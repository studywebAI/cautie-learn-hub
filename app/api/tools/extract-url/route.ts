import { NextRequest, NextResponse } from 'next/server';

const MIN_MEANINGFUL_TEXT_LENGTH = 140;

const toHttpUrl = (input: string) => {
  const trimmed = String(input || '').trim();
  if (!trimmed) return null;
  const candidate = /^(https?:)?\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const extractMeta = (html: string, name: string) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i'
  );
  return html.match(regex)?.[1]?.trim() || '';
};

const extractTitle = (html: string) => html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';

const stripHtmlToText = (html: string) => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote|section|article|main)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
};

const cleanupExtractedText = (text: string) => {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
};

const decodeHtmlEntities = (value: string) => {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
};

const getYouTubeVideoId = (input: URL): string | null => {
  if (input.hostname.includes('youtu.be')) {
    const id = input.pathname.split('/').filter(Boolean)[0] || '';
    return id || null;
  }
  if (input.hostname.includes('youtube.com')) {
    const v = input.searchParams.get('v') || '';
    if (v) return v;
    const shortsMatch = input.pathname.match(/\/shorts\/([^/?#]+)/i);
    if (shortsMatch?.[1]) return shortsMatch[1];
    const embedMatch = input.pathname.match(/\/embed\/([^/?#]+)/i);
    if (embedMatch?.[1]) return embedMatch[1];
  }
  return null;
};

const parseCaptionTracks = (watchHtml: string) => {
  const marker = '"captionTracks":';
  const markerIndex = watchHtml.indexOf(marker);
  if (markerIndex === -1) return [] as Array<{ baseUrl: string; languageCode?: string }>;
  const startIndex = watchHtml.indexOf('[', markerIndex);
  if (startIndex === -1) return [] as Array<{ baseUrl: string; languageCode?: string }>;
  let depth = 0;
  let endIndex = -1;
  for (let index = startIndex; index < watchHtml.length; index += 1) {
    const char = watchHtml[index];
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        endIndex = index;
        break;
      }
    }
  }
  if (endIndex === -1) return [] as Array<{ baseUrl: string; languageCode?: string }>;
  const rawArray = watchHtml.slice(startIndex, endIndex + 1);
  try {
    const tracks = JSON.parse(rawArray);
    if (!Array.isArray(tracks)) return [] as Array<{ baseUrl: string; languageCode?: string }>;
    return tracks
      .map((track: any) => ({
        baseUrl: typeof track?.baseUrl === 'string' ? track.baseUrl : '',
        languageCode: typeof track?.languageCode === 'string' ? track.languageCode : undefined,
      }))
      .filter((track) => Boolean(track.baseUrl));
  } catch {
    return [] as Array<{ baseUrl: string; languageCode?: string }>;
  }
};

const fetchYouTubeTranscript = async (videoId: string) => {
  const watchResponse = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CautieLearn/1.0; +https://cautie.app)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (!watchResponse.ok) return '';
  const watchHtml = await watchResponse.text();
  const tracks = parseCaptionTracks(watchHtml);
  if (tracks.length === 0) return '';

  const preferredLanguageOrder = ['en', 'nl', 'de', 'fr', 'es', 'pt'];
  const sortedTracks = [...tracks].sort((a, b) => {
    const aIdx = preferredLanguageOrder.indexOf((a.languageCode || '').toLowerCase());
    const bIdx = preferredLanguageOrder.indexOf((b.languageCode || '').toLowerCase());
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  for (const track of sortedTracks) {
    try {
      const base = track.baseUrl.includes('&fmt=') ? track.baseUrl : `${track.baseUrl}&fmt=json3`;
      const transcriptResponse = await fetch(base, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CautieLearn/1.0; +https://cautie.app)',
          Accept: 'application/json,text/plain,*/*',
        },
        signal: AbortSignal.timeout(10000),
        cache: 'no-store',
      });
      if (!transcriptResponse.ok) continue;
      const payload = await transcriptResponse.json().catch(() => null);
      const events = Array.isArray(payload?.events) ? payload.events : [];
      const chunks = events
        .flatMap((event: any) => (Array.isArray(event?.segs) ? event.segs : []))
        .map((segment: any) => decodeHtmlEntities(String(segment?.utf8 || '')))
        .map((segment: string) => segment.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      const transcript = cleanupExtractedText(chunks.join(' '));
      if (transcript.length >= MIN_MEANINGFUL_TEXT_LENGTH) {
        return transcript;
      }
    } catch {
      continue;
    }
  }

  return '';
};

const fetchViaJinaReader = async (url: string) => {
  const readerUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, '')}`;
  const response = await fetch(readerUrl, {
    headers: { Accept: 'text/plain, text/markdown;q=0.9, */*;q=0.8' },
    signal: AbortSignal.timeout(20000),
    cache: 'no-store',
  });
  if (!response.ok) return '';
  const text = await response.text();
  return cleanupExtractedText(text);
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsedUrl = toHttpUrl(body?.url);
    if (!parsedUrl) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    const isYouTube = hostname.includes('youtube.com') || hostname.includes('youtu.be');
    if (isYouTube) {
      const videoId = getYouTubeVideoId(parsedUrl);
      if (videoId) {
        const transcript = await fetchYouTubeTranscript(videoId);
        if (transcript.length >= MIN_MEANINGFUL_TEXT_LENGTH) {
          const text = transcript.length > 50000 ? `${transcript.slice(0, 50000)}\n\n[Content truncated...]` : transcript;
          return NextResponse.json({ text, source: hostname, mode: 'youtube_captions' });
        }
      }
    }

    const directRes = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CautieLearn/1.0; +https://cautie.app)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.7',
      },
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    });

    if (!directRes.ok) {
      const fallback = await fetchViaJinaReader(parsedUrl.toString());
      if (fallback.length >= MIN_MEANINGFUL_TEXT_LENGTH) {
        const text = fallback.length > 50000 ? `${fallback.slice(0, 50000)}\n\n[Content truncated...]` : fallback;
        return NextResponse.json({ text, source: hostname, mode: 'reader_fallback' });
      }
      return NextResponse.json({ error: `Failed to fetch URL (${directRes.status})` }, { status: 502 });
    }

    const contentType = (directRes.headers.get('content-type') || '').toLowerCase();
    const raw = await directRes.text();

    let extracted = '';
    if (contentType.includes('text/plain')) {
      extracted = cleanupExtractedText(raw);
    } else {
      const title = extractTitle(raw);
      const ogTitle = extractMeta(raw, 'og:title');
      const description = extractMeta(raw, 'description') || extractMeta(raw, 'og:description');
      const bodyText = cleanupExtractedText(stripHtmlToText(raw));
      const header = [ogTitle || title, description].filter(Boolean).join('\n\n');
      extracted = cleanupExtractedText([header, bodyText].filter(Boolean).join('\n\n'));
    }

    // YouTube commonly blocks usable transcript extraction from page HTML.
    // In that case we return a clear message so the client can show why.
    if (isYouTube && extracted.length < MIN_MEANINGFUL_TEXT_LENGTH) {
      const fallback = await fetchViaJinaReader(parsedUrl.toString());
      if (fallback.length >= MIN_MEANINGFUL_TEXT_LENGTH) {
        const text = fallback.length > 50000 ? `${fallback.slice(0, 50000)}\n\n[Content truncated...]` : fallback;
        return NextResponse.json({ text, source: hostname, mode: 'reader_fallback' });
      }
      return NextResponse.json(
        { error: 'YouTube transcript is not available from this link. Try article links or paste transcript text.' },
        { status: 422 }
      );
    }

    if (extracted.length < MIN_MEANINGFUL_TEXT_LENGTH) {
      const fallback = await fetchViaJinaReader(parsedUrl.toString());
      if (fallback.length >= MIN_MEANINGFUL_TEXT_LENGTH) {
        const text = fallback.length > 50000 ? `${fallback.slice(0, 50000)}\n\n[Content truncated...]` : fallback;
        return NextResponse.json({ text, source: hostname, mode: 'reader_fallback' });
      }
    }

    if (!extracted || extracted.length < 10) {
      return NextResponse.json({ error: 'Could not extract meaningful text from this URL' }, { status: 422 });
    }

    const text = extracted.length > 50000 ? `${extracted.slice(0, 50000)}\n\n[Content truncated...]` : extracted;
    return NextResponse.json({ text, source: hostname, mode: 'direct' });
  } catch (error: any) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return NextResponse.json({ error: 'URL took too long to respond' }, { status: 504 });
    }
    console.error('URL extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract text from URL' }, { status: 500 });
  }
}
