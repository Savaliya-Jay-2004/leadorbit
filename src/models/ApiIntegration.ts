import mongoose, { Schema, Document } from 'mongoose';
import { IntegrationCategory, IntegrationProvider } from '@/types';

export interface IApiIntegration extends Document {
  workspaceId: string;
  provider: IntegrationProvider;
  label: string;
  category: IntegrationCategory;
  description: string;
  docsUrl: string;
  encryptedApiKey: string;
  isEnabled: boolean;
  dailyLimit: number;
  usedToday: number;
  usageResetDate: string;
  status: 'UNCONFIGURED' | 'CONNECTED' | 'ERROR';
  lastTestedAt?: Date;
  lastError?: string;
  updatedAt: Date;
}

const ApiIntegrationSchema = new Schema<IApiIntegration>(
  {
    workspaceId: { type: String, default: 'nextorbit_main', index: true },
    provider: {
      type: String,
      enum: [
        'google_places',
        'serper',
        'hunter',
        'apollo',
        'google_pagespeed',
        'openai',
        'anthropic',
        'google_gemini',
      ],
      required: true,
    },
    label: { type: String, required: true },
    category: {
      type: String,
      enum: ['DISCOVERY', 'ENRICHMENT', 'AUDIT', 'AI'],
      required: true,
    },
    description: { type: String, default: '' },
    docsUrl: { type: String, default: '' },
    encryptedApiKey: { type: String, default: '' },
    isEnabled: { type: Boolean, default: false },
    dailyLimit: { type: Number, default: 500 },
    usedToday: { type: Number, default: 0 },
    usageResetDate: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    status: {
      type: String,
      enum: ['UNCONFIGURED', 'CONNECTED', 'ERROR'],
      default: 'UNCONFIGURED',
    },
    lastTestedAt: { type: Date },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
);

ApiIntegrationSchema.index({ workspaceId: 1, provider: 1 }, { unique: true });

export const ApiIntegration =
  mongoose.models.ApiIntegration ||
  mongoose.model<IApiIntegration>('ApiIntegration', ApiIntegrationSchema);

