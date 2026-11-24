export type UserRole = 'SUPER_ADMIN' | 'SALES_MANAGER' | 'BDE';

export type PipelineStage =
  | 'NEW'
  | 'QUALIFIED'
  | 'OUTREACH_SENT'
  | 'IN_CONVERSATION'
  | 'INTERESTED'
  | 'MEETING_SCHEDULED'
  | 'PROPOSAL_NEGOTIATION'
  | 'WON'
  | 'LOST';

export type AiProcessingStatus = 'PENDING' | 'AUDITING' | 'AUDITED' | 'FAILED';

export type OutreachChannel = 'EMAIL' | 'WHATSAPP' | 'LINKEDIN' | 'INSTAGRAM';

export type OutreachTone = 'PROFESSIONAL' | 'FRIENDLY' | 'DIRECT' | 'CONVERSATIONAL';

export type OutreachLength = 'SHORT' | 'MEDIUM' | 'DETAILED';

export type OutreachStatus = 'DRAFT' | 'APPROVED' | 'MANUALLY_SENT' | 'REJECTED';

export type ReplyIntent =
  | 'INTERESTED'
  | 'ASKING_PRICE'
  | 'REQUESTING_PORTFOLIO'
  | 'MORE_INFO'
  | 'NOT_INTERESTED'
  | 'FOLLOW_UP_LATER'
  | 'HAS_PROVIDER'
  | 'PARTNERSHIP'
  | 'UNCLEAR';

export type IntegrationProvider =
  | 'google_places'
  | 'serper'
  | 'hunter'
  | 'apollo'
  | 'google_pagespeed'
  | 'openai'
  | 'anthropic'
  | 'google_gemini';

export type IntegrationCategory = 'DISCOVERY' | 'ENRICHMENT' | 'AUDIT' | 'AI';

export type AiModuleName = 'AUDITOR' | 'WRITER' | 'CLOSER';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  workspaceId: string;
}

export interface ApiIntegrationDTO {
  id: string;
  provider: IntegrationProvider;
  label: string;
  category: IntegrationCategory;
  description: string;
  docsUrl: string;
  maskedKey: string;
  hasKey: boolean;
  isEnabled: boolean;
  dailyLimit: number;
  usedToday: number;
  status: 'UNCONFIGURED' | 'CONNECTED' | 'ERROR';
  lastTestedAt?: string;
  lastError?: string;
}

