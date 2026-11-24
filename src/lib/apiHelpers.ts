import { NextResponse } from 'next/server';

export function handleApiError(err: unknown) {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  if (message === 'UNAUTHORIZED') {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }
  if (message === 'FORBIDDEN') {
    return NextResponse.json(
      { success: false, error: 'You do not have permission for this action.' },
      { status: 403 }
    );
  }
  if (message.includes('MONGODB_URI') || message.includes('ECONNREFUSED') || message.includes('buffering timed out')) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Database connection failed. Ensure MongoDB is running or configure MONGODB_URI in .env.local.',
      },
      { status: 503 }
    );
  }
  console.error('[LeadOrbit API Error]:', err);
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}

