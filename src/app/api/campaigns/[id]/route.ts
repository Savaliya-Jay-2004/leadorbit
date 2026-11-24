import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { Campaign } from '@/models/Campaign';
import { Lead } from '@/models/Lead';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    await connectDB();
    const { id } = await context.params;

    const campaign = await Campaign.findOne({ _id: id, workspaceId: user.workspaceId }).lean();
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    const leads = await Lead.find({ campaignId: id, workspaceId: user.workspaceId })
      .sort({ auditScore: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, campaign, leads });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    await connectDB();
    const { id } = await context.params;

    await Campaign.deleteOne({ _id: id, workspaceId: user.workspaceId });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

