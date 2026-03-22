import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidMicrosoftAccessToken } from '@/lib/integrations/microsoft-store';
import { listMicrosoftFiles, MicrosoftFileKind } from '@/lib/integrations/microsoft';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const kind = request.nextUrl.searchParams.get('kind');
    if (kind !== 'word' && kind !== 'powerpoint') {
      return NextResponse.json({ error: "Query param 'kind' must be 'word' or 'powerpoint'" }, { status: 400 });
    }
    const query = request.nextUrl.searchParams.get('q') || '';

    const tokenState = await getValidMicrosoftAccessToken(supabase, user.id);
    if (!tokenState) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 404 });
    }

    const items = await listMicrosoftFiles({
      accessToken: tokenState.accessToken,
      kind: kind as MicrosoftFileKind,
      query,
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load files' }, { status: 500 });
  }
}
