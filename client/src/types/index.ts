export interface User {
  id: string;
  email: string;
  username: string;
  avatarColor: string;
}

export type Role = 'owner' | 'editor' | 'viewer';

export interface ProjectCard {
  id: string;
  name: string;
  description: string;
  defaultLanguage: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  memberAvatars: Array<{ username: string; avatarColor: string }>;
  onlineCount: number;
}

export interface FileNode {
  id: string;
  projectId: string;
  parentId: string | null;
  type: 'file' | 'folder';
  name: string;
  language?: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  userId: string;
  username: string;
  email: string;
  avatarColor: string;
  role: Role;
  joinedAt: string;
}

export interface PresenceUser {
  id: string;
  username: string;
  avatarColor: string;
  fileId?: string | null;
  lastActive: number;
}
