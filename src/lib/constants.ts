import { IntegrationCategory, IntegrationProvider, PipelineStage, ReplyIntent } from '@/types';

export const PIPELINE_STAGES: {
  id: PipelineStage;
  label: string;
  color: string;
  bgClass: string;
}[] = [
  { id: 'NEW', label: 'New Lead', color: '#94a3b8', bgClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  { id: 'QUALIFIED', label: 'Qualified', color: '#38bdf8', bgClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  { id: 'OUTREACH_SENT', label: 'Outreach Sent', color: '#818cf8', bgClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  { id: 'IN_CONVERSATION', label: 'In Conversation', color: '#c084fc', bgClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { id: 'INTERESTED', label: 'Interested', color: '#fbbf24', bgClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { id: 'MEETING_SCHEDULED', label: 'Meeting Scheduled', color: '#2dd4bf', bgClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  { id: 'PROPOSAL_NEGOTIATION', label: 'Proposal / Negotiation', color: '#fb923c', bgClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  { id: 'WON', label: 'Won', color: '#34d399', bgClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { id: 'LOST', label: 'Lost', color: '#f87171', bgClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
];

export const LEAD_CATEGORIES = [
  'Startup',
  'Small & Medium Business',
  'Enterprise',
  'Digital Agency',
  'E-commerce Business',
  'SaaS Company',
  'Technology Company',
  'Healthcare / Clinic',
  'Hospitality / Local',
  'Other Industry',
] as const;

export const SERVICE_OPTIONS = [
  'Website Development & Redesign',
  'E-commerce Development',
  'Custom CRM / ERP Software',
  'Mobile App Development',
  'SaaS Product Development',
  'AI Automation & Agents',
  'API Integration & Maintenance',
  'White-Label Development Partnership',
] as const;

export const REPLY_INTENT_LABELS: Record<ReplyIntent, { label: string; badgeClass: string }> = {
  INTERESTED: { label: 'Interested', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  ASKING_PRICE: { label: 'Asking for Pricing', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  REQUESTING_PORTFOLIO: { label: 'Requesting Portfolio', badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  MORE_INFO: { label: 'More Info Needed', badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  NOT_INTERESTED: { label: 'Not Interested', badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  FOLLOW_UP_LATER: { label: 'Follow Up Later', badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  HAS_PROVIDER: { label: 'Already Has Provider', badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  PARTNERSHIP: { label: 'Partnership Inquiry', badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  UNCLEAR: { label: 'Unclear / General', badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
};

export const DEFAULT_INTEGRATIONS: {
  provider: IntegrationProvider;
  label: string;
  category: IntegrationCategory;
  description: string;
  docsUrl: string;
  dailyLimit: number;
}[] = [
  {
    provider: 'google_places',
    label: 'Google Places API',
    category: 'DISCOVERY',
    description: 'Discovers verified local & regional businesses with official phone numbers, websites, and ratings.',
    docsUrl: 'https://developers.google.com/maps/documentation/places/web-service',
    dailyLimit: 500,
  },
  {
    provider: 'serper',
    label: 'Serper.dev (Google Search & Jobs)',
    category: 'DISCOVERY',
    description: 'Finds startups, LinkedIn company pages, niche directories, and public developer hiring postings.',
    docsUrl: 'https://serper.dev',
    dailyLimit: 500,
  },
  {
    provider: 'hunter',
    label: 'Hunter.io API',
    category: 'ENRICHMENT',
    description: 'Optional domain-to-email lookup when business emails are not listed directly on their website.',
    docsUrl: 'https://hunter.io/api-documentation',
    dailyLimit: 100,
  },
  {
    provider: 'apollo',
    label: 'Apollo.io API',
    category: 'ENRICHMENT',
    description: 'Optional B2B decision-maker enrichment (Founder, CEO, CTO names, LinkedIn URLs, work emails).',
    docsUrl: 'https://docs.apollo.io',
    dailyLimit: 100,
  },
  {
    provider: 'google_pagespeed',
    label: 'Google PageSpeed Insights API',
    category: 'AUDIT',
    description: 'Runs free real Lighthouse mobile speed, performance, and SEO checks for accurate audit evidence.',
    docsUrl: 'https://developers.google.com/speed/docs/insights/v5/get-started',
    dailyLimit: 1000,
  },
  {
    provider: 'anthropic',
    label: 'Anthropic Claude API',
    category: 'AI',
    description: 'Recommended AI engine for natural, human-sounding Outreach Messages and Sales Closer replies.',
    docsUrl: 'https://docs.anthropic.com',
    dailyLimit: 1000,
  },
  {
    provider: 'openai',
    label: 'OpenAI API (GPT-4o / 4o-mini)',
    category: 'AI',
    description: 'Fast structured AI reasoning for Lead Auditing, Scoring, Intent Classification, and Drafting.',
    docsUrl: 'https://platform.openai.com/docs',
    dailyLimit: 1000,
  },
  {
    provider: 'google_gemini',
    label: 'Google Gemini API',
    category: 'AI',
    description: 'Fast, cost-effective AI provider for high-volume business auditing and response classification.',
    docsUrl: 'https://ai.google.dev/docs',
    dailyLimit: 1500,
  },
];

export const DEFAULT_AI_PROMPTS = {
  AUDITOR: `You are NextOrbit Infotech's Senior Technical Business Auditor.
Analyze the provided verified website technical measurements, extracted page text, and any hiring signals.
Rules:
1. NEVER invent metrics or facts not present in the input evidence.
2. Distinguish clearly between a direct full-time hiring need vs. a genuine outsourcing/development agency opportunity.
3. Recommend matching services from: Website Redesign, E-commerce, Custom CRM/ERP, Mobile App, SaaS Development, AI Automation, API Integration, Maintenance.
4. Return strict JSON with: existingPlatform, identifiedOpportunities[], suggestedService, evidence, confidence (HIGH|MEDIUM|LOW), verificationStatus (VERIFIED|PARTIALLY_VERIFIED|UNVERIFIED), priority (HIGH|MEDIUM|LOW), score (0-100), summary.`,

  WRITER: `You are NextOrbit Infotech's B2B Outreach Writer.
Write a crisp, personalized, non-spammy outreach message for a human BDE to manually copy and send.
Rules:
1. Reference the prospect's exact company name and real verified audit observation.
2. Explain the business impact in plain words and offer one concrete quick win or relevant portfolio case study.
3. End with a low-friction soft CTA (e.g., 15-minute call or free 2-minute audit video).
4. NEVER use "Dear Sir/Madam", fake flattery, hype, or drop exact pricing in the first cold message.
5. Keep SHORT under 80 words, MEDIUM ~120 words, DETAILED ~180 words.`,

  CLOSER: `You are NextOrbit Infotech's AI Sales Closer Assistant.
Given the full conversation history and the prospect's latest reply, classify the prospect's intent and draft 3 helpful reply options for the BDE to review, copy, and send manually.
Rules:
1. Classify intent strictly into one of: INTERESTED, ASKING_PRICE, REQUESTING_PORTFOLIO, MORE_INFO, NOT_INTERESTED, FOLLOW_UP_LATER, HAS_PROVIDER, PARTNERSHIP, UNCLEAR.
2. Each suggested reply should directly answer the prospect's question (referencing matched portfolio links if requested) and gently guide toward a 15-minute discovery call.
3. If intent is NOT_INTERESTED, provide a polite graceful close and recommend suppression.`,
};

