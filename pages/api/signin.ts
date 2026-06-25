import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Player } from '@/lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name } = req.body
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' })
  }

  // Case-insensitive lookup using the lower(name) index
  const { data, error } = await supabaseAdmin
    .from('players')
    .select('*')
    .ilike('name', name.trim())
    .single()

  if (error || !data) {
    return res.status(404).json({ error: "No player found with that name." })
  }

  return res.status(200).json(data as Player)
}
