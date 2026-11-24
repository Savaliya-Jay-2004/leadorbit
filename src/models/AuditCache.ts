import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditCache extends Document {
  domain: string;
  payload: Record<string, unknown>;
  expiresAt: Date;
}

const AuditCacheSchema = new Schema<IAuditCache>(
  {
    domain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    payload: { type: Schema.Types.Mixed, required: true },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export const AuditCache =
  mongoose.models.AuditCache || mongoose.model<IAuditCache>('AuditCache', AuditCacheSchema);

