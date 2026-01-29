import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Cpu } from 'lucide-react';
import { CreateTaskModal } from './components/CreateTaskModal';
import { TaskCard } from './components/TaskCard';
import { TaskDetail } from './components/TaskDetail';
import { api } from './services/api';
import type { Task } from './types';
import MatrixBackground from './components/MatrixBackground';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const fetchedTasks = await api.getTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTaskId) {
      return;
    }
    fetchTasks();
    const interval = setInterval(fetchTasks, 2000);
    return () => clearInterval(interval);
  }, [selectedTaskId, fetchTasks]);

  const handleCreateTask = async (name: string, pythonVersion: string) => {
    try {
      await api.createTask({ name, python_version: pythonVersion });
      fetchTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
      fetchTasks();
    }
  };

  const handleRunTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (!task.command) {
      setSelectedTaskId(taskId);
      return;
    }
    try {
      await api.runTask(taskId, task.command);
      fetchTasks();
    } catch (error) {
      console.error('Failed to run task:', error);
    }
  };

  const handleStopTask = async (taskId: string) => {
    try {
      await api.stopTask(taskId);
      fetchTasks();
    } catch (error) {
      console.error('Failed to stop task:', error);
    }
  };

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    // Вот здесь было `bg-black`, я его убрал. Теперь фон будет прозрачным.
    <div className="min-h-screen">
      <MatrixBackground />
      <div className="scanline-overlay" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <header className="mb-12 text-center animate-slideDown">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="relative">
              <Cpu size={48} className="text-[var(--matrix-green)]" />
              <div className="absolute inset-0 blur-xl bg-[var(--matrix-green)]/30" />
            </div>
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600">
              DEEP MATRIX
            </h1>
          </div>
          <p className="text-gray-400 text-lg font-mono">
            Panel for controlling Python
          </p>
        </header>

        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md border border-green-500 shadow-lg shadow-green-500/20 transition-all transform hover:scale-105"
            >
              <Plus size={20} />
              Create Task
            </button>
            <button
              onClick={fetchTasks}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-green-400 rounded-md border border-green-500/30 transition-all transform hover:scale-105"
            >
              <RefreshCw size={20} />
              Refresh
            </button>
          </div>
          <div className="text-green-400 font-mono border border-green-500/50 px-4 py-2 rounded-md">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-24">
            <div className="mb-4"><Cpu size={64} className="mx-auto text-gray-700" /></div>
            <h3 className="text-2xl font-semibold text-gray-500 mb-2">No tasks yet</h3>
            <p className="text-gray-600 mb-6">Create your first task to get started</p>
            <button onClick={() => setIsCreateModalOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg">
              <Plus size={20} />
              Create First Task
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slideUp">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onRun={handleRunTask}
                onStop={handleStopTask}
                onDelete={handleDeleteTask}
                onOpen={(id) => setSelectedTaskId(id)}
              />
            ))}
          </div>
        )}
        
        <div className="text-center mt-16">
            <p className="glitch" data-text="Нео ты выпил правильную таблетку">Нео ты выпил правильную таблетку</p>
        </div>

      </div>

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateTask}
      />

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={fetchTasks}
        />
      )}
    </div>
  );
}

export default App;