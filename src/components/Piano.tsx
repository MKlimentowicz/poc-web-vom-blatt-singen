import { useEffect, useRef, useState } from 'react'
import * as Tone from 'tone'

interface KeyDef {
  display: string
  file: string
  toneName: string
  isBlack: boolean
}

function buildKeys(octave: number): KeyDef[] {
  const notes = [
    { de: 'c',   en: 'C',  black: false },
    { de: 'cis', en: 'C#', black: true },
    { de: 'd',   en: 'D',  black: false },
    { de: 'dis', en: 'D#', black: true },
    { de: 'e',   en: 'E',  black: false },
    { de: 'f',   en: 'F',  black: false },
    { de: 'fis', en: 'F#', black: true },
    { de: 'g',   en: 'G',  black: false },
    { de: 'gis', en: 'G#', black: true },
    { de: 'a',   en: 'A',  black: false },
    { de: 'ais', en: 'A#', black: true },
    { de: 'h',   en: 'B',  black: false },
  ]
  return notes.map(n => ({
    display: `${n.en}${octave}`,
    file: `${n.de}${octave}`,
    toneName: `${n.en}${octave}`,
    isBlack: n.black,
  }))
}

const ALL_KEYS = [...buildKeys(3), ...buildKeys(4)]

function normalizeNoteName(name: string): string {
  return name.replace('Bb', 'A#').replace('H', 'B')
}

interface PianoProps {
  highlightedNote?: string | null
}

export default function Piano({ highlightedNote }: PianoProps) {
  const samplerRef = useRef<Tone.Sampler | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const sampleMap: Record<string, string> = {}
    for (const key of ALL_KEYS) {
      sampleMap[key.toneName] = `${key.file.slice(-1)}/${key.file}.wav`
    }

    const sampler = new Tone.Sampler({
      urls: sampleMap,
      baseUrl: './samples/',
      onload: () => setLoaded(true),
    }).toDestination()

    samplerRef.current = sampler
    return () => { sampler.dispose() }
  }, [])

  const playNote = async (toneName: string) => {
    await Tone.start()
    if (samplerRef.current && loaded) {
      samplerRef.current.triggerAttackRelease(toneName, '1n')
    }
  }

  const normalizedHighlight = highlightedNote ? normalizeNoteName(highlightedNote) : null

  const whiteKeys = ALL_KEYS.filter(k => !k.isBlack)
  const blackKeys = ALL_KEYS.filter(k => k.isBlack)

  const blackKeyPositions: Record<string, number> = {}
  let whiteIndex = 0
  for (const key of ALL_KEYS) {
    if (!key.isBlack) {
      whiteIndex++
    } else {
      blackKeyPositions[key.display] = whiteIndex * 44 - 14
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-3 bg-gray-800 border-t border-gray-700 shrink-0">
      <div className="relative flex" style={{ height: '120px' }}>
        {whiteKeys.map(key => (
          <button
            key={key.display}
            onMouseDown={() => playNote(key.toneName)}
            className={`relative w-11 h-[120px] border border-gray-400 rounded-b text-[10px] flex items-end justify-center pb-1.5 transition-colors z-0
              ${normalizedHighlight === key.display
                ? 'bg-pistachio text-black font-bold'
                : 'bg-white hover:bg-gray-100 text-gray-500'
              }`}
          >
            {key.display}
          </button>
        ))}

        {blackKeys.map(key => (
          <button
            key={key.display}
            onMouseDown={() => playNote(key.toneName)}
            className={`absolute w-7 h-[76px] rounded-b z-10 text-[9px] flex items-end justify-center pb-1 transition-colors
              ${normalizedHighlight === key.display
                ? 'bg-pistachio text-black font-bold'
                : 'bg-gray-900 hover:bg-gray-700 text-gray-500'
              }`}
            style={{ left: `${blackKeyPositions[key.display]}px` }}
          >
            {key.display}
          </button>
        ))}
      </div>
    </div>
  )
}
