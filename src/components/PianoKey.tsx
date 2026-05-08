interface PianoKeyProps {
  note: string
  isBlack: boolean
  isHighlighted: boolean
  onPlay: (note: string) => void
}

export default function PianoKey({ note, isBlack, isHighlighted, onPlay }: PianoKeyProps) {
  const highlightClass = isHighlighted ? 'ring-4 ring-pistachio' : ''

  if (isBlack) {
    return (
      <button
        onMouseDown={() => onPlay(note)}
        className={`absolute w-8 h-24 rounded-b-md z-10 text-xs flex items-end justify-center pb-1 transition-colors
          ${isHighlighted ? 'bg-pistachio text-black' : 'bg-gray-900 hover:bg-gray-700 text-gray-400'}
          ${highlightClass}`}
        style={{ marginLeft: '-16px' }}
      >
        {note}
      </button>
    )
  }

  return (
    <button
      onMouseDown={() => onPlay(note)}
      className={`relative w-12 h-40 border border-gray-300 rounded-b-md text-xs flex items-end justify-center pb-2 transition-colors
        ${isHighlighted ? 'bg-pistachio text-black' : 'bg-white hover:bg-gray-100 text-gray-600'}
        ${highlightClass}`}
    >
      {note}
    </button>
  )
}
