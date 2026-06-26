import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.body
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'id is required' })
  }

  const { data: completion, error: fetchErr } = await supabaseAdmin
    .from('challenge_completions')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchErr || !completion) return res.status(404).json({ error: 'Completion not found' })
  if (completion.status !== 'pending') {
    return res.status(409).json({ error: 'Completion already resolved' })
  }

  const { error } = await supabaseAdmin
    .from('challenge_completions')
    .update({ status: 'rejected', resolved_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true })
}
