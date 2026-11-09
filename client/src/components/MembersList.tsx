import React from 'react';
import { Member, PresenceUser, Role } from '../types/index.js';
import { Users, Shield, Trash2, X } from 'lucide-react';
import { api } from '../services/api.js';

interface MembersListProps {
  projectId: string;
  members: Member[];
  presenceUsers: PresenceUser[];
  currentRole: Role;
  isOpen: boolean;
  onClose: () => void;
  onMembersUpdated: () => void;
}

export const MembersList: React.FC<MembersListProps> = ({
  projectId,
  members,
  presenceUsers,
  currentRole,
  isOpen,
  onClose,
  onMembersUpdated,
}) => {
  if (!isOpen) return null;

  const isOwner = currentRole === 'owner';

  // Check which members are currently online
  const onlineUserIds = new Set(presenceUsers.map((u) => u.id));

  const handleChangeRole = async (userId: string, newRole: Role) => {
    try {
      await api.patch(`/projects/${projectId}/members/${userId}`, { role: newRole });
      onMembersUpdated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (userId: string, username: string) => {
    if (confirm(`Remove ${username} from this project?`)) {
      try {
        await api.delete(`/projects/${projectId}/members/${userId}`);
        onMembersUpdated();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Failed to remove member');
      }
    }
  };

  return (
    <div className="w-72 bg-ide-sidebar border-l border-ide-border flex flex-col h-full select-none">
      <div className="h-9 px-3 flex items-center justify-between border-b border-ide-border text-xs font-semibold text-zinc-400">
        <div className="flex items-center space-x-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span className="uppercase tracking-wider text-[11px]">Collaborators ({members.length})</span>
        </div>
        <button onClick={onClose} className="p-1 hover:text-white rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {members.map((member) => {
          const isOnline = onlineUserIds.has(member.userId);

          return (
            <div
              key={member.userId}
              className="p-2 rounded-lg bg-ide-panel/40 border border-ide-border/50 hover:bg-ide-panel transition flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <div
                      className="w-7 h-7 rounded-full text-[11px] font-bold text-white flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: member.avatarColor || '#6366f1' }}
                    >
                      {member.username.slice(0, 2).toUpperCase()}
                    </div>
                    {/* Online indicator dot */}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-ide-sidebar ${
                        isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-zinc-200 flex items-center space-x-1">
                      <span>{member.username}</span>
                      {isOnline && <span className="text-[10px] text-emerald-400 font-normal">(online)</span>}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate max-w-[120px]">{member.email}</div>
                  </div>
                </div>

                {isOwner && member.role !== 'owner' ? (
                  <div className="flex items-center space-x-1">
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.userId, e.target.value as Role)}
                      className="text-[10px] bg-ide-sidebar border border-ide-border text-zinc-300 rounded px-1.5 py-0.5 focus:outline-none"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>

                    <button
                      onClick={() => handleRemoveMember(member.userId, member.username)}
                      title="Remove member"
                      className="p-1 text-zinc-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                      member.role === 'owner'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : member.role === 'editor'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-zinc-700/30 text-zinc-400'
                    }`}
                  >
                    {member.role}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
