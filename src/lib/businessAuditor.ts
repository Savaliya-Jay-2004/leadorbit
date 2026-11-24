import { Lead } from '@/models/Lead';
import { LeadAudit } from '@/models/LeadAudit';
import { AuditCache } from '@/models/AuditCache';
import { AiModuleConfig } from '@/models/AiModuleConfig';
import { crawlWebsite, ensureHttpUrl, normalizeDomain } from '@/lib/crawler';
import { getActiveIntegrationKey, reportIntegrationError } from '@/lib/integrations';
import { extractJsonBlock, runAiModule } from '@/lib/ai';

interface AiAuditJson {
  existingPlatform?: string;
  identifiedOpportunities?: string[];
  suggestedService?: string;
  evidence?: string[];
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  verificationStatus?: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED';
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  score?: number;
  summary?: string;
  hiringType?: 'NONE' | 'DIRECT_HIRING' | 'POSSIBLE_OUTSOURCING';
}

export async function auditSingleLead(
  leadId: string,
  requiredServices: string[] = [],
  workspaceId = 'nextorbit_main',
  forceRefresh = false
) {
  const lead = await Lead.findById(leadId);
  if (!lead) throw new Error('Lead not found');

  lead.aiStatus = 'AUDITING';
  await lead.save();

  try {
    const domain = lead.normalizedDomain || normalizeDomain(lead.website);

    // 1. Check 7-day MongoDB AuditCache
    let technicalSnapshot: {
      pagespeedMobileScore?: number;
      pagespeedSeoScore?: number;
      loadTimeSeconds?: number;
      crawled: Awaited<ReturnType<typeof crawlWebsite>>;
      hiringSignals: string[];
    } | null = null;

    if (domain && !forceRefresh) {
      const cached = await AuditCache.findOne({ domain });
      if (cached?.payload) {
        technicalSnapshot = cached.payload as typeof technicalSnapshot;
      }
    }

    if (!technicalSnapshot) {
      const crawled = await crawlWebsite(lead.website);

      // Update newly discovered contact channels on the lead if empty
      let leadUpdated = false;
      if (!lead.email && crawled.emails.length > 0) {
        lead.email = crawled.emails[0];
        leadUpdated = true;
      }
      if (!lead.phone && crawled.phones.length > 0) {
        lead.phone = crawled.phones[0];
        lead.whatsapp = crawled.phones[0].replace(/[^\d]/g, '');
        leadUpdated = true;
      }
      if (!lead.linkedinUrl && crawled.linkedinUrl) {
        lead.linkedinUrl = crawled.linkedinUrl;
        leadUpdated = true;
      }
      if (!lead.instagramUrl && crawled.instagramUrl) {
        lead.instagramUrl = crawled.instagramUrl;
        leadUpdated = true;
      }
      if (leadUpdated) await lead.save();

      // 2. Google PageSpeed Insights API (if enabled in Admin)
      let pagespeedMobileScore: number | undefined;
      let pagespeedSeoScore: number | undefined;
      let loadTimeSeconds: number | undefined;

      if (lead.website) {
        const psKey = await getActiveIntegrationKey('google_pagespeed', workspaceId);
        if (psKey) {
          try {
            const psRes = await fetch(
              `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
                ensureHttpUrl(lead.website)
              )}&strategy=mobile&category=performance&category=seo&key=${encodeURIComponent(psKey)}`,
              { signal: AbortSignal.timeout(25000) }
            );
            if (psRes.ok) {
              const psData = await psRes.json();
              const perf = psData?.lighthouseResult?.categories?.performance?.score;
              const seo = psData?.lighthouseResult?.categories?.seo?.score;
              const lcpMs = psData?.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue;
              if (typeof perf === 'number') pagespeedMobileScore = Math.round(perf * 100);
              if (typeof seo === 'number') pagespeedSeoScore = Math.round(seo * 100);
              if (typeof lcpMs === 'number') loadTimeSeconds = Math.round((lcpMs / 1000) * 10) / 10;
            } else {
              await reportIntegrationError('google_pagespeed', `HTTP ${psRes.status}`, workspaceId);
            }
          } catch {
            // Non-fatal fallback to responseTimeMs
          }
        }
        if (loadTimeSeconds === undefined && crawled.reachable && crawled.responseTimeMs > 0) {
          loadTimeSeconds = Math.round((crawled.responseTimeMs / 1000) * 10) / 10;
        }
      }

      // 3. Hiring Signal lookup via Serper if enabled
      const hiringSignals: string[] = [];
      const serperKey = await getActiveIntegrationKey('serper', workspaceId);
      if (serperKey) {
        try {
          const jRes = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: `"${lead.companyName}" hiring (developer OR react OR laravel OR php OR "ai engineer")`,
              num: 3,
            }),
            signal: AbortSignal.timeout(8000),
          });
          if (jRes.ok) {
            const jData = await jRes.json();
            for (const o of jData?.organic || []) {
              if (o.title && /hiring|developer|engineer|job|career/i.test(`${o.title} ${o.snippet || ''}`)) {
                hiringSignals.push(o.title);
              }
            }
          }
        } catch {
          // Ignore optional hiring lookup failure
        }
      }

      technicalSnapshot = {
        pagespeedMobileScore,
        pagespeedSeoScore,
        loadTimeSeconds,
        crawled,
        hiringSignals: hiringSignals.slice(0, 3),
      };

      if (domain) {
        await AuditCache.updateOne(
          { domain },
          {
            domain,
            payload: technicalSnapshot,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          { upsert: true }
        );
      }
    }

    const { crawled, pagespeedMobileScore, pagespeedSeoScore, loadTimeSeconds, hiringSignals } =
      technicalSnapshot;

    // 4. Build deterministic verified facts first
    const verifiedEvidence: string[] = [];
    const heuristicOpportunities: string[] = [];

    if (!lead.website) {
      verifiedEvidence.push('No official website URL found for this business.');
      heuristicOpportunities.push('Build a high-converting business website & online booking/lead funnel');
    } else if (!crawled.reachable) {
      verifiedEvidence.push(`Website unreachable during inspection (${crawled.error || 'timeout'}).`);
      heuristicOpportunities.push('Website reliability audit, hosting/SSL repair, or modern redevelopment');
    } else {
      if (!crawled.sslValid) {
        verifiedEvidence.push('Website is missing valid HTTPS/SSL encryption.');
        heuristicOpportunities.push('SSL security upgrade and website modernization');
      }
      if (!crawled.hasMobileViewport) {
        verifiedEvidence.push('Missing mobile responsive viewport meta tag.');
        heuristicOpportunities.push('Mobile-first responsive UI redesign');
      }
      if (typeof pagespeedMobileScore === 'number' && pagespeedMobileScore < 65) {
        verifiedEvidence.push(`Mobile PageSpeed score is ${pagespeedMobileScore}/100 (LCP ${loadTimeSeconds}s).`);
        heuristicOpportunities.push('Performance optimization & Core Web Vitals speed rebuild');
      } else if (typeof loadTimeSeconds === 'number' && loadTimeSeconds > 3.0) {
        verifiedEvidence.push(`Slow server/page response time detected (${loadTimeSeconds}s).`);
        heuristicOpportunities.push('Frontend/backend speed optimization');
      }
      if (!crawled.hasBookingCta) {
        verifiedEvidence.push('No clear online appointment/booking CTA or interactive inquiry flow detected.');
        heuristicOpportunities.push('Add online booking / automated lead capture workflow');
      }
      if (!crawled.hasWhatsappWidget) {
        verifiedEvidence.push('No instant WhatsApp chat widget detected for customer inquiries.');
      }
      if (crawled.techStack.length > 0) {
        verifiedEvidence.push(`Detected technology stack: ${crawled.techStack.join(', ')}.`);
      }
    }

    if (hiringSignals.length > 0) {
      verifiedEvidence.push(`Public hiring activity detected: ${hiringSignals[0]}`);
    }

    // Load Admin scoring weights
    const aiCfg = await AiModuleConfig.findOne({ workspaceId, moduleName: 'AUDITOR' });
    const weights = aiCfg?.scoringWeights || {
      technicalNeed: 35,
      serviceFit: 30,
      contactReachability: 20,
      hiringSignal: 15,
    };

    // Baseline deterministic score
    let baseScore = 25;
    if (!lead.website || !crawled.reachable || !crawled.sslValid || !crawled.hasMobileViewport) {
      baseScore += Math.round(weights.technicalNeed * 0.9);
    } else if (heuristicOpportunities.length > 0) {
      baseScore += Math.round(weights.technicalNeed * 0.65);
    }
    if (lead.email || lead.phone || lead.linkedinUrl || lead.instagramUrl) {
      baseScore += weights.contactReachability;
    }
    if (hiringSignals.length > 0) {
      baseScore += Math.round(weights.hiringSignal * 0.8);
    }
    if (requiredServices.length > 0) {
      baseScore += Math.round(weights.serviceFit * 0.7);
    }
    baseScore = Math.min(98, Math.max(15, baseScore));

    // 5. Run AI Interpreter on verified technical evidence
    const promptInput = JSON.stringify(
      {
        company: lead.companyName,
        industry: lead.industry,
        category: lead.category,
        city: lead.city,
        country: lead.country,
        website: lead.website || 'NONE',
        targetServicesOfferedByUs: requiredServices,
        verifiedMeasurements: {
          websiteReachable: crawled.reachable,
          sslValid: crawled.sslValid,
          hasMobileViewport: crawled.hasMobileViewport,
          hasBookingCta: crawled.hasBookingCta,
          hasWhatsappWidget: crawled.hasWhatsappWidget,
          pagespeedMobileScore,
          pagespeedSeoScore,
          loadTimeSeconds,
          techStack: crawled.techStack,
          title: crawled.title,
          metaDescription: crawled.metaDescription,
          siteTextSnippet: crawled.bodyTextSnippet.slice(0, 1200),
          hiringSignals,
        },
        baselineFacts: verifiedEvidence,
      },
      null,
      2
    );

    const aiRes = await runAiModule('AUDITOR', promptInput, workspaceId);
    const parsedAi = aiRes.usedAi ? extractJsonBlock<AiAuditJson>(aiRes.text) : null;

    const finalScore =
      typeof parsedAi?.score === 'number'
        ? Math.min(100, Math.max(0, Math.round(parsedAi.score)))
        : baseScore;

    const existingPlatform =
      parsedAi?.existingPlatform ||
      (lead.website
        ? crawled.techStack.length > 0
          ? crawled.techStack.join(' / ')
          : 'Custom Website'
        : 'No Website (Maps / Social Only)');

    const identifiedOpportunities =
      parsedAi?.identifiedOpportunities && parsedAi.identifiedOpportunities.length > 0
        ? parsedAi.identifiedOpportunities
        : heuristicOpportunities.length > 0
          ? heuristicOpportunities
          : ['Website UX refresh & conversion optimization'];

    const suggestedService =
      parsedAi?.suggestedService ||
      requiredServices[0] ||
      (!lead.website ? 'Website Development & Redesign' : 'Custom CRM / Automation & Web Upgrade');

    const evidence =
      parsedAi?.evidence && parsedAi.evidence.length > 0
        ? parsedAi.evidence
        : verifiedEvidence.length > 0
          ? verifiedEvidence
          : ['Manual verification recommended on target link.'];

    const verificationStatus =
      parsedAi?.verificationStatus ||
      (crawled.reachable || !lead.website ? 'VERIFIED' : 'PARTIALLY_VERIFIED');

    const confidence =
      parsedAi?.confidence || (crawled.reachable ? 'HIGH' : lead.website ? 'LOW' : 'MEDIUM');

    const priority =
      parsedAi?.priority || (finalScore >= 75 ? 'HIGH' : finalScore >= 50 ? 'MEDIUM' : 'LOW');

    const auditDoc = await LeadAudit.findOneAndUpdate(
      { leadId: lead.id },
      {
        workspaceId,
        leadId: lead.id,
        existingPlatform,
        pagespeedMobileScore,
        pagespeedSeoScore,
        loadTimeSeconds,
        sslValid: crawled.sslValid,
        hasMobileViewport: crawled.hasMobileViewport,
        hasBookingCta: crawled.hasBookingCta,
        hasWhatsappWidget: crawled.hasWhatsappWidget,
        techStack: crawled.techStack,
        hiringSignals,
        hiringType:
          parsedAi?.hiringType ||
          (hiringSignals.length > 0 ? 'DIRECT_HIRING' : 'NONE'),
        identifiedOpportunities,
        suggestedService,
        evidence,
        confidence,
        verificationStatus,
        priority,
        score: finalScore,
        summary:
          parsedAi?.summary ||
          `${lead.companyName}: ${evidence.slice(0, 2).join(' ')} Recommended pitch: ${suggestedService}.`,
        auditedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    lead.aiStatus = 'AUDITED';
    lead.auditScore = finalScore;
    await lead.save();

    return auditDoc;
  } catch (err) {
    lead.aiStatus = 'FAILED';
    await lead.save();
    throw err;
  }
}

