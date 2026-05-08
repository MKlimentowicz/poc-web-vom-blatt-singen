export interface PrimavistaNote {
  name: string
  perfectPitch: number
  recordedPitch: number
  adjustmentFactor: number
  minPitch: number
  maxPitch: number
}

export type LampState =
  | 'GREEN_HIT'
  | 'YELLOW_BOTTOM'
  | 'YELLOW_TOP'
  | 'RED_BOTTOM_1'
  | 'RED_TOP_1'
  | 'RED_BOTTOM_2'
  | 'RED_TOP_2'
  | 'RED_BOTTOM_3'
  | 'RED_TOP_3'
  | 'GRAY_NONE'

export interface NoteRange {
  name: string
  perfectPitch: number
  min: number
  max: number
}

export interface TunerState {
  frequency: number
  note: PrimavistaNote | null
  lampState: LampState
  isListening: boolean
}
