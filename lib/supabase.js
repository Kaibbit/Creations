import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xgqjltfoqlclkweyudas.supabase.co';
const supabasePublishableKey = 'sb_publishable_V7szuq8VQK3TjNU923rqVw_8cNdbaQx';
const productionRecoveryUrl = 'https://jornada-biblica-git.vercel.app/?reset=1';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// O fluxo de recuperação usa uma chamada direta para evitar que qualquer
// origem antiga/cacheada substitua o domínio oficial por localhost.
supabase.auth.resetPasswordForEmail = async (email) => {
  try {
    const response = await fetch(
      `${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(productionRecoveryUrl)}`,
      {
        method: 'POST',
        headers: {
          apikey: supabasePublishableKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      },
    );

    if (!response.ok) {
      let message = 'Não foi possível enviar o e-mail de recuperação.';
      try {
        const payload = await response.json();
        message = payload?.msg || payload?.message || payload?.error_description || message;
      } catch {}
      return { data: null, error: { message } };
    }

    return { data: {}, error: null };
  } catch {
    return {
      data: null,
      error: { message: 'Não foi possível enviar o e-mail de recuperação.' },
    };
  }
};
