import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ success: true, database: 'connected' });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        database: 'disconnected',
        error: err instanceof Error ? err.message : 'MongoDB unavailable',
      },
      { status: 503 }
    );
  }
}

