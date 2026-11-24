import mongoose, { Schema, Document } from 'mongoose';

export interface IPortfolioItem extends Document {
  workspaceId: string;
  title: string;
  industry: string;
  serviceType: string;
  projectUrl: string;
  summary: string;
  resultsMetric: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
}

const PortfolioItemSchema = new Schema<IPortfolioItem>(
  {
    workspaceId: { type: String, default: 'nextorbit_main', index: true },
    title: { type: String, required: true, trim: true },
    industry: { type: String, required: true, trim: true },
    serviceType: { type: String, required: true, trim: true },
    projectUrl: { type: String, required: true, trim: true },
    summary: { type: String, required: true },
    resultsMetric: { type: String, default: '' },
    tags: { type: [String], default: [] },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const PortfolioItem =
  mongoose.models.PortfolioItem ||
  mongoose.model<IPortfolioItem>('PortfolioItem', PortfolioItemSchema);

