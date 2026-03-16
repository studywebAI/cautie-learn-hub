import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const normalizeLanguage = (value?: string | null) => {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return lower.includes('-') ? lower.split('-')[0] : lower;
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_STT_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured on the server.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const input = formData.get('file');
    const language = normalizeLanguage(formData.get('language')?.toString());

    if (!(input instanceof File)) {
      return NextResponse.json({ error: 'Missing audio file.' }, { status: 400 });
    }

    if (!input.type.startsWith('audio/') && !input.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be audio or video.' }, { status: 400 });
    }

    if (input.size <= 0) {
      return NextResponse.json({ error: 'Audio file is empty.' }, { status: 400 });
    }

    if (input.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: 'Audio file is too large. Max size is 25MB.' },
        { status: 413 }
      );
    }

    const upstreamForm = new FormData();
    upstreamForm.append('model', 'whisper-1');
    upstreamForm.append('file', input, input.name || 'speech.webm');
    if (language) upstreamForm.append('language', language);

    const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamForm,
    });

    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const message =
        payload?.error?.message || `Transcription provider request failed (${upstream.status}).`;
      return NextResponse.json({ error: message }, { status: upstream.status });
    }

    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    return NextResponse.json({ text });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unexpected transcription server error.' },
      { status: 500 }
    );
  }
}
