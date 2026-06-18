import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MoneyButtonsProps {
  onSubmit: (amount: number) => void
  disabled: boolean
}

const PRESETS = [
  { label: '+$50', value: 50, color: 'bg-green-600 hover:bg-green-500' },
  { label: '+$100', value: 100, color: 'bg-green-700 hover:bg-green-600' },
  { label: '-$50', value: -50, color: 'bg-red-600 hover:bg-red-500' },
  { label: '-$100', value: -100, color: 'bg-red-700 hover:bg-red-600' },
]

export function MoneyButtons({ onSubmit, disabled }: MoneyButtonsProps) {
  const [custom, setCustom] = useState('')
  const [animating, setAnimating] = useState<number | null>(null)

  function handlePreset(value: number) {
    setAnimating(value)
    setTimeout(() => setAnimating(null), 300)
    onSubmit(value)
  }

  function handleCustom() {
    const parsed = parseInt(custom, 10)
    if (isNaN(parsed) || parsed === 0) return
    onSubmit(parsed)
    setCustom('')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map(({ label, value, color }) => (
          <button
            key={value}
            onClick={() => handlePreset(value)}
            disabled={disabled}
            className={`${color} text-white font-bold text-lg py-4 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 ${
              animating === value ? 'scale-95 brightness-125' : ''
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Custom amount (e.g. 75 or -75)"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          disabled={disabled}
          className="bg-purple-900/50 border-purple-600 text-white placeholder:text-purple-400"
          onKeyDown={e => e.key === 'Enter' && handleCustom()}
        />
        <Button
          onClick={handleCustom}
          disabled={disabled || !custom}
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold whitespace-nowrap"
        >
          Add Money
        </Button>
      </div>
    </div>
  )
}
