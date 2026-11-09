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

      // Auto-open first file (e.g. README or index)
      const firstFile = fetchedNodes.find((n) => n.type === 'file');
      if (firstFile) {
        setOpenFiles([firstFile]);
        setActiveFileId(firstFile.id);
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
      console.log('[Socket tree:changed]', op, node);
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

    const handleMemberJoined = ({ user, role }: any) => {
      console.log('[Socket member:joined]', user, role);
      setMembers((prev) => [
        ...prev.filter((m) => m.userId !== user.userId),
        {
          userId: user.userId,
          username: user.username,
          email: '',
          avatarColor: user.avatarColor,
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
      // If current user's role changed, update local permissions immediately
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
  }, [socket, projectId]);

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
      <div className="h-screen flex items-center justify-center bg-ide-sidebar text-zinc-400 text-sm">
        Opening project workspace...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-ide-sidebar overflow-hidden">
      {/* Top Navigation */}
      <Navbar onBackToDirectory={onBackToDirectory} projectName={project?.name} />

      {/* Subheader Toolbar */}
      <div className="h-10 bg-ide-panel/80 border-b border-ide-border px-4 flex items-center justify-between text-xs select-none">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToDirectory}
            className="flex items-center space-x-1 text-zinc-400 hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </button>
          <span className="text-zinc-600">|</span>
          <span className="font-semibold text-zinc-200">{project?.name}</span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
              userRole === 'owner'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                : userRole === 'editor'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-zinc-700/30 text-zinc-400'
            }`}
          >
            {userRole}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Active online avatars in this project */}
          <div className="flex items-center space-x-1.5 mr-2">
            <div className="flex -space-x-1.5 overflow-hidden">
              {presenceUsers.map((u) => (
                <div
                  key={u.id}
                  title={`${u.username} (Online)`}
                  className="w-6 h-6 rounded-full border-2 border-ide-panel font-bold text-[9px] text-white flex items-center justify-center shadow"
                  style={{ backgroundColor: u.avatarColor || '#6366f1' }}
                >
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-[11px] text-zinc-400">{presenceUsers.length} online</span>
          </div>

          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border text-xs transition ${
              showMembers
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                : 'bg-ide-sidebar border-ide-border text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members ({members.length})</span>
          </button>

          {userRole === 'owner' && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Tree Explorer (Left) */}
        <div className="w-60 h-full shrink-0">
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

        {/* Center Editor & Tabs Area */}
        <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] overflow-hidden">
          {/* Open File Tabs */}
          <div className="h-9 bg-ide-sidebar border-b border-ide-border flex items-center overflow-x-auto select-none">
            {openFiles.map((file) => {
              const isActive = activeFileId === file.id;
              return (
                <div
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  className={`group h-full flex items-center space-x-2 px-3 border-r border-ide-border text-xs cursor-pointer transition ${
                    isActive
                      ? 'bg-[#1e1e1e] text-indigo-300 border-t-2 border-t-indigo-500 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-ide-hover'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{file.name}</span>
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
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                <Code2 className="w-12 h-12 text-zinc-600 mb-3" />
                <p>Select a file from the explorer to begin collaborative editing</p>
              </div>
            )}
          </div>
        </div>

        {/* Members Sidebar (Right Drawer) */}
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

      {/* Bottom Status Bar */}
      <footer className="h-6 bg-indigo-950/60 border-t border-ide-border px-3 flex items-center justify-between text-[11px] text-zinc-400 select-none">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>CRDT Convergence Active (Yjs)</span>
          </div>
          <span>•</span>
          <span>Role: {userRole}</span>
          <span>•</span>
          <span>Language: {activeFile?.language || 'plaintext'}</span>
        </div>

        <div className="flex items-center space-x-3">
          <span>UTF-8</span>
          <span>•</span>
          <span>Tab Size: 2</span>
        </div>
      </footer>

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        projectId={projectId}
        projectName={project?.name || 'Project'}
      />
    </div>
  );
};
