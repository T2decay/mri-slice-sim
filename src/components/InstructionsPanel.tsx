import type { Exam, Plane } from '../types'
import { PLANES } from '../types'
import type { Prescription } from '../lib/prescription'
import { ghostRender } from '../lib/prescription'
import Viewport from './Viewport'
import ParametersPanel from './ParametersPanel'

interface Props {
  exam: Exam
  open: boolean
  onToggle: () => void
  /** plane whose coverage row is highlighted (click a viewport to change) */
  activePlane: Plane | null
  rx: Prescription
  onRxChange: (rx: Prescription) => void
  imageWidthMm: number
}

/**
 * Coverage instructions for all three planes, the shared Parameters block,
 * and live reference thumbnails — glanceable while dragging.
 */
export default function InstructionsPanel({
  exam,
  open,
  onToggle,
  activePlane,
  rx,
  onRxChange,
  imageWidthMm,
}: Props) {
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
              <li key={plane} className={plane === activePlane ? 'active' : ''}>
                <strong>
                  {plane}
                  {plane === exam.targetPlane ? ' · FOV' : ' · slice lines'}
                </strong>
                <span>{exam.coverage[plane]}</span>
              </li>
            ))}
          </ul>
          <h3>Parameters</h3>
          <ParametersPanel rx={rx} onChange={onRxChange} imageWidthMm={imageWidthMm} />
          <h3>Reference example</h3>
          <div className="reference-thumbs">
            {PLANES.map((plane) => (
              <Viewport
                key={plane}
                plane={plane}
                image={exam.views[plane].image}
                unavailableReason={exam.views[plane].unavailableReason}
                referenceImage={exam.views[plane].referenceImage}
                ghost={ghostRender(exam, plane, rx, imageWidthMm)}
                mini
              />
            ))}
          </div>
          <p className="glossary">
            FOV (field of view — the box that sets what gets scanned) ·
            localizer (the quick scout image you plan on). Nothing you do here
            is stored.
          </p>
        </div>
      )}
    </aside>
  )
}
