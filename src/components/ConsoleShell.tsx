import { useState } from 'react'
import type { Exam, Placement, Plane } from '../types'
import { PLANES } from '../types'
import { deltas, scoreExam, type ExamScore } from '../lib/scoring'
import Viewport from './Viewport'
import InstructionsPanel from './InstructionsPanel'
import ScorePanel from './ScorePanel'
import Walkthrough from './Walkthrough'

interface Props {
  exam: Exam
  onBack: () => void
}

type Mode = 'learn' | 'practice'

const WALKTHROUGH_KEY = 'mri-sim-walkthrough-seen'
const HINT_KEY = 'mri-sim-handle-hint-seen'

/** Pre-placed, centered, unrotated — the student adjusts, never creates. */
function defaultPlacement(exam: Exam, plane: Plane): Placement {
  if (plane === exam.targetPlane) {
    return { type: 'fov', cx: 0.5, cy: 0.5, w: 0.6, h: 0.6, angleDeg: 0 }
  }
  return { type: 'lines', cx: 0.5, cy: 0.5, angleDeg: 0, extent: 0.5 }
}

export default function ConsoleShell({ exam, onBack }: Props) {
  // Learn is the default landing mode: the first rep is always guided.
  const [mode, setMode] = useState<Mode>('learn')
  const [placements, setPlacements] = useState<Record<Plane, Placement> | null>(null)
  const [score, setScore] = useState<ExamScore | null>(null)
  const [instructionsOpen, setInstructionsOpen] = useState(true)
  const [walkthrough, setWalkthrough] = useState(
    () => !localStorage.getItem(WALKTHROUGH_KEY),
  )
  const [hint, setHint] = useState(false)

  const closeWalkthrough = () => {
    localStorage.setItem(WALKTHROUGH_KEY, '1')
    setWalkthrough(false)
  }

  const addGroup = () => {
    setPlacements({
      sagittal: defaultPlacement(exam, 'sagittal'),
      coronal: defaultPlacement(exam, 'coronal'),
      axial: defaultPlacement(exam, 'axial'),
    })
    setScore(null)
    if (!localStorage.getItem(HINT_KEY)) setHint(true)
  }

  const reset = () => {
    setPlacements(null)
    setScore(null)
  }

  const dismissHint = () => {
    if (hint) {
      localStorage.setItem(HINT_KEY, '1')
      setHint(false)
    }
  }

  const change = (plane: Plane) => (p: Placement) => {
    setPlacements((prev) => (prev ? { ...prev, [plane]: p } : prev))
    // adjusting again invalidates the last scan (and, in Practice, re-hides
    // the reference so the student keeps working from the instructions)
    setScore(null)
  }

  const scan = () => {
    if (placements) setScore(scoreExam(exam, placements))
  }

  const switchMode = (m: Mode) => {
    setMode(m)
    setScore(null)
  }

  const showGhost = mode === 'learn' || score !== null

  return (
    <div className="console-shell">
      <header className="shell-header">
        <button className="btn subtle" onClick={onBack}>
          ← Exams
        </button>
        <div className="shell-title">
          <h2>
            {exam.exam} — {exam.sequenceNote}
          </h2>
          {exam.landmark && <span className="landmark">{exam.landmark}</span>}
        </div>
        <div className="mode-toggle" role="group" aria-label="Mode">
          <button
            className={mode === 'learn' ? 'btn seg active' : 'btn seg'}
            onClick={() => switchMode('learn')}
          >
            Learn
          </button>
          <button
            className={mode === 'practice' ? 'btn seg active' : 'btn seg'}
            onClick={() => switchMode('practice')}
          >
            Practice
          </button>
        </div>
        <button
          className="btn subtle help"
          title="Show the walkthrough again"
          onClick={() => setWalkthrough(true)}
        >
          ?
        </button>
      </header>

      <div className="shell-body">
        <div className="work-area">
          <div className="viewports">
            {PLANES.map((plane) => (
              <Viewport
                key={plane}
                plane={plane}
                image={exam.views[plane].image}
                answer={exam.views[plane].answer}
                placement={placements?.[plane] ?? null}
                showGhost={showGhost}
                interactive
                onChange={change(plane)}
                onInteract={dismissHint}
                deltas={
                  mode === 'learn' && placements
                    ? deltas(placements[plane], exam.views[plane].answer)
                    : null
                }
              />
            ))}
          </div>

          <div className="controls">
            {!placements ? (
              <button className="btn primary big" onClick={addGroup}>
                Add Slice Group
              </button>
            ) : (
              <>
                <button className="btn primary big" onClick={scan}>
                  Scan
                </button>
                <button className="btn subtle" onClick={reset}>
                  Reset
                </button>
              </>
            )}
            {hint && placements && (
              <div className="handle-hint" onPointerDown={dismissHint}>
                Drag to move · top handle rotates · corners resize the FOV ·
                line ends stretch coverage
                <button className="hint-close" onClick={dismissHint}>
                  ×
                </button>
              </div>
            )}
          </div>

          {score && <ScorePanel score={score} />}
        </div>

        <InstructionsPanel
          exam={exam}
          open={instructionsOpen}
          onToggle={() => setInstructionsOpen((o) => !o)}
        />
      </div>

      {walkthrough && <Walkthrough onClose={closeWalkthrough} />}
    </div>
  )
}
