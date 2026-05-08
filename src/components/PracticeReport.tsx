export interface NoteResult {
  name: string
  targetHz: number
  avgSungHz: number
  holdTimeMs: number
  avgDeviation: number
}

interface PracticeReportProps {
  results: NoteResult[]
  totalTimeMs: number
  onRestart: () => void
  onClose: () => void
}

export default function PracticeReport({ results, totalTimeMs, onRestart, onClose }: PracticeReportProps) {
  const totalTimeSec = (totalTimeMs / 1000).toFixed(1)
  const avgTimePerNote = results.length > 0 ? (totalTimeMs / results.length / 1000).toFixed(1) : '—'
  const avgDeviation = results.length > 0
    ? (results.reduce((sum, r) => sum + Math.abs(r.avgDeviation), 0) / results.length).toFixed(2)
    : '—'

  const bestNote = results.length > 0
    ? results.reduce((best, r) => Math.abs(r.avgDeviation) < Math.abs(best.avgDeviation) ? r : best)
    : null
  const worstNote = results.length > 0
    ? results.reduce((worst, r) => Math.abs(r.avgDeviation) > Math.abs(worst.avgDeviation) ? r : worst)
    : null

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-8 max-w-lg w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-green-400 mb-6 text-center">Fertig!</h2>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Gesamtzeit</div>
            <div className="text-xl font-mono">{totalTimeSec}s</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">pro Note</div>
            <div className="text-xl font-mono">{avgTimePerNote}s</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Abweichung</div>
            <div className={`text-xl font-mono ${
              Number(avgDeviation) < 5 ? 'text-green-400' :
              Number(avgDeviation) < 20 ? 'text-yellow-400' : 'text-red-400'
            }`}>{avgDeviation} Hz</div>
          </div>
        </div>

        {/* Best / Worst */}
        {bestNote && worstNote && results.length > 1 && (
          <div className="flex gap-4 mb-6">
            <div className="flex-1 bg-gray-700 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Bester Treffer</div>
              <div className="text-lg font-mono text-green-400">{bestNote.name}</div>
              <div className="text-xs text-gray-400">{Math.abs(bestNote.avgDeviation).toFixed(2)} Hz Abweichung</div>
            </div>
            <div className="flex-1 bg-gray-700 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Schwierigster</div>
              <div className="text-lg font-mono text-yellow-400">{worstNote.name}</div>
              <div className="text-xs text-gray-400">{Math.abs(worstNote.avgDeviation).toFixed(2)} Hz Abweichung</div>
            </div>
          </div>
        )}

        {/* Per-note table */}
        {results.length > 0 && (
          <div className="max-h-40 overflow-auto mb-6 rounded-lg">
            <table className="w-full text-sm">
              <thead className="text-gray-400 text-[10px] uppercase sticky top-0 bg-gray-800">
                <tr>
                  <th className="text-left py-1 px-2">Note</th>
                  <th className="text-right py-1 px-2">Ziel</th>
                  <th className="text-right py-1 px-2">Gesungen</th>
                  <th className="text-right py-1 px-2">Abweichung</th>
                  <th className="text-right py-1 px-2">Zeit</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-gray-700">
                    <td className="py-1 px-2">{r.name}</td>
                    <td className="text-right py-1 px-2">{r.targetHz.toFixed(1)}</td>
                    <td className="text-right py-1 px-2">{r.avgSungHz.toFixed(1)}</td>
                    <td className={`text-right py-1 px-2 ${
                      Math.abs(r.avgDeviation) < 5 ? 'text-green-400' :
                      Math.abs(r.avgDeviation) < 20 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{r.avgDeviation > 0 ? '+' : ''}{r.avgDeviation.toFixed(2)}</td>
                    <td className="text-right py-1 px-2">{(r.holdTimeMs / 1000).toFixed(1)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRestart}
            className="px-6 py-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Neustart
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-semibold bg-gray-600 hover:bg-gray-500 transition-colors"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  )
}
