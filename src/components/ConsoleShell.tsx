import { useState } from 'react'
import type { Exam, ExamFamily, Placement, Plane, Pose } from '../types'
import { PLANES, PLANE_SHORT } from '../types'
import type { Prescription } from '../lib/prescription'
import {
  clampPrescription,
  ghostRender,
  slicesForCoverage,
  studentRender,
} from '../lib/prescription'
import { deltas, feedbackForView } from '../lib/scoring'
import { examForPlane } from '../lib/exams'
import { hasSeen, markSeen } from '../lib/preferences'
import { KEY_LABEL } from '../lib/labels'
import Viewport from './Viewport'
import InstructionsPanel from './InstructionsPanel'
import FeedbackPanel from './FeedbackPanel'
import Walkthrough from './Walkthrough'

interface Props {
  exam: Exam
  families: ExamFamily[]
  family: ExamFamily
  plane: Plane
  onSelectFamily: (name: string) => void
  onSelectPlane: (plane: Plane) => void
  onSelectSequence: (id: string) => void
  rx: Prescription
  onRxChange: (rx: Prescription) => void
  imageWidthMm: number
  keyOn: boolean
  onToggleKey: () => void
}

/** The ONLY persistence in the app: two first-run "seen" flags. */
const WALKTHROUGH_KEY = 'mri-sim-walkthrough-seen'
const HINT_KEY = 'mri-sim-handle-hint-seen'

const HOTKEY: Record<Plane, string> = { sagittal: 'S', coronal: 'C', axial: 'A' }

/** Pre-placed, centered, unrotated — the student adjusts, never creates. */
const DEFAULT_POSE: Pose = { cx: 0.5, cy: 0.5, angleDeg: 0 }

