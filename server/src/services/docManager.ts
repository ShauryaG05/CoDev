import * as Y from 'yjs';
import { Node } from '../models/Node.js';
import { YSnapshot } from '../models/YSnapshot.js';
import { YUpdate } from '../models/YUpdate.js';
import { ENV } from '../config/env.js';
import mongoose from 'mongoose';

interface LiveDocEntry {
  ydoc: Y.Doc;
  refCount: number;
  dirty: boolean;
  saveTimer: NodeJS.Timeout | null;
  lastPersistedSeq: number;
  projectId: string;
}

class DocManager {
  private docs: Map<string, LiveDocEntry> = new Map();

  /**
   * Retrieves an active Y.Doc or loads it from DB snapshots + updates
   */
  async getOrCreateDoc(fileId: string, projectId: string): Promise<Y.Doc> {
    const existing = this.docs.get(fileId);
    if (existing) {
      existing.refCount++;
      return existing.ydoc;
    }

    const ydoc = new Y.Doc();
    let highestSeq = 0;

    try {
      // 1. Try loading latest snapshot
      if (mongoose.Types.ObjectId.isValid(fileId)) {
        const snapshot = await YSnapshot.findOne({ fileId }).sort({ createdAt: -1 });
        if (snapshot && snapshot.state) {
          Y.applyUpdate(ydoc, new Uint8Array(snapshot.state));
          highestSeq = snapshot.upToSeq || 0;
        }

        // 2. Apply any updates since the snapshot
        const updates = await YUpdate.find({ fileId, seq: { $gt: highestSeq } }).sort({ seq: 1 });
        for (const u of updates) {
          if (u.update) {
            Y.applyUpdate(ydoc, new Uint8Array(u.update));
            if (u.seq > highestSeq) highestSeq = u.seq;
          }
        }

        // 3. If doc is empty and snapshot didn't exist, seed with initial Node.content if any
        const ytext = ydoc.getText('monaco');
        if (ytext.length === 0 && !snapshot && updates.length === 0) {
          const fileNode = await Node.findById(fileId);
          if (fileNode && fileNode.content) {
            ydoc.transact(() => {
              ytext.insert(0, fileNode.content || '');
            });
          }
        }
      }
    } catch (err: any) {
      console.error(`[DocManager] Error loading doc for file ${fileId}:`, err);
    }

    const entry: LiveDocEntry = {
      ydoc,
      refCount: 1,
      dirty: false,
      saveTimer: null,
      lastPersistedSeq: highestSeq,
      projectId,
    };

    this.docs.set(fileId, entry);
    return ydoc;
  }

  /**
   * Applies an incremental update from a client, marks dirty, and schedules debounced persist
   */
  async applyClientUpdate(fileId: string, updateBuffer: Uint8Array, projectId: string): Promise<void> {
    let entry = this.docs.get(fileId);
    if (!entry) {
      await this.getOrCreateDoc(fileId, projectId);
      entry = this.docs.get(fileId);
    }
    if (!entry) return;

    Y.applyUpdate(entry.ydoc, updateBuffer);
    entry.dirty = true;
    this.scheduleDebouncedPersist(fileId);
  }

  /**
   * Decrements ref count when a user leaves a file
   */
  releaseDoc(fileId: string): void {
    const entry = this.docs.get(fileId);
    if (!entry) return;

    entry.refCount = Math.max(0, entry.refCount - 1);
    if (entry.refCount === 0) {
      // Flush any pending save immediately
      if (entry.dirty) {
        this.persistDoc(fileId).catch((err) =>
          console.error(`[DocManager] Error persisting doc on release ${fileId}:`, err)
        );
      }

      // Schedule unload after 60 seconds if still idle
      setTimeout(() => {
        const current = this.docs.get(fileId);
        if (current && current.refCount === 0 && !current.dirty) {
          current.ydoc.destroy();
          this.docs.delete(fileId);
        }
      }, 60000);
    }
  }

  /**
   * Encodes the current full state of the Y.Doc as an update
   */
  encodeFullState(ydoc: Y.Doc): Uint8Array {
    return Y.encodeStateAsUpdate(ydoc);
  }

  /**
   * Encodes the state vector for diffing
   */
  encodeStateVector(ydoc: Y.Doc): Uint8Array {
    return Y.encodeStateVector(ydoc);
  }

  /**
   * Computes diff update based on a client's state vector
   */
  encodeDiff(ydoc: Y.Doc, clientStateVector: Uint8Array): Uint8Array {
    return Y.encodeStateAsUpdate(ydoc, clientStateVector);
  }

  private scheduleDebouncedPersist(fileId: string): void {
    const entry = this.docs.get(fileId);
    if (!entry) return;

    if (entry.saveTimer) {
      clearTimeout(entry.saveTimer);
    }

    entry.saveTimer = setTimeout(() => {
      this.persistDoc(fileId).catch((err) =>
        console.error(`[DocManager] Debounced persist error for ${fileId}:`, err)
      );
    }, ENV.PERSIST_DEBOUNCE_MS);
  }

  private async persistDoc(fileId: string): Promise<void> {
    const entry = this.docs.get(fileId);
    if (!entry || !entry.dirty) return;

    entry.dirty = false;
    if (entry.saveTimer) {
      clearTimeout(entry.saveTimer);
      entry.saveTimer = null;
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) return;

    try {
      const stateUpdate = Buffer.from(Y.encodeStateAsUpdate(entry.ydoc));
      const nextSeq = entry.lastPersistedSeq + 1;

      // Append incremental update
      await YUpdate.create({
        fileId: new mongoose.Types.ObjectId(fileId),
        projectId: new mongoose.Types.ObjectId(entry.projectId),
        update: stateUpdate,
        seq: nextSeq,
      });

      entry.lastPersistedSeq = nextSeq;

      // Update Node plain text content for quick search / static preview
      const plainText = entry.ydoc.getText('monaco').toString();
      await Node.findByIdAndUpdate(fileId, { content: plainText });

      // Check if compaction is needed
      if (nextSeq % ENV.SNAPSHOT_EVERY === 0) {
        await this.compactSnapshot(fileId, entry.ydoc, nextSeq);
      }
    } catch (err: any) {
      entry.dirty = true; // Retry on next cycle
      console.error(`[DocManager] Failed to persist file ${fileId}:`, err.message);
    }
  }

  private async compactSnapshot(fileId: string, ydoc: Y.Doc, upToSeq: number): Promise<void> {
    try {
      const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
      await YSnapshot.create({
        fileId: new mongoose.Types.ObjectId(fileId),
        state,
        upToSeq,
      });

      // Prune updates older than snapshot
      await YUpdate.deleteMany({
        fileId: new mongoose.Types.ObjectId(fileId),
        seq: { $lte: upToSeq },
      });
      console.log(`[DocManager] Compacted snapshot for file ${fileId} up to seq ${upToSeq}`);
    } catch (err) {
      console.error(`[DocManager] Snapshot compaction error:`, err);
    }
  }

  /**
   * Flush all active docs on graceful shutdown
   */
  async flushAll(): Promise<void> {
    console.log(`[DocManager] Flushing ${this.docs.size} active documents to database...`);
    const promises: Promise<void>[] = [];
    for (const fileId of this.docs.keys()) {
      promises.push(this.persistDoc(fileId));
    }
    await Promise.allSettled(promises);
    console.log(`[DocManager] Flush complete.`);
  }
}

export const docManager = new DocManager();
