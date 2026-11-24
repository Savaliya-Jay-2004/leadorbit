import { Lead } from '@/models/Lead';
import { SuppressionEntry } from '@/models/SuppressionEntry';
import { getActiveIntegrationKey, reportIntegrationError } from '@/lib/integrations';
import { crawlWebsite, normalizeDomain } from '@/lib/crawler';

export interface DiscoveredLeadCandidate {
  companyName: string;
  website: string;
  phone: string;
  email: string;
  contactPerson: string;
  designation: string;
  linkedinUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  googleMapsUrl: string;
  rating?: number;
  reviewCount?: number;
  source: string;
  country: string;
  city: string;
  industry: string;
  category: string;
  companySize: string;
}

function classifyCategory(industry: string, targetBusinessType: string, companySize: string): string {
  const combined = `${industry} ${targetBusinessType} ${companySize}`.toLowerCase();
  if (combined.includes('startup')) return 'Startup';
  if (combined.includes('saas')) return 'SaaS Company';
  if (combined.includes('ecommerce') || combined.includes('e-commerce') || combined.includes('store'))
    return 'E-commerce Business';
  if (combined.includes('agency')) return 'Digital Agency';
  if (combined.includes('enterprise') || combined.includes('500+')) return 'Enterprise';
  if (combined.includes('clinic') || combined.includes('health') || combined.includes('hospital'))
    return 'Healthcare / Clinic';
  if (combined.includes('cafe') || combined.includes('restaurant') || combined.includes('hotel'))
    return 'Hospitality / Local';
  if (combined.includes('tech') || combined.includes('software') || combined.includes('it'))
    return 'Technology Company';
  return 'Small & Medium Business';
}

function sanitizePhoneToWhatsapp(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits.replace(/^\+/, '');
}

