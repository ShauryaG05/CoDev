import React, { useState } from 'react';
import { api } from '../services/api.js';
import { FolderPlus, X, Code2 } from 'lucide-react';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: any) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultLanguage, setDefaultLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/projects', {
        name,
        description,
        defaultLanguage,
      });
      onCreated(res.data.project);
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateName: string, lang: string, desc: string) => {
    setName(templateName);
    setDefaultLanguage(lang);
    setDescription(desc);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-md bg-ide-surface border border-ide-border rounded-xl shadow-elevated p-6">
        <div className="flex items-center justify-between pb-3.5 border-b border-ide-border">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-ide-elevated text-indigo-400 rounded-lg border border-ide-border">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm">Create Workspace</h3>
              <p className="text-[11px] text-zinc-400">Independent project with dedicated file tree and members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-ide-elevated transition btn-tactile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3.5 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Quick starter templates */}
        <div className="mt-4">
          <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
            Quick Templates
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleTemplateSelect('node-backend', 'javascript', 'Node.js server with REST APIs')}
              className="p-2 bg-ide-sidebar hover:bg-ide-elevated border border-ide-border rounded-lg text-left transition btn-tactile"
            >
              <div className="font-medium text-zinc-200 text-xs">Node.js Server</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">JavaScript starter</div>
            </button>
            <button
              type="button"
              onClick={() => handleTemplateSelect('py-algorithm', 'python', 'Python data script and algorithms')}
              className="p-2 bg-ide-sidebar hover:bg-ide-elevated border border-ide-border rounded-lg text-left transition btn-tactile"
            >
              <div className="font-medium text-zinc-200 text-xs">Python Script</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Python main.py</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Project Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. backend-api or data-crawler"
              className="w-full px-3 py-2 bg-ide-sidebar border border-ide-border rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Description (Optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this workspace"
              className="w-full px-3 py-2 bg-ide-sidebar border border-ide-border rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Default Language</label>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-ide-sidebar border border-ide-border rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-ide-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition btn-tactile"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition btn-tactile disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
