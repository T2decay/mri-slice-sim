import { useState } from 'react'
import { KEY_LABEL } from '../lib/labels'

interface Props {
  onClose: () => void
}

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Pick an exam and a plane',
    body:
      'Choose an exam from the dropdown at the top, then a target plane with the ' +
      'Sag / Cor / Ax buttons (or press S, C, A). The three localizers — quick ' +
      'scout scans you plan on — show sagittal, coronal, and axial.',
  },
  {
    title: 'Add a slice group',
    body:
      'Click “Add Slice Group” to drop a starting prescription onto all three ' +
      'views — the console equivalent of dragging a sequence onto the localizers. ' +
      'It always starts centered; your job is to adjust it, never to draw from scratch.',
  },
  {
    title: 'Move · rotate · resize',
    body:
      'Drag inside a shape to move it; the small handle above it rotates. Corner ' +
      'handles resize the FOV (field of view — the box that sets what gets ' +
      'scanned); line-end handles stretch coverage. One prescription is shared by ' +
      'all three views, so resizing on one view updates the others, and the ' +
      'Parameters numbers let you fine-tune it exactly. Arrow keys nudge 1 px; ' +
      'Shift + arrows rotate 1°.',
  },
  {
    title: 'Scan to check',
    body:
      'Click a view to highlight its coverage instruction, match it, then press ' +
      '“Scan” to reveal the green reference placement and read the feedback. ' +
      `The “${KEY_LABEL}” button shows or hides that reference any time.`,
  },
]

/** Skippable 4-step first-run overlay; reopen anytime from the ? icon. */
export default function Walkthrough({ onClose }: Props) {
  const [step, setStep] = useState(0)
  const last = step === STEPS.length - 1

  return (
    <div className="walkthrough-backdrop" role="dialog" aria-modal="true">
      <div className="walkthrough-card">
        <button className="walkthrough-skip" onClick={onClose}>
          Skip
        </button>
        <h3>{STEPS[step].title}</h3>
        <p>{STEPS[step].body}</p>
        <div className="walkthrough-footer">
          <div className="dots">
            {STEPS.map((_, i) => (
              <span key={i} className={i === step ? 'dot active' : 'dot'} />
            ))}
          </div>
          <div className="walkthrough-nav">
            {step > 0 && (
              <button className="btn subtle" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button
              className="btn primary"
              onClick={() => (last ? onClose() : setStep(step + 1))}
            >
              {last ? 'Start planning' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
