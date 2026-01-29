# 📟 CyberTask: Matrix-Style System Interface

![React](https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.0-B73BFE?style=for-the-badge&logo=vite&logoColor=white)


A futuristic web application for managing Python script execution with isolated virtual environments.

## Features

- Create and manage Python tasks with isolated virtual environments
- Support for multiple Python versions (3.9, 3.10, 3.11, 3.12)
- Real-time console output with terminal emulation
- Interactive console for installing dependencies
- Start, stop, and restart script execution
- Modern "2030" UI with dark theme and cyan/blue accents

## Architecture

### Frontend
- React + TypeScript + Vite
- Tailwind CSS for styling
- Xterm.js for terminal emulation
- Supabase for data persistence

### Backend
- Flask (Python) REST API
- Supabase database for task and log storage
- Subprocess management for script execution
- Virtual environment isolation per task

## Setup

### Prerequisites
- Node.js 18+
- Python 3.9+ (with pip)
- Supabase account (database already configured)

### Installation

1. Install frontend dependencies:
```bash
npm install
```

2. Install backend dependencies:
```bash
cd backend
pip install -r requirements.txt
```

### Running the Application

1. Start the backend server:
```bash
cd backend
python app.py
```

The backend will run on `http://localhost:5000`

2. Start the frontend development server (in a separate terminal):
```bash
npm run dev
```

The frontend will run on the port specified by Vite (usually `http://localhost:5173`)

## Usage

1. **Create a Task**: Click "Create Task" and provide a name and Python version
2. **Open Task Details**: Click "Open" on any task card to view details
3. **Install Dependencies**: Use the interactive console to run commands like `pip install requests`
4. **Configure Command**: Enter the command to run your script (e.g., `python main.py`)
5. **Run Script**: Click "Run" to start execution
6. **Monitor Output**: Watch real-time logs in the terminal
7. **Stop/Restart**: Control script execution with the control buttons

## Database Schema

### tasks
- `id`: Task identifier
- `name`: Task name
- `python_version`: Python version for the virtual environment
- `status`: Current status (stopped, running, error)
- `command`: Last executed command
- `venv_path`: Path to virtual environment
- `process_id`: OS process ID when running

### task_logs
- `id`: Log entry identifier
- `task_id`: Associated task
- `log_type`: Type of log (stdout, stderr, system)
- `content`: Log content
- `created_at`: Timestamp

## API Endpoints

- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create a new task
- `DELETE /api/tasks/<id>` - Delete a task
- `POST /api/tasks/<id>/run` - Run a task
- `POST /api/tasks/<id>/stop` - Stop a task
- `POST /api/tasks/<id>/execute-in-console` - Execute command in task environment
- `GET /api/tasks/<id>/logs` - Get task logs

## Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Xterm.js
- **Backend**: Flask, Python
- **Database**: Supabase (PostgreSQL)
- **Process Management**: Python subprocess module
- **Isolation**: Python venv

## Notes

- Each task runs in its own isolated virtual environment
- Virtual environments are stored in `backend/python_tasks/<task_id>/venv`
- Logs are stored in Supabase and streamed in real-time
- The application uses HTTP polling for log updates (1.5 second intervals)

## 📂 System Architecture

The project follows a decoupled architecture separating the UI logic from the backend API.

```text
cyber-task-matrix/
├── 🐍 backend/              # Flask REST API
│   ├── instance/            # SQLite Database Storage
│   ├── app.py               # Application Entry Point & Routes
│   └── requirements.txt     # Python Dependencies
├── ⚛️ src/                  # React Frontend
│   ├── components/          # Cyberpunk UI Components
│   │   ├── Terminal.tsx     # Command Line Interface
│   │   ├── MatrixBackground # Rain Animation Logic
│   │   └── FileEditorModal  # Virtual File System
│   ├── services/            # API Integration (Axios)
│   └── types/               # TypeScript Interfaces
└── 📄 README.md             # Documentation
