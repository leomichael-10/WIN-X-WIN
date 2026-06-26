import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

  // Resolve player UUID from name (completions table stores name, not id)
  const { data: playerRow, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('id')
    .ilike('name', completion.player_name)
    .single()

  if (playerErr || !playerRow) {
    return res.status(404).json({ error: `Player not found: ${completion.player_name}` })
  }

  // Append-only ledger write via apply_reward.
  // Idempotency key ties the reward to this exact completion UUID — a dealer
  // double-tapping confirm inserts only ONE transaction row.
  const idempotencyKey = `${playerRow.id}-${completion.id}`
  const { data: newTotal, error: rpcErr } = await supabaseAdmin.rpc('apply_reward', {
    p_player_id: playerRow.id,
    p_amount: rewardAmount,
    p_reason: completion.id,          // completion UUID — stable, auditable
    p_idempotency_key: idempotencyKey,
  })

  if (rpcErr) return res.status(500).json({ error: rpcErr.message })

  // Mark confirmed
  const { error: updateErr } = await supabaseAdmin
    .from('challenge_completions')
    .update({ status: 'confirmed', reward: rewardAmount, resolved_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) return res.status(500).json({ error: updateErr.message })

  return res.status(200).json({ money: newTotal as number, reward: rewardAmount })
}
