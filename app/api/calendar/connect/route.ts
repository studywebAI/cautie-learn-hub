import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getCalDAVClient } from '@/lib/caldav-utils';

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

    // Validate CalDAV credentials by attempting a connection
    const { client } = (await getCalDAVClient(provider, caldavUrl, username, password)) || {
      client: null
    };

    if (!client) {
      return NextResponse.json(
        { error: 'Invalid calendar credentials. Please check your email/username and password.' },
        { status: 400 }
      );
    }

    // Encrypt password before storing
    const { data: encryptedData, error: encryptError } = await supabase.rpc(
      'encrypt_password',
      { password }
    );

    if (encryptError || !encryptedData) {
      console.error('Password encryption failed:', encryptError);
      return NextResponse.json(
        { error: 'Failed to encrypt credentials' },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from('calendar_accounts')
      .insert({
        user_id: user.id,
        provider,
        username,
        password: encryptedData, // Encrypted password stored
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
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    setTimeout(() => {
      fetch(`${baseUrl}/api/calendar/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: data.id }),
      }).catch((err) => console.error('Background sync failed:', err));
    }, 1000);

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
