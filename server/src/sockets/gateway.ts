import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, UserTokenPayload } from '../utils/tokens.js';
import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';
import { docManager } from '../services/docManager.js';
import { ENV } from '../config/env.js';

export interface PresenceUser {
  id: string;
  username: string;
  avatarColor: string;
  fileId?: string | null;
  lastActive: number;
}

export class RealtimeGateway {
  private io: SocketIOServer;
  // Map of projectId -> Map<socketId, PresenceUser>
  private projectPresence: Map<string, Map<string, PresenceUser>> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupAuthMiddleware();
    this.setupConnectionHandlers();
  }

  private setupAuthMiddleware(): void {
    this.io.use((socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          (socket.handshake.headers.authorization?.startsWith('Bearer ')
            ? socket.handshake.headers.authorization.split(' ')[1]
            : null);

        if (!token) {
          return next(new Error('Authentication failed: Missing token in socket handshake'));
        }

        const decoded = verifyAccessToken(token);
        socket.data.user = decoded;
        next();
      } catch (err: any) {
        next(new Error(`Authentication failed: ${err.message}`));
      }
    });
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', async (socket: Socket) => {
      const user: UserTokenPayload = socket.data.user;
      if (!user) {
        socket.disconnect();
        return;
      }

      // Fetch user profile for avatar color
      let avatarColor = '#6366f1';
      try {
        const dbUser = await User.findById(user.id).select('avatarColor');
        if (dbUser?.avatarColor) avatarColor = dbUser.avatarColor;
      } catch (e) {
        // Fallback default
      }

      // Auto-join personal user room for targeted notifications
      const userRoom = `user:${user.id}`;
      socket.join(userRoom);

      // Track active joined project
      let currentProjectId: string | null = null;
      let currentFileId: string | null = null;

      // -------------------------------------------------------------
      // Project Room Management
      // -------------------------------------------------------------
      socket.on('project:join', async ({ projectId }: { projectId: string }, ack?: (res: any) => void) => {
        try {
          const membership = await Membership.findOne({ projectId, userId: user.id });
          if (!membership) {
            socket.emit('error:permission', { code: 'NOT_A_MEMBER', message: 'Not authorized for this project.' });
            if (ack) ack({ ok: false, error: 'Not authorized' });
            return;
          }

          currentProjectId = projectId;
          socket.join(`project:${projectId}`);

          // Register in presence
          if (!this.projectPresence.has(projectId)) {
            this.projectPresence.set(projectId, new Map());
          }
          const presenceMap = this.projectPresence.get(projectId)!;
          presenceMap.set(socket.id, {
            id: user.id,
            username: user.username,
            avatarColor,
            fileId: null,
            lastActive: Date.now(),
          });

          this.broadcastPresence(projectId);

          if (ack) {
            ack({
              ok: true,
              role: membership.role,
              activeUsers: Array.from(presenceMap.values()),
            });
          }
        } catch (err: any) {
          if (ack) ack({ ok: false, error: err.message });
        }
      });

      socket.on('project:leave', ({ projectId }: { projectId: string }) => {
        socket.leave(`project:${projectId}`);
        const presenceMap = this.projectPresence.get(projectId);
        if (presenceMap) {
          presenceMap.delete(socket.id);
          this.broadcastPresence(projectId);
        }
        if (currentProjectId === projectId) currentProjectId = null;
      });

      // -------------------------------------------------------------
      // File Room Management & Collaborative Yjs Editing
      // -------------------------------------------------------------
      socket.on('file:open', async ({ fileId }: { fileId: string }, ack?: (res: any) => void) => {
        try {
          if (!currentProjectId) {
            if (ack) ack({ ok: false, error: 'Must join project first' });
            return;
          }

          // Leave previous file if any
          if (currentFileId && currentFileId !== fileId) {
            socket.leave(`file:${currentFileId}`);
            docManager.releaseDoc(currentFileId);
          }

          currentFileId = fileId;
          socket.join(`file:${fileId}`);

          // Update open file in presence
          const presenceMap = this.projectPresence.get(currentProjectId);
          if (presenceMap && presenceMap.has(socket.id)) {
            presenceMap.get(socket.id)!.fileId = fileId;
            this.broadcastPresence(currentProjectId);
          }

          // Retrieve or load Y.Doc
          const ydoc = await docManager.getOrCreateDoc(fileId, currentProjectId);
          const fullState = docManager.encodeFullState(ydoc);

          // Send initial sync step to this client
          socket.emit('yjs:sync-step', {
            fileId,
            update: Array.from(fullState),
          });

          if (ack) ack({ ok: true, fileId });
        } catch (err: any) {
          console.error('[Socket file:open Error]', err);
          if (ack) ack({ ok: false, error: err.message });
        }
      });

      socket.on('file:close', ({ fileId }: { fileId: string }) => {
        if (currentFileId === fileId) {
          socket.leave(`file:${fileId}`);
          docManager.releaseDoc(fileId);
          currentFileId = null;

          if (currentProjectId) {
            const presenceMap = this.projectPresence.get(currentProjectId);
            if (presenceMap && presenceMap.has(socket.id)) {
              presenceMap.get(socket.id)!.fileId = null;
              this.broadcastPresence(currentProjectId);
            }
          }
        }
      });

      // Relay Yjs update
      socket.on(
        'yjs:update',
        async ({ fileId, update }: { fileId: string; update: number[] | Uint8Array }) => {
          try {
            if (!currentProjectId) return;

            // Enforce role check: viewers are read-only
            const membership = await Membership.findOne({ projectId: currentProjectId, userId: user.id });
            if (!membership || membership.role === 'viewer') {
              socket.emit('error:permission', {
                code: 'READ_ONLY',
                message: 'Viewers cannot edit code.',
              });
              return;
            }

            const updateArray = update instanceof Uint8Array ? update : new Uint8Array(update);
            if (updateArray.byteLength > ENV.MAX_FILE_BYTES) {
              socket.emit('error:permission', {
                code: 'OVERSIZED_UPDATE',
                message: 'Edit payload exceeds permitted limit.',
              });
              return;
            }

            // Apply to server doc for persistence
            await docManager.applyClientUpdate(fileId, updateArray, currentProjectId);

            // Broadcast to other peers editing the same file
            socket.to(`file:${fileId}`).emit('yjs:update', {
              fileId,
              update: Array.from(updateArray),
            });
          } catch (err) {
            console.error('[Socket yjs:update Error]', err);
          }
        }
      );

      // Relay cursor / awareness update (ephemeral, not persisted)
      socket.on('awareness:update', ({ fileId, update }: { fileId: string; update: any }) => {
        socket.to(`file:${fileId}`).emit('awareness:update', {
          fileId,
          userId: user.id,
          username: user.username,
          avatarColor,
          update,
        });
      });

      // -------------------------------------------------------------
      // Disconnect
      // -------------------------------------------------------------
      socket.on('disconnect', () => {
        if (currentFileId) {
          docManager.releaseDoc(currentFileId);
        }
        if (currentProjectId) {
          const presenceMap = this.projectPresence.get(currentProjectId);
          if (presenceMap) {
            presenceMap.delete(socket.id);
            if (presenceMap.size === 0) {
              this.projectPresence.delete(currentProjectId);
            } else {
              this.broadcastPresence(currentProjectId);
            }
          }
        }
      });
    });
  }

  private broadcastPresence(projectId: string): void {
    const presenceMap = this.projectPresence.get(projectId);
    const users = presenceMap ? Array.from(presenceMap.values()) : [];
    this.io.to(`project:${projectId}`).emit('presence:update', { users });
  }

  // Helper push emitters used by REST controllers
  public emitDirectoryProjectAdded(userId: string, project: any, role: string): void {
    this.io.to(`user:${userId}`).emit('directory:project-added', { project, role });
  }

  public emitDirectoryProjectRemoved(userId: string, projectId: string): void {
    this.io.to(`user:${userId}`).emit('directory:project-removed', { projectId });
  }

  public emitMemberJoined(projectId: string, user: any, role: string): void {
    this.io.to(`project:${projectId}`).emit('member:joined', { user, role });
  }

  public emitMemberLeft(projectId: string, userId: string): void {
    this.io.to(`project:${projectId}`).emit('member:left', { userId });
  }

  public emitMemberRoleChanged(projectId: string, userId: string, role: string): void {
    this.io.to(`project:${projectId}`).emit('member:role-changed', { userId, role });
  }

  public emitTreeChanged(projectId: string, op: 'create' | 'rename' | 'move' | 'delete', node: any): void {
    this.io.to(`project:${projectId}`).emit('tree:changed', { op, node });
  }

  public getOnlineCountForProject(projectId: string): number {
    const map = this.projectPresence.get(projectId);
    if (!map) return 0;
    // Deduplicate distinct user IDs
    const userIds = new Set(Array.from(map.values()).map((u) => u.id));
    return userIds.size;
  }
}

let gatewayInstance: RealtimeGateway | null = null;

export function initRealtimeGateway(io: SocketIOServer): RealtimeGateway {
  gatewayInstance = new RealtimeGateway(io);
  return gatewayInstance;
}

export function getRealtimeGateway(): RealtimeGateway | null {
  return gatewayInstance;
}
