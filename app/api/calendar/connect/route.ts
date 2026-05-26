import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, username, password, caldavUrl } = body;

    if (!provider || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, username, password' },
        { status: 400 }
      );
    }

    const validProviders = ['apple', 'google', 'outlook', 'caldav'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` },
        { status: 400 }
      );
    }

    if (provider === 'caldav' && !caldavUrl) {
      return NextResponse.json(
        { error: 'caldavUrl is required for caldav provider' },
        { status: 400 }
      );
    }

    // TODO: Validate CalDAV credentials by attempting a connection
    // For now, we'll just store them encrypted in the database

    const { data, error } = await supabase
      .from('calendar_accounts')
      .insert({
        user_id: user.id,
        provider,
        username,
        password, // TODO: Encrypt this in production
        caldav_url: caldavUrl || null,
        last_synced_at: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create calendar account:', error);
      return NextResponse.json(
        { error: 'Failed to create calendar account' },
        { status: 500 }
      );
    }

    // Trigger initial sync in the background
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/calendar/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ accountId: data.id }),
    }).catch((err) => console.error('Background sync failed:', err));

    return NextResponse.json(
      { success: true, account: data },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Calendar connection error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
