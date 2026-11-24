import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { SuppressionEntry } from '@/models/SuppressionEntry';
import { normalizeDomain } from '@/lib/crawler';

export async function GET() {
  try {
    const user = await requireUser(['SUPER_ADMIN', 'SALES_MANAGER']);
    await connectDB();
    const entries = await SuppressionEntry.find({ workspaceId: user.workspaceId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, entries });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(['SUPER_ADMIN', 'SALES_MANAGER']);
    await connectDB();
    const body = await req.json();

    const entry = await SuppressionEntry.create({
      workspaceId: user.workspaceId,
      email: String(body.email || '').toLowerCase().trim(),
      normalizedDomain: normalizeDomain(String(body.domain || '')),
      phone: String(body.phone || '').trim(),
      reason: String(body.reason || 'Added to Do Not Contact list'),
      addedBy: user.name,
    });

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(['SUPER_ADMIN', 'SALES_MANAGER']);
    await connectDB();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      await SuppressionEntry.deleteOne({ _id: id, workspaceId: user.workspaceId });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

