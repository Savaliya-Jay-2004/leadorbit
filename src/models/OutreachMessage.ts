import mongoose, { Schema, Document } from 'mongoose';
import { OutreachChannel, OutreachLength, OutreachStatus, OutreachTone } from '@/types';

export interface IOutreachMessage extends Document {
  workspaceId: string;
  leadId: string;
  campaignId?: string;
  channel: OutreachChannel;
  tone: OutreachTone;
  length: OutreachLength;
  subject: string;
  body: string;
  matchedPortfolioId?: string;
  matchedPortfolioTitle?: string;
  status: OutreachStatus;
  followUpStep: number;
  createdBy: string;
  sentBy?: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OutreachMessageSchema = new Schema<IOutreachMessage>(
  {
    workspaceId: { type: String, default: 'nextorbit_main', index: true },
    leadId: { type: String, required: true, index: true },
    campaignId: { type: String },
    channel: {
      type: String,
      enum: ['EMAIL', 'WHATSAPP', 'LINKEDIN', 'INSTAGRAM'],
      default: 'EMAIL',
    },
    tone: {
      type: String,
      enum: ['PROFESSIONAL', 'FRIENDLY', 'DIRECT', 'CONVERSATIONAL'],
      default: 'DIRECT',
    },
    length: {
      type: String,
      enum: ['SHORT', 'MEDIUM', 'DETAILED'],
      default: 'SHORT',
    },
    subject: { type: String, default: '' },
    body: { type: String, required: true },
    matchedPortfolioId: { type: String },
    matchedPortfolioTitle: { type: String },
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED', 'MANUALLY_SENT', 'REJECTED'],
      default: 'DRAFT',
    },
    followUpStep: { type: Number, default: 0 },
    createdBy: { type: String, required: true },
    sentBy: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

export const OutreachMessage =
  mongoose.models.OutreachMessage ||
  mongoose.model<IOutreachMessage>('OutreachMessage', OutreachMessageSchema);

