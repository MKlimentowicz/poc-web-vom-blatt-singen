import type { NoteRange, PrimavistaNote, LampState } from './types'

// Ported from Converter.cs — frequency ranges for note detection
export const NOTE_RANGES: NoteRange[] = [
  { name: 'E3',  perfectPitch: 82.407,  min: 62.25,    max: 75.1249 },
  { name: 'F3',  perfectPitch: 87.307,  min: 75.1250,  max: 90.5149 },
  { name: 'F#3', perfectPitch: 92.499,  min: 90.5150,  max: 94.7599 },
  { name: 'G3',  perfectPitch: 97.999,  min: 94.7600,  max: 100.6202 },
  { name: 'G#3', perfectPitch: 103.83,  min: 100.6203, max: 107.3752 },
  { name: 'A3',  perfectPitch: 110.00,  min: 107.3753, max: 111.9767 },
  { name: 'Bb3', perfectPitch: 116.54,  min: 111.9768, max: 118.5689 },
  { name: 'H3',  perfectPitch: 123.47,  min: 118.5690, max: 128.0080 },
  { name: 'C4',  perfectPitch: 130.81,  min: 128.0081, max: 136.8631 },
  { name: 'C#4', perfectPitch: 138.59,  min: 136.8632, max: 144.6896 },
  { name: 'D4',  perfectPitch: 146.83,  min: 144.6897, max: 153.7750 },
  { name: 'D#4', perfectPitch: 155.56,  min: 153.7751, max: 162.1862 },
  { name: 'E4',  perfectPitch: 164.81,  min: 162.1863, max: 172.5749 },
  { name: 'F4',  perfectPitch: 174.61,  min: 172.5750, max: 181.0299 },
  { name: 'F#4', perfectPitch: 185.00,  min: 181.0300, max: 189.5199 },
  { name: 'G4',  perfectPitch: 196.00,  min: 189.5200, max: 201.2404 },
  { name: 'G#4', perfectPitch: 207.65,  min: 201.2405, max: 214.7504 },
  { name: 'A4',  perfectPitch: 220.00,  min: 214.7505, max: 223.9534 },
  { name: 'Bb4', perfectPitch: 233.08,  min: 223.9535, max: 237.1378 },
  { name: 'H4',  perfectPitch: 246.94,  min: 237.1379, max: 256.0160 },
  { name: 'C5',  perfectPitch: 261.63,  min: 256.0161, max: 273.7262 },
  { name: 'C#5', perfectPitch: 277.18,  min: 273.7263, max: 289.3792 },
  { name: 'D5',  perfectPitch: 293.66,  min: 289.3793, max: 307.5500 },
  { name: 'D#5', perfectPitch: 311.13,  min: 307.5501, max: 324.3724 },
  { name: 'E5',  perfectPitch: 329.63,  min: 324.3725, max: 345.1498 },
  { name: 'F5',  perfectPitch: 349.23,  min: 345.1499, max: 362.0598 },
  { name: 'F#5', perfectPitch: 369.99,  min: 362.0599, max: 379.0398 },
  { name: 'G5',  perfectPitch: 392.00,  min: 379.0399, max: 402.4808 },
  { name: 'G#5', perfectPitch: 415.30,  min: 402.4809, max: 429.5008 },
  { name: 'A5',  perfectPitch: 440.00,  min: 429.5009, max: 447.9068 },
  { name: 'Bb5', perfectPitch: 466.16,  min: 447.9069, max: 474.2756 },
  { name: 'H5',  perfectPitch: 493.88,  min: 474.2757, max: 512.0320 },
  { name: 'C6',  perfectPitch: 523.25,  min: 512.0321, max: 547.4524 },
  { name: 'C#6', perfectPitch: 554.37,  min: 547.4525, max: 578.7584 },
  { name: 'D6',  perfectPitch: 587.33,  min: 578.7585, max: 615.1000 },
  { name: 'D#6', perfectPitch: 622.25,  min: 615.1001, max: 648.7448 },
  { name: 'E6',  perfectPitch: 659.26,  min: 648.7449, max: 690.2996 },
  { name: 'F6',  perfectPitch: 698.46,  min: 690.2997, max: 724.1196 },
  { name: 'F#6', perfectPitch: 739.99,  min: 724.1197, max: 758.0796 },
  { name: 'G6',  perfectPitch: 783.99,  min: 758.0797, max: 804.9616 },
  { name: 'G#6', perfectPitch: 830.61,  min: 804.9617, max: 859.0016 },
  { name: 'A6',  perfectPitch: 880.00,  min: 859.0017, max: 895.8136 },
  { name: 'Bb6', perfectPitch: 932.33,  min: 895.8137, max: 948.5512 },
  { name: 'H6',  perfectPitch: 987.77,  min: 948.5513, max: 1024.064 },
  { name: 'C7',  perfectPitch: 1046.50, min: 1024.065, max: 1150.00 },
]

export function convertPitchToNote(frequency: number): PrimavistaNote | null {
  for (const range of NOTE_RANGES) {
    if (frequency >= range.min && frequency <= range.max) {
      return {
        name: range.name,
        perfectPitch: range.perfectPitch,
        recordedPitch: frequency,
        adjustmentFactor: 0,
        minPitch: range.min,
        maxPitch: range.max,
      }
    }
  }
  return null
}

export function getLampState(referencePitch: number, sungPitch: number): LampState {
  const diff = referencePitch - sungPitch

  if (Math.abs(diff) < 10) return 'GREEN_HIT'

  if (diff >= 10 && diff < 50) return 'YELLOW_BOTTOM'
  if (diff <= -10 && diff > -50) return 'YELLOW_TOP'

  if (diff >= 50 && diff < 70) return 'RED_BOTTOM_1'
  if (diff <= -50 && diff > -70) return 'RED_TOP_1'

  if (diff >= 70 && diff < 100) return 'RED_BOTTOM_2'
  if (diff <= -70 && diff > -100) return 'RED_TOP_2'

  if (diff >= 100 && diff < 200) return 'RED_BOTTOM_3'
  if (diff <= -100 && diff > -200) return 'RED_TOP_3'

  return 'GRAY_NONE'
}

// Target notes for tuner dropdown
export const TARGET_NOTES = NOTE_RANGES.filter(n =>
  ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'H4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'].includes(n.name)
)
