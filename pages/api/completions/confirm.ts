import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Player } from '@/lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id, reward } = req.body

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'id is required' })
  }

  const rewardAmount = Number(reward ?? 100)
  if (!Number.isFinite(rewardAmount) || rewardAmount < 0) {
    return res.status(400).json({ error: 'reward must be a non-negative number' })
  }

  // Fetch completion — check it exists and is still pending
  const { data: completion, error: fetchErr } = await supabaseAdmin
    .from('challenge_completions')
    .select('id, player_name, avatar_url, status')
    .eq('id', id)
    .single()

  if (fetchErr || !completion) return res.status(404).json({ error: 'Completion not found' })
  if (completion.status !== 'pending') {
    return res.status(409).json({ error: 'Completion already resolved' })
  }

  // Award money via the existing atomic RPC (same one used by /api/players)
  const { data: player, error: rpcErr } = await supabaseAdmin.rpc('upsert_player_money', {
    p_name: completion.player_name,
    p_money_delta: rewardAmount,
    p_avatar_url: completion.avatar_url ?? null,
  })

  if (rpcErr) return res.status(500).json({ error: rpcErr.message })

  // Mark confirmed
  const { error: updateErr } = await supabaseAdmin
    .from('challenge_completions')
    .update({ status: 'confirmed', reward: rewardAmount, resolved_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) return res.status(500).json({ error: updateErr.message })

  const updatedPlayer = Array.isArray(player) ? player[0] : player
  return res.status(200).json({ player: updatedPlayer as Player, reward: rewardAmount })
}
