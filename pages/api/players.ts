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
    const { name, avatar_url } = req.body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' })
    }

    const moneyChange = Number(req.body.moneyChange)
    if (!Number.isFinite(moneyChange)) {
      return res.status(400).json({ error: 'moneyChange must be a finite number' })
    }

    // Atomic upsert via Postgres RPC — avoids race condition
    const { data, error } = await supabaseAdmin.rpc('upsert_player_money', {
      p_name: name.trim(),
      p_money_delta: moneyChange,
      p_avatar_url: avatar_url ?? null,
    })

    if (error) return res.status(500).json({ error: error.message })
    // rpc returns array; take first row
    const player = Array.isArray(data) ? data[0] : data
    return res.status(200).json(player as Player)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}
