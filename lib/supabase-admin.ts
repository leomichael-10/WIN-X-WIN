import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey  = process.env.SUPABASE_SERVICE_KEY!

// supabase-js speaks HTTPS to PostgREST — not direct Postgres — so the
// Supabase transaction-mode pooler URL (pooler.supabase.com:6543) doesn't
// apply here. PostgREST manages its own Postgres connection pool internally.
//
// What we DO to reduce connection overhead under load:
//   1. Module-level singleton — one client per warm serverless instance,
//      not one per request (Next.js module caching handles this).
//   2. auth.persistSession: false — no auth state is stored, no extra calls.
//   3. global.fetch with keepalive — reuses the underlying TCP connection to
//      PostgREST across requests within the same warm function lifetime,
//      avoiding repeated TLS handshakes under burst traffic.

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
  global: {
    fetch: (url, options = {}) =>
      fetch(url, { ...options, keepalive: true }),
  },
})
