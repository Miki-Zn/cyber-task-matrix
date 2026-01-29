import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface FileEditorModalProps {
  filename: string;
  initialContent: string;
  onSave: (newContent: string) => Promise<void>;
  onClose: () => void;
}

export function FileEditorModal({
  filename,
  initialContent,
  onSave,
  onClose,
}: FileEditorModalProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      onClose();
    } catch (error) {
      alert(`Failed to save file: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-black border border-green-500/30 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold text-green-400 font-mono">{filename}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-green-400">
            <X size={24} />
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full bg-black/50 text-gray-200 font-mono p-4 rounded-md border border-gray-700 focus:outline-none focus:border-green-500 resize-none"
          spellCheck="false"
        />
        <div className="flex justify-end mt-4 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}