import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, pythonVersion: string) => void;
}

const PYTHON_VERSIONS = ['3.9', '3.10', '3.11', '3.12'];

export function CreateTaskModal({ isOpen, onClose, onCreate }: CreateTaskModalProps) {
  const [name, setName] = useState('');
  const [pythonVersion, setPythonVersion] = useState('3.11');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name, pythonVersion);
      setName('');
      setPythonVersion('3.11');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-black border border-green-500/30 rounded-lg shadow-2xl shadow-green-500/20 w-full max-w-md p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-green-400 transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-500 mb-6">
          Create New Task
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="taskName" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              Task Name
            </label>
            <input
              type="text"
              id="taskName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900/50 border border-green-500/30 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all font-mono"
              placeholder="Enter task name"
              required
            />
          </div>

          <div>
            <label htmlFor="pythonVersion" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              Python Version
            </label>
            <select
              id="pythonVersion"
              value={pythonVersion}
              onChange={(e) => setPythonVersion(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900/50 border border-green-500/30 rounded-md text-white focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all cursor-pointer font-mono"
            >
              {PYTHON_VERSIONS.map((version) => (
                <option key={version} value={version} className="bg-gray-900">
                  Python {version}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all transform hover:scale-105"
            >
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}