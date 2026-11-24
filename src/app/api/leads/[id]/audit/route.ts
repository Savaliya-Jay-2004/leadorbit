import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { auditSingleLead } from '@/lib/businessAuditor';
import { ActivityLog } from '@/models/ActivityLog';
import { Lead } from '@/models/Lead';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    await connectDB();
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const lead = await Lead.findOne({ _id: id, workspaceId: user.workspaceId });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const audit = await auditSingleLead(
      id,
      Array.isArray(body.requiredServices) ? body.requiredServices : [],
      user.workspaceId,
      Boolean(body.forceRefresh)
    );

    await ActivityLog.create({
      workspaceId: user.workspaceId,
      leadId: id,
      userId: user.id,
      userName: user.name,
      action: 'AUDIT_COMPLETED',
      details: `Completed business audit for "${lead.companyName}" (Score: ${audit.score}/100, ${audit.verificationStatus}).`,
    });

    return NextResponse.json({ success: true, audit });
  } catch (err) {
    return handleApiError(err);
  }
}

