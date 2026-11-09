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
    <header className="h-14 border-b border-ide-border bg-ide-sidebar px-4 flex items-center justify-between select-none">
      <div className="flex items-center space-x-3">
        <button
          onClick={onBackToDirectory}
          className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 transition"
        >
          <div className="p-1.5 bg-indigo-500/10 rounded-md border border-indigo-500/20">
            <Code2 className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">CoDev</span>
        </button>

        {projectName && (
          <div className="flex items-center space-x-2 text-sm text-zinc-400">
            <span>/</span>
            <span className="font-semibold text-zinc-200">{projectName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* Connection status badge */}
        <div
          className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border transition ${
            connected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}
          title={connected ? 'Connected to Realtime Gateway' : 'Connecting to Realtime Gateway...'}
        >
          {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
          <span className="font-medium">{connected ? 'Live Sync' : 'Reconnecting...'}</span>
        </div>

        {/* User profile */}
        {user && (
          <div className="flex items-center space-x-3 pl-2 border-l border-ide-border">
            <div className="flex items-center space-x-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm"
                style={{ backgroundColor: user.avatarColor || '#6366f1' }}
              >
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-zinc-300">{user.username}</span>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
