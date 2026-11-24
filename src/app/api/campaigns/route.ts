import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { Campaign } from '@/models/Campaign';
import { ActivityLog } from '@/models/ActivityLog';

export async function GET() {
  try {
    const user = await requireUser();
    await connectDB();

    const campaigns = await Campaign.find({ workspaceId: user.workspaceId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, campaigns });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    await connectDB();
    const body = await req.json();

    if (!body.name || !body.industry || !body.country) {
      return NextResponse.json(
        { success: false, error: 'Campaign name, industry, and country are required.' },
        { status: 400 }
      );
    }

    const campaign = await Campaign.create({
      workspaceId: user.workspaceId,
      name: String(body.name).trim(),
      industry: String(body.industry).trim(),
      country: String(body.country).trim(),
      city: String(body.city || '').trim(),
      targetBusinessType: String(body.targetBusinessType || '').trim(),
      companySize: String(body.companySize || 'Any'),
      requiredServices: Array.isArray(body.requiredServices) ? body.requiredServices : [],
      keywords: String(body.keywords || '').trim(),
      targetCount: Math.min(Math.max(Number(body.targetCount) || 15, 1), 50),
      status: 'DRAFT',
      createdBy: user.id,
    });

    await ActivityLog.create({
      workspaceId: user.workspaceId,
      userId: user.id,
      userName: user.name,
      action: 'CAMPAIGN_CREATED',
      details: `Created campaign "${campaign.name}" (${campaign.industry} · ${campaign.city ? `${campaign.city}, ` : ''}${campaign.country})`,
    });

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

