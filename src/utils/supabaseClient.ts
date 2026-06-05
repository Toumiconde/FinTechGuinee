import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kfgmeunfizrijnjmpobh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ALrheAqiI0wtzVuCdnanbA_hLDXas6h';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // On gère notre propre session locale dans Redux
  }
});
