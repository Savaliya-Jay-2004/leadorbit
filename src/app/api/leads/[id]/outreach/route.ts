import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { buildFollowUpMessage, generateOutreachDraft } from '@/lib/outreachEngine';
import { OutreachMessage } from '@/models/OutreachMessage';
import { Lead } from '@/models/Lead';
import { FollowUpTask } from '@/models/FollowUpTask';
import { AiModuleConfig } from '@/models/AiModuleConfig';
import { Conversation } from '@/models/Conversation';
import { ActivityLog } from '@/models/ActivityLog';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    await connectDB();
    const { id } = await context.params;
    const body = await req.json();

    const message = await generateOutreachDraft({
      leadId: id,
      channel: body.channel || 'EMAIL',
      tone: body.tone || 'DIRECT',
      length: body.length || 'SHORT',
      serviceFocus: body.serviceFocus,
      userId: user.id,
      workspaceId: user.workspaceId,
    });

    await ActivityLog.create({
      workspaceId: user.workspaceId,
      leadId: id,
      userId: user.id,
      userName: user.name,
      action: 'OUTREACH_DRAFTED',
      details: `Generated ${message.channel} outreach draft.`,
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
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

    const msg = await OutreachMessage.findOne({ _id: body.messageId, leadId: id });
    if (!msg) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    if (body.subject !== undefined) msg.subject = String(body.subject);
    if (body.body !== undefined) msg.body = String(body.body);
    if (body.status !== undefined) msg.status = body.status;

    if (body.status === 'MANUALLY_SENT') {
      msg.sentBy = user.id;
      msg.sentAt = new Date();
      await msg.save();

      const lead = await Lead.findById(id);
      if (lead) {
        if (lead.pipelineStage === 'NEW' || lead.pipelineStage === 'QUALIFIED') {
          lead.pipelineStage = 'OUTREACH_SENT';
        }
        lead.approvalStatus = 'APPROVED';
        await lead.save();

        await Conversation.create({
          workspaceId: user.workspaceId,
          leadId: id,
          sender: 'BDE',
          channel: msg.channel,
          messageText: msg.subject ? `[${msg.subject}]\n${msg.body}` : msg.body,
          createdBy: user.id,
        });

        // Auto-schedule Day 3 / Day 7 / Day 14 follow-up tasks if none exist yet
        const existingTasks = await FollowUpTask.countDocuments({ leadId: id, status: 'PENDING' });
        if (existingTasks === 0) {
          const closerCfg = await AiModuleConfig.findOne({
            workspaceId: user.workspaceId,
            moduleName: 'CLOSER',
          });
          const days: number[] = closerCfg?.followUpDays?.length
            ? closerCfg.followUpDays
            : [3, 7, 14];
          await FollowUpTask.insertMany(
            days.map((stepDay: number) => ({
              workspaceId: user.workspaceId,
              leadId: id,
              assignedTo: lead.assignedTo || user.id,
              stepDay,
              channel: msg.channel,
              dueAt: new Date(Date.now() + stepDay * 24 * 60 * 60 * 1000),
              status: 'PENDING',
              suggestedMessage: buildFollowUpMessage(lead.companyName, stepDay),
            }))
          );
        }

        await ActivityLog.create({
          workspaceId: user.workspaceId,
          leadId: id,
          userId: user.id,
          userName: user.name,
          action: 'OUTREACH_MARKED_SENT',
          details: `Marked ${msg.channel} outreach to "${lead.companyName}" as manually sent and scheduled follow-ups.`,
        });
      }
    } else {
      await msg.save();
    }

    return NextResponse.json({ success: true, message: msg });
  } catch (err) {
    return handleApiError(err);
  }
}

