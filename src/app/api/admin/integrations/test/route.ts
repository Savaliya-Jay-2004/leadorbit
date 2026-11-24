import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { ApiIntegration } from '@/models/ApiIntegration';
import { decryptSecret } from '@/lib/crypto';
import { testProviderKey } from '@/lib/integrations';

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(['SUPER_ADMIN']);
    await connectDB();
    const body = await req.json();

    const doc = await ApiIntegration.findOne({
      workspaceId: user.workspaceId,
      provider: body.provider,
    });
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Integration not found.' }, { status: 404 });
    }

    const keyToTest =
      typeof body.apiKey === 'string' && body.apiKey.trim()
        ? body.apiKey.trim()
        : decryptSecret(doc.encryptedApiKey);

    if (!keyToTest) {
      return NextResponse.json(
        { success: false, ok: false, message: 'No API key configured yet.' },
        { status: 400 }
      );
    }

    const result = await testProviderKey(doc.provider, keyToTest);
    doc.status = result.ok ? 'CONNECTED' : 'ERROR';
    doc.lastTestedAt = new Date();
    doc.lastError = result.ok ? '' : result.message;
    await doc.save();

    return NextResponse.json({
      success: true,
      ok: result.ok,
      message: result.message,
      status: doc.status,
      lastTestedAt: doc.lastTestedAt,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

