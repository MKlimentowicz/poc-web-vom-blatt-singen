/**
 * Maps between app note names (from note-converter.ts) and OSMD Pitch objects.
 * Uses chromatic semitone comparison for enharmonic equivalence (D# = Eb).
 */

export interface ChromaticNote {
  semitone: number  // 0-11 (C=0, C#=1, ..., B/H=11)
  octave: number
}

// App note names → chromatic semitone
const NOTE_TO_SEMITONE: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'Bb': 10, 'H': 11,
}

/**
 * Convert app note name (e.g. "C#4", "Bb4", "H3") to chromatic representation.
 */
export function appNoteToChromatic(name: string): ChromaticNote | null {
  // Parse: note part (everything except last digit) + octave (last digit)
  const match = name.match(/^([A-Ha-h][#b]?)(\d)$/)
  if (!match) return null

  const notePart = match[1]
  const octave = parseInt(match[2])
  const semitone = NOTE_TO_SEMITONE[notePart]

  if (semitone === undefined) return null
  return { semitone, octave }
}

/**
 * Convert OSMD Pitch to chromatic representation.
 * OSMD 1.9.x: FundamentalNote is already chromatic (0-11), not diatonic.
 * AccidentalHalfTones adjusts for sharps/flats.
 *
 * Octave convention: OSMD octave 1 = standard octave 4.
 * The app's note-converter (ported from WPF Converter.cs) labels octaves +1 above standard
 * (e.g. it calls A3=220Hz "A4", and A4=440Hz "A5").
 * To match note-converter convention: OSMD octave + 4.
 */
export function osmdPitchToChromatic(pitch: {
  FundamentalNote: number
  AccidentalHalfTones: number
  Octave: number
}): ChromaticNote {
  const chromatic = pitch.FundamentalNote + pitch.AccidentalHalfTones
  const octave = pitch.Octave + 4
  return {
    semitone: ((chromatic % 12) + 12) % 12,
    octave,
  }
}

/**
 * Check if two chromatic notes match.
 */
export function notesMatch(a: ChromaticNote, b: ChromaticNote): 'exact' | 'sameNote' | 'none' {
  if (a.semitone === b.semitone && a.octave === b.octave) return 'exact'
  if (a.semitone === b.semitone) return 'sameNote'  // right note, wrong octave
  return 'none'
}
