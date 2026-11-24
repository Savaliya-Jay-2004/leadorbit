import { Lead } from '@/models/Lead';
import { LeadAudit } from '@/models/LeadAudit';
import { PortfolioItem } from '@/models/PortfolioItem';
import { OutreachMessage } from '@/models/OutreachMessage';
import { Conversation } from '@/models/Conversation';
import { extractJsonBlock, runAiModule } from '@/lib/ai';
import { OutreachChannel, OutreachLength, OutreachTone, ReplyIntent } from '@/types';

interface AiOutreachJson {
  subject?: string;
  body?: string;
}

interface AiCloserJson {
  intent?: ReplyIntent;
  summary?: string;
  replies?: Array<{ label: string; text: string }>;
}

export async function generateOutreachDraft(params: {
  leadId: string;
  channel: OutreachChannel;
  tone: OutreachTone;
  length: OutreachLength;
  serviceFocus?: string;
  userId: string;
  workspaceId?: string;
}) {
  const workspaceId = params.workspaceId || 'nextorbit_main';
  const lead = await Lead.findById(params.leadId);
  if (!lead) throw new Error('Lead not found');

  const audit = await LeadAudit.findOne({ leadId: lead.id });
  const portfolioItems = await PortfolioItem.find({ workspaceId });

  // Best matching portfolio item by industry or service
  const matchedPortfolio =
    portfolioItems.find(
      (p) =>
        p.industry.toLowerCase().includes((lead.industry || '').toLowerCase()) ||
        p.serviceType.toLowerCase().includes((audit?.suggestedService || '').toLowerCase())
    ) || portfolioItems[0];

  const promptInput = JSON.stringify(
    {
      channel: params.channel,
      tone: params.tone,
      length: params.length,
      prospect: {
        companyName: lead.companyName,
        contactPerson: lead.contactPerson || 'Team',
        industry: lead.industry,
        city: lead.city,
        website: lead.website || 'None',
      },
      auditFindings: audit
        ? {
            evidence: audit.evidence,
            opportunities: audit.identifiedOpportunities,
            suggestedService: params.serviceFocus || audit.suggestedService,
            loadTimeSeconds: audit.loadTimeSeconds,
          }
        : {
            evidence: ['Direct business outreach based on industry profile'],
            suggestedService: params.serviceFocus || 'Website & Custom Software Development',
          },
      portfolioReference: matchedPortfolio
        ? {
            title: matchedPortfolio.title,
            resultsMetric: matchedPortfolio.resultsMetric,
            url: matchedPortfolio.projectUrl,
          }
        : null,
      outputFormat: 'Return strict JSON: { "subject": "short email subject or empty for DM", "body": "message text" }',
    },
    null,
    2
  );

  const aiRes = await runAiModule('WRITER', promptInput, workspaceId);
  const parsed = aiRes.usedAi ? extractJsonBlock<AiOutreachJson>(aiRes.text) : null;

  const greetingName = lead.contactPerson ? lead.contactPerson.split(' ')[0] : `${lead.companyName} team`;
  const mainIssue =
    audit?.evidence?.[0] ||
    (lead.website
      ? 'a couple of quick conversion & mobile speed gaps on your site'
      : 'no dedicated website/booking hub linked to your profile');
  const servicePitch = params.serviceFocus || audit?.suggestedService || 'a fast, high-converting web & booking setup';

  const fallbackSubject =
    params.channel === 'EMAIL' ? `Quick idea for ${lead.companyName}` : '';

  const fallbackBody =
    params.length === 'SHORT'
      ? `Hi ${greetingName}, I checked ${lead.companyName}'s online presence and noticed ${mainIssue.toLowerCase().replace(/\.$/, '')}. That usually costs warm local inquiries before they even reach out.\n\nWe recently helped a similar team with ${servicePitch.toLowerCase()}${matchedPortfolio ? ` (${matchedPortfolio.resultsMetric})` : ''}.\n\nOpen to a free 2-minute breakdown video or quick 10-min call this week?`
      : `Hi ${greetingName},\n\nI was researching ${lead.industry || 'businesses'} in ${lead.city || 'your area'} and came across ${lead.companyName}. While looking through your setup, I spotted a concrete gap: ${mainIssue}\n\nAt NextOrbit Infotech, we help teams fix this cleanly with ${servicePitch.toLowerCase()}.${matchedPortfolio ? ` For example, our recent "${matchedPortfolio.title}" project achieved ${matchedPortfolio.resultsMetric}.` : ''}\n\nWould you like me to send a quick 2-minute audit video showing the exact fixes?`;

  const msgDoc = await OutreachMessage.create({
    workspaceId,
    leadId: lead.id,
    campaignId: lead.campaignId,
    channel: params.channel,
    tone: params.tone,
    length: params.length,
    subject: parsed?.subject ?? fallbackSubject,
    body: parsed?.body || fallbackBody,
    matchedPortfolioId: matchedPortfolio?.id,
    matchedPortfolioTitle: matchedPortfolio?.title,
    status: 'DRAFT',
    followUpStep: 0,
    createdBy: params.userId,
  });

  return msgDoc;
}

