import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { Code2, ArrowRight, UserPlus, LogIn, Sparkles } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.post('/auth/register', { username, email, password });
        login(res.data.accessToken, res.data.refreshToken, res.data.user);
      } else {
        const res = await api.post('/auth/login', { identifier: username || email, password });
        login(res.data.accessToken, res.data.refreshToken, res.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (userType: 'alice' | 'bob') => {
    if (userType === 'alice') {
      setUsername('alice');
      setEmail('alice@codev.io');
      setPassword('password123');
    } else {
      setUsername('bob');
      setEmail('bob@codev.io');
      setPassword('password123');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-sm bg-ide-surface border border-ide-border rounded-xl shadow-elevated p-6 sm:p-7">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-2.5 bg-ide-elevated border border-ide-border rounded-xl mb-3 text-indigo-400 shadow-subtle-inner">
            <Code2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight font-mono">CoDev</h2>
          <p className="text-xs text-zinc-400 mt-1">Real-time collaborative code workspace</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-ide-sidebar p-1 rounded-lg border border-ide-border mb-5">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition flex items-center justify-center space-x-1.5 ${
              !isRegister
                ? 'bg-ide-elevated text-zinc-100 shadow-sm border border-ide-border'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition flex items-center justify-center space-x-1.5 ${
              isRegister
                ? 'bg-ide-elevated text-zinc-100 shadow-sm border border-ide-border'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              {isRegister ? 'Username' : 'Username or Email'}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isRegister ? 'e.g. dev_alex' : 'alex or alex@example.com'}
              className="w-full px-3 py-2 bg-ide-sidebar border border-ide-border rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2 bg-ide-sidebar border border-ide-border rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-ide-sidebar border border-ide-border rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-xs transition flex items-center justify-center space-x-1.5 btn-tactile disabled:opacity-50 shadow-sm"
          >
            <span>{loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Demo Fast Autofill */}
        <div className="mt-5 pt-4 border-t border-ide-border/60">
          <div className="flex items-center space-x-1.5 text-[11px] text-zinc-400 mb-2">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="font-medium text-zinc-300">Quick Test Profiles:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemo('alice')}
              className="px-2 py-1.5 bg-ide-sidebar hover:bg-ide-elevated border border-ide-border rounded text-zinc-300 text-left transition btn-tactile text-[11px]"
            >
              Fill <strong>Alice</strong> (User 1)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('bob')}
              className="px-2 py-1.5 bg-ide-sidebar hover:bg-ide-elevated border border-ide-border rounded text-zinc-300 text-left transition btn-tactile text-[11px]"
            >
              Fill <strong>Bob</strong> (User 2)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
