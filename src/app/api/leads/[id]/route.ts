import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { Lead } from '@/models/Lead';
import { LeadAudit } from '@/models/LeadAudit';
import { OutreachMessage } from '@/models/OutreachMessage';
import { Conversation } from '@/models/Conversation';
import { FollowUpTask } from '@/models/FollowUpTask';
import { ActivityLog } from '@/models/ActivityLog';
import { SuppressionEntry } from '@/models/SuppressionEntry';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    await connectDB();
    const { id } = await context.params;

    const lead = await Lead.findOne({ _id: id, workspaceId: user.workspaceId }).lean();
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const [audit, outreachMessages, conversations, followUps, activities] = await Promise.all([
      LeadAudit.findOne({ leadId: id }).lean(),
      OutreachMessage.find({ leadId: id }).sort({ createdAt: -1 }).lean(),
      Conversation.find({ leadId: id }).sort({ createdAt: 1 }).lean(),
      FollowUpTask.find({ leadId: id }).sort({ stepDay: 1 }).lean(),
      ActivityLog.find({ leadId: id }).sort({ createdAt: -1 }).limit(30).lean(),
    ]);

    return NextResponse.json({
      success: true,
      lead,
      audit,
      outreachMessages,
      conversations,
      followUps,
      activities,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    await connectDB();
    const { id } = await context.params;
    const body = await req.json();

    const lead = await Lead.findOne({ _id: id, workspaceId: user.workspaceId });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const allowedFields = [
      'companyName',
      'website',
      'phone',
      'whatsapp',
      'email',
      'contactPerson',
      'designation',
      'linkedinUrl',
      'instagramUrl',
      'country',
      'city',
      'industry',
      'category',
      'pipelineStage',
      'approvalStatus',
      'assignedTo',
      'notes',
      'tags',
      'doNotContact',
    ] as const;

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lead as any)[key] = body[key];
      }
    }
    if (body.phone !== undefined && !body.whatsapp) {
      lead.whatsapp = String(body.phone).replace(/[^\d]/g, '');
    }

    await lead.save();

    if (body.doNotContact === true) {
      await SuppressionEntry.create({
        workspaceId: user.workspaceId,
        email: lead.email || '',
        normalizedDomain: lead.normalizedDomain || '',
        phone: lead.phone || '',
        reason: body.suppressionReason || 'Marked Do Not Contact by BDE',
        addedBy: user.name,
      });
    }

    await ActivityLog.create({
      workspaceId: user.workspaceId,
      leadId: lead.id,
      userId: user.id,
      userName: user.name,
      action: 'LEAD_UPDATED',
      details: body.pipelineStage
        ? `Moved "${lead.companyName}" to stage ${body.pipelineStage}.`
        : `Updated lead "${lead.companyName}".`,
    });

    return NextResponse.json({ success: true, lead });
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

    await Promise.all([
      Lead.deleteOne({ _id: id, workspaceId: user.workspaceId }),
      LeadAudit.deleteOne({ leadId: id }),
      OutreachMessage.deleteMany({ leadId: id }),
      Conversation.deleteMany({ leadId: id }),
      FollowUpTask.deleteMany({ leadId: id }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