export async function analyzeReplyAndSuggestClosers(params: {
  leadId: string;
  prospectReply: string;
  channel: OutreachChannel;
  userId: string;
  workspaceId?: string;
}) {
  const workspaceId = params.workspaceId || 'nextorbit_main';
  const lead = await Lead.findById(params.leadId);
  if (!lead) throw new Error('Lead not found');

  const history = await Conversation.find({ leadId: lead.id }).sort({ createdAt: 1 }).limit(12);
  const sentMessages = await OutreachMessage.find({
    leadId: lead.id,
    status: 'MANUALLY_SENT',
  })
    .sort({ sentAt: -1 })
    .limit(3);
  const portfolioItems = await PortfolioItem.find({ workspaceId });

  const promptInput = JSON.stringify(
    {
      prospect: {
        companyName: lead.companyName,
        contactPerson: lead.contactPerson,
        industry: lead.industry,
      },
      latestProspectReply: params.prospectReply,
      priorOutreach: sentMessages.map((m) => m.body),
      conversationHistory: history.map((h) => ({ sender: h.sender, text: h.messageText })),
      availablePortfolio: portfolioItems.map((p) => ({
        title: p.title,
        url: p.projectUrl,
        result: p.resultsMetric,
      })),
      outputFormat:
        'Return strict JSON: { "intent": "INTERESTED|ASKING_PRICE|REQUESTING_PORTFOLIO|MORE_INFO|NOT_INTERESTED|FOLLOW_UP_LATER|HAS_PROVIDER|PARTNERSHIP|UNCLEAR", "summary": "1 sentence analysis", "replies": [{ "label": "Direct to Call", "text": "..." }, { "label": "Value + Portfolio", "text": "..." }, { "label": "Soft Qualification", "text": "..." }] }',
    },
    null,
    2
  );

  const aiRes = await runAiModule('CLOSER', promptInput, workspaceId);
  const parsed = aiRes.usedAi ? extractJsonBlock<AiCloserJson>(aiRes.text) : null;

  // Deterministic intent fallback
  const lower = params.prospectReply.toLowerCase();
  let fallbackIntent: ReplyIntent = 'MORE_INFO';
  if (/not interested|stop|unsubscribe|remove|no thanks|don'?t contact/.test(lower)) {
    fallbackIntent = 'NOT_INTERESTED';
  } else if (/how much|price|cost|budget|quote|charges|rate/.test(lower)) {
    fallbackIntent = 'ASKING_PRICE';
  } else if (/portfolio|work|sample|case study|examples|projects/.test(lower)) {
    fallbackIntent = 'REQUESTING_PORTFOLIO';
  } else if (/already have|in-house|agency|someone else/.test(lower)) {
    fallbackIntent = 'HAS_PROVIDER';
  } else if (/later|next month|busy|after/.test(lower)) {
    fallbackIntent = 'FOLLOW_UP_LATER';
  } else if (/partner|white.?label|collaborate/.test(lower)) {
    fallbackIntent = 'PARTNERSHIP';
  } else if (/yes|sure|call|schedule|interested|tell me more|let'?s talk|pm|am/.test(lower)) {
    fallbackIntent = 'INTERESTED';
  }

  const intent: ReplyIntent = parsed?.intent || fallbackIntent;
  const topPortfolio = portfolioItems[0];

  const fallbackRepliesMap: Record<ReplyIntent, Array<{ label: string; text: string }>> = {
    ASKING_PRICE: [
      {
        label: 'Ballpark + 15-Min Call',
        text: `Thanks for asking! Depending on exact features and scope, our starter builds usually range around ₹12,000–₹35,000 (or $400–$1,200) and wrap up in 1–2 weeks. Happy to walk through the exact audit for ${lead.companyName} on a quick 15-min call tomorrow so I can give you a fixed quote—does 4 PM work?`,
      },
      {
        label: 'Audit First',
        text: `It depends on whether we optimize your existing setup or add custom booking/automation. Let's hop on a 10–15 min call where I'll show you the 2 quick fixes we spotted—no obligation, and you'll have an exact fixed price right on the call.`,
      },
    ],
    REQUESTING_PORTFOLIO: [
      {
        label: 'Share Case Study + Call CTA',
        text: `Of course! Here's a recent similar build: ${topPortfolio ? `${topPortfolio.title} (${topPortfolio.projectUrl}) — ${topPortfolio.resultsMetric}` : 'our recent client case studies'}. Since every business workflow is slightly different, want to do a quick 15-min call tomorrow so I can show relevant live examples for ${lead.companyName}?`,
      },
    ],
    INTERESTED: [
      {
        label: 'Book 15-Min Discovery Call',
        text: `Awesome! Looking forward to sharing what we spotted for ${lead.companyName}. Would tomorrow at 11:30 AM or 4:00 PM work for a quick 15-min Google Meet?`,
      },
    ],
    NOT_INTERESTED: [
      {
        label: 'Polite Close',
        text: `Totally understood—appreciate you letting me know! Wishing ${lead.companyName} all the best ahead.`,
      },
    ],
    FOLLOW_UP_LATER: [
      {
        label: 'Respectful Future Check-in',
        text: `Sounds good, totally understand timing matters! I'll circle back in a couple of weeks. Feel free to ping me anytime before then if something comes up.`,
      },
    ],
    HAS_PROVIDER: [
      {
        label: 'Keep Door Open / Second Opinion',
        text: `Great to hear you're already supported! We work alongside existing teams for specialized automation or backup capacity too—happy to share our audit notes purely as a free second opinion if helpful.`,
      },
    ],
    PARTNERSHIP: [
      {
        label: 'Explore White-Label Synergy',
        text: `We love white-label and agency partnerships at NextOrbit Infotech! Let's hop on a quick 15-min intro call this week to discuss capabilities, turnaround times, and how we can support your pipeline.`,
      },
    ],
    MORE_INFO: [
      {
        label: 'Concise Scope + Call Invite',
        text: `Happy to clarify! In short, we help fix speed/UX bottlenecks and build custom booking or CRM automation tailored to ${lead.companyName}. Easiest way is a quick 15-min screen-share where I show your exact audit—open to chatting tomorrow?`,
      },
    ],
    UNCLEAR: [
      {
        label: 'Clarify + Soft CTA',
        text: `Thanks for replying! Just to make sure I send the most helpful info for ${lead.companyName}, are you open to looking at a quick 2-minute website/workflow audit this week?`,
      },
    ],
  };

  const suggestedReplies =
    parsed?.replies && parsed.replies.length > 0 ? parsed.replies : fallbackRepliesMap[intent];

  const conv = await Conversation.create({
    workspaceId,
    leadId: lead.id,
    sender: 'PROSPECT',
    channel: params.channel,
    messageText: params.prospectReply,
    aiIntent: intent,
    aiSummary: parsed?.summary || `Classified prospect reply as ${intent.replace(/_/g, ' ')}.`,
    suggestedReplies,
    createdBy: params.userId,
  });

  // Update lead pipeline stage intelligently
  if (intent === 'INTERESTED' || intent === 'ASKING_PRICE' || intent === 'REQUESTING_PORTFOLIO') {
    lead.pipelineStage = 'INTERESTED';
  } else if (intent === 'NOT_INTERESTED') {
    lead.pipelineStage = 'LOST';
  } else if (lead.pipelineStage === 'OUTREACH_SENT' || lead.pipelineStage === 'NEW' || lead.pipelineStage === 'QUALIFIED') {
    lead.pipelineStage = 'IN_CONVERSATION';
  }
  await lead.save();

  return conv;
}

export function buildFollowUpMessage(companyName: string, stepDay: number): string {
  if (stepDay <= 3) {
    return `Hi ${companyName} team — just bumping my quick note from a few days ago in case it got buried. Happy to send over the 2-minute audit video whenever convenient!`;
  }
  if (stepDay <= 7) {
    return `Hey ${companyName} team, quick check-in! Still have those speed & conversion notes saved for your site—worth a 10-min look this week, or should I close this thread?`;
  }
  return `Hi ${companyName} team — last polite follow-up from my side so I don't clutter your inbox. If upgrading your web/automation setup comes up later this quarter, feel free to reply anytime!`;
}

