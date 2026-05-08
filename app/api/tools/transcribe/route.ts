import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { readUserAIRuntimeOptions } from '@/lib/ai/runtime-settings';

export const runtime = 'nodejs';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const normalizeLanguage = (value?: string | null) => {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  return lower.includes('-') ? lower.split('-')[0] : lower;
};

const parseDeepgramText = (payload: any) => {
  const text = String(
    payload?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
  ).trim();
  return text;
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
    const supabase = await createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    const runtimeOptions = user ? await readUserAIRuntimeOptions(supabase, user.id).catch(() => null) : null;
    const sttStrategy = runtimeOptions?.sttProviderStrategy || 'deepgram_with_openai_fallback';
    const deepgramApiKey = String(process.env.DEEPGRAM_API_KEY || '').trim();
    const openaiApiKey = runtimeOptions?.openaiApiKey || process.env.OPENAI_API_KEY || process.env.OPENAI_STT_API_KEY;

    const formData = await request.formData();
    const input = formData.get('file');
    const language = normalizeLanguage(formData.get('language')?.toString());
    const micSessionId = String(formData.get('micSessionId') || '').trim();
    const clientTs = String(formData.get('clientTs') || '').trim();
    log('transcribe_formdata_parsed', {
      language: language || null,
      micSessionId: micSessionId || null,
      clientTs: clientTs || null,
      inputType: input?.constructor?.name || typeof input,
      contentType: request.headers.get('content-type') || null,
      userAgent: request.headers.get('user-agent') || null,
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
      micSessionId: micSessionId || null,
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

    const tryDeepgram = async () => {
      if (!deepgramApiKey) {
        throw new Error('DEEPGRAM_API_KEY is not configured on the server.');
      }
      const query = new URLSearchParams({
        model: 'nova-3',
        punctuate: 'true',
        smart_format: 'true',
      });
      if (language && language !== 'auto') query.set('language', language);
      const deepgramResponse = await fetch(`https://api.deepgram.com/v1/listen?${query.toString()}`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          'Content-Type': input.type || 'audio/webm',
        },
        body: input,
      });
      const payload = await deepgramResponse.json().catch(() => null);
      const text = parseDeepgramText(payload);
      log('transcribe_upstream_response', {
        provider: 'deepgram',
        ok: deepgramResponse.ok,
        status: deepgramResponse.status,
        durationMs: Date.now() - startedAt,
        micSessionId: micSessionId || null,
        textLength: text.length,
        errorMessage: payload?.err_msg || payload?.error || null,
      });
      if (!deepgramResponse.ok) {
        throw new Error(payload?.err_msg || `Deepgram transcription failed (${deepgramResponse.status}).`);
      }
      return text;
    };

    const tryOpenAI = async () => {
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY is not configured on the server.');
      }
      const upstreamForm = new FormData();
      upstreamForm.append('model', 'whisper-1');
      upstreamForm.append('file', input, input.name || 'speech.webm');
      if (language) upstreamForm.append('language', language);
      const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: upstreamForm,
      });
      const payload = await upstream.json().catch(() => null);
      const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
      log('transcribe_upstream_response', {
        provider: 'openai',
        ok: upstream.ok,
        status: upstream.status,
        durationMs: Date.now() - startedAt,
        micSessionId: micSessionId || null,
        textLength: text.length,
        errorMessage: payload?.error?.message || null,
        errorType: payload?.error?.type || null,
        errorCode: payload?.error?.code || null,
      });
      if (!upstream.ok) {
        throw new Error(payload?.error?.message || `OpenAI transcription failed (${upstream.status}).`);
      }
      return text;
    };

    let text = '';
    let providerUsed: 'deepgram' | 'openai' | null = null;
    let fallbackReason: string | null = null;

    if (sttStrategy === 'openai_only') {
      text = await tryOpenAI();
      providerUsed = 'openai';
    } else {
      try {
        text = await tryDeepgram();
        providerUsed = 'deepgram';
      } catch (deepgramError: any) {
        fallbackReason = deepgramError?.message || 'deepgram_failed';
        log('transcribe_fallback_to_openai', {
          reason: fallbackReason,
          micSessionId: micSessionId || null,
        });
        text = await tryOpenAI();
        providerUsed = 'openai';
      }
    }

    log('transcribe_success', {
      providerUsed,
      sttStrategy,
      fallbackReason,
      textLength: text.length,
      durationMs: Date.now() - startedAt,
      micSessionId: micSessionId || null,
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
