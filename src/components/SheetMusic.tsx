import { useEffect, useRef, useCallback } from 'react'
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay'
import { appNoteToChromatic, osmdPitchToChromatic, notesMatch } from '../audio/note-matcher'
import type { ChromaticNote } from '../audio/note-matcher'
import type { NoteResult } from './PracticeReport'

const SVG_NS = 'http://www.w3.org/2000/svg'

interface CachedNote {
  chromatic: ChromaticNote
  svgElements: Element[]
  state: 'pending' | 'current' | 'hit'
  bbox: { x: number; y: number; width: number; height: number } | null
}

interface SheetMusicProps {
  musicXmlBase64: string | null
  detectedNoteName: string | null
  detectedFrequency?: number
  pitchTick?: number
  holdDurationMs?: number
  active?: boolean
  onProgress?: (current: number, total: number) => void
  onCurrentTargetChange?: (targetHz: number | null, targetName: string | null) => void
  onHoldProgress?: (percent: number) => void
  onComplete?: (results: NoteResult[], totalTimeMs: number) => void
}

const HIT_COLOR = '#22c55e'
const CURRENT_COLOR = '#3b82f6'
const PENDING_COLOR = '#000000'

const SEMITONE_TO_HZ_BASE = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88]

function chromaticToHz(note: ChromaticNote): number {
  return SEMITONE_TO_HZ_BASE[note.semitone] * Math.pow(2, note.octave - 5)
}

const SEMITONE_TO_NAME = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'H']

function chromaticToName(note: ChromaticNote): string {
  return `${SEMITONE_TO_NAME[note.semitone]}${note.octave}`
}

function chromaticToMidi(c: ChromaticNote): number {
  return c.semitone + c.octave * 12
}

function findSvgElements(graphicalNote: any, gve: any): Element[] {
  const elements: Element[] = []
  try {
    const svgG = graphicalNote.getSVGGElement?.()
    if (svgG) {
      elements.push(...Array.from(svgG.querySelectorAll('path, circle, ellipse')) as Element[])
    }
  } catch { /* ignore */ }
  if (elements.length === 0) {
    try {
      const vfNote = gve?.vfStaveNote
      const el = vfNote?.getSVGElement?.() ?? vfNote?.getAttribute?.('el')
      if (el) {
        elements.push(...Array.from(el.querySelectorAll('path, circle, ellipse')) as Element[])
      }
    } catch { /* ignore */ }
  }
  return elements
}

function computePixelsPerSemitone(cache: CachedNote[]): number {
  for (let i = 0; i < cache.length; i++) {
    for (let j = i + 1; j < cache.length; j++) {
      if (!cache[i].bbox || !cache[j].bbox) continue
      const midiDiff = chromaticToMidi(cache[j].chromatic) - chromaticToMidi(cache[i].chromatic)
      if (midiDiff === 0) continue
      const yDiff = cache[j].bbox!.y - cache[i].bbox!.y
      return yDiff / midiDiff  // negative: higher pitch = smaller Y
    }
  }
  return -3 // fallback
}

