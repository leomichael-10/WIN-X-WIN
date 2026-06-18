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
    const { name, moneyChange, avatar_url } = req.body

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' })
    }
    if (typeof moneyChange !== 'number') {
      return res.status(400).json({ error: 'moneyChange must be a number' })
    }

    // Fetch existing player to calculate new balance
    const { data: existing } = await supabaseAdmin
      .from('players')
      .select('money')
      .eq('name', name.trim())
      .single()

    const currentMoney = existing?.money ?? 0
    const newMoney = currentMoney + moneyChange

    const upsertPayload: Partial<Player> & { name: string; money: number } = {
      name: name.trim(),
      money: newMoney,
    }
    if (avatar_url) upsertPayload.avatar_url = avatar_url

    const { data, error } = await supabaseAdmin
      .from('players')
      .upsert(upsertPayload, { onConflict: 'name' })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data as Player)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Method not allowed' })
}
