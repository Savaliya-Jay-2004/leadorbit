import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/models/User';
import { setSessionCookie } from '@/lib/auth';
import { handleApiError } from '@/lib/apiHelpers';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials or inactive account.' },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(String(password), user.passwordHash);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials.' }, { status: 401 });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    };

    await setSessionCookie(sessionUser);
    return NextResponse.json({ success: true, user: sessionUser });
  } catch (err) {
    return handleApiError(err);
  }
}

