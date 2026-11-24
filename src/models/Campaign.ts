import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign extends Document {
  workspaceId: string;
  name: string;
  industry: string;
  country: string;
  city: string;
  targetBusinessType: string;
  companySize: string;
  requiredServices: string[];
  keywords: string;
  targetCount: number;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  discoveredCount: number;
  auditedCount: number;
  lastRunError?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    workspaceId: { type: String, default: 'nextorbit_main', index: true },
    name: { type: String, required: true, trim: true },
    industry: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    city: { type: String, default: '', trim: true },
    targetBusinessType: { type: String, default: '', trim: true },
    companySize: { type: String, default: 'Any' },
    requiredServices: { type: [String], default: [] },
    keywords: { type: String, default: '' },
    targetCount: { type: Number, default: 20, min: 1, max: 100 },
    status: {
      type: String,
      enum: ['DRAFT', 'RUNNING', 'COMPLETED', 'FAILED'],
      default: 'DRAFT',
    },
    discoveredCount: { type: Number, default: 0 },
    auditedCount: { type: Number, default: 0 },
    lastRunError: { type: String, default: '' },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const Campaign =
  mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', CampaignSchema);

