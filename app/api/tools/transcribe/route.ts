import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const normalizeLanguage = (value?: string | null) => {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return lower.includes('-') ? lower.split('-')[0] : lower;
};

export async function POST(request: NextRequest) {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now();
  const log = (event: string, details?: Record<string, unknown>) => {
    console.log('[MIC_DEBUG][SERVER]', {
      event,
      requestId,
      ts: new Date().toISOString(),
      ...details,
    });
  };

  try {
    log('transcribe_request_received');
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_STT_API_KEY;
    if (!apiKey) {
      log('transcribe_missing_api_key');
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured on the server.' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const input = formData.get('file');
    const language = normalizeLanguage(formData.get('language')?.toString());
    log('transcribe_formdata_parsed', {
      language: language || null,
      inputType: input?.constructor?.name || typeof input,
    });

    if (!(input instanceof File)) {
      log('transcribe_validation_failed', { reason: 'missing_file' });
      return NextResponse.json({ error: 'Missing audio file.' }, { status: 400 });
    }

    log('transcribe_file_received', {
      fileName: input.name,
      fileType: input.type,
      fileSize: input.size,
      maxSize: MAX_AUDIO_BYTES,
    });

    if (!input.type.startsWith('audio/') && !input.type.startsWith('video/')) {
      log('transcribe_validation_failed', { reason: 'invalid_file_type', fileType: input.type });
      return NextResponse.json({ error: 'File must be audio or video.' }, { status: 400 });
    }

    if (input.size <= 0) {
      log('transcribe_validation_failed', { reason: 'empty_file' });
      return NextResponse.json({ error: 'Audio file is empty.' }, { status: 400 });
    }

    if (input.size > MAX_AUDIO_BYTES) {
      log('transcribe_validation_failed', { reason: 'file_too_large', fileSize: input.size });
      return NextResponse.json(
        { error: 'Audio file is too large. Max size is 25MB.' },
        { status: 413 }
      );
    }

    const upstreamForm = new FormData();
    upstreamForm.append('model', 'whisper-1');
    upstreamForm.append('file', input, input.name || 'speech.webm');
    if (language) upstreamForm.append('language', language);
    log('transcribe_upstream_request_start', {
      model: 'whisper-1',
      language: language || null,
    });

    const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamForm,
    });

    const payload = await upstream.json().catch(() => null);
    log('transcribe_upstream_response', {
      ok: upstream.ok,
      status: upstream.status,
      durationMs: Date.now() - startedAt,
      payloadKeys: payload ? Object.keys(payload) : [],
      textLength: typeof payload?.text === 'string' ? payload.text.length : 0,
      errorMessage: payload?.error?.message || null,
      errorType: payload?.error?.type || null,
      errorCode: payload?.error?.code || null,
    });
    if (!upstream.ok) {
      const message =
        payload?.error?.message || `Transcription provider request failed (${upstream.status}).`;
      log('transcribe_upstream_failed', { message });
      return NextResponse.json({ error: message }, { status: upstream.status });
    }

    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
    log('transcribe_success', {
      textLength: text.length,
      durationMs: Date.now() - startedAt,
      textPreview: text.slice(0, 160),
    });
    return NextResponse.json({ text });
  } catch (error: any) {
    log('transcribe_unexpected_error', {
      message: error?.message || null,
      stack: error?.stack || null,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { error: error?.message || 'Unexpected transcription server error.' },
      { status: 500 }
    );
  }
}
