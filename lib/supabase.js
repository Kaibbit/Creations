import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xgqjltfoqlclkweyudas.supabase.co';
const supabasePublishableKey = 'sb_publishable_V7szuq8VQK3TjNU923rqVw_8cNdbaQx';
const productionSiteUrl = 'https://jornada-biblica-git.vercel.app';

function authFetch(input, init) {
  const sourceUrl =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input?.url;

  if (sourceUrl) {
    const url = new URL(sourceUrl);
    const isSupabaseAuth = url.origin === supabaseUrl && url.pathname.startsWith('/auth/v1/');
    const needsOfficialRedirect =
      url.pathname.endsWith('/recover') ||
      url.pathname.endsWith('/signup') ||
      url.pathname.endsWith('/otp');

    if (isSupabaseAuth && needsOfficialRedirect) {
      url.searchParams.set('redirect_to', productionSiteUrl);
      input =
        typeof input === 'string' || input instanceof URL
          ? url.toString()
          : new Request(url.toString(), input);
    }
  }

  return fetch(input, init);
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: authFetch,
  },
});
