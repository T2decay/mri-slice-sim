import { useId, useRef } from 'react'
import type { Placement, Plane } from '../types'
import type { Deltas } from '../lib/scoring'
import { TOLERANCES } from '../lib/scoring'
import { VIEW, clamp } from '../lib/svg'
import FovBox from './FovBox'
import SliceLines from './SliceLines'

interface Props {
  plane: Plane
  image: string
  answer: Placement
  placement?: Placement | null
  showGhost: boolean
  interactive?: boolean
  mini?: boolean
  onChange?: (p: Placement) => void
  onInteract?: () => void
  deltas?: Deltas | null
}

/** keyboard nudge: 1 px on a typical 256-px localizer */
const NUDGE = 1 / 256

function renderPlacement(
  p: Placement,
  opts: {
    ghost?: boolean
    interactive?: boolean
    svgRef?: React.RefObject<SVGSVGElement | null>
    clipId?: string
    onChange?: (p: Placement) => void
    onInteract?: () => void
  },
) {
  if (p.type === 'fov') {
    return (
      <FovBox
        p={p}
        ghost={opts.ghost}
        interactive={opts.interactive}
        svgRef={opts.svgRef}
        onChange={opts.onChange}
        onInteract={opts.onInteract}
      />
    )
  }
  return (
    <SliceLines
      p={p}
      ghost={opts.ghost}
      interactive={opts.interactive}
      svgRef={opts.svgRef}
      clipId={opts.clipId}
      onChange={opts.onChange}
      onInteract={opts.onInteract}
    />
  )
}

function band(v: number, tol: { full: number; partial: number }): string {
  return v <= tol.full ? 'good' : v <= tol.partial ? 'close' : 'off'
}

/** One localizer image plus its SVG overlay layer. */
export default function Viewport({
  plane,
  image,
  answer,
  placement,
  showGhost,
  interactive,
  mini,
  onChange,
  onInteract,
  deltas,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const clipId = useId()

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!placement || !interactive || !onChange) return
    let dx = 0
    let dy = 0
    let dAng = 0
    switch (e.key) {
      case 'ArrowLeft':
        e.shiftKey ? (dAng = -1) : (dx = -NUDGE)
        break
      case 'ArrowRight':
        e.shiftKey ? (dAng = 1) : (dx = NUDGE)
        break
      case 'ArrowUp':
        e.shiftKey ? (dAng = -1) : (dy = -NUDGE)
        break
      case 'ArrowDown':
        e.shiftKey ? (dAng = 1) : (dy = NUDGE)
        break
      default:
        return
    }
    e.preventDefault()
    onChange({
      ...placement,
      cx: clamp(placement.cx + dx, 0.05, 0.95),
      cy: clamp(placement.cy + dy, 0.05, 0.95),
      angleDeg: placement.angleDeg + dAng,
    })
    onInteract?.()
  }

  return (
    <div className={mini ? 'viewport mini' : 'viewport'}>
      <div
        className="viewport-frame"
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={onKeyDown}
        aria-label={`${plane} localizer`}
      >
        <img src={import.meta.env.BASE_URL + image} alt={`${plane} localizer`} draggable={false} />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          style={{ overflow: 'visible', touchAction: 'none' }}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={VIEW} height={VIEW} />
            </clipPath>
          </defs>
          {showGhost && renderPlacement(answer, { ghost: true, clipId })}
          {placement &&
            renderPlacement(placement, {
              interactive,
              svgRef,
              clipId,
              onChange,
              onInteract,
            })}
        </svg>
        <span className="plane-label">{plane}</span>
      </div>
      {!mini && deltas && (
        <div className="readout">
          <span className={band(deltas.offsetFrac, TOLERANCES.center)}>
            offset {(deltas.offsetFrac * 100).toFixed(1)}%
          </span>
          <span className={band(deltas.angleDeg, TOLERANCES.angle)}>
            angle Δ {deltas.angleDeg.toFixed(1)}°
          </span>
          <span className={band(deltas.sizeFrac, TOLERANCES.size)}>
            size Δ {(deltas.sizeFrac * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  )
}
