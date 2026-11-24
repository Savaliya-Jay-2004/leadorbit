import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { analyzeReplyAndSuggestClosers } from '@/lib/outreachEngine';
import { Conversation } from '@/models/Conversation';
import { FollowUpTask } from '@/models/FollowUpTask';
import { Lead } from '@/models/Lead';
import { SuppressionEntry } from '@/models/SuppressionEntry';
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

    // Log a manual BDE reply
    if (body.sender === 'BDE') {
      const conv = await Conversation.create({
        workspaceId: user.workspaceId,
        leadId: id,
        sender: 'BDE',
        channel: body.channel || 'EMAIL',
        messageText: String(body.messageText || ''),
        createdBy: user.id,
      });

      await ActivityLog.create({
        workspaceId: user.workspaceId,
        leadId: id,
        userId: user.id,
        userName: user.name,
        action: 'BDE_REPLY_LOGGED',
        details: `Logged manual ${conv.channel} reply.`,
      });

      return NextResponse.json({ success: true, conversation: conv });
    }

    if (!body.prospectReply) {
      return NextResponse.json(
        { success: false, error: 'Please paste the prospect reply text.' },
        { status: 400 }
      );
    }

    const conv = await analyzeReplyAndSuggestClosers({
      leadId: id,
      prospectReply: String(body.prospectReply),
      channel: body.channel || 'EMAIL',
      userId: user.id,
      workspaceId: user.workspaceId,
    });

    // Cancel pending automated follow-ups since the prospect replied
    await FollowUpTask.updateMany(
      { leadId: id, status: 'PENDING' },
      { $set: { status: 'SKIPPED', completedAt: new Date() } }
    );

    if (conv.aiIntent === 'NOT_INTERESTED') {
      const lead = await Lead.findById(id);
      if (lead) {
        lead.doNotContact = true;
        await lead.save();
        await SuppressionEntry.create({
          workspaceId: user.workspaceId,
          email: lead.email || '',
          normalizedDomain: lead.normalizedDomain || '',
          phone: lead.phone || '',
          reason: 'Prospect replied Not Interested',
          addedBy: user.name,
        });
      }
    }

    await ActivityLog.create({
      workspaceId: user.workspaceId,
      leadId: id,
      userId: user.id,
      userName: user.name,
      action: 'CLOSER_ANALYZED_REPLY',
      details: `Classified prospect reply as ${conv.aiIntent || 'UNCLEAR'}.`,
    });

    return NextResponse.json({ success: true, conversation: conv });
  } catch (err) {
    return handleApiError(err);
  }
}

