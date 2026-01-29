import { File as FileIcon, Trash2, Folder, Edit, ArrowUp, FileText, Image as ImageIcon, FileCode, Archive } from 'lucide-react';
import type { FileItem } from '../services/api';

interface FileListProps {
  items: FileItem[];
  currentPath: string;
  onDeleteItem: (path: string) => void;
  onNavigate: (path: string) => void;
  onEditFile: (path: string) => void;
}

export function FileList({ items, currentPath, onDeleteItem, onNavigate, onEditFile }: FileListProps) {
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };
  
  const getFileIcon = (item: FileItem) => {
    if (item.type === 'folder') return Folder;
    if (!item.mime_type) return FileIcon;
    if (item.mime_type.startsWith('image/')) return ImageIcon;
    if (item.mime_type.startsWith('text/')) return FileText;
    if (item.mime_type.includes('python') || item.mime_type.includes('javascript') || item.mime_type.includes('json')) return FileCode;
    if (item.mime_type.includes('zip') || item.mime_type.includes('tar') || item.mime_type.includes('gz')) return Archive;
    return FileIcon;
  };

  const isTextFile = (mimeType?: string) => {
    if (!mimeType) return true; // Assume unknown files might be text
    return mimeType.startsWith('text/') || 
           ['application/json', 'application/javascript', 'application/x-python-code', 'application/x-sh'].includes(mimeType) ||
           mimeType.includes('python');
  };

  const parentPath = currentPath.split('/').slice(0, -1).join('/') || '.';

  if (items.length === 0 && currentPath === '.') {
    return (
      <div className="flex-1 flex items-center justify-center text-center py-12 border-2 border-dashed border-green-500/20 rounded-lg">
        <div>
            <FileIcon size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-500">No files or folders yet</p>
            <p className="text-sm text-gray-600 mt-2">Upload files or create a new folder to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-2">
      <h4 className="text-sm font-medium text-gray-300 mb-3 flex-shrink-0">
        Items ({items.length})
      </h4>
      <div className="overflow-y-auto pr-2 flex-1">
        <div className="space-y-2">
          {currentPath !== '.' && (
            <button 
              onClick={() => onNavigate(parentPath)} 
              className="group flex items-center gap-3 w-full p-4 text-left rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <ArrowUp size={24} className="text-green-400 flex-shrink-0" />
              <p className="text-sm font-medium">.. (Go up)</p>
            </button>
          )}
          {items.map((item) => {
            const Icon = getFileIcon(item);
            return (
              <div key={item.path} className="group flex items-center justify-between p-4 bg-gray-800/50 border border-green-500/20 rounded-lg hover:border-green-500/40 hover:bg-gray-800 transition-all">
                <button 
                  onClick={() => item.type === 'folder' && onNavigate(item.path)} 
                  disabled={item.type !== 'folder'}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:cursor-default"
                >
                  <Icon size={24} className={`${item.type === 'folder' ? 'text-yellow-400' : 'text-green-400'} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate font-medium">{item.name}</p>
                    {item.type === 'file' && (
                        <p className="text-xs text-gray-500 mt-1">{formatFileSize(item.size)}</p>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.type === 'file' && isTextFile(item.mime_type) && (
                    <button onClick={() => onEditFile(item.path)} className="p-2 text-gray-400 hover:text-white hover:bg-green-500/20 rounded-md" title="Edit file">
                      <Edit size={16} />
                    </button>
                  )}
                  <button onClick={() => onDeleteItem(item.path)} className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-md" title={`Delete ${item.type}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}