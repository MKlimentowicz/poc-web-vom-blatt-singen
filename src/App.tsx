import { useState, useCallback, useRef, useEffect } from 'react'
import Tuner from './components/Tuner'
import SheetMusic from './components/SheetMusic'
import PracticeReport from './components/PracticeReport'
import type { NoteResult } from './components/PracticeReport'

export default function App() {
  const [highlightedNote, setHighlightedNote] = useState<string | null>(null)
  const [detectedFrequency, setDetectedFrequency] = useState(0)
  const [pitchTick, setPitchTick] = useState(0)
  const pitchTickRef = useRef(0)
  const [musicXmlData, setMusicXmlData] = useState<string | null>(null)
  const [sheetFilename, setSheetFilename] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const [sheetKey, setSheetKey] = useState(0)
  const [sheetTargetHz, setSheetTargetHz] = useState<number | null>(null)
  const [sheetTargetName, setSheetTargetName] = useState<string | null>(null)
  const [holdDuration, setHoldDuration] = useState(1)
  const [holdProgress, setHoldProgress] = useState(0)

  // Countdown
  const [countdown, setCountdown] = useState<number | null>(null)
  const [practiceActive, setPracticeActive] = useState(false)

  // Report
  const [reportData, setReportData] = useState<{ results: NoteResult[]; totalTimeMs: number } | null>(null)

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setCountdown(null)
      setPracticeActive(true)
      return
    }
    const timer = setTimeout(() => setCountdown(c => c !== null ? c - 1 : null), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleSheetLoaded = (data: string, filename: string) => {
    setMusicXmlData(data)
    setSheetFilename(filename)
    setProgress(null)
    setReportData(null)
    setSheetKey(k => k + 1)
    setPracticeActive(false)
    setCountdown(null)
  }

  const handleReset = () => {
    setProgress(null)
    setReportData(null)
    setHoldProgress(0)
    setPracticeActive(false)
    setCountdown(null)
    setSheetKey(k => k + 1)
  }

  const handleClose = () => {
    setMusicXmlData(null)
    setSheetFilename(null)
    setProgress(null)
    setSheetTargetHz(null)
    setSheetTargetName(null)
    setReportData(null)
    setPracticeActive(false)
    setCountdown(null)
  }

  const handleProgress = useCallback((current: number, total: number) => {
    setProgress({ current, total })
  }, [])

  const handleCurrentTargetChange = useCallback((hz: number | null, name: string | null) => {
    setSheetTargetHz(hz)
    setSheetTargetName(name)
  }, [])

  const handleComplete = useCallback((results: NoteResult[], totalTimeMs: number) => {
    setReportData({ results, totalTimeMs })
  }, [])

  // Start countdown when mic starts and sheet is loaded
  const handleMicStarted = useCallback(() => {
    if (musicXmlData && !practiceActive && countdown === null) {
      setCountdown(3)
    }
  }, [musicXmlData, practiceActive, countdown])

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden relative">
      <Tuner
        holdDuration={holdDuration}
        onHoldDurationChange={setHoldDuration}
        holdProgress={holdProgress}
        onNoteDetected={(note, freq) => {
          setHighlightedNote(note)
          setDetectedFrequency(freq ?? 0)
          pitchTickRef.current++
          setPitchTick(pitchTickRef.current)
        }}
        onSheetLoaded={handleSheetLoaded}
        onMicStarted={handleMicStarted}
        sheetTargetHz={sheetTargetHz}
        sheetTargetName={sheetTargetName}
        hasSheet={!!musicXmlData}
        centerContent={
          musicXmlData ? (
            <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
              <div className="flex items-center gap-3 px-3 pt-2 text-xs shrink-0">
                <span className="text-gray-400 truncate">{sheetFilename}</span>

                {progress && (
                  <span className={`font-mono ${progress.current >= progress.total ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                    {progress.current >= progress.total ? 'Fertig!' : `${progress.current} / ${progress.total}`}
                  </span>
                )}

                {progress && progress.current > 0 && (
                  <button onClick={handleReset} className="text-blue-400 hover:text-blue-300">
                    Neustart
                  </button>
                )}

                <button onClick={handleClose} className="text-gray-500 hover:text-white ml-auto">
                  Schliessen
                </button>
              </div>

              {/* Hold progress bar */}
              {holdProgress > 0 && (
                <div className="h-1.5 mx-3 mt-1 bg-gray-700 rounded-full overflow-hidden shrink-0">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      holdProgress >= 1 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${holdProgress * 100}%` }}
                  />
                </div>
              )}

              {/* Overall progress bar */}
              {progress && progress.total > 0 && holdProgress === 0 && (
                <div className="h-1 mx-3 mt-1 bg-gray-700 rounded-full overflow-hidden shrink-0">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      progress.current >= progress.total ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              )}

              {/* Countdown overlay */}
              {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 rounded">
                  <div className="text-center">
                    <div className="text-9xl font-bold text-white animate-pulse">{countdown}</div>
                    <div className="text-lg text-gray-300 mt-2">Mach dich bereit...</div>
                  </div>
                </div>
              )}

              <SheetMusic
                key={sheetKey}
                musicXmlBase64={musicXmlData}
                detectedNoteName={highlightedNote}
                detectedFrequency={detectedFrequency}
                pitchTick={pitchTick}
                holdDurationMs={holdDuration * 1000}
                active={practiceActive}
                onProgress={handleProgress}
                onCurrentTargetChange={handleCurrentTargetChange}
                onHoldProgress={setHoldProgress}
                onComplete={handleComplete}
              />
            </div>
          ) : undefined
        }
      />

      {/* Practice Report Modal */}
      {reportData && (
        <PracticeReport
          results={reportData.results}
          totalTimeMs={reportData.totalTimeMs}
          onRestart={handleReset}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
