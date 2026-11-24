import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { Lead } from '@/models/Lead';
import { LeadAudit } from '@/models/LeadAudit';
import { OutreachMessage } from '@/models/OutreachMessage';
import { Conversation } from '@/models/Conversation';
import { FollowUpTask } from '@/models/FollowUpTask';
import { ActivityLog } from '@/models/ActivityLog';
import { User } from '@/models/User';
import { PIPELINE_STAGES } from '@/lib/constants';

export async function GET() {
  try {
    const user = await requireUser();
    await connectDB();

    const baseFilter: Record<string, unknown> = { workspaceId: user.workspaceId };
    if (user.role === 'BDE') {
      baseFilter.$or = [{ assignedTo: user.id }, { assignedTo: { $exists: false } }, { assignedTo: '' }];
    }

    const [
      leads,
      auditsCount,
      draftedCount,
      sentCount,
      responsesCount,
      dueFollowUps,
      recentActivities,
      users,
    ] = await Promise.all([
      Lead.find(baseFilter).sort({ createdAt: -1 }).lean(),
      LeadAudit.countDocuments({ workspaceId: user.workspaceId }),
      OutreachMessage.countDocuments({ workspaceId: user.workspaceId, status: { $in: ['DRAFT', 'APPROVED'] } }),
      OutreachMessage.countDocuments({ workspaceId: user.workspaceId, status: 'MANUALLY_SENT' }),
      Conversation.countDocuments({ workspaceId: user.workspaceId, sender: 'PROSPECT' }),
      FollowUpTask.find({
        workspaceId: user.workspaceId,
        status: 'PENDING',
        ...(user.role === 'BDE' ? { assignedTo: user.id } : {}),
      })
        .sort({ dueAt: 1 })
        .limit(8)
        .lean(),
      ActivityLog.find({ workspaceId: user.workspaceId }).sort({ createdAt: -1 }).limit(12).lean(),
      User.find({ workspaceId: user.workspaceId }).select('name role email').lean(),
    ]);

    const stageCounts = PIPELINE_STAGES.map((st) => ({
      stage: st.id,
      label: st.label,
      color: st.color,
      count: leads.filter((l) => l.pipelineStage === st.id).length,
    }));

    const industryMap = new Map<string, number>();
    const sourceMap = new Map<string, number>();
    for (const l of leads) {
      const ind = l.category || l.industry || 'Other';
      industryMap.set(ind, (industryMap.get(ind) || 0) + 1);
      const src = l.source || 'Manual';
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
    }

    const userMap = new Map(users.map((u) => [String(u._id), u.name]));
    const leadMap = new Map(leads.map((l) => [String(l._id), l]));

    const bdePerformance = users.map((u) => {
      const uid = String(u._id);
      const owned = leads.filter((l) => l.assignedTo === uid);
      return {
        userId: uid,
        name: u.name,
        role: u.role,
        assignedLeads: owned.length,
        sentOutreach: owned.filter((l) =>
          ['OUTREACH_SENT', 'IN_CONVERSATION', 'INTERESTED', 'MEETING_SCHEDULED', 'PROPOSAL_NEGOTIATION', 'WON'].includes(
            l.pipelineStage
          )
        ).length,
        wonCount: owned.filter((l) => l.pipelineStage === 'WON').length,
      };
    });

    const totalLeads = leads.length;
    const qualifiedLeads = leads.filter((l) => l.approvalStatus === 'APPROVED' || l.pipelineStage !== 'NEW').length;
    const interestedCount = leads.filter((l) =>
      ['INTERESTED', 'MEETING_SCHEDULED', 'PROPOSAL_NEGOTIATION', 'WON'].includes(l.pipelineStage)
    ).length;
    const meetingsScheduled = leads.filter((l) => l.pipelineStage === 'MEETING_SCHEDULED').length;
    const proposalsSent = leads.filter((l) => l.pipelineStage === 'PROPOSAL_NEGOTIATION').length;
    const wonCount = leads.filter((l) => l.pipelineStage === 'WON').length;
    const lostCount = leads.filter((l) => l.pipelineStage === 'LOST').length;

    const contactedCount = leads.filter((l) => l.pipelineStage !== 'NEW' && l.pipelineStage !== 'QUALIFIED').length;
    const responseRate = contactedCount > 0 ? Math.round((responsesCount / contactedCount) * 100) : 0;
    const conversionRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalLeads,
        qualifiedLeads,
        auditsCount,
        draftedCount,
        sentCount,
        responsesCount,
        interestedCount,
        meetingsScheduled,
        proposalsSent,
        wonCount,
        lostCount,
        responseRate,
        conversionRate,
      },
      stageCounts,
      industryDistribution: Array.from(industryMap.entries()).map(([name, count]) => ({ name, count })),
      sourceDistribution: Array.from(sourceMap.entries()).map(([name, count]) => ({ name, count })),
      bdePerformance,
      recentLeads: leads.slice(0, 6).map((l) => ({
        id: String(l._id),
        companyName: l.companyName,
        industry: l.industry,
        city: l.city,
        auditScore: l.auditScore,
        pipelineStage: l.pipelineStage,
        assignedName: userMap.get(l.assignedTo || '') || 'Unassigned',
      })),
      dueFollowUps: dueFollowUps.map((f) => ({
        id: String(f._id),
        leadId: f.leadId,
        companyName: leadMap.get(f.leadId)?.companyName || 'Lead',
        stepDay: f.stepDay,
        channel: f.channel,
        dueAt: f.dueAt,
      })),
      recentActivities,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

