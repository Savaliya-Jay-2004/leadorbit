import mongoose, { Schema, Document } from 'mongoose';
import { AiProcessingStatus, PipelineStage } from '@/types';

export interface ILead extends Document {
  workspaceId: string;
  campaignId?: string;
  companyName: string;
  normalizedDomain: string;
  website: string;
  country: string;
  city: string;
  industry: string;
  category: string;
  companySize: string;
  phone: string;
  whatsapp: string;
  email: string;
  contactPerson: string;
  designation: string;
  linkedinUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  googleMapsUrl: string;
  rating?: number;
  reviewCount?: number;
  source: string;
  discoveredAt: Date;
  aiStatus: AiProcessingStatus;
  pipelineStage: PipelineStage;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  auditScore: number;
  assignedTo?: string;
  doNotContact: boolean;
  notes: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    workspaceId: { type: String, default: 'nextorbit_main', index: true },
    campaignId: { type: String, index: true },
    companyName: { type: String, required: true, trim: true },
    normalizedDomain: { type: String, default: '', index: true },
    website: { type: String, default: '' },
    country: { type: String, default: '' },
    city: { type: String, default: '' },
    industry: { type: String, default: '' },
    category: { type: String, default: 'Small & Medium Business' },
    companySize: { type: String, default: '' },
    phone: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    email: { type: String, default: '', lowercase: true, trim: true },
    contactPerson: { type: String, default: '' },
    designation: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },
    instagramUrl: { type: String, default: '' },
    facebookUrl: { type: String, default: '' },
    googleMapsUrl: { type: String, default: '' },
    rating: { type: Number },
    reviewCount: { type: Number },
    source: { type: String, default: 'Manual' },
    discoveredAt: { type: Date, default: Date.now },
    aiStatus: {
      type: String,
      enum: ['PENDING', 'AUDITING', 'AUDITED', 'FAILED'],
      default: 'PENDING',
    },
    pipelineStage: {
      type: String,
      enum: [
        'NEW',
        'QUALIFIED',
        'OUTREACH_SENT',
        'IN_CONVERSATION',
        'INTERESTED',
        'MEETING_SCHEDULED',
        'PROPOSAL_NEGOTIATION',
        'WON',
        'LOST',
      ],
      default: 'NEW',
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    auditScore: { type: Number, default: 0, index: true },
    assignedTo: { type: String, index: true },
    doNotContact: { type: Boolean, default: false, index: true },
    notes: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

LeadSchema.index({ workspaceId: 1, normalizedDomain: 1 });
LeadSchema.index({ workspaceId: 1, companyName: 1 });

export const Lead = mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);

