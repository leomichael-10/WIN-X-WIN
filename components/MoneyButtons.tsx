import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface MoneyButtonsProps {
  onSubmit: (amount: number) => void
  disabled: boolean
}

const PRESETS = [
  { label: '+$100', value:  100, positive: true },
  { label: '+$200', value:  200, positive: true },
  { label: '-$100', value: -100, positive: false },
  { label: '-$200', value: -200, positive: false },
]

export function MoneyButtons({ onSubmit, disabled }: MoneyButtonsProps) {
  const [custom, setCustom] = useState('')
  const [activeValue, setActiveValue] = useState<number | null>(null)

  async function handlePreset(value: number) {
    if (disabled) return
    setActiveValue(value)
    await onSubmit(value)
    setTimeout(() => setActiveValue(null), 600)
  }

  function handleCustom() {
    const parsed = parseInt(custom, 10)
    if (isNaN(parsed) || parsed === 0) return
    onSubmit(parsed)
    setCustom('')
  }

  return (
    <div className="space-y-3">
      {/* Preset grid */}
      <div className="grid grid-cols-2 gap-3">
        {PRESETS.map(({ label, value, positive }) => {
          const isActive = activeValue === value
          return (
            <button
              key={value}
              onClick={() => handlePreset(value)}
              disabled={disabled}
              className="py-5 rounded-xl font-black text-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed select-none"
              style={{
                background: positive
                  ? isActive
                    ? 'linear-gradient(135deg,#4ade80,#16a34a)'
                    : 'linear-gradient(135deg,#16a34a,#15803d)'
                  : isActive
                    ? 'linear-gradient(135deg,#f87171,#dc2626)'
                    : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                color: '#fff',
                boxShadow: isActive
                  ? `0 0 28px ${positive ? 'rgba(74,222,128,0.55)' : 'rgba(248,113,113,0.55)'}`
                  : `0 2px 8px ${positive ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}`,
                transform: isActive ? 'scale(0.95)' : 'scale(1)',
                letterSpacing: '0.05em',
              }}
            >
              {isActive ? (positive ? '✓' : '✓') : label}
            </button>
          )
        })}
      </div>

      {/* Custom amount */}
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Custom amount…"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          disabled={disabled}
          onKeyDown={e => e.key === 'Enter' && handleCustom()}
          className="text-white placeholder:text-white/25 h-12 text-base"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1.5px solid rgba(212,175,55,0.2)',
          }}
        />
        <button
          onClick={handleCustom}
          disabled={disabled || !custom}
          className="h-12 px-5 rounded-xl font-black text-sm text-black whitespace-nowrap transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg,#ffe066,#d4af37,#a07820)',
            minWidth: 90,
            boxShadow: !disabled && custom ? '0 0 16px rgba(212,175,55,0.35)' : 'none',
          }}
        >
          Add
        </button>
      </div>
    </div>
  )
}
