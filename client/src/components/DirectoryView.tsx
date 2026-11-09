import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useSocket } from '../context/SocketContext.js';
import { ProjectCard } from '../types/index.js';
import {
  FolderPlus,
  Search,
  Users,
  FolderGit2,
  Share2,
  Calendar,
  ExternalLink,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DirectoryViewProps {
  onSelectProject: (projectId: string) => void;
  onCreateNew: () => void;
  onInvite: (projectId: string, projectName: string) => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({
  onSelectProject,
  onCreateNew,
  onInvite,
}) => {
  const { socket } = useSocket();
  const [mine, setMine] = useState<ProjectCard[]>([]);
  const [shared, setShared] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'shared'>('all');

  const fetchDirectory = async () => {
    try {
      const res = await api.get('/me/directory', { params: { search } });
      setMine(res.data.mine || []);
      setShared(res.data.shared || []);
    } catch (err) {
      console.error('Failed to load directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [search]);

  // Real-time Push Event Subscriptions
  useEffect(() => {
    if (!socket) return;

    // 1. When an invite is accepted or user is added, server pushes project directly into user room
    const handleProjectAdded = (payload: { project: any; role: any }) => {
      console.log('[Socket] directory:project-added received:', payload);
      const newCard: ProjectCard = {
        id: payload.project.id || payload.project._id,
        name: payload.project.name,
        description: payload.project.description || '',
        defaultLanguage: payload.project.defaultLanguage || 'javascript',
        role: payload.role,
        createdAt: payload.project.createdAt || new Date().toISOString(),
        updatedAt: payload.project.updatedAt || new Date().toISOString(),
        memberAvatars: [],
        onlineCount: 1,
      };

      if (payload.role === 'owner') {
        setMine((prev) => [newCard, ...prev.filter((p) => p.id !== newCard.id)]);
      } else {
        setShared((prev) => [newCard, ...prev.filter((p) => p.id !== newCard.id)]);
      }
    };

    // 2. When project is deleted or membership is revoked
    const handleProjectRemoved = ({ projectId }: { projectId: string }) => {
      console.log('[Socket] directory:project-removed received:', projectId);
      setMine((prev) => prev.filter((p) => p.id !== projectId));
      setShared((prev) => prev.filter((p) => p.id !== projectId));
    };

    socket.on('directory:project-added', handleProjectAdded);
    socket.on('directory:project-removed', handleProjectRemoved);

    return () => {
      socket.off('directory:project-added', handleProjectAdded);
      socket.off('directory:project-removed', handleProjectRemoved);
    };
  }, [socket]);

  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? It will be removed for all members.')) {
      try {
        await api.delete(`/projects/${projectId}`);
        setMine((prev) => prev.filter((p) => p.id !== projectId));
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete project');
      }
    }
  };

  const renderCard = (project: ProjectCard) => (
    <div
      key={project.id}
      onClick={() => onSelectProject(project.id)}
      className="group relative bg-ide-panel hover:bg-ide-hover border border-ide-border hover:border-indigo-500/50 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:scale-105 transition">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-white group-hover:text-indigo-300 transition text-base">
              {project.name}
            </h4>
          </div>

          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              project.role === 'owner'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                : project.role === 'editor'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-zinc-700/30 text-zinc-400 border border-zinc-600/30'
            }`}
          >
            {project.role}
          </span>
        </div>

        <p className="text-xs text-zinc-400 line-clamp-2 mt-1 min-h-[32px]">
          {project.description || 'No description provided.'}
        </p>
      </div>

      <div className="mt-4 pt-3.5 border-t border-ide-border/60 flex items-center justify-between">
        {/* Avatars and online presence */}
        <div className="flex items-center space-x-2">
          <div className="flex -space-x-1.5 overflow-hidden">
            {project.memberAvatars?.map((m, idx) => (
              <div
                key={idx}
                title={m.username}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-ide-panel font-bold text-[10px] text-white flex items-center justify-center"
                style={{ backgroundColor: m.avatarColor || '#6366f1' }}
              >
                {m.username.slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>

          {project.onlineCount > 0 && (
            <span className="flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{project.onlineCount} online</span>
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-2">
          {project.role === 'owner' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInvite(project.id, project.name);
              }}
              title="Invite collaborators"
              className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {project.role === 'owner' && (
            <button
              onClick={(e) => handleDelete(e, project.id)}
              title="Delete project"
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="p-1.5 text-zinc-400 group-hover:text-indigo-400 transition">
            <ExternalLink className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Cloud Directory</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-medium px-2 py-0.5 rounded-full border border-indigo-500/30">
              Live View
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Independent workspaces you own and projects shared with you across teams
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition shadow-md shadow-indigo-600/20"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Search & Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex bg-ide-panel p-1 rounded-lg border border-ide-border w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Projects ({mine.length + shared.length})
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'mine' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            My Projects ({mine.length})
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              activeTab === 'shared' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Shared with me ({shared.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-ide-panel border border-ide-border rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500 text-sm">
          Loading your Cloud Directory...
        </div>
      ) : (
        <div className="space-y-8">
          {/* My Projects */}
          {(activeTab === 'all' || activeTab === 'mine') && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">My Projects</h3>
                <span className="text-xs text-zinc-500">({mine.length})</span>
              </div>

              {mine.length === 0 ? (
                <div className="border border-dashed border-ide-border rounded-xl p-8 text-center bg-ide-panel/30">
                  <p className="text-xs text-zinc-400">You haven't created any projects yet.</p>
                  <button
                    onClick={onCreateNew}
                    className="mt-3 text-xs text-indigo-400 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Create your first project</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mine.map(renderCard)}
                </div>
              )}
            </div>
          )}

          {/* Shared with Me */}
          {(activeTab === 'all' || activeTab === 'shared') && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Shared with me</h3>
                <span className="text-xs text-zinc-500">({shared.length})</span>
              </div>

              {shared.length === 0 ? (
                <div className="border border-dashed border-ide-border rounded-xl p-8 text-center bg-ide-panel/30">
                  <p className="text-xs text-zinc-400">
                    No shared projects yet. Projects you are invited to will appear here automatically in real time!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {shared.map(renderCard)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
