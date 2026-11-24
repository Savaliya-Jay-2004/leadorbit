import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  workspaceId: string;
  leadId?: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    workspaceId: { type: String, default: 'nextorbit_main', index: true },
    leadId: { type: String, index: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String, default: '' },
  },
  { timestamps: true }
);

export const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

