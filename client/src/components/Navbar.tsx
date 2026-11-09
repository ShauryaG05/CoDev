import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useSocket } from '../context/SocketContext.js';
import { Code2, LogOut, Wifi, WifiOff } from 'lucide-react';

interface NavbarProps {
  onBackToDirectory?: () => void;
  projectName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onBackToDirectory, projectName }) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="h-13 border-b border-ide-border bg-ide-sidebar px-4 flex items-center justify-between select-none shadow-subtle-inner">
      <div className="flex items-center space-x-3">
        <button
          onClick={onBackToDirectory}
          className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 transition btn-tactile"
        >
          <div className="p-1.5 bg-indigo-500/10 rounded-md border border-indigo-500/20">
            <Code2 className="w-4 h-4 text-indigo-400" />
          </div>
          <span className="font-bold text-sm text-zinc-100 tracking-tight font-mono">CoDev</span>
        </button>

        {projectName && (
          <div className="flex items-center space-x-2 text-xs text-zinc-500">
            <span>/</span>
            <span className="font-mono text-zinc-300">{projectName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3.5">
        {/* Connection status badge */}
        <div
          className={`flex items-center space-x-1.5 text-[11px] px-2.5 py-1 rounded-full border transition font-mono ${
            connected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}
          title={connected ? 'Connected to Realtime Gateway' : 'Connecting to Realtime Gateway...'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span>{connected ? 'Sync Online' : 'Connecting...'}</span>
        </div>

        {/* User Profile */}
        {user && (
          <div className="flex items-center space-x-2.5 pl-3 border-l border-ide-border">
            <div className="flex items-center space-x-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shadow-sm"
                style={{ backgroundColor: user.avatarColor || '#6366f1' }}
              >
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-zinc-300 hidden sm:inline">{user.username}</span>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition btn-tactile"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
