import mongoose, { Schema, Document } from 'mongoose';
import { OutreachChannel } from '@/types';

export interface IFollowUpTask extends Document {
  workspaceId: string;
  leadId: string;
  assignedTo: string;
  stepDay: number;
  channel: OutreachChannel;
  dueAt: Date;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  suggestedMessage: string;
  completedAt?: Date;
  createdAt: Date;
}

const FollowUpTaskSchema = new Schema<IFollowUpTask>(
  {
    workspaceId: { type: String, default: 'nextorbit_main', index: true },
    leadId: { type: String, required: true, index: true },
    assignedTo: { type: String, required: true, index: true },
    stepDay: { type: Number, required: true },
    channel: {
      type: String,
      enum: ['EMAIL', 'WHATSAPP', 'LINKEDIN', 'INSTAGRAM'],
      default: 'EMAIL',
    },
    dueAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'SKIPPED'],
      default: 'PENDING',
      index: true,
    },
    suggestedMessage: { type: String, default: '' },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const FollowUpTask =
  mongoose.models.FollowUpTask ||
  mongoose.model<IFollowUpTask>('FollowUpTask', FollowUpTaskSchema);

