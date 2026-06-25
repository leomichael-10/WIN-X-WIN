import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Player } from '@/lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, avatar_url } = req.body

  // Validate name
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'username is required' })
  }
  const trimmedName = name.trim()
  if (trimmedName.length > 30) {
    return res.status(400).json({ error: 'username must be 30 characters or fewer' })
  }

  // Insert — intentionally NOT upsert so existing players can't be overwritten
  const { data, error } = await supabaseAdmin
    .from('players')
    .insert({
      name: trimmedName,
      money: 1500,
      avatar_url: avatar_url ?? null,
    })
    .select()
    .single()

  if (error) {
    // Postgres unique violation — username already taken (case-insensitive index)
    if (error.code === '23505') {
      return res.status(409).json({ error: "That name's taken — pick another." })
    }
    return res.status(500).json({ error: error.message })
  }

  return res.status(201).json(data as Player)
}