export default function SheetMusic({
  musicXmlBase64, detectedNoteName, detectedFrequency = 0, pitchTick,
  holdDurationMs = 3000, active = true,
  onProgress, onCurrentTargetChange, onHoldProgress, onComplete,
}: SheetMusicProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null)
  const noteCacheRef = useRef<CachedNote[]>([])
  const graphicalNotesRef = useRef<any[]>([])
  const currentIndexRef = useRef(0)
  const rafRef = useRef<number>(0)
  const isCompleteRef = useRef(false)
  const holdStartRef = useRef<number>(0)
  const lastCorrectTimeRef = useRef<number>(0)
  const GRACE_MS = 300

  const noteResultsRef = useRef<NoteResult[]>([])
  const currentHzSamplesRef = useRef<number[]>([])
  const practiceStartRef = useRef<number>(0)
  const noteStartRef = useRef<number>(0)

  // Ghost note refs
  const ghostNoteRef = useRef<SVGEllipseElement | null>(null)
  const ghostGroupRef = useRef<SVGGElement | null>(null)
  const ppsRef = useRef<number>(-3) // pixels per semitone

  useEffect(() => {
    if (!containerRef.current) return
    const osmd = new OpenSheetMusicDisplay(containerRef.current, {
      backend: 'svg',
      drawTitle: false,
      drawComposer: false,
      drawCredits: false,
      autoResize: false,
    })
    osmdRef.current = osmd
    return () => { osmdRef.current = null }
  }, [])

  useEffect(() => {
    const osmd = osmdRef.current
    if (!osmd || !musicXmlBase64) return

    const loadScore = async () => {
      try {
        const binaryString = atob(musicXmlBase64)
        const isXml = binaryString.startsWith('<?xml') || binaryString.startsWith('<score')
        if (isXml) {
          await osmd.load(binaryString)
        } else {
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          await osmd.load(new Blob([bytes]))
        }

        osmd.zoom = 1.2
        osmd.render()

        buildNoteCache(osmd)
        currentIndexRef.current = 0
        isCompleteRef.current = false
        holdStartRef.current = 0
        lastCorrectTimeRef.current = 0
        noteResultsRef.current = []
        currentHzSamplesRef.current = []
        practiceStartRef.current = 0
        noteStartRef.current = 0

        // Compute pixels per semitone from rendered notes
        ppsRef.current = computePixelsPerSemitone(noteCacheRef.current)

        // Create ghost note SVG element
        createGhostNote()

        const cache = noteCacheRef.current
        if (cache.length > 0) {
          cache[0].state = 'current'
          renderNoteColors()
          onProgress?.(0, cache.length)
          onCurrentTargetChange?.(chromaticToHz(cache[0].chromatic), chromaticToName(cache[0].chromatic))
        }
        centerScore()
      } catch (err) {
        console.error('Failed to load MusicXML:', err)
      }
    }
    loadScore()
  }, [musicXmlBase64])

  function createGhostNote() {
    // Remove old ghost note if exists
    ghostGroupRef.current?.remove()
    ghostNoteRef.current = null
    ghostGroupRef.current = null

    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return

    const group = document.createElementNS(SVG_NS, 'g') as SVGGElement
    group.id = 'ghost-note'
    group.setAttribute('opacity', '0')

    const ellipse = document.createElementNS(SVG_NS, 'ellipse') as SVGEllipseElement
    ellipse.setAttribute('rx', '6')
    ellipse.setAttribute('ry', '4.5')
    ellipse.setAttribute('fill', '#9ca3af')
    ellipse.setAttribute('stroke', '#6b7280')
    ellipse.setAttribute('stroke-width', '0.5')

    group.appendChild(ellipse)
    svg.appendChild(group)

    ghostNoteRef.current = ellipse
    ghostGroupRef.current = group
  }

  function updateGhostNote(detectedName: string | null) {
    const group = ghostGroupRef.current
    const ellipse = ghostNoteRef.current
    if (!group || !ellipse) return

    if (!detectedName || !active || isCompleteRef.current) {
      group.setAttribute('opacity', '0')
      return
    }

    const detected = appNoteToChromatic(detectedName)
    if (!detected) { group.setAttribute('opacity', '0'); return }

    const idx = currentIndexRef.current
    const cache = noteCacheRef.current
    if (idx >= cache.length) { group.setAttribute('opacity', '0'); return }

    const currentNote = cache[idx]
    if (!currentNote.bbox) { group.setAttribute('opacity', '0'); return }

    const targetMidi = chromaticToMidi(currentNote.chromatic)
    const sungMidi = chromaticToMidi(detected)
    const semitoneDiff = sungMidi - targetMidi

    const cx = currentNote.bbox.x + currentNote.bbox.width / 2
    const cy = (currentNote.bbox.y + currentNote.bbox.height / 2) + (semitoneDiff * ppsRef.current)

    ellipse.setAttribute('cx', String(cx))
    ellipse.setAttribute('cy', String(cy))
    ellipse.setAttribute('transform', `rotate(-15 ${cx} ${cy})`)
    group.setAttribute('opacity', '0.5')
  }

  function centerScore() {
    const container = containerRef.current
    if (!container) return
    const svg = container.querySelector('svg')
    if (!svg) return
    svg.style.maxWidth = '100%'
    svg.style.display = 'block'
    svg.style.marginLeft = 'auto'
    svg.style.marginRight = 'auto'
  }

  function scrollToCurrentNote() {
    const cache = noteCacheRef.current
    const idx = currentIndexRef.current
    if (idx >= cache.length) return
    const note = cache[idx]
    if (note.svgElements.length > 0) {
      note.svgElements[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }

  function buildNoteCache(osmd: OpenSheetMusicDisplay) {
    const cache: CachedNote[] = []
    const graphicalNotes: any[] = []

    try {
      for (const measureRow of osmd.GraphicSheet.MeasureList) {
        for (const measure of measureRow) {
          if (!measure) continue
          for (const staffEntry of measure.staffEntries) {
            for (const gve of staffEntry.graphicalVoiceEntries) {
              for (const graphicalNote of gve.notes) {
                const sourceNote = graphicalNote.sourceNote
                if (!sourceNote.Pitch || sourceNote.isRest()) continue

                const chromatic = osmdPitchToChromatic(sourceNote.Pitch)
                const svgElements = findSvgElements(graphicalNote, gve)

                // Get bounding box for ghost note positioning
                let bbox: CachedNote['bbox'] = null
                if (svgElements.length > 0) {
                  try {
                    const b = (svgElements[0] as SVGGraphicsElement).getBBox()
                    bbox = { x: b.x, y: b.y, width: b.width, height: b.height }
                  } catch { /* ignore */ }
                }

                cache.push({ chromatic, svgElements, state: 'pending', bbox })
                graphicalNotes.push(graphicalNote)
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Error building note cache:', err)
    }

    noteCacheRef.current = cache
    graphicalNotesRef.current = graphicalNotes
  }

  const processDetectedNote = useCallback((detectedName: string | null, sungHz: number) => {
    // Always update ghost note position
    updateGhostNote(detectedName)

    if (isCompleteRef.current || !detectedName || !active) {
      onHoldProgress?.(0)
      return
    }

    const detected = appNoteToChromatic(detectedName)
    if (!detected) { onHoldProgress?.(0); return }

    const cache = noteCacheRef.current
    const idx = currentIndexRef.current
    if (idx >= cache.length) return

    const currentNote = cache[idx]
    const match = notesMatch(detected, currentNote.chromatic)

    const now = performance.now()

    if (match === 'exact') {
      lastCorrectTimeRef.current = now

      if (practiceStartRef.current === 0) {
        practiceStartRef.current = now
      }

      if (holdStartRef.current === 0) {
        holdStartRef.current = now
        noteStartRef.current = now
        currentHzSamplesRef.current = []
      }

      if (sungHz > 0) {
        currentHzSamplesRef.current.push(sungHz)
      }

      const elapsed = now - holdStartRef.current
      const percent = Math.min(elapsed / holdDurationMs, 1)
      onHoldProgress?.(percent)

      if (elapsed < holdDurationMs) return

      const targetHz = chromaticToHz(currentNote.chromatic)
      const samples = currentHzSamplesRef.current
      const avgHz = samples.length > 0 ? samples.reduce((a, b) => a + b) / samples.length : targetHz

      noteResultsRef.current.push({
        name: chromaticToName(currentNote.chromatic),
        targetHz,
        avgSungHz: avgHz,
        holdTimeMs: now - noteStartRef.current,
        avgDeviation: avgHz - targetHz,
      })

      holdStartRef.current = 0
      lastCorrectTimeRef.current = 0
      currentHzSamplesRef.current = []
      onHoldProgress?.(0)

      currentNote.state = 'hit'
      currentIndexRef.current = idx + 1

      if (idx + 1 < cache.length) {
        cache[idx + 1].state = 'current'
        const next = cache[idx + 1].chromatic
        onCurrentTargetChange?.(chromaticToHz(next), chromaticToName(next))
        setTimeout(() => scrollToCurrentNote(), 100)
      } else {
        isCompleteRef.current = true
        onCurrentTargetChange?.(null, null)
        const totalTime = now - practiceStartRef.current
        onComplete?.(noteResultsRef.current, totalTime)
        // Hide ghost note when complete
        ghostGroupRef.current?.setAttribute('opacity', '0')
      }

      renderNoteColors()
      onProgress?.(currentIndexRef.current, cache.length)
    } else {
      if (holdStartRef.current > 0 && lastCorrectTimeRef.current > 0) {
        const timeSinceCorrect = now - lastCorrectTimeRef.current
        if (timeSinceCorrect < GRACE_MS) {
          const elapsed = now - holdStartRef.current
          const percent = Math.min(elapsed / holdDurationMs, 1)
          onHoldProgress?.(percent)
          return
        }
        holdStartRef.current = 0
        lastCorrectTimeRef.current = 0
        currentHzSamplesRef.current = []
        onHoldProgress?.(0)
      }
    }
  }, [onProgress, onCurrentTargetChange, onHoldProgress, onComplete, holdDurationMs, active])

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      processDetectedNote(detectedNoteName, detectedFrequency)
    })
  }, [detectedNoteName, pitchTick, processDetectedNote, detectedFrequency])

  function renderNoteColors() {
    const osmd = osmdRef.current
    let usedFallback = false

    for (let i = 0; i < noteCacheRef.current.length; i++) {
      const note = noteCacheRef.current[i]
      const color = note.state === 'hit' ? HIT_COLOR : note.state === 'current' ? CURRENT_COLOR : PENDING_COLOR

      if (note.svgElements.length > 0) {
        for (const el of note.svgElements) {
          el.setAttribute('fill', color)
          el.setAttribute('stroke', color)
        }
      } else {
        const gn = graphicalNotesRef.current[i]
        if (gn?.sourceNote) {
          gn.sourceNote.NoteheadColor = color
          usedFallback = true
        }
      }
    }

    if (usedFallback && osmd) {
      requestAnimationFrame(() => {
        osmd.render()
        centerScore()
        createGhostNote() // re-create ghost note after OSMD re-render
      })
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-auto bg-white rounded"
      style={{ margin: '8px' }}
    />
  )
}
