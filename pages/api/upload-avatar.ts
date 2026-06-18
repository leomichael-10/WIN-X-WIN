import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const config = { api: { bodyParser: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const form = formidable({ maxFileSize: 5 * 1024 * 1024 }) // 5MB limit

  let fields: formidable.Fields
  let files: formidable.Files

  try {
    [fields, files] = await form.parse(req)
  } catch (err: any) {
    return res.status(400).json({ error: err.message ?? 'Failed to parse upload' })
  }

  const file = Array.isArray(files.avatar) ? files.avatar[0] : files.avatar

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded. Send file as form field "avatar".' })
  }

  const ext = path.extname(file.originalFilename ?? 'avatar.jpg')
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

  let fileBuffer: Buffer
  try {
    fileBuffer = fs.readFileSync(file.filepath)
  } catch {
    return res.status(500).json({ error: 'Failed to read uploaded file' })
  }

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(filename, fileBuffer, {
      contentType: file.mimetype ?? 'image/jpeg',
      upsert: false,
    })

  if (uploadError) return res.status(500).json({ error: uploadError.message })

  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(filename)

  return res.status(200).json({ url: data.publicUrl })
}
