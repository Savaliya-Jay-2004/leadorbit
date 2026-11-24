import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';
import { User } from '@/models/User';

export async function GET() {
  try {
    const user = await requireUser(['SUPER_ADMIN', 'SALES_MANAGER']);
    await connectDB();
    const users = await User.find({ workspaceId: user.workspaceId })
      .select('-passwordHash')
      .sort({ createdAt: 1 })
      .lean();
    return NextResponse.json({ success: true, users });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(['SUPER_ADMIN']);
    await connectDB();
    const body = await req.json();

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and password are required.' },
        { status: 400 }
      );
    }

    const email = String(body.email).toLowerCase().trim();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A user with this email already exists.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(String(body.password), 10);
    const created = await User.create({
      workspaceId: user.workspaceId,
      name: String(body.name).trim(),
      email,
      passwordHash,
      role: body.role || 'BDE',
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          _id: created._id,
          name: created.name,
          email: created.email,
          role: created.role,
          isActive: created.isActive,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireUser(['SUPER_ADMIN']);
    await connectDB();
    const body = await req.json();

    const target = await User.findOne({ _id: body.userId, workspaceId: admin.workspaceId });
    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    if (typeof body.isActive === 'boolean') target.isActive = body.isActive;
    if (body.role) target.role = body.role;
    if (typeof body.password === 'string' && body.password.trim().length >= 6) {
      target.passwordHash = await bcrypt.hash(body.password.trim(), 10);
    }

    await target.save();
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}

