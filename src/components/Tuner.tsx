import { useState, useCallback, useRef, useEffect, type ReactNode, type ChangeEvent } from 'react'
import { startPitchDetection, stopPitchDetection, listAudioInputDevices } from '../audio/pitch-detector'
import type { AudioInputDevice } from '../audio/pitch-detector'
import { convertPitchToNote, getLampState } from '../audio/note-converter'
import type { LampState, PrimavistaNote } from '../audio/types'
import TunerLamp from './TunerLamp'

const LAMP_ORDER: LampState[] = [
  'RED_TOP_3', 'RED_TOP_2', 'RED_TOP_1', 'YELLOW_TOP',
  'GREEN_HIT',
  'YELLOW_BOTTOM', 'RED_BOTTOM_1', 'RED_BOTTOM_2', 'RED_BOTTOM_3',
]

interface TunerProps {
  onNoteDetected?: (note: string | null, freq?: number) => void
  onSheetLoaded?: (data: string, filename: string) => void
  onMicStarted?: () => void
  centerContent?: ReactNode
  sheetTargetHz?: number | null
  sheetTargetName?: string | null
  hasSheet?: boolean
  holdDuration?: number
  onHoldDurationChange?: (seconds: number) => void
  holdProgress?: number
}

export default function Tuner({
  onNoteDetected, onSheetLoaded, onMicStarted, centerContent,
  sheetTargetHz, sheetTargetName, hasSheet,
  holdDuration = 3, onHoldDurationChange, holdProgress = 0,
}: TunerProps) {
  const [isListening, setIsListening] = useState(false)
  const [frequency, setFrequency] = useState(0)
  const [detectedNote, setDetectedNote] = useState<PrimavistaNote | null>(null)
  const [lampState, setLampState] = useState<LampState>('GRAY_NONE')
  const [micStatus, setMicStatus] = useState('')
  const [devices, setDevices] = useState<AudioInputDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  const sheetTargetHzRef = useRef(sheetTargetHz)
  sheetTargetHzRef.current = sheetTargetHz

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    listAudioInputDevices()
      .then(devs => {
        setDevices(devs)
        if (devs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(devs[0].deviceId)
        }
      })
      .catch(() => setMicStatus('Mikrofon-Zugriff verweigert'))
  }, [])

  const handlePitch = useCallback((freq: number) => {
    setFrequency(freq)
    const note = convertPitchToNote(freq)
    setDetectedNote(note)

    if (note) {
      const targetHz = sheetTargetHzRef.current
      if (targetHz) {
        setLampState(getLampState(targetHz, freq))
      } else {
        setLampState('GRAY_NONE')
      }
      onNoteDetected?.(note.name, freq)
    } else {
      setLampState('GRAY_NONE')
      onNoteDetected?.(null)
    }
  }, [onNoteDetected])

  const toggleListening = async () => {
    if (isListening) {
      await stopPitchDetection()
      setIsListening(false)
      setLampState('GRAY_NONE')
      setFrequency(0)
      setDetectedNote(null)
      setMicStatus('')
      onNoteDetected?.(null)
    } else {
      try {
        await startPitchDetection(handlePitch, setMicStatus, selectedDeviceId || undefined)
        setIsListening(true)
        onMicStarted?.()
      } catch (err) {
        setMicStatus(`Fehler: ${err}`)
      }
    }
  }

  const handleLoadSheet = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    onSheetLoaded?.(base64, file.name)
  }

  const deviation = (frequency > 0 && sheetTargetHz)
    ? frequency - sheetTargetHz
    : 0

  const defaultCenter = (
    <div className="flex-1 flex flex-col items-center justify-center min-w-0">
      <div className={`text-8xl font-bold font-mono transition-colors duration-150 ${
        lampState === 'GREEN_HIT' ? 'text-green-400' :
        lampState.includes('YELLOW') ? 'text-yellow-400' :
        lampState.includes('RED') ? 'text-red-400' :
        'text-gray-600'
      }`}>
        {detectedNote?.name ?? '—'}
      </div>
      <div className="text-sm text-gray-500 mt-1 font-mono">
        {frequency > 0 ? `${frequency.toFixed(1)} Hz` : 'Lade ein Notenblatt zum Starten'}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <header className="flex items-center gap-3 px-5 py-3 bg-gray-800 border-b border-gray-700 shrink-0 flex-wrap">
        <h1 className="text-base font-bold text-pistachio mr-1">Primavista</h1>

        <select
          value={selectedDeviceId}
          onChange={e => setSelectedDeviceId(e.target.value)}
          disabled={isListening}
          className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white disabled:opacity-50 max-w-[200px] truncate"
        >
          {devices.length === 0 && <option value="">Kein Mikrofon</option>}
          {devices.map(d => (
            <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
          ))}
        </select>

        <button
          onClick={toggleListening}
          className={`px-4 py-1.5 rounded font-semibold text-sm transition-colors ${
            isListening
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isListening ? 'Stop' : 'Start'}
        </button>

        <button
          onClick={handleLoadSheet}
          className="px-4 py-1.5 rounded font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Noten laden
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.musicxml,.mxl"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-400">Halten:</label>
          <input
            type="range"
            min={0.5} max={5} step={0.5}
            value={holdDuration}
            onChange={e => onHoldDurationChange?.(Number(e.target.value))}
            className="w-24 h-1.5 accent-pistachio"
          />
          <span className="text-xs text-gray-300 font-mono w-8">{holdDuration.toFixed(1)}s</span>
        </div>

        {micStatus && (
          <span className={`text-xs ${isListening ? 'text-green-400' : 'text-yellow-400'}`}>
            {isListening && <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full mr-1 animate-pulse" />}
            {micStatus}
          </span>
        )}
      </header>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 items-stretch">
        {/* Lamp column */}
        <div className="flex flex-col items-center justify-center gap-1 px-4 py-3 border-r border-gray-700 shrink-0 relative">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">hoch</span>
          {LAMP_ORDER.map(pos => (
            <TunerLamp key={pos} position={pos} activeState={lampState} />
          ))}
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">tief</span>

          {/* Hold progress ring around lamp column */}
          {holdProgress > 0 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
              <svg width="48" height="48" viewBox="0 0 48 48" className="transform -rotate-90">
                <circle cx="24" cy="24" r="20" fill="none" stroke="#374151" strokeWidth="3" />
                <circle
                  cx="24" cy="24" r="20" fill="none"
                  stroke={holdProgress >= 1 ? '#22c55e' : '#3b82f6'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${holdProgress * 125.6} 125.6`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-white">
                {Math.round(holdProgress * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* Center */}
        {centerContent ?? defaultCenter}

        {/* Right: stats */}
        <div className="flex flex-col justify-center gap-2.5 px-5 py-3 border-l border-gray-700 shrink-0 w-52">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Zielton</div>
            <div className="text-lg font-mono text-blue-400">{sheetTargetName ?? '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Gemessener Ton</div>
            <div className={`text-lg font-mono font-bold ${
              lampState === 'GREEN_HIT' ? 'text-green-400' :
              lampState.includes('YELLOW') ? 'text-yellow-400' :
              lampState.includes('RED') ? 'text-red-400' :
              'text-gray-500'
            }`}>{detectedNote?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Zielfrequenz</div>
            <div className="text-lg font-mono">{sheetTargetHz ? `${sheetTargetHz.toFixed(3)} Hz` : '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Gemessene Frequenz</div>
            <div className="text-lg font-mono">{frequency > 0 ? `${frequency.toFixed(3)} Hz` : '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Abweichung</div>
            <div className={`text-lg font-mono ${
              Math.abs(deviation) < 10 ? 'text-green-400' :
              Math.abs(deviation) < 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {frequency > 0 && sheetTargetHz ? `${deviation > 0 ? '+' : ''}${deviation.toFixed(3)} Hz` : '—'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
