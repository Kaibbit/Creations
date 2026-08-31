import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xgqjltfoqlclkweyudas.supabase.co';
const supabasePublishableKey = 'sb_publishable_V7szuq8VQK3TjNU923rqVw_8cNdbaQx';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
