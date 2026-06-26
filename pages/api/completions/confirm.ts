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

  // Resolve player UUID from name (completions table stores name, not id).
  // Use maybeSingle so we can distinguish zero matches from multiple matches.
  const { data: playerRows, error: playerErr } = await supabaseAdmin
    .from('players')
    .select('id')
    .ilike('name', completion.player_name)

  if (playerErr) {
    return res.status(500).json({ error: `Player lookup failed: ${playerErr.message}` })
  }
  if (!playerRows || playerRows.length === 0) {
    return res.status(404).json({
      error: `Player not found — no player named "${completion.player_name}". They may need to re-register.`,
    })
  }
  if (playerRows.length > 1) {
    return res.status(409).json({
      error: `Ambiguous player name "${completion.player_name}" matched ${playerRows.length} players. Resolve the duplicate in the DB first.`,
    })
  }
  const playerRow = playerRows[0]

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

  if (rpcErr) {
    if (rpcErr.message?.includes('PLAYER_NOT_FOUND')) {
      // Player was deleted between the name lookup and the RPC call (race condition).
      // Surface a clear, non-fatal dealer message so the queue keeps working.
      return res.status(404).json({
        error: `Player "${completion.player_name}" no longer exists in the DB — they may need to re-register.`,
      })
    }
    return res.status(500).json({ error: rpcErr.message })
  }

  // Mark confirmed
  const { error: updateErr } = await supabaseAdmin
    .from('challenge_completions')
    .update({ status: 'confirmed', reward: rewardAmount, resolved_at: new Date().toISOString() })
    .eq('id', id)

  if (updateErr) return res.status(500).json({ error: updateErr.message })

  return res.status(200).json({ money: newTotal as number, reward: rewardAmount })
}
