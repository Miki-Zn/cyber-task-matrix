import { Play, Square, Trash2, ChevronRight } from 'lucide-react';
import type { Task } from '../types';

interface TaskCardProps {
  task: Task;
  onRun: (taskId: string) => void;
  onStop: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onOpen: (taskId: string) => void;
}

export function TaskCard({ task, onRun, onStop, onDelete, onOpen }: TaskCardProps) {
  const statusColors = {
    stopped: 'text-gray-400 border-gray-600',
    running: 'text-green-400 border-green-500',
    error: 'text-red-400 border-red-500',
  };

  const statusGlow = {
    stopped: '',
    running: 'shadow-green-500/50 animate-pulse',
    error: 'shadow-red-500/50',
  };

  return (
    <div className="group relative bg-black/50 backdrop-blur-sm border border-green-500/20 rounded-lg p-6 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-green-400 transition-colors">
            {task.name}
          </h3>
          <p className="text-sm text-gray-400 font-mono">Python {task.python_version}</p>
        </div>

        <div className={`px-3 py-1 rounded-md border ${statusColors[task.status]} ${statusGlow[task.status]} text-xs font-medium uppercase tracking-wider`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${task.status === 'running' ? 'bg-green-400 animate-pulse' : task.status === 'error' ? 'bg-red-400' : 'bg-gray-400'}`} />
            {task.status}
          </div>
        </div>
      </div>

      {task.command && (
        <div className="mb-4 p-2 bg-black/50 rounded border border-gray-700 text-xs text-gray-300 font-mono truncate">
          {task.command}
        </div>
      )}

      <div className="flex items-center gap-2">
        {task.status === 'running' ? (
          <button
            onClick={() => onStop(task.id)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-md transition-all transform hover:scale-105"
          >
            <Square size={16} />
            Stop
          </button>
        ) : (
          <button
            onClick={() => onRun(task.id)}
            disabled={!task.command}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-all shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} />
            Run
          </button>
        )}

        <button
          onClick={() => onOpen(task.id)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-all transform hover:scale-105"
        >
          <ChevronRight size={16} />
          Open
        </button>

        <button
          onClick={() => onDelete(task.id)}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-red-600 text-gray-300 hover:text-white rounded-md transition-all transform hover:scale-105"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}