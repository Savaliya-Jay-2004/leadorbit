import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { FollowUpTask } from '@/models/FollowUpTask';
import { Lead } from '@/models/Lead';
import { ActivityLog } from '@/models/ActivityLog';

export async function GET() {
  try {
    const user = await requireUser();
    await connectDB();

    const query: Record<string, unknown> = { workspaceId: user.workspaceId };
    if (user.role === 'BDE') {
      query.assignedTo = user.id;
    }

    const tasks = await FollowUpTask.find(query).sort({ status: -1, dueAt: 1 }).lean();
    const leadIds = Array.from(new Set(tasks.map((t) => t.leadId)));
    const leads = await Lead.find({ _id: { $in: leadIds } }).lean();
    const leadMap = new Map(leads.map((l) => [String(l._id), l]));

    const enriched = tasks.map((t) => {
      const lead = leadMap.get(t.leadId);
      return {
        ...t,
        lead: lead
          ? {
              id: String(lead._id),
              companyName: lead.companyName,
              phone: lead.phone,
              whatsapp: lead.whatsapp,
              email: lead.email,
              linkedinUrl: lead.linkedinUrl,
              instagramUrl: lead.instagramUrl,
              pipelineStage: lead.pipelineStage,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, tasks: enriched });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    await connectDB();
    const body = await req.json();

    const task = await FollowUpTask.findOne({
      _id: body.taskId,
      workspaceId: user.workspaceId,
    });
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    task.status = body.status === 'SKIPPED' ? 'SKIPPED' : 'COMPLETED';
    task.completedAt = new Date();
    await task.save();

    await ActivityLog.create({
      workspaceId: user.workspaceId,
      leadId: task.leadId,
      userId: user.id,
      userName: user.name,
      action: `FOLLOWUP_${task.status}`,
      details: `Marked Day ${task.stepDay} follow-up as ${task.status.toLowerCase()}.`,
    });

    return NextResponse.json({ success: true, task });
  } catch (err) {
    return handleApiError(err);
  }
}

