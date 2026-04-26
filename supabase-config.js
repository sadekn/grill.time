import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://urpbxbkrbrgqlwuptnbt.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_RqYfHY9b5xeijjxzidVmkA_qA0lf1ry';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
