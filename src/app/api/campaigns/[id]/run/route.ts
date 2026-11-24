import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { Campaign } from '@/models/Campaign';
import { ActivityLog } from '@/models/ActivityLog';
import { runLeadDiscovery } from '@/lib/leadHunter';
import { auditSingleLead } from '@/lib/businessAuditor';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    await connectDB();
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const autoAudit = body.autoAudit !== false;

    const campaign = await Campaign.findOne({ _id: id, workspaceId: user.workspaceId });
    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    campaign.status = 'RUNNING';
    campaign.lastRunError = '';
    await campaign.save();

    const discovery = await runLeadDiscovery({
      workspaceId: user.workspaceId,
      campaignId: campaign.id,
      industry: campaign.industry,
      country: campaign.country,
      city: campaign.city,
      targetBusinessType: campaign.targetBusinessType,
      companySize: campaign.companySize,
      keywords: campaign.keywords,
      targetCount: campaign.targetCount,
      assignedTo: user.id,
    });

    let auditedCount = 0;
    if (autoAudit && discovery.createdLeads.length > 0) {
      // Audit up to 10 leads cleanly in parallel chunks to stay responsive
      const leadsToAudit = discovery.createdLeads.slice(0, 15);
      const chunkSize = 3;
      for (let i = 0; i < leadsToAudit.length; i += chunkSize) {
        const chunk = leadsToAudit.slice(i, i + chunkSize);
        await Promise.allSettled(
          chunk.map(async (lead) => {
            await auditSingleLead(lead.id, campaign.requiredServices, user.workspaceId);
            auditedCount++;
          })
        );
      }
    }

    campaign.discoveredCount += discovery.createdLeads.length;
    campaign.auditedCount += auditedCount;
    campaign.status = 'COMPLETED';
    if (discovery.warnings.length > 0 && discovery.createdLeads.length === 0) {
      campaign.lastRunError = discovery.warnings.join(' | ');
    }
    await campaign.save();

    await ActivityLog.create({
      workspaceId: user.workspaceId,
      userId: user.id,
      userName: user.name,
      action: 'CAMPAIGN_EXECUTED',
      details: `Campaign "${campaign.name}" discovered ${discovery.createdLeads.length} leads (${discovery.duplicatesSkipped} duplicates skipped) and audited ${auditedCount}.`,
    });

    return NextResponse.json({
      success: true,
      discoveredCount: discovery.createdLeads.length,
      auditedCount,
      duplicatesSkipped: discovery.duplicatesSkipped,
      suppressedSkipped: discovery.suppressedSkipped,
      sourcesUsed: discovery.sourcesUsed,
      warnings: discovery.warnings,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