export default function ConsoleShell({
  exam,
  families,
  family,
  plane,
  onSelectFamily,
  onSelectPlane,
  onSelectSequence,
  rx,
  onRxChange,
  imageWidthMm: W,
  keyOn,
  onToggleKey,
}: Props) {
  const [poses, setPoses] = useState<Record<Plane, Pose> | null>(null)
  const [scanned, setScanned] = useState(false)
  const [activePlane, setActivePlane] = useState<Plane | null>(exam.targetPlane)
  const [instructionsOpen, setInstructionsOpen] = useState(true)
  const [walkthrough, setWalkthrough] = useState(
    () => !hasSeen(WALKTHROUGH_KEY),
  )
  const [hint, setHint] = useState(false)

  const closeWalkthrough = () => {
    markSeen(WALKTHROUGH_KEY)
    setWalkthrough(false)
  }

  const addGroup = () => {
    setPoses({ sagittal: DEFAULT_POSE, coronal: DEFAULT_POSE, axial: DEFAULT_POSE })
    setScanned(false)
    if (!hasSeen(HINT_KEY)) setHint(true)
  }

  const reset = () => {
    setPoses(null)
    setScanned(false)
  }

  const dismissHint = () => {
    if (hint) {
      markSeen(HINT_KEY)
      setHint(false)
    }
  }

  /** Any adjustment invalidates the last scan (and re-hides the reference unless Key is on). */
  const changeRx = (next: Prescription) => {
    onRxChange(clampPrescription(next, W))
    setScanned(false)
  }

  /**
   * A drag handle reports a full placement; position/angle go to this view's
   * pose, while any size change is folded back into the SHARED prescription
   * so every view re-derives from the same numbers.
   */
  const change = (p: Plane) => (next: Placement) => {
    setPoses((prev) =>
      prev ? { ...prev, [p]: { cx: next.cx, cy: next.cy, angleDeg: next.angleDeg } } : prev,
    )
    setScanned(false)
    if (next.type === 'fov') {
      const readout = Math.round(next.w * W)
      const phase = Math.round(next.h * W)
      if (readout !== rx.fovReadout_mm || phase !== rx.fovPhase_mm) {
        onRxChange(clampPrescription({ ...rx, fovReadout_mm: readout, fovPhase_mm: phase }, W))
      }
    } else {
      const n = slicesForCoverage(next.extent * W, rx)
      if (n !== rx.nSlices) onRxChange({ ...rx, nSlices: n })
    }
  }

  const scan = () => {
    if (poses) setScanned(true)
  }

  const showGhost = keyOn || scanned
  const regions = [...new Set(families.map((entry) => entry.exams[0].region))]

  const student = (p: Plane) => (poses && exam.views[p].image ? studentRender(exam, p, poses[p], rx, W) : null)
  const viewDeltas = (p: Plane) => {
    const s = student(p)
    const answer = exam.views[p].answer
    return s && answer ? deltas(s.placement, answer) : null
  }

  const feedback =
    scanned && poses
      ? PLANES.filter((p) => exam.views[p].image).map((p) => ({
          plane: p,
          feedback: viewDeltas(p) ? feedbackForView(viewDeltas(p)!, exam.coverage[p]) : [exam.coverage[p], ...(exam.views[p].referenceUnavailableReason ? [exam.views[p].referenceUnavailableReason!] : [])],
        }))
      : null

  return (
    <div className="console-shell">
      <header className="shell-header">
        <span className="brand">MRI Slice Planning</span>
        <select
          className="exam-select"
          aria-label="Exam"
          value={family.name}
          onChange={(e) => onSelectFamily(e.target.value)}
        >
          {regions.length > 1 ? regions.map((region) => (
            <optgroup key={region} label={region}>
              {families.filter((entry) => entry.exams[0].region === region).map((entry) => (
                <option key={entry.name} value={entry.name}>{entry.name}</option>
              ))}
            </optgroup>
          )) : families.map((entry) => (
            <option key={entry.name} value={entry.name}>{entry.name}</option>
          ))}
        </select>
        <div className="plane-buttons" role="group" aria-label="Target plane">
          {PLANES.filter((p) => examForPlane(family, p)).map((p) => (
            <button
              key={p}
              className={p === plane ? 'btn seg active' : 'btn seg'}
              title={`${p} (${HOTKEY[p]})`}
              aria-pressed={p === plane}
              onClick={() => onSelectPlane(p)}
            >
              {PLANE_SHORT[p]}
            </button>
          ))}
        </div>
        <div className="shell-title">
          {family.exams.filter((entry) => entry.targetPlane === plane).length > 1 ? (
            <select className="exam-select" aria-label="Sequence" value={exam.id}
              onChange={(event) => onSelectSequence(event.target.value)}>
              {family.exams.filter((entry) => entry.targetPlane === plane).map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.sequenceNote}</option>
              ))}
            </select>
          ) : <span className="seq">{exam.sequenceNote}</span>}
          {exam.landmark && <span className="landmark">{exam.landmark}</span>}
        </div>
        <button
          className={keyOn ? 'btn toggle active' : 'btn toggle'}
          aria-pressed={keyOn}
          title="Show or hide the green reference placement"
          onClick={onToggleKey}
        >
          {KEY_LABEL}
        </button>
        <button
          className="btn subtle help"
          title="Show the walkthrough again"
          aria-label="Show walkthrough"
          onClick={() => setWalkthrough(true)}
        >
          ?
        </button>
      </header>

      <div className="shell-body">
        <div className="work-area">
          {exam.referenceMode === 'source' && <p className="source-guidance">Plan on the available localizers. Key or Scan shows the source planning lines in green. Use the coverage instructions to compare your placement; numerical match feedback is not available for this exercise.</p>}
          {instructionsOpen && <div className="mobile-coverage"><strong>{activePlane ?? plane} coverage</strong><p>{exam.coverage[activePlane ?? plane]}</p></div>}
          <div className="viewports">
            {PLANES.map((p) => (
              <Viewport
                key={`${exam.id}-${p}`}
                plane={p}
                image={exam.views[p].image}
                alternateImage={exam.views[p].alternateImage}
                saturationSide={p === 'axial' ? undefined : exam.exam === 'MRV Head' ? 'superior' : exam.exam === 'MRA Head' ? 'inferior' : undefined}
                unavailableReason={exam.views[p].unavailableReason}
                sourceReference={exam.referenceMode === 'source'}
                referenceUnavailableReason={exam.views[p].referenceUnavailableReason}
                referenceImage={showGhost ? exam.views[p].referenceImage : undefined}
                ghost={showGhost ? ghostRender(exam, p, rx, W) : null}
                student={student(p)}
                interactive
                active={p === activePlane}
                onActivate={() => setActivePlane(p)}
                onChange={change(p)}
                onInteract={dismissHint}
                deltas={viewDeltas(p)}
              />
            ))}
          </div>

          <div className="controls">
            {!poses ? (
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
            {hint && poses && (
              <div className="handle-hint" onPointerDown={dismissHint}>
                Drag to move · top handle rotates · corners resize the FOV ·
                line ends stretch coverage
                <button className="hint-close" aria-label="Dismiss handle hint" onClick={dismissHint}>
                  ×
                </button>
              </div>
            )}
          </div>

          {feedback && <FeedbackPanel views={feedback} />}
        </div>

        <InstructionsPanel
          exam={exam}
          open={instructionsOpen}
          onToggle={() => setInstructionsOpen((o) => !o)}
          activePlane={activePlane}
          rx={rx}
          onRxChange={changeRx}
          imageWidthMm={W}
        />
      </div>

      {walkthrough && <Walkthrough onClose={closeWalkthrough} />}
    </div>
  )
}
