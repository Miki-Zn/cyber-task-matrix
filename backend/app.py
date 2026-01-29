import sys
import os
import shutil
import shlex
import time
import uuid
import logging
import threading
import signal
import subprocess
import mimetypes
from pathlib import Path
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename

# --- Basic Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# --- 1. Исправление: Абсолютный путь к БД ---
# Теперь база всегда будет создаваться в той же папке, где лежит этот файл
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(BASE_DIR, 'project.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Папка для задач (тоже абсолютный путь)
VENV_BASE_DIR = Path(os.path.join(BASE_DIR, 'python_tasks'))
try:
    VENV_BASE_DIR.mkdir(exist_ok=True)
except PermissionError:
    logger.error(f"CRITICAL: No permission to create {VENV_BASE_DIR}. Run chown!")

# --- Helper to get venv paths ---
def get_venv_paths(task):
    venv_path = Path(task.venv_path).resolve()
    if os.name == 'nt':
        bin_path = venv_path / 'venv' / 'Scripts'
        return {
            "python": str(bin_path / 'python.exe'),
            "pip": str(bin_path / 'pip.exe')
        }
    else:
        bin_path = venv_path / 'venv' / 'bin'
        return {
            "python": str(bin_path / 'python'),
            "pip": str(bin_path / 'pip')
        }

# --- Database Models ---
class Task(db.Model):
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String, nullable=False)
    python_version = db.Column(db.String, nullable=False)
    status = db.Column(db.String, nullable=False, default='stopped')
    command = db.Column(db.String, nullable=True)
    venv_path = db.Column(db.String, nullable=True)
    process_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    logs = db.relationship('TaskLog', backref='task', cascade="all, delete-orphan")
    files = db.relationship('TaskFile', backref='task', cascade="all, delete-orphan")

    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        d['created_at'] = self.created_at.isoformat()
        d['updated_at'] = self.updated_at.isoformat()
        return d

