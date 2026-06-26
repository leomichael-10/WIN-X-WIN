import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Player } from '@/lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { player_id } = req.query

    // Targeted single-player read: returns { money } via get_total RPC.
    // Used by game.tsx on mount and after dealer confirm — avoids fetching
    // all 85 players just to read one balance.
    if (player_id && typeof player_id === 'string') {
      // Validate the id exists before calling get_total.
      // get_total returns 0/null for a deleted player (no transactions) so we
      // can't rely on it to detect a missing player — we need an explicit row check.
      const { data: row, error: existsErr } = await supabaseAdmin
        .from('players')
        .select('id')
        .eq('id', player_id)
        .maybeSingle()

      if (existsErr) return res.status(500).json({ error: existsErr.message })
      if (!row) return res.status(404).json({ error: 'PLAYER_NOT_FOUND' })

      const { data: total, error } = await supabaseAdmin.rpc('get_total', {
        p_player_id: player_id,
      })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ money: total as number })
    }

    // No player_id — return full list sorted by money (used by leaderboard).
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('*')
      .order('money', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data as Player[])
  }

  if (req.method === 'POST') {
    const { player_id, amount, reason, idempotency_key } = req.body

    if (!player_id || typeof player_id !== 'string') {
      return res.status(400).json({ error: 'player_id is required' })
    }
    const delta = Number(amount)
    if (!Number.isFinite(delta)) {
      return res.status(400).json({ error: 'amount must be a finite number' })
    }
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'reason is required' })
    }
    if (!idempotency_key || typeof idempotency_key !== 'string') {
      return res.status(400).json({ error: 'idempotency_key is required' })
    }

    // Append-only ledger write — idempotency_key makes double-taps safe
    const { data: newTotal, error } = await supabaseAdmin.rpc('apply_reward', {
      p_player_id: player_id,
      p_amount: delta,
      p_reason: reason,
      p_idempotency_key: idempotency_key,
    })

    if (error) {
      // apply_reward raises PLAYER_NOT_FOUND (P0002) for a missing player id.
      // Return 404 so the client can self-heal (clear cache + re-register)
      // rather than showing a generic 500 with no recovery path.
      if (error.message?.includes('PLAYER_NOT_FOUND')) {
        return res.status(404).json({ error: 'PLAYER_NOT_FOUND' })
      }
      return res.status(500).json({ error: error.message })
    }
    return res.status(200).json({ money: newTotal as number })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}
