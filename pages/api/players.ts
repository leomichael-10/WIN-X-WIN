import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Player } from '@/lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
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

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ money: newTotal as number })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}
