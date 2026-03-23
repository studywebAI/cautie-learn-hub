import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url) throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
