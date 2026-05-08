export type PitchCallback = (frequency: number) => void
export type StatusCallback = (status: string) => void

export interface AudioInputDevice {
  deviceId: string
  label: string
}

let audioContext: AudioContext | null = null
let workletNode: AudioWorkletNode | null = null
let mediaStream: MediaStream | null = null

export async function listAudioInputDevices(): Promise<AudioInputDevice[]> {
  // Need a temporary getUserMedia call to get device labels (browsers hide them until permission is granted)
  const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  tempStream.getTracks().forEach(t => t.stop())

  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices
    .filter(d => d.kind === 'audioinput')
    .map(d => ({ deviceId: d.deviceId, label: d.label || `Mikrofon ${d.deviceId.slice(0, 8)}` }))
}

export async function startPitchDetection(
  onPitch: PitchCallback,
  onStatus?: StatusCallback,
  deviceId?: string,
): Promise<void> {
  onStatus?.('AudioContext erstellen...')
  audioContext = new AudioContext({ sampleRate: 44100 })

  // Ensure AudioContext is running (can start suspended)
  if (audioContext.state === 'suspended') {
    onStatus?.('AudioContext wird fortgesetzt...')
    await audioContext.resume()
  }

  onStatus?.('AudioWorklet laden...')
  const processorCode = `
    const MIN_FREQ = 75;
    const MAX_FREQ = 1150;
    const SAMPLE_RATE = 44100;
    const BUFFER_SIZE = 2048;
    const minOffset = Math.floor(SAMPLE_RATE / MAX_FREQ);
    const maxOffset = Math.floor(SAMPLE_RATE / MIN_FREQ);

    class PitchDetectorProcessor extends AudioWorkletProcessor {
      constructor() {
        super();
        this.buffer = new Float32Array(BUFFER_SIZE);
        this.prevBuffer = new Float32Array(BUFFER_SIZE);
        this.bufferIndex = 0;
        this.hasPrevBuffer = false;
      }

      process(inputs) {
        const input = inputs[0];
        if (!input || !input[0]) return true;
        const channelData = input[0];

        for (let i = 0; i < channelData.length; i++) {
          this.buffer[this.bufferIndex++] = channelData[i];
          if (this.bufferIndex >= BUFFER_SIZE) {
            const frequency = this.detectPitch();
            this.port.postMessage({ frequency, hasData: true });
            const temp = this.prevBuffer;
            this.prevBuffer = this.buffer;
            this.buffer = temp;
            this.bufferIndex = 0;
            this.hasPrevBuffer = true;
          }
        }
        return true;
      }

      detectPitch() {
        const frames = BUFFER_SIZE;
        if (!this.hasPrevBuffer) return 0;

        let maxCorr = 0;
        let maxLag = 0;

        for (let lag = maxOffset; lag >= minOffset; lag--) {
          let corr = 0;
          for (let i = 0; i < frames; i++) {
            const oldIndex = i - lag;
            const sample = oldIndex < 0
              ? this.prevBuffer[frames + oldIndex]
              : this.buffer[oldIndex];
            corr += sample * this.buffer[i];
          }
          if (corr > maxCorr) {
            maxCorr = corr;
            maxLag = lag;
          }
        }

        const noiseThreshold = frames / 1000;
        if (maxCorr < noiseThreshold || maxLag === 0) return 0;
        return SAMPLE_RATE / maxLag;
      }
    }

    registerProcessor('pitch-detector', PitchDetectorProcessor);
  `

  const blob = new Blob([processorCode], { type: 'application/javascript' })
  const blobUrl = URL.createObjectURL(blob)
  await audioContext.audioWorklet.addModule(blobUrl)
  URL.revokeObjectURL(blobUrl)

  onStatus?.('Mikrofon anfordern...')
  const audioConstraints: MediaTrackConstraints = {
    sampleRate: { ideal: 44100 },
    channelCount: { exact: 1 },
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  }
  if (deviceId) {
    audioConstraints.deviceId = { exact: deviceId }
  }
  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })

  onStatus?.('Verbunden — lausche...')

  const source = audioContext.createMediaStreamSource(mediaStream)
  workletNode = new AudioWorkletNode(audioContext, 'pitch-detector')

  workletNode.port.onmessage = (event: MessageEvent<{ frequency: number; hasData: boolean }>) => {
    const { frequency } = event.data
    if (frequency > 0) {
      onPitch(frequency)
    }
  }

  source.connect(workletNode)
}

export async function stopPitchDetection(): Promise<void> {
  if (workletNode) {
    workletNode.disconnect()
    workletNode = null
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }
  if (audioContext) {
    await audioContext.close()
    audioContext = null
  }
}
