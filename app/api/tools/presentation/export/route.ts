import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import PptxGenJS from 'pptxgenjs';
import { createClient } from '@/lib/supabase/server';
import { getValidMicrosoftAccessToken } from '@/lib/integrations/microsoft-store';
import { getValidGoogleAccessToken } from '@/lib/integrations/google-store';
import { checkRateLimit } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

const SlideSchema = z.object({
  index: z.number().int().positive(),
  heading: z.string().min(1),
  bullets: z.array(z.string()).default([]),
  speakerNotes: z.string().optional(),
  imageUrl: z.string().optional(),
});

const VisualAssetSchema = z.object({
  kind: z.enum(['source_image', 'internet_image', 'chart', 'icon']).optional(),
  query: z.string().optional(),
  sourceUrl: z.string().optional(),
});

const RequestSchema = z.object({
  title: z.string().min(1).max(2000),
  slides: z.array(SlideSchema).min(1).max(120),
  visualAssets: z.array(VisualAssetSchema).optional(),
  includeSpeakerNotes: z.boolean().optional(),
  destination: z
    .object({
      kind: z.enum(['download', 'microsoft', 'google']),
      targetApp: z.enum(['powerpoint', 'sharepoint', 'google-slides']).optional(),
      microsoftFolder: z
        .object({
          folderId: z.string().optional(),
          driveId: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

const sanitizeFilename = (value: string): string =>
  value
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'presentation';

const cleanTitle = (value: string): string => value.replace(/\s+/g, ' ').trim().slice(0, 160) || 'Presentation';

const cleanBullet = (value: string): string => value.replace(/\s+/g, ' ').trim().slice(0, 180);

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

async function fetchImageAsDataUri(url: string) {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  if (!isHttpUrl(url)) return null;
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return null;
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

async function renderPptxBuffer(input: {
  title: string;
  slides: Array<{ index: number; heading: string; bullets: string[]; speakerNotes?: string; imageUrl?: string }>;
  visualAssets?: Array<{ kind?: string; query?: string; sourceUrl?: string }>;
  includeSpeakerNotes: boolean;
}) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Cautie';
  pptx.company = 'Cautie';
  pptx.subject = input.title;
  pptx.title = input.title;

  const visualPool = (input.visualAssets || [])
    .filter((asset) => String(asset.kind || '').toLowerCase() === 'source_image')
    .map((asset) => String(asset.sourceUrl || '').trim())
    .filter(Boolean);

  const imageCache = new Map<string, string | null>();
  const resolveImage = async (candidate?: string) => {
    const key = String(candidate || '').trim();
    if (!key) return null;
    if (imageCache.has(key)) return imageCache.get(key) || null;
    const dataUri = await fetchImageAsDataUri(key);
    imageCache.set(key, dataUri);
    return dataUri;
  };

  for (const slideItem of input.slides) {
    const slide = pptx.addSlide();
    slide.background = { color: 'F4F3EE' };

    const fallbackVisual = visualPool.length > 0 ? visualPool[(slideItem.index - 1) % visualPool.length] : '';
    const imageData = await resolveImage(slideItem.imageUrl || fallbackVisual);
    const hasImage = Boolean(imageData);

    slide.addText(input.title, {
      x: 0.6,
      y: 0.28,
      w: 11.8,
      h: 0.35,
      fontFace: 'Calibri',
      fontSize: 11,
      color: '6B6B66',
    });

    slide.addText(`${slideItem.index}. ${cleanTitle(slideItem.heading).slice(0, 100)}`, {
      x: 0.7,
      y: 0.82,
      w: 11.6,
      h: 0.92,
      fontFace: 'Calibri',
      bold: true,
      fontSize: 30,
      color: '111111',
      breakLine: true,
    });

    if (hasImage && imageData) {
      slide.addImage({
        data: imageData,
        x: 7.15,
        y: 1.88,
        w: 5.35,
        h: 3.95,
      });
    }

    const bullets = slideItem.bullets
      .map((line) => cleanBullet(line))
      .filter(Boolean)
      .slice(0, 8)
      .map((line) => ({ text: line }));

    if (bullets.length > 0) {
      slide.addText(bullets, {
        x: 1.02,
        y: 2.0,
        w: hasImage ? 5.85 : 10.8,
        h: 4.4,
        fontFace: 'Calibri',
        fontSize: 20,
        color: '222222',
        bullet: { indent: 18 },
        breakLine: true,
        margin: 2,
      });
    }

    if (input.includeSpeakerNotes && slideItem.speakerNotes?.trim()) {
      slide.addNotes(slideItem.speakerNotes.trim().slice(0, 1200));
    }

    slide.addText(`Generated by Cautie | ${new Date().toLocaleDateString('en-US')}`, {
      x: 0.7,
      y: 6.86,
      w: 11.6,
      h: 0.28,
      fontFace: 'Calibri',
      fontSize: 10,
      color: '7A7A74',
      align: 'right',
    });
  }

  const base64 = (await pptx.write({ outputType: 'base64' })) as string;
  return Buffer.from(base64, 'base64');
}

async function uploadToMicrosoftDrive(input: {
  accessToken: string;
  filename: string;
  data: Buffer;
  folderId?: string;
  driveId?: string;
}) {
  const hasFolderTarget = Boolean(input.folderId);
  const encodedFile = encodeURIComponent(input.filename);
  const endpoint = hasFolderTarget
    ? input.driveId
      ? `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.folderId || '')}:/${encodedFile}:/content`
      : `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(input.folderId || '')}:/${encodedFile}:/content`
    : `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(`Cautie Exports/${input.filename}`).replace(/%2F/g, '/')}:/content`;
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    },
    body: new Uint8Array(input.data),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || 'Microsoft cloud export failed';
    throw new Error(message);
  }
  return {
    id: typeof payload?.id === 'string' ? payload.id : '',
    webUrl: typeof payload?.webUrl === 'string' ? payload.webUrl : '',
    name: typeof payload?.name === 'string' ? payload.name : input.filename,
  };
}

async function getPreferredMicrosoftFolder(input: {
  supabase: any;
  userId: string;
}) {
  const { data, error } = await input.supabase
    .from('external_integration_sources')
    .select('metadata, updated_at')
    .eq('user_id', input.userId)
    .eq('provider', 'microsoft')
    .eq('app', 'onedrive')
    .eq('is_selected', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const metadata = (data.metadata || {}) as Record<string, any>;
  const folderId = typeof metadata.parent_id === 'string' ? metadata.parent_id : '';
  const driveId = typeof metadata.drive_id === 'string' ? metadata.drive_id : '';
  if (!folderId) return null;
  return { folderId, driveId: driveId || undefined };
}

async function uploadToGoogle(input: {
  accessToken: string;
  filename: string;
  data: Buffer;
  targetApp?: 'google-slides';
}) {
  const boundary = `cautie-${crypto.randomUUID()}`;
  const metadata =
    input.targetApp === 'google-slides'
      ? {
          name: input.filename.replace(/\.pptx$/i, ''),
          mimeType: 'application/vnd.google-apps.presentation',
        }
      : {
          name: input.filename,
          mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };

  const prefix =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation\r\n\r\n`;
  const suffix = `\r\n--${boundary}--`;

  const body = Buffer.concat([
    Buffer.from(prefix, 'utf8'),
    input.data,
    Buffer.from(suffix, 'utf8'),
  ]);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: new Uint8Array(body),
      cache: 'no-store',
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error_description ||
      'Google cloud export failed';
    throw new Error(message);
  }

  const id = typeof payload?.id === 'string' ? payload.id : '';
  const mimeType = typeof payload?.mimeType === 'string' ? payload.mimeType : '';
  const webViewLink = typeof payload?.webViewLink === 'string' ? payload.webViewLink : '';
  const openUrl =
    webViewLink ||
    (mimeType === 'application/vnd.google-apps.presentation' && id
      ? `https://docs.google.com/presentation/d/${id}/edit`
      : id
        ? `https://drive.google.com/file/d/${id}/view`
        : '');

  return {
    id,
    name: typeof payload?.name === 'string' ? payload.name : input.filename,
    mimeType,
    webUrl: openUrl,
  };
}

export async function POST(req: NextRequest) {
  const rateLimit = checkRateLimit(req, { key: 'presentation-export', limit: 25, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimit.response;

  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }

    const title = cleanTitle(parsed.data.title);
    const slides = parsed.data.slides;
    const includeSpeakerNotes = Boolean(parsed.data.includeSpeakerNotes);
    const destination = parsed.data.destination?.kind || 'download';
    const filename = `${sanitizeFilename(title)}.pptx`;

    const buffer = await renderPptxBuffer({
      title,
      slides,
      visualAssets: parsed.data.visualAssets || [],
      includeSpeakerNotes,
    });

    if (destination === 'download') {
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (destination === 'google') {
      const cookieStore = cookies();
      const supabase = await createClient(cookieStore);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const tokenState = await getValidGoogleAccessToken(supabase, user.id);
      if (!tokenState?.accessToken) {
        return NextResponse.json(
          {
            error: 'Google account not connected',
            code: 'google_not_connected',
            fallback: 'download',
          },
          { status: 409 }
        );
      }

      const uploaded = await uploadToGoogle({
        accessToken: tokenState.accessToken,
        filename,
        data: buffer,
        targetApp: parsed.data.destination?.targetApp === 'google-slides' ? 'google-slides' : undefined,
      });

      return NextResponse.json({
        ok: true,
        destination: 'google',
        targetApp: parsed.data.destination?.targetApp || 'google-slides',
        fileName: uploaded.name,
        fileId: uploaded.id,
        webUrl: uploaded.webUrl,
        openLabel: 'Open in Google Slides',
        fallback: 'download',
      });
    }

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokenState = await getValidMicrosoftAccessToken(supabase, user.id);
    if (!tokenState?.accessToken) {
      return NextResponse.json(
        {
          error: 'Microsoft account not connected',
          code: 'microsoft_not_connected',
          fallback: 'download',
        },
        { status: 409 }
      );
    }

    const pickerFolder = await getPreferredMicrosoftFolder({
      supabase,
      userId: user.id,
    });
    const folderFromPayload = parsed.data.destination?.microsoftFolder;
    const targetFolder = {
      folderId: folderFromPayload?.folderId || pickerFolder?.folderId,
      driveId: folderFromPayload?.driveId || pickerFolder?.driveId,
    };

    const uploaded = await uploadToMicrosoftDrive({
      accessToken: tokenState.accessToken,
      filename,
      data: buffer,
      folderId: targetFolder.folderId,
      driveId: targetFolder.driveId,
    });

    return NextResponse.json({
      ok: true,
      destination: 'microsoft',
      targetApp: parsed.data.destination?.targetApp || 'powerpoint',
      fileName: filename,
      fileId: uploaded.id,
      webUrl: uploaded.webUrl,
      openLabel:
        parsed.data.destination?.targetApp === 'sharepoint'
          ? 'Open in SharePoint'
          : 'Open in PowerPoint',
      folderTarget: targetFolder.folderId ? 'picker_selected_folder' : 'default_cautie_exports',
      fallback: 'download',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Failed to generate presentation file'),
        fallback: 'download',
      },
      { status: 500 }
    );
  }
}
