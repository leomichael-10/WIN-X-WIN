import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const config = { api: { bodyParser: false } }

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const form = formidable({ maxFileSize: 5 * 1024 * 1024 }) // 5MB limit

  let files: formidable.Files

  try {
    [, files] = await form.parse(req)
  } catch (err: any) {
    return res.status(400).json({ error: err.message ?? 'Failed to parse upload' })
  }

  const file = Array.isArray(files.avatar) ? files.avatar[0] : files.avatar

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded. Send file as form field "avatar".' })
  }

  const mimeType = file.mimetype ?? ''
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return res.status(400).json({ error: 'Only JPEG, PNG, GIF, and WebP images are allowed' })
  }

  const ext = MIME_TO_EXT[mimeType]
  const filename = `${Date.now()}-${randomUUID()}${ext}`

  let fileBuffer: Buffer
  try {
    fileBuffer = fs.readFileSync(file.filepath)
  } catch {
    return res.status(500).json({ error: 'Failed to read uploaded file' })
  } finally {
    // Clean up temp file regardless of read outcome
    try { fs.unlinkSync(file.filepath) } catch { /* ignore cleanup errors */ }
  }

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(filename, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (uploadError) return res.status(500).json({ error: uploadError.message })

  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(filename)

  return res.status(200).json({ url: data.publicUrl })
}
