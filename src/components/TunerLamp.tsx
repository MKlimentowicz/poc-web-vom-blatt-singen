import type { LampState } from '../audio/types'

interface TunerLampProps {
  position: LampState
  activeState: LampState
}

const LAMP_CONFIG: Record<LampState, { label: string; activeColor: string }> = {
  RED_TOP_3:      { label: '▲▲▲', activeColor: 'bg-red-700 shadow-red-700/50' },
  RED_TOP_2:      { label: '▲▲',  activeColor: 'bg-red-600 shadow-red-600/50' },
  RED_TOP_1:      { label: '▲',   activeColor: 'bg-red-500 shadow-red-500/50' },
  YELLOW_TOP:     { label: '↑',   activeColor: 'bg-yellow-500 shadow-yellow-500/50' },
  GREEN_HIT:      { label: '●',   activeColor: 'bg-green-500 shadow-green-500/50' },
  YELLOW_BOTTOM:  { label: '↓',   activeColor: 'bg-yellow-500 shadow-yellow-500/50' },
  RED_BOTTOM_1:   { label: '▼',   activeColor: 'bg-red-500 shadow-red-500/50' },
  RED_BOTTOM_2:   { label: '▼▼',  activeColor: 'bg-red-600 shadow-red-600/50' },
  RED_BOTTOM_3:   { label: '▼▼▼', activeColor: 'bg-red-700 shadow-red-700/50' },
  GRAY_NONE:      { label: '—',   activeColor: 'bg-gray-700' },
}

export default function TunerLamp({ position, activeState }: TunerLampProps) {
  const config = LAMP_CONFIG[position]
  const isActive = position === activeState

  return (
    <div
      className={`w-12 h-6 rounded flex items-center justify-center text-[11px] font-bold transition-all duration-100 ${
        isActive
          ? `${config.activeColor} shadow-lg text-white`
          : 'bg-gray-800 text-gray-600'
      }`}
    >
      {config.label}
    </div>
  )
}
