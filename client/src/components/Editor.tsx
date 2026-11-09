import React, { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import * as Y from 'yjs';
import { useSocket } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';
import { Role } from '../types/index.js';
import { Eye, ShieldAlert } from 'lucide-react';

interface EditorProps {
  fileId: string;
  filename: string;
  language: string;
  userRole: Role;
}

interface RemoteCursor {
  userId: string;
  username: string;
  avatarColor: string;
  position: { lineNumber: number; column: number };
}

export const Editor: React.FC<EditorProps> = ({ fileId, filename, language, userRole }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const decorationsRef = useRef<string[]>([]);

  const isReadOnly = userRole === 'viewer';

  // Map file language to monaco language identifier
  const getMonacoLanguage = (lang: string) => {
    switch (lang) {
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
        return 'html';
      case 'css':
        return 'css';
      case 'json':
        return 'json';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'cpp':
        return 'cpp';
      default:
        return 'plaintext';
    }
  };

  useEffect(() => {
    if (!socket || !fileId) return;

    // 1. Initialize fresh Y.Doc for this file
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('monaco');

    // 2. Open file room on socket
    socket.emit('file:open', { fileId });

    // 3. Receive initial state sync step from server
    const handleSyncStep = (payload: { fileId: string; update: number[] }) => {
      if (payload.fileId === fileId && payload.update) {
        isApplyingRemoteRef.current = true;
        Y.applyUpdate(ydoc, new Uint8Array(payload.update));
        if (editorRef.current) {
          const currentVal = editorRef.current.getValue();
          const yval = ytext.toString();
          if (currentVal !== yval) {
            editorRef.current.setValue(yval);
          }
        }
        isApplyingRemoteRef.current = false;
      }
    };

    // 4. Receive incremental updates from peers
    const handleYjsUpdate = (payload: { fileId: string; update: number[] }) => {
      if (payload.fileId === fileId && payload.update) {
        isApplyingRemoteRef.current = true;
        Y.applyUpdate(ydoc, new Uint8Array(payload.update));
        if (editorRef.current) {
          const currentVal = editorRef.current.getValue();
          const yval = ytext.toString();
          if (currentVal !== yval) {
            const pos = editorRef.current.getPosition();
            editorRef.current.setValue(yval);
            if (pos) editorRef.current.setPosition(pos);
          }
        }
        isApplyingRemoteRef.current = false;
      }
    };

    // 5. Receive remote cursor updates
    const handleAwarenessUpdate = (payload: {
      fileId: string;
      userId: string;
      username: string;
      avatarColor: string;
      update: { position: { lineNumber: number; column: number } };
    }) => {
      if (payload.fileId === fileId && payload.userId !== user?.id) {
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          if (payload.update?.position) {
            next.set(payload.userId, {
              userId: payload.userId,
              username: payload.username,
              avatarColor: payload.avatarColor,
              position: payload.update.position,
            });
          }
          return next;
        });
      }
    };

    socket.on('yjs:sync-step', handleSyncStep);
    socket.on('yjs:update', handleYjsUpdate);
    socket.on('awareness:update', handleAwarenessUpdate);

    // 6. Listen to local changes on Y.Doc and broadcast to server
    const onYDocUpdate = (update: Uint8Array, origin: any) => {
      if (origin !== 'remote' && !isReadOnly) {
        socket.emit('yjs:update', {
          fileId,
          update: Array.from(update),
        });
      }
    };

    ydoc.on('update', onYDocUpdate);

    return () => {
      socket.off('yjs:sync-step', handleSyncStep);
      socket.off('yjs:update', handleYjsUpdate);
      socket.off('awareness:update', handleAwarenessUpdate);
      socket.emit('file:close', { fileId });
      ydoc.destroy();
      ydocRef.current = null;
    };
  }, [fileId, socket, isReadOnly]);

  // Update Monaco decorations for remote cursors
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const newDecorations: any[] = [];

    remoteCursors.forEach((cursor) => {
      newDecorations.push({
        range: new monaco.Range(
          cursor.position.lineNumber,
          cursor.position.column,
          cursor.position.lineNumber,
          cursor.position.column
        ),
        options: {
          className: 'remote-caret',
          hoverMessage: { value: `**${cursor.username}**` },
          beforeContentClassName: 'remote-caret-label',
        },
      });
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [remoteCursors]);

  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor movement and broadcast awareness
    editor.onDidChangeCursorPosition((e: any) => {
      if (socket && fileId && user) {
        socket.emit('awareness:update', {
          fileId,
          update: {
            position: {
              lineNumber: e.position.lineNumber,
              column: e.position.column,
            },
          },
        });
      }
    });

    // Set initial value from Y.Doc if loaded
    if (ydocRef.current) {
      const ytext = ydocRef.current.getText('monaco');
      if (ytext.length > 0) {
        editor.setValue(ytext.toString());
      }
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (isApplyingRemoteRef.current || !ydocRef.current || isReadOnly) return;

    const ytext = ydocRef.current.getText('monaco');
    const newText = value || '';

    if (ytext.toString() !== newText) {
      ydocRef.current.transact(() => {
        ytext.delete(0, ytext.length);
        ytext.insert(0, newText);
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] relative">
      {/* Read only notification banner */}
      {isReadOnly && (
        <div className="h-8 bg-amber-500/10 border-b border-amber-500/20 px-4 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center space-x-2">
            <Eye className="w-3.5 h-3.5" />
            <span>You have <strong>Viewer</strong> access. Edits are disabled.</span>
          </div>
          <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded">Read-Only</span>
        </div>
      )}

      {/* Active Remote Collaborator Badges */}
      {remoteCursors.size > 0 && (
        <div className="absolute top-2 right-4 z-20 flex items-center space-x-1.5 bg-ide-panel/80 backdrop-blur border border-ide-border px-2.5 py-1 rounded-full shadow-lg">
          <span className="text-[10px] text-zinc-400 mr-1">Co-editing:</span>
          {Array.from(remoteCursors.values()).map((c) => (
            <div
              key={c.userId}
              className="flex items-center space-x-1 text-[11px] font-medium px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: c.avatarColor }}
            >
              <span>{c.username}</span>
            </div>
          ))}
        </div>
      )}

      {/* Editor Body */}
      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="100%"
          path={filename}
          language={getMonacoLanguage(language)}
          theme="vs-dark"
          options={{
            readOnly: isReadOnly,
            fontSize: 13,
            fontFamily: "'Fira Code', 'Courier New', monospace",
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            smoothScrolling: true,
          }}
          onMount={handleEditorMount}
          onChange={handleEditorChange}
        />
      </div>
    </div>
  );
};
