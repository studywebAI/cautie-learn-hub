import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
      ts: new Date().toISOString(),
      event: body?.event || 'unknown',
      sessionId: body?.sessionId || null,
      details: body || {},
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[mic-debug] error', {
      message: error?.message || 'unknown',
      ts: new Date().toISOString(),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

