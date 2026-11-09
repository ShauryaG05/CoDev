import React, { useState } from 'react';
import { api } from '../services/api.js';
import { UserPlus, Copy, Check, X, Shield, Clock } from 'lucide-react';
import { Role } from '../types/index.js';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, projectId, projectName }) => {
  const [role, setRole] = useState<Role>('editor');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/projects/${projectId}/invites`, {
        role,
        expiresInDays,
      });
      const token = res.data.invite.token;
      const url = `${window.location.origin}/#invite=${token}`;
      setInviteUrl(url);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-ide-panel border border-ide-border rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-ide-border">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Invite Collaborators</h3>
              <p className="text-xs text-zinc-400">{projectName}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setInviteUrl(null);
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-ide-hover transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>Permission Role</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('editor')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition ${
                  role === 'editor'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                    : 'bg-ide-sidebar border-ide-border text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-semibold">Editor</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Can edit code & file tree</div>
              </button>
              <button
                type="button"
                onClick={() => setRole('viewer')}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition ${
                  role === 'viewer'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200'
                    : 'bg-ide-sidebar border-ide-border text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="font-semibold">Viewer</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Read-only live observation</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Expires In</span>
            </label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="w-full px-3.5 py-2 bg-ide-sidebar border border-ide-border rounded-lg text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value={1}>24 Hours</option>
              <option value={7}>7 Days</option>
              <option value={30}>30 Days</option>
              <option value={0}>Never</option>
            </select>
          </div>

          {!inviteUrl ? (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition disabled:opacity-50 mt-2"
            >
              {loading ? 'Generating...' : 'Generate Shareable Link'}
            </button>
          ) : (
            <div className="pt-2">
              <label className="block text-xs font-medium text-emerald-400 mb-1.5">Invite Link Ready:</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 px-3 py-2 bg-ide-sidebar border border-ide-border rounded-lg text-xs text-zinc-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition flex items-center justify-center"
                  title="Copy Link"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mt-2">
                Send this link to collaborators. When they click it, the project will automatically appear in their
                Cloud Directory!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