export async function runLeadDiscovery(params: {
  workspaceId: string;
  campaignId: string;
  industry: string;
  country: string;
  city: string;
  targetBusinessType: string;
  companySize: string;
  keywords: string;
  targetCount: number;
  assignedTo: string;
}): Promise<{
  createdLeads: Array<InstanceType<typeof Lead>>;
  duplicatesSkipped: number;
  suppressedSkipped: number;
  sourcesUsed: string[];
  warnings: string[];
}> {
  const candidates: DiscoveredLeadCandidate[] = [];
  const sourcesUsed: string[] = [];
  const warnings: string[] = [];
  const limit = Math.min(Math.max(params.targetCount || 10, 1), 50);

  const locationStr = [params.city, params.country].filter(Boolean).join(', ');
  const queryText = [
    params.targetBusinessType || params.industry,
    params.keywords,
    locationStr ? `in ${locationStr}` : '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  // 1. Google Places API (New)
  const placesKey = await getActiveIntegrationKey('google_places', params.workspaceId);
  if (placesKey) {
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': placesKey,
          'X-Goog-FieldMask':
            'places.displayName,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber,places.googleMapsUri,places.rating,places.userRatingCount,places.formattedAddress',
        },
        body: JSON.stringify({
          textQuery: queryText,
          maxResultCount: Math.min(limit, 20),
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const data = await res.json();
        const places = Array.isArray(data?.places) ? data.places : [];
        sourcesUsed.push('Google Places API');
        for (const p of places) {
          candidates.push({
            companyName: p.displayName?.text || 'Unknown Business',
            website: p.websiteUri || '',
            phone: p.internationalPhoneNumber || p.nationalPhoneNumber || '',
            email: '',
            contactPerson: '',
            designation: '',
            linkedinUrl: '',
            instagramUrl: '',
            facebookUrl: '',
            googleMapsUrl: p.googleMapsUri || '',
            rating: p.rating,
            reviewCount: p.userRatingCount,
            source: 'Google Places',
            country: params.country,
            city: params.city,
            industry: params.industry,
            category: classifyCategory(params.industry, params.targetBusinessType, params.companySize),
            companySize: params.companySize || 'SMB',
          });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || `HTTP ${res.status}`;
        warnings.push(`Google Places API: ${msg}`);
        await reportIntegrationError('google_places', msg, params.workspaceId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Places request failed';
      warnings.push(`Google Places API: ${msg}`);
    }
  }

  // 2. Serper.dev Google Search / Places API
  const serperKey = await getActiveIntegrationKey('serper', params.workspaceId);
  if (serperKey && candidates.length < limit) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': serperKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: queryText,
          num: Math.min(limit, 20),
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = await res.json();
        sourcesUsed.push('Serper Google Search');
        const organic = Array.isArray(data?.organic) ? data.organic : [];
        for (const item of organic) {
          const link = item.link || '';
          const domain = normalizeDomain(link);
          // Skip directory aggregators when looking for direct companies
          if (
            !domain ||
            ['justdial.com', 'sulekha.com', 'yelp.com', 'clutch.co', 'goodfirms.co', 'wikipedia.org'].some(
              (d) => domain.includes(d)
            )
          ) {
            continue;
          }
          candidates.push({
            companyName: (item.title || domain).split('|')[0].split('-')[0].trim(),
            website: link,
            phone: '',
            email: '',
            contactPerson: '',
            designation: '',
            linkedinUrl: domain.includes('linkedin.com') ? link : '',
            instagramUrl: domain.includes('instagram.com') ? link : '',
            facebookUrl: '',
            googleMapsUrl: '',
            source: 'Google Search (Serper)',
            country: params.country,
            city: params.city,
            industry: params.industry,
            category: classifyCategory(params.industry, params.targetBusinessType, params.companySize),
            companySize: params.companySize || 'Unknown',
          });
        }
      } else {
        const msg = `Serper HTTP ${res.status}`;
        warnings.push(msg);
        await reportIntegrationError('serper', msg, params.workspaceId);
      }
    } catch (err) {
      warnings.push(`Serper API: ${err instanceof Error ? err.message : 'Failed'}`);
    }
  }

  if (!placesKey && !serperKey) {
    warnings.push(
      'No Discovery API keys are currently enabled in Super Admin → Integrations (Google Places or Serper.dev). Add an API key to auto-discover live businesses, or add/import leads manually.'
    );
  }

  // Optional enrichment keys
  const hunterKey = await getActiveIntegrationKey('hunter', params.workspaceId);

  let duplicatesSkipped = 0;
  let suppressedSkipped = 0;
  const createdLeads: Array<InstanceType<typeof Lead>> = [];
  const seenInBatch = new Set<string>();

  for (const cand of candidates.slice(0, limit)) {
    const domain = normalizeDomain(cand.website);
    const dedupeKey = domain || cand.companyName.toLowerCase().trim();
    if (!dedupeKey || seenInBatch.has(dedupeKey)) {
      duplicatesSkipped++;
      continue;
    }
    seenInBatch.add(dedupeKey);

    // Check global suppression list
    const suppressed = await SuppressionEntry.findOne({
      workspaceId: params.workspaceId,
      $or: [
        ...(domain ? [{ normalizedDomain: domain }] : []),
        ...(cand.phone ? [{ phone: cand.phone }] : []),
      ],
    });
    if (suppressed) {
      suppressedSkipped++;
      continue;
    }

    // Check existing leads for duplicates
    const existing = await Lead.findOne({
      workspaceId: params.workspaceId,
      $or: [
        ...(domain ? [{ normalizedDomain: domain }] : []),
        { companyName: new RegExp(`^${cand.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ],
    });
    if (existing) {
      duplicatesSkipped++;
      continue;
    }

    // Crawl website for FREE emails, phones, WhatsApp, LinkedIn, Instagram
    if (cand.website) {
      const crawled = await crawlWebsite(cand.website);
      if (crawled.reachable) {
        if (!cand.email && crawled.emails.length > 0) cand.email = crawled.emails[0];
        if (!cand.phone && crawled.phones.length > 0) cand.phone = crawled.phones[0];
        if (!cand.linkedinUrl && crawled.linkedinUrl) cand.linkedinUrl = crawled.linkedinUrl;
        if (!cand.instagramUrl && crawled.instagramUrl) cand.instagramUrl = crawled.instagramUrl;
        if (!cand.facebookUrl && crawled.facebookUrl) cand.facebookUrl = crawled.facebookUrl;
      }
    }

    // Optional Hunter.io fallback if email still missing
    if (!cand.email && domain && hunterKey) {
      try {
        const hRes = await fetch(
          `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=2&api_key=${encodeURIComponent(hunterKey)}`,
          { signal: AbortSignal.timeout(7000) }
        );
        if (hRes.ok) {
          const hData = await hRes.json();
          const first = hData?.data?.emails?.[0];
          if (first?.value) {
            cand.email = first.value;
            if (!cand.contactPerson && (first.first_name || first.last_name)) {
              cand.contactPerson = `${first.first_name || ''} ${first.last_name || ''}`.trim();
              cand.designation = first.position || '';
            }
          }
        }
      } catch {
        // Ignore enrichment fallback errors
      }
    }

    const doc = await Lead.create({
      workspaceId: params.workspaceId,
      campaignId: params.campaignId,
      companyName: cand.companyName,
      normalizedDomain: domain,
      website: cand.website,
      country: cand.country,
      city: cand.city,
      industry: cand.industry,
      category: cand.category,
      companySize: cand.companySize,
      phone: cand.phone,
      whatsapp: sanitizePhoneToWhatsapp(cand.phone),
      email: cand.email,
      contactPerson: cand.contactPerson,
      designation: cand.designation,
      linkedinUrl: cand.linkedinUrl,
      instagramUrl: cand.instagramUrl,
      facebookUrl: cand.facebookUrl,
      googleMapsUrl: cand.googleMapsUrl,
      rating: cand.rating,
      reviewCount: cand.reviewCount,
      source: cand.source,
      aiStatus: 'PENDING',
      pipelineStage: 'NEW',
      approvalStatus: 'PENDING',
      assignedTo: params.assignedTo,
    });

    createdLeads.push(doc);
  }

  return {
    createdLeads,
    duplicatesSkipped,
    suppressedSkipped,
    sourcesUsed,
    warnings,
  };
}

