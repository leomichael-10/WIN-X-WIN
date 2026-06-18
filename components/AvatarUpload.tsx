import { useRef, useState } from 'react'
import Image from 'next/image'

interface AvatarUploadProps {
  onUpload: (url: string) => void
  currentUrl: string | null
}

export function AvatarUpload({ onUpload, currentUrl }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const [uploading, setUploading] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)

    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.url) onUpload(json.url)
    } catch {
      // keep local preview; user can retry on submit
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-yellow-400 bg-purple-900 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
      >
        {preview ? (
          <Image src={preview} alt="Avatar" fill className="object-cover" unoptimized />
        ) : (
          <span className="text-4xl">🎰</span>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-bold">...</span>
          </div>
        )}
      </button>
      <span className="text-xs text-purple-300">Tap to upload photo</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}
