import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { Lead } from '@/models/Lead';
import { SuppressionEntry } from '@/models/SuppressionEntry';
import { ActivityLog } from '@/models/ActivityLog';
import { crawlWebsite, normalizeDomain } from '@/lib/crawler';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const stage = searchParams.get('stage') || '';
    const category = searchParams.get('category') || '';
    const campaignId = searchParams.get('campaignId') || '';
    const minScore = Number(searchParams.get('minScore') || '0');

    const query: Record<string, unknown> = { workspaceId: user.workspaceId };
    if (user.role === 'BDE') {
      query.$or = [{ assignedTo: user.id }, { assignedTo: { $exists: false } }, { assignedTo: '' }];
    }
    if (stage && stage !== 'ALL') query.pipelineStage = stage;
    if (category && category !== 'ALL') query.category = category;
    if (campaignId) query.campaignId = campaignId;
    if (minScore > 0) query.auditScore = { $gte: minScore };
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$and = [
        ...(Array.isArray(query.$and) ? (query.$and as unknown[]) : []),
        {
          $or: [
            { companyName: rx },
            { normalizedDomain: rx },
            { industry: rx },
            { city: rx },
            { email: rx },
            { phone: rx },
          ],
        },
      ];
    }

    const leads = await Lead.find(query).sort({ auditScore: -1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, leads });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    await connectDB();
    const body = await req.json();

    if (!body.companyName) {
      return NextResponse.json(
        { success: false, error: 'Company name is required.' },
        { status: 400 }
      );
    }

    const website = String(body.website || '').trim();
    const normalizedDomain = normalizeDomain(website);
    const email = String(body.email || '').toLowerCase().trim();
    const phone = String(body.phone || '').trim();

    // Check Suppression List
    const suppressed = await SuppressionEntry.findOne({
      workspaceId: user.workspaceId,
      $or: [
        ...(normalizedDomain ? [{ normalizedDomain }] : []),
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });
    if (suppressed) {
      return NextResponse.json(
        { success: false, error: `Blocked by Do-Not-Contact list: ${suppressed.reason}` },
        { status: 409 }
      );
    }

    // Duplicate Check unless forceCreate
    if (!body.forceCreate) {
      const dup = await Lead.findOne({
        workspaceId: user.workspaceId,
        $or: [
          ...(normalizedDomain ? [{ normalizedDomain }] : []),
          { companyName: new RegExp(`^${String(body.companyName).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        ],
      });
      if (dup) {
        return NextResponse.json(
          { success: false, error: `Duplicate lead detected (${dup.companyName}).` },
          { status: 409 }
        );
      }
    }

    // Auto-extract public contact info from website if provided & fields are blank
    let enrichedEmail = email;
    let enrichedPhone = phone;
    let linkedinUrl = String(body.linkedinUrl || '').trim();
    let instagramUrl = String(body.instagramUrl || '').trim();

    if (website && (!enrichedEmail || !enrichedPhone)) {
      const crawled = await crawlWebsite(website);
      if (crawled.reachable) {
        if (!enrichedEmail && crawled.emails.length > 0) enrichedEmail = crawled.emails[0];
        if (!enrichedPhone && crawled.phones.length > 0) enrichedPhone = crawled.phones[0];
        if (!linkedinUrl && crawled.linkedinUrl) linkedinUrl = crawled.linkedinUrl;
        if (!instagramUrl && crawled.instagramUrl) instagramUrl = crawled.instagramUrl;
      }
    }

    const lead = await Lead.create({
      workspaceId: user.workspaceId,
      campaignId: body.campaignId || undefined,
      companyName: String(body.companyName).trim(),
      normalizedDomain,
      website,
      country: String(body.country || '').trim(),
      city: String(body.city || '').trim(),
      industry: String(body.industry || '').trim(),
      category: String(body.category || 'Small & Medium Business'),
      companySize: String(body.companySize || ''),
      phone: enrichedPhone,
      whatsapp: enrichedPhone.replace(/[^\d]/g, ''),
      email: enrichedEmail,
      contactPerson: String(body.contactPerson || '').trim(),
      designation: String(body.designation || '').trim(),
      linkedinUrl,
      instagramUrl,
      source: String(body.source || 'Manual Entry'),
      assignedTo: body.assignedTo || user.id,
      notes: String(body.notes || ''),
      tags: Array.isArray(body.tags) ? body.tags : [],
    });

    await ActivityLog.create({
      workspaceId: user.workspaceId,
      leadId: lead.id,
      userId: user.id,
      userName: user.name,
      action: 'LEAD_ADDED',
      details: `Added lead "${lead.companyName}" manually.`,
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

