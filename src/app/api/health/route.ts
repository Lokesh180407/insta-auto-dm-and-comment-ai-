import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const timestamp = new Date().toISOString();
  const checks = {
    supabase: { ok: false, message: 'Not tested' },
    meta_token: { ok: false, message: 'Not set' },
    openrouter: { ok: false, message: 'Not set' },
  };

  try {
    // 1. Supabase check
    const { error } = await supabase.from('app_settings').select('id').limit(1);
    if (error) {
      checks.supabase = { ok: false, message: error.message };
    } else {
      checks.supabase = { ok: true, message: 'Connection successful' };
    }
  } catch (err: any) {
    checks.supabase = { ok: false, message: err?.message || 'Error connecting to database' };
  }

  // 2. Meta Instagram token check
  if (process.env.INSTAGRAM_ACCESS_TOKEN) {
    checks.meta_token = { ok: true, message: 'INSTAGRAM_ACCESS_TOKEN is configured' };
  } else {
    checks.meta_token = { ok: false, message: 'INSTAGRAM_ACCESS_TOKEN is missing from environment variables' };
  }

  // 3. OpenRouter API check
  if (process.env.OPENROUTER_API_KEY) {
    checks.openrouter = { ok: true, message: 'OPENROUTER_API_KEY is configured' };
  } else {
    checks.openrouter = { ok: false, message: 'OPENROUTER_API_KEY is missing from environment variables' };
  }

  const status = checks.supabase.ok && checks.meta_token.ok && checks.openrouter.ok
    ? 'ok'
    : checks.supabase.ok
    ? 'degraded'
    : 'down';

  return NextResponse.json({
    status,
    checks,
    timestamp
  }, {
    status: status === 'down' ? 503 : 200
  });
}
