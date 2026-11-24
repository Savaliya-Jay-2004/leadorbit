import mongoose, { Schema, Document } from 'mongoose';
import { OutreachChannel, ReplyIntent } from '@/types';

export interface IConversation extends Document {
  workspaceId: string;
  leadId: string;
  sender: 'PROSPECT' | 'BDE';
  channel: OutreachChannel;
  messageText: string;
  aiIntent?: ReplyIntent;
  aiSummary?: string;
  suggestedReplies: { label: string; text: string }[];
  createdBy: string;
  createdAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    workspaceId: { type: String, default: 'nextorbit_main', index: true },
    leadId: { type: String, required: true, index: true },
    sender: { type: String, enum: ['PROSPECT', 'BDE'], required: true },
    channel: {
      type: String,
      enum: ['EMAIL', 'WHATSAPP', 'LINKEDIN', 'INSTAGRAM'],
      default: 'EMAIL',
    },
    messageText: { type: String, required: true },
    aiIntent: {
      type: String,
      enum: [
        'INTERESTED',
        'ASKING_PRICE',
        'REQUESTING_PORTFOLIO',
        'MORE_INFO',
        'NOT_INTERESTED',
        'FOLLOW_UP_LATER',
        'HAS_PROVIDER',
        'PARTNERSHIP',
        'UNCLEAR',
      ],
    },
    aiSummary: { type: String, default: '' },
    suggestedReplies: {
      type: [{ label: String, text: String }],
      default: [],
    },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export const Conversation =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>('Conversation', ConversationSchema);

