import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { PortfolioItem } from '@/models/PortfolioItem';

export async function GET() {
  try {
    const user = await requireUser();
    await connectDB();
    const items = await PortfolioItem.find({ workspaceId: user.workspaceId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, items });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    await connectDB();
    const body = await req.json();

    if (!body.title || !body.projectUrl || !body.summary) {
      return NextResponse.json(
        { success: false, error: 'Title, project URL, and summary are required.' },
        { status: 400 }
      );
    }

    const item = await PortfolioItem.create({
      workspaceId: user.workspaceId,
      title: String(body.title).trim(),
      industry: String(body.industry || 'General'),
      serviceType: String(body.serviceType || 'Website Development & Redesign'),
      projectUrl: String(body.projectUrl).trim(),
      summary: String(body.summary).trim(),
      resultsMetric: String(body.resultsMetric || '').trim(),
      tags: Array.isArray(body.tags) ? body.tags : [],
      createdBy: user.id,
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      await PortfolioItem.deleteOne({ _id: id, workspaceId: user.workspaceId });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

