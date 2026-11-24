import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadAudit extends Document {
  workspaceId: string;
  leadId: string;
  existingPlatform: string;
  pagespeedMobileScore?: number;
  pagespeedSeoScore?: number;
  loadTimeSeconds?: number;
  sslValid: boolean;
  hasMobileViewport: boolean;
  hasBookingCta: boolean;
  hasWhatsappWidget: boolean;
  techStack: string[];
  hiringSignals: string[];
  hiringType: 'NONE' | 'DIRECT_HIRING' | 'POSSIBLE_OUTSOURCING';
  identifiedOpportunities: string[];
  suggestedService: string;
  evidence: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  verificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  summary: string;
  auditedAt: Date;
}

const LeadAuditSchema = new Schema<ILeadAudit>(
  {
    workspaceId: { type: String, default: 'nextorbit_main', index: true },
    leadId: { type: String, required: true, unique: true, index: true },
    existingPlatform: { type: String, default: 'Unknown' },
    pagespeedMobileScore: { type: Number },
    pagespeedSeoScore: { type: Number },
    loadTimeSeconds: { type: Number },
    sslValid: { type: Boolean, default: false },
    hasMobileViewport: { type: Boolean, default: false },
    hasBookingCta: { type: Boolean, default: false },
    hasWhatsappWidget: { type: Boolean, default: false },
    techStack: { type: [String], default: [] },
    hiringSignals: { type: [String], default: [] },
    hiringType: {
      type: String,
      enum: ['NONE', 'DIRECT_HIRING', 'POSSIBLE_OUTSOURCING'],
      default: 'NONE',
    },
    identifiedOpportunities: { type: [String], default: [] },
    suggestedService: { type: String, default: '' },
    evidence: { type: [String], default: [] },
    confidence: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED'],
      default: 'PARTIALLY_VERIFIED',
    },
    priority: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
    score: { type: Number, default: 50, min: 0, max: 100 },
    summary: { type: String, default: '' },
    auditedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const LeadAudit =
  mongoose.models.LeadAudit || mongoose.model<ILeadAudit>('LeadAudit', LeadAuditSchema);

