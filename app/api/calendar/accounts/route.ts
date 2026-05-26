import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: accounts, error } = await supabase
      .from('calendar_accounts')
      .select('id, provider, username, caldav_url, created_at, last_synced_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch calendar accounts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch calendar accounts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ accounts: accounts || [] });
  } catch (error: any) {
    console.error('Calendar accounts error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('id');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId query parameter' },
        { status: 400 }
      );
    }

    // Verify the account belongs to the user before deleting
    const { data: account, error: fetchError } = await supabase
      .from('calendar_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !account) {
      return NextResponse.json(
        { error: 'Calendar account not found' },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from('calendar_accounts')
      .delete()
      .eq('id', accountId);

    if (deleteError) {
      console.error('Failed to delete calendar account:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete calendar account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar account disconnected',
    });
  } catch (error: any) {
    console.error('Calendar disconnect error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
