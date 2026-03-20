import { createClient as _createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

let client: ReturnType<typeof _createClient<Database>> | null = null;

export function createClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.error('[Supabase] Missing env vars:', { url: !!url, key: !!key });
    }
    client = _createClient<Database>(url!, key!);
  }
  return client;
}
