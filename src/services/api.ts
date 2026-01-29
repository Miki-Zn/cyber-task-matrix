import type { Task, TaskLog, CreateTaskInput } from '../types';

// Обновленный интерфейс, который описывает и файл, и папку
export interface FileItem {
  name: string;
  type: 'file' | 'folder';
  path: string; // Относительный путь от корня задачи
  size: number;
  created_at: string;
  mime_type?: string;
}

const API_BASE_URL = '/api';

// Вспомогательная функция для обработки ошибок API
async function handleResponse(response: Response) {
  if (!response.ok) {
    // Try to get JSON error response, otherwise use status text
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const api = {
  async getTasks(): Promise<Task[]> {
    const response = await fetch(`${API_BASE_URL}/tasks`);
    return handleResponse(response);
  },

  async createTask(input: CreateTaskInput): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return handleResponse(response);
  },
  
  async updateTask(taskId: string, data: Partial<Task>): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteTask(taskId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete task');
  },

  async runTask(taskId: string, command: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to run task' }));
        throw new Error(errorData.error || 'Failed to run task');
    }
  },

  async stopTask(taskId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/stop`, { method: 'POST' });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to stop task' }));
        throw new Error(errorData.error || 'Failed to stop task');
    }
  },
  
  async executeInConsole(taskId: string, command: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/execute-in-console`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute command');
    }
  },

  async getLogs(taskId: string, since?: string): Promise<TaskLog[]> {
    const url = new URL(`${API_BASE_URL}/tasks/${taskId}/logs`, window.location.origin);
    if (since) url.searchParams.append('since', since);
    const response = await fetch(url.toString());
    return handleResponse(response);
  },

  async clearLogs(taskId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/logs`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to clear logs');
  },

  // --- FILE MANAGEMENT ---

  async getFiles(taskId: string, path: string): Promise<FileItem[]> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/files?path=${encodeURIComponent(path)}`);
    return handleResponse(response);
  },
  
  async uploadFiles(taskId: string, files: File[], path: string): Promise<any[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('path', path);
    
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/files`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  async deleteItem(taskId: string, path: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/files`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!response.ok) throw new Error('Failed to delete item');
  },
  
  async createFolder(taskId: string, folderName: string, path: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_name: folderName, path: path }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
    }
  },
  
  async getFileContent(taskId: string, path: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/file-content?path=${encodeURIComponent(path)}`);
    const data = await handleResponse(response);
    return data.content;
  },
  
  async saveFileContent(taskId: string, path: string, content: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/file-content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save file');
    }
  },
};