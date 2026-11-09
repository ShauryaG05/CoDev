import mongoose, { Document, Schema } from 'mongoose';

export interface IYSnapshot extends Document {
  fileId: mongoose.Types.ObjectId;
  state: Buffer;
  upToSeq: number;
  createdAt: Date;
}

const YSnapshotSchema = new Schema<IYSnapshot>(
  {
    fileId: { type: Schema.Types.ObjectId, ref: 'Node', required: true, index: true },
    state: { type: Buffer, required: true },
    upToSeq: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const YSnapshot = mongoose.model<IYSnapshot>('YSnapshot', YSnapshotSchema);
