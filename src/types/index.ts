export interface Task {
  id: string;
  name: string;
  python_version: string;
  status: 'stopped' | 'running' | 'error';
  command: string | null;
  venv_path: string | null;
  process_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskLog {
  id: string;
  task_id: string;
  log_type: 'stdout' | 'stderr' | 'system';
  content: string;
  created_at: string;
}

export interface CreateTaskInput {
  name: string;
  python_version: string;
}
