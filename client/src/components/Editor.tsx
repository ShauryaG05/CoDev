import React, { useEffect, useRef, useState } from 'react';
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import { useSocket } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';
import { Role } from '../types/index.js';
import { Eye, ShieldAlert, Sparkles, Check, Copy } from 'lucide-react';

interface EditorProps {
  fileId: string;
  filename: string;
  language: string;
  userRole: Role;
  onCursorChange?: (line: number, col: number) => void;
}

interface PeerInfo {
  clientId: number;
  name: string;
  color: string;
}

export const Editor: React.FC<EditorProps> = ({
  fileId,
  filename,
  language,
  userRole,
  onCursorChange,
}) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const editorRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [activePeers, setActivePeers] = useState<PeerInfo[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  const isReadOnly = userRole === 'viewer';

  // Map file language extension to Monaco language
  const getMonacoLanguage = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'js':
      case 'javascript':
        return 'javascript';
      case 'ts':
      case 'typescript':
        return 'typescript';
      case 'py':
      case 'python':
        return 'python';
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'cpp':
      case 'c':
        return 'cpp';
      case 'java':
        return 'java';
      case 'sql':
        return 'sql';
      default:
        return 'plaintext';
    }
  };

  // Setup Yjs, Awareness & Socket listeners for this file
  useEffect(() => {
    if (!socket || !fileId) return;

    // 1. Fresh Y.Doc and Awareness
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const awareness = new Awareness(ydoc);
    awarenessRef.current = awareness;

    // Set local awareness credentials
    if (user) {
      awareness.setLocalStateField('user', {
        name: user.username,
        color: user.avatarColor || '#6366f1',
      });
    }

    // 2. Open file room on the server gateway
    socket.emit('file:open', { fileId });

    // 3. Handle initial sync step from server
    const handleSyncStep = (payload: { fileId: string; update: number[] }) => {
      if (payload.fileId === fileId && payload.update) {
        Y.applyUpdate(ydoc, new Uint8Array(payload.update), 'server-init');
      }
    };

    // 4. Handle incoming Yjs updates from remote peers
    const handleYjsUpdate = (payload: { fileId: string; update: number[] }) => {
      if (payload.fileId === fileId && payload.update) {
        Y.applyUpdate(ydoc, new Uint8Array(payload.update), 'remote-peer');
      }
    };

    // 5. Handle incoming awareness updates (remote cursors & selections)
    const handleAwarenessUpdate = (payload: { fileId: string; update: any }) => {
      if (payload.fileId === fileId && payload.update) {
        try {
          const updateBuffer = Array.isArray(payload.update)
            ? new Uint8Array(payload.update)
            : new Uint8Array(payload.update.data || payload.update);
          applyAwarenessUpdate(awareness, updateBuffer, 'remote');
        } catch (e) {
          // Ignore malformed packet
        }
      }
    };

    socket.on('yjs:sync-step', handleSyncStep);
    socket.on('yjs:update', handleYjsUpdate);
    socket.on('awareness:update', handleAwarenessUpdate);

    // 6. Broadcast local Yjs changes to server
    const handleDocUpdate = (update: Uint8Array, origin: any) => {
      if (origin !== 'remote-peer' && origin !== 'server-init' && !isReadOnly) {
        socket.emit('yjs:update', {
          fileId,
          update: Array.from(update),
        });
      }
    };
    ydoc.on('update', handleDocUpdate);

    // 7. Broadcast local awareness changes to server
    const handleAwarenessChange = ({ added, updated, removed }: any, origin: any) => {
      if (origin === 'local') {
        const changedClients = added.concat(updated).concat(removed);
        const encoded = encodeAwarenessUpdate(awareness, changedClients);
        socket.emit('awareness:update', {
          fileId,
          update: Array.from(encoded),
        });
      }

      // Update peer indicators
      const states = awareness.getStates();
      const peers: PeerInfo[] = [];
      states.forEach((state: any, client: number) => {
        if (client !== awareness.clientID && state?.user) {
          peers.push({
            clientId: client,
            name: state.user.name || 'Anonymous',
            color: state.user.color || '#6366f1',
          });
        }
      });
      setActivePeers(peers);
    };
    awareness.on('update', handleAwarenessChange);

    // Bind to Monaco if already mounted
    if (editorRef.current) {
      bindMonaco(editorRef.current, ydoc, awareness);
    }

    return () => {
      socket.off('yjs:sync-step', handleSyncStep);
      socket.off('yjs:update', handleYjsUpdate);
      socket.off('awareness:update', handleAwarenessUpdate);
      socket.emit('file:close', { fileId });

      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      awareness.destroy();
      awarenessRef.current = null;
      ydoc.destroy();
      ydocRef.current = null;
    };
  }, [fileId, socket, isReadOnly, user]);

  const bindMonaco = (editor: any, ydoc: Y.Doc, awareness: Awareness) => {
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }

    const model = editor.getModel();
    if (!model) return;

    const ytext = ydoc.getText('monaco');
    bindingRef.current = new MonacoBinding(
      ytext,
      model,
      new Set([editor]),
      awareness
    );
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Track cursor line & col
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange(e.position.lineNumber, e.position.column);
      }
    });

    if (ydocRef.current && awarenessRef.current) {
      bindMonaco(editor, ydocRef.current, awarenessRef.current);
    }
  };

  const handleCopyCode = () => {
    if (editorRef.current) {
      const code = editorRef.current.getValue();
      navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0d11] relative select-none">
      {/* File Top Bar */}
      <div className="h-9 px-3.5 bg-ide-sidebar/95 backdrop-blur-sm border-b border-ide-border flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center space-x-2">
          <span className="font-mono text-zinc-300 font-medium">{filename}</span>
          <span className="text-zinc-600">/</span>
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-mono">{language}</span>
          {isReadOnly && (
            <span className="flex items-center space-x-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded ml-2">
              <Eye className="w-3 h-3" />
              <span>Read-Only</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {/* Active Co-Editors List */}
          {activePeers.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-ide-surface px-2 py-0.5 rounded-full border border-ide-border">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex -space-x-1.5">
                {activePeers.map((p) => (
                  <div
                    key={p.clientId}
                    title={`${p.name} (Editing)`}
                    className="w-4 h-4 rounded-full font-bold text-[8px] text-white flex items-center justify-center border border-ide-surface shadow-sm"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-zinc-400">{activePeers.length} active</span>
            </div>
          )}

          <button
            onClick={handleCopyCode}
            title="Copy file contents"
            className="p-1 hover:text-zinc-200 rounded transition flex items-center space-x-1 text-[11px]"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Read-Only Notice for Viewers */}
      {isReadOnly && (
        <div className="bg-amber-950/30 border-b border-amber-800/30 px-3 py-1 flex items-center space-x-2 text-xs text-amber-300">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>You have viewer access. Direct edits are disabled for your account.</span>
        </div>
      )}

      {/* Native Monaco Editor Canvas */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          path={filename}
          language={getMonacoLanguage(language)}
          theme="vs-dark"
          options={{
            readOnly: isReadOnly,
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'Geist Mono', 'Fira Code', 'Courier New', monospace",
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            lineNumbers: 'on',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            padding: { top: 8, bottom: 8 },
            renderLineHighlight: 'all',
            overviewRulerBorder: false,
          }}
          onMount={handleEditorMount}
        />
      </div>
    </div>
  );
};
