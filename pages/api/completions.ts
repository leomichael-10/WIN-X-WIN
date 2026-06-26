import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Completion } from '@/lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  // ── GET /api/completions?status=pending  (dealer queue) ──────────────────
  if (req.method === 'GET') {
    const status = (req.query.status as string) ?? 'pending'
    const { data, error } = await supabaseAdmin
      .from('challenge_completions')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data as Completion[])
  }

  // ── POST /api/completions  { player_name, avatar_url, challenge_text } ───
  if (req.method === 'POST') {
    const { player_name, avatar_url, challenge_text } = req.body

    if (!player_name || typeof player_name !== 'string' || !player_name.trim()) {
      return res.status(400).json({ error: 'player_name is required' })
    }
    if (!challenge_text || typeof challenge_text !== 'string' || !challenge_text.trim()) {
      return res.status(400).json({ error: 'challenge_text is required' })
    }

    const { data, error } = await supabaseAdmin
      .from('challenge_completions')
      .insert({
        player_name: player_name.trim(),
        avatar_url: avatar_url ?? null,
        challenge_text: challenge_text.trim(),
        status: 'pending',
        reward: 0,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data as Completion)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}
