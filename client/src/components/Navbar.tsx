import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import {
  Code2,
  FolderGit2,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Users,
  ChevronDown,
} from 'lucide-react';
import {
  Avatar,
  MenuDivider,
  MenuItem,
  Popover,
  cn,
  controlBase,
  ghostControl,
} from './NavPrimitives.js';

export interface NavbarProps {
  onBackToDirectory?: () => void;
  projectName?: string;
  userRole?: string;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  presenceUsers?: Array<{ id: string; username: string; avatarColor?: string }>;
  showMembers?: boolean;
  onToggleMembers?: () => void;
  memberCount?: number;
  onInvite?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onBackToDirectory,
  projectName,
  userRole,
  isSidebarOpen,
  onToggleSidebar,
  presenceUsers = [],
  showMembers,
  onToggleMembers,
  memberCount,
  onInvite,
}) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="h-14 border-b border-ide-border bg-ide-sidebar/95 px-3 sm:px-4 flex items-center justify-between select-none backdrop-blur z-30">
      {/* Left: Brand + Navigation + Project Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onBackToDirectory}
          title="Return to Dashboard"
          aria-label="Back to dashboard"
          className="flex h-9 items-center gap-2 rounded-[10px] px-2 transition-[background-color,transform] duration-150 active:scale-[0.96] hover:bg-white/5"
        >
          <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 p-1.5">
            <Code2 className="h-4 w-4 text-indigo-400" />
          </span>
          <span className="font-mono text-sm font-bold tracking-tight text-zinc-100 hidden sm:inline">
            CoDev
          </span>
        </button>

        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className={cn(ghostControl, 'h-8 w-8 p-0 justify-center text-zinc-400 hover:text-zinc-100')}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
        )}

        {projectName && (
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="text-zinc-600">/</span>
            <span className="font-mono font-medium text-zinc-200 truncate max-w-[120px] sm:max-w-[220px]">
              {projectName}
            </span>
            {userRole && (
              <span
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider font-sans shrink-0',
                  userRole === 'owner'
                    ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                    : userRole === 'editor'
                    ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                )}
              >
                {userRole}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions, Collaboration, Gateway Status, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Presence Avatars */}
        {presenceUsers && presenceUsers.length > 0 && (
          <div className="flex items-center gap-1.5 pl-1">
            <div className="flex -space-x-2 overflow-hidden">
              {presenceUsers.map((u) => (
                <Avatar
                  key={u.id}
                  user={u}
                  size="sm"
                  presence="live"
                  stacked
                />
              ))}
            </div>
            <span className="hidden font-mono text-[11px] text-zinc-400 lg:inline">
              {presenceUsers.length} online
            </span>
          </div>
        )}

        {/* Members Toggle */}
        {onToggleMembers && (
          <button
            type="button"
            onClick={onToggleMembers}
            className={cn(
              controlBase,
              'h-8 px-2.5 text-xs',
              showMembers
                ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300'
                : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Members</span>
            {memberCount !== undefined && <span className="font-mono text-[11px]">({memberCount})</span>}
          </button>
        )}

        {/* Invite Button */}
        {onInvite && userRole === 'owner' && (
          <button
            type="button"
            onClick={onInvite}
            className={cn(
              controlBase,
              'h-8 bg-indigo-500 px-3 text-xs font-medium text-white hover:bg-indigo-400'
            )}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>
        )}

        {/* Realtime Gateway Status Badge */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors',
            connected
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
          )}
          title={connected ? 'Connected to Realtime Gateway' : 'Connecting to Realtime Gateway...'}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              connected ? 'bg-emerald-400' : 'animate-pulse bg-amber-400'
            )}
          />
          <span className="hidden md:inline">{connected ? 'Sync Online' : 'Connecting...'}</span>
        </div>

        {/* User Profile Popover */}
        {user && (
          <Popover
            label="Account"
            align="right"
            widthClass="w-60"
            trigger={({ open, toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-haspopup="true"
                aria-label="Account"
                className={cn(ghostControl, 'h-9 px-1.5 gap-2')}
              >
                <Avatar user={user} size="sm" />
                <span className="hidden max-w-[90px] truncate text-xs font-medium text-zinc-300 md:inline">
                  {user.username}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-zinc-500 transition-transform duration-200',
                    open && 'rotate-180'
                  )}
                />
              </button>
            )}
          >
            {({ close }) => (
              <>
                <div className="flex items-center gap-2.5 px-2.5 py-2">
                  <Avatar user={user} size="md" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-zinc-200">{user.username}</span>
                    <span className="block truncate text-[11px] text-zinc-500">{user.email || 'Member'}</span>
                  </div>
                </div>
                <MenuDivider />
                {onBackToDirectory && (
                  <MenuItem
                    icon={<FolderGit2 className="h-4 w-4" />}
                    title="All Projects"
                    hint="Return to dashboard"
                    onClick={() => {
                      close();
                      onBackToDirectory();
                    }}
                  />
                )}
                <MenuItem
                  icon={<LogOut className="h-4 w-4" />}
                  title="Sign out"
                  danger
                  onClick={() => {
                    close();
                    logout();
                  }}
                />
              </>
            )}
          </Popover>
        )}
      </div>
    </header>
  );
};

export const IdeNavbar = Navbar;
