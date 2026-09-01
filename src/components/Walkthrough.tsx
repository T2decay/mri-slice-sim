import { useState } from 'react'

interface Props {
  onClose: () => void
}

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Your localizer images',
    body:
      'These three images are localizers (quick scout scans you plan on): ' +
      'sagittal on the left, coronal in the middle, axial on the right.',
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
      'Drag anywhere inside a shape to move it. The small handle above it rotates. ' +
      'On the FOV (field of view — the box that sets what gets scanned), corner ' +
      'handles resize; on slice lines, the end handles stretch coverage. ' +
      'Arrow keys nudge 1 px; hold Shift to rotate 1°.',
  },
  {
    title: 'Scan to check',
    body:
      'Match the coverage instructions in the panel, then press “Scan”. ' +
      'Learn mode shows the green reference the whole time; Practice mode ' +
      'scores you and then reveals it.',
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
