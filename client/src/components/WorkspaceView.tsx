import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useSocket } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';
import { FileNode, Member, PresenceUser, Role } from '../types/index.js';
import { Navbar } from './Navbar.js';
import { FileTree } from './FileTree.js';
import { Editor } from './Editor.js';
import { MembersList } from './MembersList.js';
import { InviteModal } from './InviteModal.js';
import {
  Users,
  Share2,
  FileCode,
  X,
  Code2,
  ChevronLeft,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface WorkspaceViewProps {
  projectId: string;
  onBackToDirectory: () => void;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({ projectId, onBackToDirectory }) => {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [userRole, setUserRole] = useState<Role>('editor');
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<FileNode[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });
  const [loading, setLoading] = useState(true);

  // 1. Fetch project data & file tree
  const loadWorkspace = async () => {
    try {
      const [projRes, treeRes, membersRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tree`),
        api.get(`/projects/${projectId}/members`),
      ]);

      setProject(projRes.data.project);
      setUserRole(projRes.data.project.role);
      const fetchedNodes: FileNode[] = treeRes.data.nodes || [];
      setNodes(fetchedNodes);
      setMembers(membersRes.data.members || []);

      // Auto-open first file (README or index) if no file currently open
      if (!activeFileId) {
        const firstFile = fetchedNodes.find((n) => n.type === 'file');
        if (firstFile) {
          setOpenFiles([firstFile]);
          setActiveFileId(firstFile.id);
        }
      }
    } catch (err) {
      console.error('Error loading workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, [projectId]);

  // 2. Real-time Project Room Synchronization
  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit('project:join', { projectId }, (res: any) => {
      if (res?.ok && res.role) {
        setUserRole(res.role);
      }
    });

    const handlePresence = ({ users }: { users: PresenceUser[] }) => {
      setPresenceUsers(users || []);
    };

    const handleTreeChanged = ({ op, node }: { op: string; node: any }) => {
      if (op === 'create') {
        setNodes((prev) => [...prev.filter((n) => n.id !== node.id), node]);
      } else if (op === 'rename' || op === 'move') {
        setNodes((prev) => prev.map((n) => (n.id === node.id ? node : n)));
        setOpenFiles((prev) => prev.map((f) => (f.id === node.id ? node : f)));
      } else if (op === 'delete') {
        setNodes((prev) => prev.filter((n) => n.id !== node.id));
        setOpenFiles((prev) => prev.filter((f) => f.id !== node.id));
        setActiveFileId((prev) => (prev === node.id ? null : prev));
      }
    };

    const handleMemberJoined = ({ user: newUser, role }: any) => {
      setMembers((prev) => [
        ...prev.filter((m) => m.userId !== newUser.userId),
        {
          userId: newUser.userId,
          username: newUser.username,
          email: '',
          avatarColor: newUser.avatarColor,
          role,
          joinedAt: new Date().toISOString(),
        },
      ]);
    };

    const handleMemberLeft = ({ userId }: { userId: string }) => {
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    };

    const handleRoleChanged = ({ userId, role }: { userId: string; role: Role }) => {
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } : m)));
      if (user?.id === userId) {
        setUserRole(role);
      }
    };

    socket.on('presence:update', handlePresence);
    socket.on('tree:changed', handleTreeChanged);
    socket.on('member:joined', handleMemberJoined);
    socket.on('member:left', handleMemberLeft);
    socket.on('member:role-changed', handleRoleChanged);

    return () => {
      socket.off('presence:update', handlePresence);
      socket.off('tree:changed', handleTreeChanged);
      socket.off('member:joined', handleMemberJoined);
      socket.off('member:left', handleMemberLeft);
      socket.off('member:role-changed', handleRoleChanged);
      socket.emit('project:leave', { projectId });
    };
  }, [socket, projectId, user]);

  // Tab & File actions
  const handleSelectFile = (fileId: string) => {
    const file = nodes.find((n) => n.id === fileId);
    if (!file || file.type !== 'file') return;

    if (!openFiles.some((f) => f.id === fileId)) {
      setOpenFiles((prev) => [...prev, file]);
    }
    setActiveFileId(fileId);
  };

  const handleCloseTab = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const updatedTabs = openFiles.filter((f) => f.id !== fileId);
    setOpenFiles(updatedTabs);
    if (activeFileId === fileId) {
      setActiveFileId(updatedTabs.length > 0 ? updatedTabs[updatedTabs.length - 1].id : null);
    }
  };

  const handleCreateNode = async (name: string, type: 'file' | 'folder', parentId: string | null) => {
    try {
      const res = await api.post(`/projects/${projectId}/nodes`, {
        name,
        type,
        parentId,
      });
      const createdNode = res.data.node;
      setNodes((prev) => [...prev, createdNode]);
      if (type === 'file') {
        handleSelectFile(createdNode.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create item');
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    try {
      await api.delete(`/projects/${projectId}/nodes/${nodeId}`);
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setOpenFiles((prev) => prev.filter((f) => f.id !== nodeId));
      if (activeFileId === nodeId) setActiveFileId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete node');
    }
  };

  const activeFile = nodes.find((n) => n.id === activeFileId);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-ide-bg text-zinc-400 text-xs font-mono">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-ide-bg overflow-hidden select-none">
      {/* Top Navbar */}
      <Navbar onBackToDirectory={onBackToDirectory} projectName={project?.name} />

      {/* Subheader Toolbar */}
      <div className="h-10 bg-ide-surface/90 border-b border-ide-border px-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-ide-elevated rounded transition btn-tactile"
          >
            {isSidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>

          <span className="text-zinc-700">|</span>

          <button
            onClick={onBackToDirectory}
            className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <span className="text-zinc-700">/</span>

          <span className="font-semibold text-zinc-100 font-mono tracking-tight">{project?.name}</span>

          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              userRole === 'owner'
                ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                : userRole === 'editor'
                ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {userRole}
          </span>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Active online avatars in this project */}
          <div className="flex items-center space-x-1.5 mr-1">
            <div className="flex -space-x-1.5 overflow-hidden">
              {presenceUsers.map((u) => (
                <div
                  key={u.id}
                  title={`${u.username} (Online)`}
                  className="w-5 h-5 rounded-full border border-ide-surface font-bold text-[8px] text-white flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: u.avatarColor || '#6366f1' }}
                >
                  {u.username.slice(0, 1).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">{presenceUsers.length} online</span>
          </div>

          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs transition btn-tactile ${
              showMembers
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-ide-surface border-ide-border text-zinc-400 hover:text-zinc-200 hover:bg-ide-elevated'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members ({members.length})</span>
          </button>

          {userRole === 'owner' && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition btn-tactile shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left File Tree Sidebar */}
        {isSidebarOpen && (
          <div className="w-56 h-full shrink-0 border-r border-ide-border">
            <FileTree
              nodes={nodes}
              selectedFileId={activeFileId}
              onSelectFile={handleSelectFile}
              onCreateNode={handleCreateNode}
              onDeleteNode={handleDeleteNode}
              readOnly={userRole === 'viewer'}
              presenceUsers={presenceUsers}
            />
          </div>
        )}

        {/* Center Editor with Tab Bar */}
        <div className="flex-1 flex flex-col h-full bg-[#0b0d11] overflow-hidden">
          {/* File Tabs */}
          <div className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center overflow-x-auto">
            {openFiles.map((file) => {
              const isActive = activeFileId === file.id;
              return (
                <div
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  className={`group h-full flex items-center space-x-2 px-3 border-r border-ide-border text-xs cursor-pointer transition select-none ${
                    isActive
                      ? 'bg-[#0b0d11] text-zinc-100 border-t-2 border-t-indigo-500 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-ide-surface'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-mono text-[11px]">{file.name}</span>
                  <button
                    onClick={(e) => handleCloseTab(e, file.id)}
                    className="p-0.5 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-200 opacity-60 group-hover:opacity-100 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active File Editor */}
          <div className="flex-1 overflow-hidden">
            {activeFile ? (
              <Editor
                key={activeFile.id}
                fileId={activeFile.id}
                filename={activeFile.name}
                language={activeFile.language || 'javascript'}
                userRole={userRole}
                onCursorChange={(line, col) => setCursorPos({ line, col })}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                <Code2 className="w-10 h-10 text-zinc-700 mb-2" />
                <p>Select a file from the explorer to begin editing</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Drawer: Collaborators Panel */}
        <MembersList
          projectId={projectId}
          members={members}
          presenceUsers={presenceUsers}
          currentRole={userRole}
          isOpen={showMembers}
          onClose={() => setShowMembers(false)}
          onMembersUpdated={loadWorkspace}
        />
      </div>

      {/* Status Bar */}
      <footer className="h-6 bg-ide-sidebar border-t border-ide-border px-3.5 flex items-center justify-between text-[11px] text-zinc-500 font-mono select-none">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>CRDT Sync Active</span>
          </div>
          <span>•</span>
          <span>Role: {userRole}</span>
          <span>•</span>
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span>UTF-8</span>
          <span>•</span>
          <span>Spaces: 2</span>
          <span>•</span>
          <span className="capitalize">{activeFile?.language || 'plaintext'}</span>
        </div>
      </footer>

      {/* Modals */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        projectId={projectId}
        projectName={project?.name || 'Project'}
      />
    </div>
  );
};