class TaskLog(db.Model):
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = db.Column(db.String, db.ForeignKey('task.id'), nullable=False)
    log_type = db.Column(db.String, nullable=False)
    content = db.Column(db.String, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        d['created_at'] = self.created_at.isoformat()
        return d

class TaskFile(db.Model):
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = db.Column(db.String, db.ForeignKey('task.id'), nullable=False)
    filename = db.Column(db.String, nullable=False)
    size = db.Column(db.Integer, nullable=False)
    mime_type = db.Column(db.String, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

def get_safe_path(base_path, relative_path):
    try:
        base_path = Path(base_path).resolve()
        target_path = (base_path / relative_path).resolve()
        target_path.relative_to(base_path)
        return target_path
    except (ValueError, Exception):
        raise ValueError("Invalid or forbidden path")

def stream_and_log_output(task_id, process):
    def read_pipe(pipe, log_type):
        with app.app_context():
            # Читаем построчно, пока процесс жив
            for line in iter(pipe.readline, ''):
                if line:
                    db.session.add(TaskLog(task_id=task_id, log_type=log_type, content=line.strip()))
                    db.session.commit()
            pipe.close()

    stdout_thread = threading.Thread(target=read_pipe, args=(process.stdout, 'stdout'))
    stderr_thread = threading.Thread(target=read_pipe, args=(process.stderr, 'stderr'))
    stdout_thread.start()
    stderr_thread.start()
    
    return_code = process.wait()

    with app.app_context():
        task = Task.query.get(task_id)
        if task:
            task.status = 'stopped' if return_code == 0 else 'error'
            task.process_id = None
            msg = f'Process exited with code {return_code}'
            db.session.add(TaskLog(task_id=task_id, log_type='system', content=msg))
            db.session.commit()

# --- 2. Исправление: Создаем таблицы АВТОМАТИЧЕСКИ ---
# Это выполняется при каждом запуске Gunicorn, гарантируя наличие таблиц
with app.app_context():
    db.create_all()
    logger.info(f"Database initialized at {db_path}")

# --- API Endpoints ---

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.order_by(Task.created_at.desc()).all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/api/tasks', methods=['POST'])
def create_task_endpoint():
    try:
        data = request.json
        name = data.get('name')
        # Если версия не передана, пробуем 3.11, иначе системную
        python_version = data.get('python_version', '3.11')
        
        if not name: return jsonify({'error': 'Task name is required'}), 400
        
        task_id = str(uuid.uuid4())
        venv_path = VENV_BASE_DIR / task_id
        
        # Создаем папку (с проверкой ошибки)
        try:
            venv_path.mkdir(parents=True, exist_ok=True)
        except PermissionError:
            err_msg = f"Permission denied creating {venv_path}. Check folder owner!"
            logger.error(err_msg)
            return jsonify({'error': err_msg}), 500
        
        # --- 3. Исправление: Умный поиск Python ---
        requested_python = f'python{python_version}'
        python_executable = requested_python

        # Если python3.11 не найден, берем тот, который запустил этот скрипт
        if shutil.which(python_executable) is None:
            logger.warning(f"{python_executable} not found. Using system python: {sys.executable}")
            python_executable = sys.executable

        logger.info(f"Creating venv using: {python_executable}")
        
        # Создаем venv
        result = subprocess.run(
            [python_executable, '-m', 'venv', str(venv_path / 'venv')],
            capture_output=True, 
            text=True
        )
        
        if result.returncode != 0:
            logger.error(f"Venv creation failed: {result.stderr}")
            shutil.rmtree(venv_path, ignore_errors=True)
            return jsonify({'error': f'Failed to create venv: {result.stderr}'}), 500

        new_task = Task(id=task_id, name=name, python_version=python_version, venv_path=str(venv_path.resolve()))
        db.session.add(new_task)
        db.session.add(TaskLog(task_id=task_id, log_type='system', content=f'Task created with {python_executable}'))
        db.session.commit()
        return jsonify(new_task.to_dict()), 201

    except Exception as e:
        logger.exception("Unexpected error in create_task")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<task_id>/run', methods=['POST'])
def run_task(task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({'error': 'Task not found'}), 404

    if task.status == 'running' and task.process_id:
        try:
            os.kill(task.process_id, 0)
            return jsonify({'error': 'Task is already running'}), 400
        except OSError:
            logger.warning(f"Stale PID {task.process_id}")

    data = request.json
    command = data.get('command')
    if not command: return jsonify({'error': 'Command is required'}), 400

    venv_paths = get_venv_paths(task)
    
    try:
        cmd_parts = shlex.split(command)
    except ValueError as e:
        return jsonify({'error': f"Invalid command: {e}"}), 400

    # Подменяем python/pip на версии из venv
    if cmd_parts[0] == 'python':
        cmd_parts[0] = venv_paths['python']
    elif cmd_parts[0] == 'pip':
        cmd_parts[0] = venv_paths['pip']

    try:
        preexec_fn = os.setsid if os.name != 'nt' else None
        process = subprocess.Popen(
            cmd_parts,
            cwd=task.venv_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            env=os.environ.copy(),
            preexec_fn=preexec_fn
        )
    except FileNotFoundError:
        return jsonify({'error': f"Command not found: {cmd_parts[0]}"}), 500
    except Exception as e:
        return jsonify({'error': f"Failed to start process: {str(e)}"}), 500

    task.status = 'running'
    task.command = command
    task.process_id = process.pid
    db.session.add(TaskLog(task_id=task_id, log_type='system', content=f'Starting: {command}'))
    db.session.commit()

    threading.Thread(target=stream_and_log_output, args=(task_id, process)).start()
    
    return jsonify({'success': True, 'pid': process.pid})


@app.route('/api/tasks/<task_id>/stop', methods=['POST'])
def stop_task(task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({'error': 'Task not found'}), 404

    pid = task.process_id
    if task.status != 'running' or not pid:
        return jsonify({'error': 'Task not running'}), 400

    try:
        if os.name != 'nt':
            pgid = os.getpgid(pid)
            os.killpg(pgid, signal.SIGTERM)
            time.sleep(1)
            try:
                os.killpg(pgid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        else:
            subprocess.run(['taskkill', '/F', '/T', '/PID', str(pid)])
            
    except Exception as e:
        logger.error(f"Error stopping task: {e}")

    task.status = 'stopped'
    task.process_id = None
    db.session.add(TaskLog(task_id=task_id, log_type='system', content='Stopped by user.'))
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({'error': 'Task not found'}), 404
    data = request.json
    if 'command' in data: task.command = data['command']
    if 'name' in data and data['name'].strip(): task.name = data['name'].strip()
    db.session.commit()
    return jsonify(task.to_dict())

@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({'error': 'Task not found'}), 404
    # Kill process if running
    if task.process_id:
        try:
            if os.name != 'nt': os.killpg(os.getpgid(task.process_id), signal.SIGKILL)
            else: subprocess.run(['taskkill', '/F', '/T', '/PID', str(task.process_id)])
        except: pass
    
    if task.venv_path: shutil.rmtree(Path(task.venv_path), ignore_errors=True)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/tasks/<task_id>/logs', methods=['GET'])
def get_task_logs(task_id):
    since = request.args.get('since')
    query = TaskLog.query.filter_by(task_id=task_id).order_by(TaskLog.created_at.asc())
    if since: query = query.filter(TaskLog.created_at > since)
    return jsonify([log.to_dict() for log in query.all()])

@app.route('/api/tasks/<task_id>/logs', methods=['DELETE'])
def clear_task_logs(task_id):
    TaskLog.query.filter_by(task_id=task_id).delete()
    db.session.commit()
    return jsonify({'success': True})

# --- Files Endpoints ---
@app.route('/api/tasks/<task_id>/files', methods=['GET'])
def get_task_files(task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({'error': 'Task not found'}), 404
    relative_path = request.args.get('path', '.')
    try: current_dir = get_safe_path(task.venv_path, relative_path)
    except ValueError as e: return jsonify({'error': str(e)}), 400
    items = []
    if current_dir.exists():
        for item in sorted(list(current_dir.iterdir()), key=lambda p: p.name):
            if item.name == 'venv' or item.name.startswith('.'): continue
            item_relative_path = (Path(relative_path) / item.name).as_posix()
            created_at = datetime.fromtimestamp(item.stat().st_ctime).isoformat()
            if item.is_dir():
                items.append({'name': item.name, 'type': 'folder', 'path': item_relative_path, 'size': 0, 'created_at': created_at})
            elif item.is_file():
                items.append({'name': item.name, 'type': 'file', 'path': item_relative_path, 'size': item.stat().st_size, 'created_at': created_at})
    items.sort(key=lambda x: (x['type'] != 'folder', x['name']))
    return jsonify(items)

@app.route('/api/tasks/<task_id>/files', methods=['POST'])
def upload_task_files(task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({'error': 'Task not found'}), 404
    relative_path = request.form.get('path', '.')
    try: upload_dir = get_safe_path(task.venv_path, relative_path)
    except ValueError: return jsonify({'error': 'Invalid path'}), 400
    if 'files' not in request.files: return jsonify({'error': 'No files'}), 400
    for file in request.files.getlist('files'):
        file.save(upload_dir / secure_filename(file.filename))
    return jsonify({'success': True}), 201

@app.route('/api/tasks/<task_id>/files', methods=['DELETE'])
def delete_task_item(task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({'error': 'Task not found'}), 404
    path_str = request.json.get('path')
    try: full_path = get_safe_path(task.venv_path, path_str)
    except ValueError: return jsonify({'error': 'Invalid path'}), 400
    if not full_path.exists(): return jsonify({'error': 'Not found'}), 404
    if full_path.is_file(): full_path.unlink()
    else: shutil.rmtree(full_path)
    return jsonify({'success': True})

@app.route('/api/tasks/<task_id>/folders', methods=['POST'])
def create_folder(task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({'error': 'Task not found'}), 404
    data = request.json
    try: target_dir = get_safe_path(task.venv_path, data.get('path', '.'))
    except ValueError: return jsonify({'error': 'Invalid path'}), 400
    folder = target_dir / secure_filename(data.get('folder_name'))
    if folder.exists(): return jsonify({'error': 'Exists'}), 400
    folder.mkdir()
    return jsonify({'success': True}), 201

@app.route('/api/tasks/<task_id>/execute-in-console', methods=['POST'])
def execute_in_console(task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({'error': 'Task not found'}), 404
    command = request.json.get('command')
    venv = get_venv_paths(task)
    try: cmd = shlex.split(command)
    except: return jsonify({'stderr': 'Invalid command'}), 400
    if cmd[0] in ['python', 'pip']: cmd[0] = venv[cmd[0]]
    
    db.session.add(TaskLog(task_id=task_id, log_type='system', content=f'$ {command}'))
    db.session.commit()
    
    try:
        res = subprocess.run(cmd, cwd=task.venv_path, capture_output=True, text=True, timeout=30)
        out, err = res.stdout, res.stderr
        if out: db.session.add(TaskLog(task_id=task_id, log_type='stdout', content=out))
        if err: db.session.add(TaskLog(task_id=task_id, log_type='stderr', content=err))
        db.session.commit()
        return jsonify({'stdout': out, 'stderr': err})
    except Exception as e:
        return jsonify({'stderr': str(e)})

@app.route('/api/tasks/<task_id>/file-content', methods=['GET', 'POST'])
def handle_file_content(task_id):
    task = Task.query.get(task_id)
    if not task: return jsonify({'error': 'Not found'}), 404
    
    if request.method == 'GET':
        path = request.args.get('path')
        try: full = get_safe_path(task.venv_path, path)
        except: return jsonify({'error': 'Invalid path'}), 400
        if not full.is_file(): return jsonify({'error': 'Not a file'}), 400
        return jsonify({'content': full.read_text(encoding='utf-8', errors='replace')})
        
    if request.method == 'POST':
        data = request.json
        try: full = get_safe_path(task.venv_path, data.get('path'))
        except: return jsonify({'error': 'Invalid path'}), 400
        full.write_text(data.get('content'), encoding='utf-8')
        return jsonify({'success': True})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)