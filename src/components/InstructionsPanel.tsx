import type { Exam } from '../types'
import { PLANES } from '../types'
import Viewport from './Viewport'

interface Props {
  exam: Exam
  open: boolean
  onToggle: () => void
}

/**
 * Coverage instructions for all three planes plus a small reference example —
 * available in BOTH modes, glanceable while dragging (plan §6, Phase 3).
 */
export default function InstructionsPanel({ exam, open, onToggle }: Props) {
  return (
    <aside className={open ? 'instructions open' : 'instructions'}>
      <button className="instructions-toggle" onClick={onToggle} aria-expanded={open}>
        {open ? '▾' : '▸'} Instructions
      </button>
      {open && (
        <div className="instructions-body">
          <h3>Coverage</h3>
          <ul className="coverage-list">
            {PLANES.map((plane) => (
              <li key={plane} className={plane === exam.targetPlane ? 'target' : ''}>
                <strong>
                  {plane}
                  {plane === exam.targetPlane ? ' · FOV' : ' · slice lines'}
                </strong>
                <span>{exam.coverage[plane]}</span>
              </li>
            ))}
          </ul>
          <h3>Reference example</h3>
          <div className="reference-thumbs">
            {PLANES.map((plane) => (
              <Viewport
                key={plane}
                plane={plane}
                image={exam.views[plane].image}
                answer={exam.views[plane].answer}
                showGhost
                mini
              />
            ))}
          </div>
          <p className="glossary">
            FOV (field of view — the box that sets what gets scanned) ·
            localizer (the quick scout image you plan on)
          </p>
        </div>
      )}
    </aside>
  )
}
