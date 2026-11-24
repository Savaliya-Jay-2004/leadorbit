import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { ApiIntegration } from '@/models/ApiIntegration';
import { decryptSecret, encryptSecret, maskSecret } from '@/lib/crypto';
import { ActivityLog } from '@/models/ActivityLog';

export async function GET() {
  try {
    const user = await requireUser(['SUPER_ADMIN']);
    await connectDB();

    const docs = await ApiIntegration.find({ workspaceId: user.workspaceId }).sort({
      category: 1,
      label: 1,
    });

    const integrations = docs.map((d) => {
      const plain = d.encryptedApiKey ? decryptSecret(d.encryptedApiKey) : '';
      return {
        id: d.id,
        provider: d.provider,
        label: d.label,
        category: d.category,
        description: d.description,
        docsUrl: d.docsUrl,
        maskedKey: maskSecret(plain),
        hasKey: Boolean(plain),
        isEnabled: d.isEnabled,
        dailyLimit: d.dailyLimit,
        usedToday: d.usedToday,
        status: d.status,
        lastTestedAt: d.lastTestedAt,
        lastError: d.lastError,
      };
    });

    return NextResponse.json({ success: true, integrations });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(['SUPER_ADMIN']);
    await connectDB();
    const body = await req.json();

    if (!body.provider) {
      return NextResponse.json({ success: false, error: 'Provider is required.' }, { status: 400 });
    }

    const doc = await ApiIntegration.findOne({
      workspaceId: user.workspaceId,
      provider: body.provider,
    });
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Integration not found.' }, { status: 404 });
    }

    if (typeof body.apiKey === 'string') {
      const trimmed = body.apiKey.trim();
      if (trimmed === '') {
        doc.encryptedApiKey = '';
        doc.status = 'UNCONFIGURED';
        doc.isEnabled = false;
      } else {
        doc.encryptedApiKey = encryptSecret(trimmed);
        doc.lastError = '';
      }
    }

    if (typeof body.isEnabled === 'boolean') {
      doc.isEnabled = body.isEnabled;
    }
    if (typeof body.dailyLimit === 'number' && body.dailyLimit >= 0) {
      doc.dailyLimit = body.dailyLimit;
    }
    if (body.resetUsage === true) {
      doc.usedToday = 0;
    }

    await doc.save();

    await ActivityLog.create({
      workspaceId: user.workspaceId,
      userId: user.id,
      userName: user.name,
      action: 'INTEGRATION_UPDATED',
      details: `Updated API integration "${doc.label}" (Enabled: ${doc.isEnabled}).`,
    });

    const plain = doc.encryptedApiKey ? decryptSecret(doc.encryptedApiKey) : '';
    return NextResponse.json({
      success: true,
      integration: {
        id: doc.id,
        provider: doc.provider,
        label: doc.label,
        category: doc.category,
        description: doc.description,
        docsUrl: doc.docsUrl,
        maskedKey: maskSecret(plain),
        hasKey: Boolean(plain),
        isEnabled: doc.isEnabled,
        dailyLimit: doc.dailyLimit,
        usedToday: doc.usedToday,
        status: doc.status,
        lastTestedAt: doc.lastTestedAt,
        lastError: doc.lastError,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

