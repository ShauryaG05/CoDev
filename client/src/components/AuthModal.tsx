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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-ide-panel border border-ide-border rounded-xl shadow-2xl p-6 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-3 text-indigo-400">
            <Code2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">CoDev</h2>
          <p className="text-sm text-zinc-400 mt-1">Real-time pair programming & independent cloud directories</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-ide-sidebar p-1 rounded-lg border border-ide-border mb-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition flex items-center justify-center space-x-1.5 ${
              !isRegister ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
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
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition flex items-center justify-center space-x-1.5 ${
              isRegister ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create Account</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              {isRegister ? 'Username' : 'Username or Email'}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isRegister ? 'e.g. dev_sarah' : 'sarah or sarah@example.com'}
              className="w-full px-3.5 py-2 bg-ide-sidebar border border-ide-border rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3.5 py-2 bg-ide-sidebar border border-ide-border rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2 bg-ide-sidebar border border-ide-border rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Fast Autofill */}
        <div className="mt-6 pt-5 border-t border-ide-border/60">
          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-zinc-300">Quick Test Credentials:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemo('alice')}
              className="px-2.5 py-1.5 bg-ide-sidebar hover:bg-ide-hover border border-ide-border rounded text-zinc-300 text-left transition"
            >
              Fill <strong>Alice</strong> (User 1)
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('bob')}
              className="px-2.5 py-1.5 bg-ide-sidebar hover:bg-ide-hover border border-ide-border rounded text-zinc-300 text-left transition"
            >
              Fill <strong>Bob</strong> (User 2)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
