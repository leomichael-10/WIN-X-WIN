/**
 * Pages Router server-side Supabase client.
 * Pass req/res from getServerSideProps or API routes.
 *
 * Usage in API route:
 *   const supabase = createClient(req, res)
 *
 * Usage in getServerSideProps:
 *   const supabase = createClient(context.req, context.res)
 */
import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { GetServerSidePropsContext } from 'next'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

type Req = NextApiRequest | GetServerSidePropsContext['req']
type Res = NextApiResponse | GetServerSidePropsContext['res']

export function createClient(req: Req, res: Res) {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return Object.entries(req.cookies ?? {}).map(([name, value]) => ({
          name,
          value: value ?? '',
        }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.setHeader(
            'Set-Cookie',
            `${name}=${value}; Path=${options?.path ?? '/'}${
              options?.httpOnly ? '; HttpOnly' : ''
            }${options?.secure ? '; Secure' : ''}${
              options?.sameSite ? `; SameSite=${options.sameSite}` : ''
            }${options?.maxAge ? `; Max-Age=${options.maxAge}` : ''}`
          )
        })
      },
    },
  })
}
