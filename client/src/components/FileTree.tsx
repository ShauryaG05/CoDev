import React, { useState } from 'react';
import { FileNode, PresenceUser } from '../types/index.js';
import {
  FileCode,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Trash2,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface FileTreeProps {
  nodes: FileNode[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onCreateNode: (name: string, type: 'file' | 'folder', parentId: string | null) => void;
  onDeleteNode: (nodeId: string) => void;
  readOnly?: boolean;
  presenceUsers?: PresenceUser[];
}

export const FileTree: React.FC<FileTreeProps> = ({
  nodes,
  selectedFileId,
  onSelectFile,
  onCreateNode,
  onDeleteNode,
  readOnly = false,
  presenceUsers = [],
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [newNodeName, setNewNodeName] = useState('');

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleStartCreate = (type: 'file' | 'folder', parentId: string | null = null) => {
    setCreatingType(type);
    setCreatingParentId(parentId);
    setNewNodeName('');
    if (parentId) {
      setExpandedFolders((prev) => new Set(prev).add(parentId));
    }
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName.trim() || !creatingType) return;
    onCreateNode(newNodeName.trim(), creatingType, creatingParentId);
    setCreatingType(null);
    setCreatingParentId(null);
    setNewNodeName('');
  };

  // Build tree hierarchy
  const renderTree = (parentId: string | null, depth = 0) => {
    const currentNodes = nodes.filter((n) => n.parentId === parentId);

    // Sort folders first, then files
    currentNodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });

    return (
      <div className="space-y-0.5">
        {currentNodes.map((node) => {
          const isFolder = node.type === 'folder';
          const isExpanded = expandedFolders.has(node.id);
          const isSelected = selectedFileId === node.id;

          // Find users viewing this file
          const viewers = presenceUsers.filter((u) => u.fileId === node.id);

          return (
            <div key={node.id}>
              <div
                onClick={() => {
                  if (isFolder) toggleFolder(node.id);
                  else onSelectFile(node.id);
                }}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer select-none transition ${
                  isSelected
                    ? 'bg-indigo-600/20 text-indigo-200 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-ide-hover'
                }`}
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
              >
                <div className="flex items-center space-x-1.5 truncate">
                  {isFolder ? (
                    <>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      )}
                      {isExpanded ? (
                        <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </>
                  ) : (
                    <>
                      <span className="w-3.5" />
                      <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    </>
                  )}
                  <span className="truncate">{node.name}</span>
                </div>

                <div className="flex items-center space-x-1">
                  {/* Remote viewers indicator */}
                  {viewers.length > 0 && (
                    <div className="flex -space-x-1 mr-1">
                      {viewers.map((v) => (
                        <div
                          key={v.id}
                          title={`${v.username} is viewing this file`}
                          className="w-4 h-4 rounded-full border border-ide-sidebar font-bold text-[8px] text-white flex items-center justify-center shrink-0 shadow-sm"
                          style={{ backgroundColor: v.avatarColor }}
                        >
                          {v.username.slice(0, 1).toUpperCase()}
                        </div>
                      ))}
                    </div>
                  )}

                  {!readOnly && (
                    <div className="hidden group-hover:flex items-center space-x-1">
                      {isFolder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartCreate('file', node.id);
                          }}
                          title="New File inside"
                          className="p-1 hover:text-white"
                        >
                          <FilePlus className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete ${node.name}?`)) onDeleteNode(node.id);
                        }}
                        title="Delete"
                        className="p-1 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Recursive child nodes */}
              {isFolder && isExpanded && renderTree(node.id, depth + 1)}
            </div>
          );
        })}

        {/* Input box for new file/folder under this parent */}
        {creatingType && creatingParentId === parentId && (
          <form
            onSubmit={handleConfirmCreate}
            className="flex items-center px-2 py-1"
            style={{ paddingLeft: `${depth * 14 + 20}px` }}
          >
            {creatingType === 'folder' ? (
              <Folder className="w-3.5 h-3.5 text-amber-400 mr-1.5 shrink-0" />
            ) : (
              <FileCode className="w-3.5 h-3.5 text-indigo-400 mr-1.5 shrink-0" />
            )}
            <input
              type="text"
              autoFocus
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              onBlur={() => setCreatingType(null)}
              placeholder={creatingType === 'folder' ? 'folder-name' : 'filename.js'}
              className="w-full bg-ide-panel border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
            />
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-ide-sidebar border-r border-ide-border select-none">
      {/* File Tree Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-ide-border text-xs font-semibold text-zinc-400">
        <span className="uppercase tracking-wider text-[11px]">Explorer</span>
        {!readOnly && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleStartCreate('file', null)}
              title="New File in Root"
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ide-hover transition"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleStartCreate('folder', null)}
              title="New Folder in Root"
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-ide-hover transition"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Nodes list */}
      <div className="flex-1 overflow-y-auto p-1.5">{renderTree(null, 0)}</div>
    </div>
  );
};
