import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'id is required' })
  }

  const { data, error } = await supabaseAdmin
    .from('challenge_completions')
    .select('status, reward')
    .eq('id', id)
    .single()

  if (error || !data) return res.status(404).json({ error: 'Completion not found' })
  return res.status(200).json({ status: data.status, reward: data.reward })
}
