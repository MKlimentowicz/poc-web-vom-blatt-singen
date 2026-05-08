/**
 * AudioWorklet processor — direct port of Autocorrelator.cs
 *
 * Runs in the audio thread. Accumulates samples in a ring buffer,
 * then runs autocorrelation to detect pitch every ~46ms (2048 samples).
 */

const MIN_FREQ = 75
const MAX_FREQ = 1150
const SAMPLE_RATE = 44100
const BUFFER_SIZE = 2048

const minOffset = Math.floor(SAMPLE_RATE / MAX_FREQ) // 38
const maxOffset = Math.floor(SAMPLE_RATE / MIN_FREQ)  // 588

class PitchDetectorProcessor extends AudioWorkletProcessor {
  private buffer: Float32Array
  private prevBuffer: Float32Array
  private bufferIndex: number
  private hasPrevBuffer: boolean

  constructor() {
    super()
    this.buffer = new Float32Array(BUFFER_SIZE)
    this.prevBuffer = new Float32Array(BUFFER_SIZE)
    this.bufferIndex = 0
    this.hasPrevBuffer = false
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0]
    if (!input || !input[0]) return true

    const channelData = input[0]

    // Accumulate samples
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i]

      if (this.bufferIndex >= BUFFER_SIZE) {
        const frequency = this.detectPitch()
        if (frequency > 0) {
          this.port.postMessage({ frequency })
        }

        // Swap buffers
        const temp = this.prevBuffer
        this.prevBuffer = this.buffer
        this.buffer = temp
        this.bufferIndex = 0
        this.hasPrevBuffer = true
      }
    }

    return true
  }

  private detectPitch(): number {
    const frames = BUFFER_SIZE

    if (!this.hasPrevBuffer) return 0

    let maxCorr = 0
    let maxLag = 0

    // Starting with low frequencies, working to higher — exact port of C# algorithm
    for (let lag = maxOffset; lag >= minOffset; lag--) {
      let corr = 0
      for (let i = 0; i < frames; i++) {
        const oldIndex = i - lag
        const sample = oldIndex < 0
          ? this.prevBuffer[frames + oldIndex]
          : this.buffer[oldIndex]
        corr += sample * this.buffer[i]
      }

      if (corr > maxCorr) {
        maxCorr = corr
        maxLag = lag
      }
    }

    const noiseThreshold = frames / 1000
    if (maxCorr < noiseThreshold || maxLag === 0) return 0

    return SAMPLE_RATE / maxLag
  }
}

registerProcessor('pitch-detector', PitchDetectorProcessor)
