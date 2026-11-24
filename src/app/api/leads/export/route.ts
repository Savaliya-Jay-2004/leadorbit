import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { Lead } from '@/models/Lead';

function csvCell(val: unknown): string {
  const s = String(val ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

export async function GET() {
  try {
    const user = await requireUser();
    await connectDB();

    const leads = await Lead.find({ workspaceId: user.workspaceId })
      .sort({ auditScore: -1, createdAt: -1 })
      .lean();

    const headers = [
      'Company Name',
      'Industry',
      'Category',
      'Website',
      'Phone',
      'Email',
      'Contact Person',
      'Designation',
      'LinkedIn',
      'Instagram',
      'Country',
      'City',
      'Audit Score',
      'Pipeline Stage',
      'Source',
      'Discovery Date',
    ];

    const rows = leads.map((l) =>
      [
        l.companyName,
        l.industry,
        l.category,
        l.website,
        l.phone,
        l.email,
        l.contactPerson,
        l.designation,
        l.linkedinUrl,
        l.instagramUrl,
        l.country,
        l.city,
        l.auditScore,
        l.pipelineStage,
        l.source,
        l.discoveredAt ? new Date(l.discoveredAt).toISOString().slice(0, 10) : '',
      ]
        .map(csvCell)
        .join(',')
    );

    const csv = [headers.map(csvCell).join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leadorbit-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

