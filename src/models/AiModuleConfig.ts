import mongoose, { Schema, Document } from 'mongoose';
import { AiModuleName } from '@/types';

export interface IAiModuleConfig extends Document {
  workspaceId: string;
  moduleName: AiModuleName;
  provider: 'anthropic' | 'openai' | 'google_gemini';
  modelName: string;
  systemPrompt: string;
  temperature: number;
  isActive: boolean;
  followUpDays: number[];
  scoringWeights: {
    technicalNeed: number;
    serviceFit: number;
    contactReachability: number;
    hiringSignal: number;
  };
  updatedAt: Date;
}

const AiModuleConfigSchema = new Schema<IAiModuleConfig>(
  {
    workspaceId: { type: String, default: 'nextorbit_main', index: true },
    moduleName: {
      type: String,
      enum: ['AUDITOR', 'WRITER', 'CLOSER'],
      required: true,
    },
    provider: {
      type: String,
      enum: ['anthropic', 'openai', 'google_gemini'],
      default: 'openai',
    },
    modelName: { type: String, default: 'gpt-4o-mini' },
    systemPrompt: { type: String, required: true },
    temperature: { type: Number, default: 0.4 },
    isActive: { type: Boolean, default: true },
    followUpDays: { type: [Number], default: [3, 7, 14] },
    scoringWeights: {
      technicalNeed: { type: Number, default: 35 },
      serviceFit: { type: Number, default: 30 },
      contactReachability: { type: Number, default: 20 },
      hiringSignal: { type: Number, default: 15 },
    },
  },
  { timestamps: true }
);

AiModuleConfigSchema.index({ workspaceId: 1, moduleName: 1 }, { unique: true });

export const AiModuleConfig =
  mongoose.models.AiModuleConfig ||
  mongoose.model<IAiModuleConfig>('AiModuleConfig', AiModuleConfigSchema);

