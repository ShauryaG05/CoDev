import React, { useEffect, useState, useMemo } from 'react';
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
  Layers,
  ArrowUpDown,
  Code2,
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
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');

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

    const handleProjectAdded = (payload: { project: any; role: any }) => {
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

    const handleProjectRemoved = ({ projectId }: { projectId: string }) => {
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
    if (confirm('Delete this project? It will be removed for all members.')) {
      try {
        await api.delete(`/projects/${projectId}`);
        setMine((prev) => prev.filter((p) => p.id !== projectId));
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to delete project');
      }
    }
  };

  const getLanguageColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'typescript':
      case 'ts':
        return '#3178c6';
      case 'python':
      case 'py':
        return '#3572A5';
      case 'javascript':
      case 'js':
        return '#f1e05a';
      case 'html':
        return '#e34c26';
      case 'css':
        return '#563d7c';
      case 'markdown':
        return '#083fa1';
      default:
        return '#8b949e';
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  // Sort projects
  const sortList = (list: ProjectCard[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  };

  const sortedMine = useMemo(() => sortList(mine), [mine, sortBy]);
  const sortedShared = useMemo(() => sortList(shared), [shared, sortBy]);

  const totalProjects = mine.length + shared.length;

  const renderCard = (project: ProjectCard) => (
    <div
      key={project.id}
      onClick={() => onSelectProject(project.id)}
      className="group relative bg-ide-surface hover:bg-ide-panel border border-ide-border hover:border-indigo-500/40 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between shadow-subtle-inner hover:shadow-elevated"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-ide-elevated text-zinc-300 rounded-lg group-hover:text-indigo-400 group-hover:bg-indigo-500/10 border border-ide-border transition">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-zinc-100 group-hover:text-white transition text-sm tracking-tight">
              {project.name}
            </h4>
          </div>

          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              project.role === 'owner'
                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                : project.role === 'editor'
                ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {project.role}
          </span>
        </div>

        <p className="text-xs text-zinc-400 line-clamp-2 mt-1 min-h-[32px] leading-relaxed">
          {project.description || 'No description provided.'}
        </p>

        {/* Language and timing tag */}
        <div className="flex items-center space-x-2.5 mt-3 text-[11px] text-zinc-500">
          <span className="flex items-center space-x-1.5 font-mono">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getLanguageColor(project.defaultLanguage) }}
            />
            <span className="capitalize text-zinc-300">{project.defaultLanguage}</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1 text-zinc-400">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span>{formatRelativeTime(project.updatedAt)}</span>
          </span>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-ide-border/60 flex items-center justify-between">
        {/* Avatars and online presence */}
        <div className="flex items-center space-x-2">
          {project.memberAvatars && project.memberAvatars.length > 0 ? (
            <div className="flex -space-x-1.5 overflow-hidden">
              {project.memberAvatars.map((m, idx) => (
                <div
                  key={idx}
                  title={m.username}
                  className="w-5 h-5 rounded-full ring-2 ring-ide-surface font-bold text-[9px] text-white flex items-center justify-center shrink-0 shadow-sm"
                  style={{ backgroundColor: m.avatarColor || '#6366f1' }}
                >
                  {m.username.slice(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-zinc-500">Solo workspace</span>
          )}

          {project.onlineCount > 0 && (
            <span className="flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{project.onlineCount} online</span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1">
          {project.role === 'owner' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInvite(project.id, project.name);
              }}
              title="Invite collaborators"
              className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-ide-elevated rounded-md transition btn-tactile"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          {project.role === 'owner' && (
            <button
              onClick={(e) => handleDelete(e, project.id)}
              title="Delete project"
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-ide-elevated rounded-md transition btn-tactile"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="p-1.5 text-zinc-500 group-hover:text-indigo-400 transition">
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-white tracking-tight">Cloud Directory</h1>
            <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Live Sync
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-[60ch]">
            Independent project workspaces and collaborative directories
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="flex items-center justify-center space-x-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition btn-tactile shadow-md shadow-indigo-600/20"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="flex bg-ide-surface p-1 rounded-lg border border-ide-border w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'all'
                ? 'bg-ide-elevated text-zinc-100 shadow-sm border border-ide-border'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({totalProjects})
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'mine'
                ? 'bg-ide-elevated text-zinc-100 shadow-sm border border-ide-border'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            My Projects ({mine.length})
          </button>
          <button
            onClick={() => setActiveTab('shared')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'shared'
                ? 'bg-ide-elevated text-zinc-100 shadow-sm border border-ide-border'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Shared with me ({shared.length})
          </button>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-8 pr-3 py-1.5 bg-ide-surface border border-ide-border rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <button
            onClick={() => setSortBy(sortBy === 'recent' ? 'name' : 'recent')}
            title={`Sorting by: ${sortBy === 'recent' ? 'Most Recent' : 'Name'}`}
            className="p-2 bg-ide-surface hover:bg-ide-panel border border-ide-border rounded-lg text-zinc-400 hover:text-zinc-200 transition btn-tactile"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-ide-surface/50 border border-ide-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* My Projects */}
          {(activeTab === 'all' || activeTab === 'mine') && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">My Projects</h2>
                <span className="text-[11px] text-zinc-600 font-mono">({sortedMine.length})</span>
              </div>

              {sortedMine.length === 0 ? (
                <div className="border border-dashed border-ide-border rounded-xl p-8 text-center bg-ide-surface/30">
                  <p className="text-xs text-zinc-400">No owned workspaces found.</p>
                  <button
                    onClick={onCreateNew}
                    className="mt-2 text-xs text-indigo-400 hover:underline font-medium"
                  >
                    Create a new project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedMine.map(renderCard)}
                </div>
              )}
            </div>
          )}

          {/* Shared with Me */}
          {(activeTab === 'all' || activeTab === 'shared') && (
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Shared with me</h2>
                <span className="text-[11px] text-zinc-600 font-mono">({sortedShared.length})</span>
              </div>

              {sortedShared.length === 0 ? (
                <div className="border border-dashed border-ide-border rounded-xl p-8 text-center bg-ide-surface/30">
                  <p className="text-xs text-zinc-400">
                    No shared projects yet. Workspaces you are invited to will appear here live.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedShared.map(renderCard)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
