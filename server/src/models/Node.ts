import mongoose, { Document, Schema } from 'mongoose';

export type NodeType = 'file' | 'folder';

export interface INode extends Document {
  projectId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
  type: NodeType;
  name: string;
  content?: string;
  language?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NodeSchema = new Schema<INode>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Node', default: null, index: true },
    type: { type: String, enum: ['file', 'folder'], required: true },
    name: { type: String, required: true, trim: true },
    content: { type: String, default: '' },
    language: { type: String, default: 'plaintext' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Unique index: prevent files/folders with the same name under the same parent folder
NodeSchema.index({ projectId: 1, parentId: 1, name: 1 }, { unique: true });

export const Node = mongoose.model<INode>('Node', NodeSchema);
