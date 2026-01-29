import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Play, Square, RotateCcw, Terminal as TerminalIcon, FolderOpen,
  FolderPlus, ArrowLeft, Trash2, Edit, Check
} from 'lucide-react';
import type { Task, TaskLog } from '../types';
import { Terminal } from './Terminal';
import { FileUpload } from './FileUpload';
import { FileList } from './FileList';
import { FileEditorModal } from './FileEditorModal';
import { api, FileItem } from '../services/api';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetail({ task, onClose, onUpdate }: TaskDetailProps) {
  const [command, setCommand] = useState(task.command || '');
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [activeTab, setActiveTab] = useState<'console' | 'files'>('console');

  const [items, setItems] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('.');
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(task.name);

  const latestLogTimestamp = useRef<string | undefined>();

  const fetchFiles = useCallback(async (path: string) => {
    try {
      const taskFiles = await api.getFiles(task.id, path);
      setItems(taskFiles);
    } catch (error) { console.error('Failed to fetch files:', error) }
  }, [task.id]);

  const fetchNewLogs = useCallback(async () => {
    if (document.hidden) return; // Don't fetch if tab is not active
    try {
        const newLogs = await api.getLogs(task.id, latestLogTimestamp.current);
        if (newLogs.length > 0) {
            setLogs(prev => [...prev, ...newLogs]);
            latestLogTimestamp.current = newLogs[newLogs.length - 1].created_at;
        }
    } catch(e) {
        console.error("Failed to fetch logs:", e);
    }
  }, [task.id]);

  useEffect(() => {
    let isMounted = true;
    
    api.getLogs(task.id).then(allLogs => {
        if (isMounted) {
            setLogs(allLogs);
            if (allLogs.length > 0) {
                latestLogTimestamp.current = allLogs[allLogs.length - 1].created_at;
            }
        }
    });
    
    const interval = setInterval(() => {
        if (isMounted) {
            fetchNewLogs();
        }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [task.id, fetchNewLogs]);

  useEffect(() => {
    if (activeTab === 'files') {
      fetchFiles(currentPath);
    }
  }, [task.id, currentPath, activeTab, fetchFiles]);
  
  const handleSaveName = async () => {
    if (editingName.trim() && editingName.trim() !== task.name) {
      try {
        await api.updateTask(task.id, { name: editingName.trim() });
        onUpdate(); 
      } catch (error) {
        console.error("Failed to update task name:", error);
        setEditingName(task.name);
      }
    }
    setIsEditingName(false);
  };

  const handleRun = async () => {
    if (!command.trim()) return;
    try {
      await api.updateTask(task.id, { command });
      await api.runTask(task.id, command);
      onUpdate();
    } catch (e) { 
        console.error('Failed to run task:', e);
        const errorLog: TaskLog = {
            id: Date.now().toString(),
            task_id: task.id,
            log_type: 'system',
            content: `Error running task: ${e instanceof Error ? e.message : String(e)}`,
            created_at: new Date().toISOString()
        };
        setLogs(prev => [...prev, errorLog]);
    }
  };

  const handleStop = async () => {
    await api.stopTask(task.id).catch(e => console.error('Failed to stop task:', e));
    onUpdate();
  };

  const handleRestart = async () => {
    try {
      await handleStop();
      setTimeout(handleRun, 1000);
    } catch (error) { console.error('Failed to restart task:', error) }
  };
  
  const handleCommandInConsole = useCallback(async (cmd: string) => {
      try {
          await api.executeInConsole(task.id, cmd);
          setTimeout(fetchNewLogs, 100);
      } catch (error) {
          console.error('Failed to execute command in console:', error);
          const errorLog: TaskLog = {
            id: Date.now().toString(),
            task_id: task.id,
            log_type: 'system',
            content: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
            created_at: new Date().toISOString()
          };
          setLogs(prev => [...prev, errorLog]);
      }
  }, [task.id, fetchNewLogs]);

  const handleClearLogs = async () => {
    try {
      await api.clearLogs(task.id);
      setLogs([]); 
      latestLogTimestamp.current = undefined;
      setTimeout(fetchNewLogs, 100);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const handleUploadFiles = async (uploadFiles: File[]) => {
    await api.uploadFiles(task.id, uploadFiles, currentPath);
    fetchFiles(currentPath);
  };
  const handleDeleteItem = async (path: string) => {
    if (confirm(`Are you sure you want to delete "${path.split('/').pop()}"?`)) {
        await api.deleteItem(task.id, path);
        fetchFiles(currentPath);
    }
  };
  const handleCreateFolder = async () => {
    const folderName = prompt('Enter new folder name:');
    if (folderName?.trim()) {
        await api.createFolder(task.id, folderName.trim(), currentPath);
        fetchFiles(currentPath);
    }
  };
  const handleEditFile = async (path: string) => {
    const content = await api.getFileContent(task.id, path);
    setEditingFile({ path, content });
  };
  const handleSaveFile = async (newContent: string) => {
    if (editingFile) {
        await api.saveFileContent(task.id, editingFile.path, newContent);
        setEditingFile(null);
    }
  };

  const statusColors = {
    stopped: 'text-gray-400 border-gray-600',
    running: 'text-green-400 border-green-500',
    error: 'text-red-400 border-red-500',
  };

  const getParentPath = (path: string) => {
    if (path === '.') return '.';
    const parts = path.split('/');
    return parts.length === 1 ? '.' : parts.slice(0, -1).join('/');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
        <div className="relative bg-black border border-green-500/30 rounded-lg shadow-2xl shadow-green-500/20 w-full max-w-6xl h-[90vh] flex flex-col animate-slideUp">
          <div className="flex items-center justify-between p-6 border-b border-green-500/30">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
                    className="bg-gray-900 text-2xl font-bold text-white border-b-2 border-green-500 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="text-green-400 hover:text-white"><Check size={24} /></button>
                  <button onClick={() => { setIsEditingName(false); setEditingName(task.name); }} className="text-red-400 hover:text-white"><X size={24} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-500 truncate">{task.name}</h2>
                  <button onClick={() => setIsEditingName(true)} className="text-gray-500 hover:text-green-400 flex-shrink-0">
                    <Edit size={18} />
                  </button>
                </div>
              )}
              <span className="text-sm text-gray-400 font-mono flex-shrink-0">Python {task.python_version}</span>
              <div className={`px-3 py-1 rounded-md border ${statusColors[task.status]} text-xs font-medium uppercase tracking-wider flex-shrink-0`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${task.status === 'running' ? 'bg-green-400 animate-pulse' : task.status === 'error' ? 'bg-red-400' : 'bg-gray-400'}`} />
                  {task.status}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-green-400 ml-4"><X size={24} /></button>
          </div>
          <div className="flex-shrink-0 flex justify-between items-center border-b border-green-500/30 px-6">
            <div className="flex">
              <button onClick={() => setActiveTab('console')} className={`flex items-center gap-2 px-6 py-3 transition-all relative ${activeTab === 'console' ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}`}>
                <TerminalIcon size={18} /> Console
                {activeTab === 'console' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />}
              </button>
              <button onClick={() => setActiveTab('files')} className={`flex items-center gap-2 px-6 py-3 transition-all relative ${activeTab === 'files' ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}`}>
                <FolderOpen size={18} /> Files
                {activeTab === 'files' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />}
              </button>
            </div>
            {activeTab === 'console' && (
              <button onClick={handleClearLogs} className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-400">
                <Trash2 size={16} />
                Clear Logs
              </button>
            )}
          </div>
          {activeTab === 'console' && (
            <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="Enter command (e.g., python main.py)"
                  className="flex-1 px-4 py-3 bg-gray-900/50 border border-green-500/30 rounded-md text-white font-mono"
                />
                {task.status === 'running' ? (
                  <>
                    <button onClick={handleStop} className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-md">
                      <Square size={18} /> Stop
                    </button>
                    <button onClick={handleRestart} className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-md">
                      <RotateCcw size={18} /> Restart
                    </button>
                  </>
                ) : (
                  <button onClick={handleRun} disabled={!command.trim()} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50">
                    <Play size={18} /> Run
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <Terminal logs={logs} onCommand={handleCommandInConsole} />
              </div>
            </div>
          )}
          {activeTab === 'files' && (
            <div className="flex-1 flex flex-col p-6 gap-6 overflow-hidden">
              <div className="flex-shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
                  {currentPath !== '.' && (
                    <button onClick={() => setCurrentPath(getParentPath(currentPath))} className="hover:text-green-400 flex items-center gap-1">
                      <ArrowLeft size={16}/> Back
                    </button>
                  )}
                  <span>Path: ./{currentPath}</span>
                </div>
                <button onClick={handleCreateFolder} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-green-600 text-white rounded-md">
                  <FolderPlus size={18} /> Create Folder
                </button>
              </div>
              <div className="flex-shrink-0">
                <h4 className="text-base font-semibold text-gray-200 mb-4">Upload Files</h4>
                <FileUpload onUpload={handleUploadFiles} />
              </div>
              <div className="flex-1 flex flex-col min-h-0">
                <FileList items={items} currentPath={currentPath} onNavigate={setCurrentPath} onDeleteItem={handleDeleteItem} onEditFile={handleEditFile} />
              </div>
            </div>
          )}
        </div>
      </div>
      {editingFile && (
        <FileEditorModal
          filename={editingFile.path.split('/').pop() || ''}
          initialContent={editingFile.content}
          onSave={handleSaveFile}
          onClose={() => setEditingFile(null)}
        />
      )}
    </>
  );
}
