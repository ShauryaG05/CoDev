import mongoose, { Document, Schema } from 'mongoose';

export type MembershipRole = 'owner' | 'editor' | 'viewer';

export interface IMembership extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: MembershipRole;
  joinedAt: Date;
  invitedBy?: mongoose.Types.ObjectId;
}

const MembershipSchema = new Schema<IMembership>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], required: true },
    joinedAt: { type: Date, default: Date.now },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: false }
);

// Unique index: a user can only have one membership per project
MembershipSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export const Membership = mongoose.model<IMembership>('Membership', MembershipSchema);
