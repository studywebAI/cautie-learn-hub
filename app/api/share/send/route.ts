import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function normalize(value: unknown) {
  return String(value || '').trim();
}

export async function POST(request: NextRequest) {
  const supabase = await createClient(cookies());
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const recipient = normalize(body?.recipient);
  const title = normalize(body?.title);
  const url = normalize(body?.url);
  const note = normalize(body?.note);

  if (!recipient || !title || !url) {
    return NextResponse.json({ error: 'recipient, title and url are required' }, { status: 422 });
  }

  const { data: senderProfile } = await (supabase as any)
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  let targetProfile: any = null;
  const byEmail = await (supabase as any)
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', recipient.toLowerCase())
    .maybeSingle();
  if (!byEmail.error && byEmail.data) targetProfile = byEmail.data;

  if (!targetProfile) {
    const byName = await (supabase as any)
      .from('profiles')
      .select('id, full_name, email')
      .ilike('full_name', recipient)
      .limit(1)
      .maybeSingle();
    if (!byName.error && byName.data) targetProfile = byName.data;
  }

  if (!targetProfile?.id) {
    return NextResponse.json({ error: 'Recipient user not found' }, { status: 404 });
  }

  if (targetProfile.id === user.id) {
    return NextResponse.json({ error: 'Cannot send to yourself' }, { status: 422 });
  }

  const senderLabel = senderProfile?.full_name || senderProfile?.email || 'Someone';
  const message = note
    ? `${senderLabel} shared "${title}" with you.\n\n${note}\n\n${url}`
    : `${senderLabel} shared "${title}" with you.\n\n${url}`;

  const { error: insertError } = await (supabase as any)
    .from('notifications')
    .insert({
      user_id: targetProfile.id,
      type: 'shared_item',
      title: `Shared: ${title}`,
      message,
      data: {
        shared_by: user.id,
        shared_by_name: senderProfile?.full_name || null,
        shared_by_email: senderProfile?.email || null,
        shared_url: url,
        shared_title: title,
      },
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message || 'Failed to send share notification' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
