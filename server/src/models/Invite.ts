import mongoose, { Document, Schema } from 'mongoose';
import { MembershipRole } from './Membership.js';

export interface IInvite extends Document {
  projectId: mongoose.Types.ObjectId;
  token: string;
  role: MembershipRole;
  createdBy: mongoose.Types.ObjectId;
  expiresAt?: Date | null;
  maxUses?: number;
  uses: number;
  revoked: boolean;
  createdAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, default: null },
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    uses: { type: Number, default: 0 },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Invite = mongoose.model<IInvite>('Invite', InviteSchema);
