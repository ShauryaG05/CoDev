import mongoose, { Document, Schema } from 'mongoose';

export interface IYUpdate extends Document {
  fileId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  update: Buffer;
  seq: number;
  createdAt: Date;
}

const YUpdateSchema = new Schema<IYUpdate>(
  {
    fileId: { type: Schema.Types.ObjectId, ref: 'Node', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    update: { type: Buffer, required: true },
    seq: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const YUpdate = mongoose.model<IYUpdate>('YUpdate', YUpdateSchema);
