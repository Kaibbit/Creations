const supabaseUrl = 'https://xgqjltfoqlclkweyudas.supabase.co';
const supabasePublishableKey = 'sb_publishable_V7szuq8VQK3TjNU923rqVw_8cNdbaQx';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headers = {
    apikey: supabasePublishableKey,
    Authorization: `Bearer ${supabasePublishableKey}`,
  };

  const result = {
    ok: false,
    timestamp: new Date().toISOString(),
    auth: null,
    studyContent: null,
  };

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers,
      cache: 'no-store',
    });
    result.auth = {
      ok: authResponse.ok,
      status: authResponse.status,
      body: (await authResponse.text()).slice(0, 500),
    };
  } catch (error) {
    result.auth = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  try {
    const contentResponse = await fetch(
      `${supabaseUrl}/rest/v1/study_content?select=chapter&book=eq.marcos&order=chapter`,
      { headers, cache: 'no-store' },
    );
    const body = await contentResponse.text();
    let count = null;
    try {
      const parsed = JSON.parse(body);
      count = Array.isArray(parsed) ? parsed.length : null;
    } catch {}
    result.studyContent = {
      ok: contentResponse.ok,
      status: contentResponse.status,
      count,
      body: body.slice(0, 500),
    };
  } catch (error) {
    result.studyContent = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  result.ok = !!result.auth?.ok && !!result.studyContent?.ok;
  return Response.json(result, { status: result.ok ? 200 : 503 });
}
