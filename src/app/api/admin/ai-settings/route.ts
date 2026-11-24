import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { AiModuleConfig } from '@/models/AiModuleConfig';

export async function GET() {
  try {
    const user = await requireUser(['SUPER_ADMIN']);
    await connectDB();
    const configs = await AiModuleConfig.find({ workspaceId: user.workspaceId }).sort({
      moduleName: 1,
    });
    return NextResponse.json({ success: true, configs });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(['SUPER_ADMIN']);
    await connectDB();
    const body = await req.json();

    if (!body.moduleName) {
      return NextResponse.json({ success: false, error: 'moduleName required' }, { status: 400 });
    }

    const cfg = await AiModuleConfig.findOne({
      workspaceId: user.workspaceId,
      moduleName: body.moduleName,
    });
    if (!cfg) {
      return NextResponse.json({ success: false, error: 'Module config not found' }, { status: 404 });
    }

    if (body.provider) cfg.provider = body.provider;
    if (body.modelName) cfg.modelName = body.modelName;
    if (typeof body.systemPrompt === 'string') cfg.systemPrompt = body.systemPrompt;
    if (typeof body.temperature === 'number') cfg.temperature = body.temperature;
    if (typeof body.isActive === 'boolean') cfg.isActive = body.isActive;
    if (Array.isArray(body.followUpDays)) cfg.followUpDays = body.followUpDays;
    if (body.scoringWeights) cfg.scoringWeights = body.scoringWeights;

    await cfg.save();
    return NextResponse.json({ success: true, config: cfg });
  } catch (err) {
    return handleApiError(err);
  }
}

