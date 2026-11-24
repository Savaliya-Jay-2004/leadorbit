import mongoose, { Schema, Document } from 'mongoose';

export interface ISuppressionEntry extends Document {
  workspaceId: string;
  email: string;
  normalizedDomain: string;
  phone: string;
  reason: string;
  addedBy: string;
  createdAt: Date;
}

const SuppressionEntrySchema = new Schema<ISuppressionEntry>(
  {
    workspaceId: { type: String, default: 'nextorbit_main', index: true },
    email: { type: String, default: '', lowercase: true, trim: true, index: true },
    normalizedDomain: { type: String, default: '', lowercase: true, trim: true, index: true },
    phone: { type: String, default: '', trim: true },
    reason: { type: String, default: 'Opted out / Not interested' },
    addedBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const SuppressionEntry =
  mongoose.models.SuppressionEntry ||
  mongoose.model<ISuppressionEntry>('SuppressionEntry', SuppressionEntrySchema);

