import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  projectId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId;
  type: string;
  payload: Record<string, any>;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);
