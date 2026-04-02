import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';
import { createPresentationProject } from '@/lib/presentation/store';
import { getDefaultConfig } from '@/lib/presentation/pipeline';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  classId: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  prompt: z.string().optional(),
  language: z.string().optional(),
  uiConfig: z.record(z.any()).optional(),
  platform: z.enum(['powerpoint', 'google-slides', 'keynote']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const payload = RequestSchema.parse(await request.json());
    const { supabase, user } = await getAuthedToolboxContext();
    const defaultConfig = getDefaultConfig();
    const selectedPlatform = payload.platform || (payload.uiConfig?.platform as any) || 'powerpoint';
    const project = await createPresentationProject({
      supabase,
      userId: user.id,
      classId: payload.classId,
      title: payload.title || 'Untitled presentation',
      prompt: payload.prompt || '',
      selectedPlatform,
      language: payload.language || 'en',
      uiConfig: { ...defaultConfig, ...(payload.uiConfig || {}), platform: selectedPlatform },
    });
    return NextResponse.json({ ok: true, project });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error?.issues) {
      return NextResponse.json({ error: 'Invalid payload', details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to create presentation project' }, { status: 500 });
  }
}
