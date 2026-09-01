import { useRef } from 'react'
import type { FovPlacement } from '../types'
import { VIEW, clientToSvg, clamp, toLocal } from '../lib/svg'

interface Props {
  p: FovPlacement
  ghost?: boolean
  interactive?: boolean
  svgRef?: React.RefObject<SVGSVGElement | null>
  onChange?: (p: FovPlacement) => void
  onInteract?: () => void
}

type DragMode = 'move' | 'rotate' | 'resize'

interface DragState {
  mode: DragMode
  start: FovPlacement
  px: number
  py: number
}

const ROT_STEM = 9

/** The FOV box: drag to move, corner handles resize, top handle rotates. */
export default function FovBox({ p, ghost, interactive, svgRef, onChange, onInteract }: Props) {
  const drag = useRef<DragState | null>(null)

  const cx = p.cx * VIEW
  const cy = p.cy * VIEW
  const w = p.w * VIEW
  const h = p.h * VIEW

  const down = (mode: DragMode) => (e: React.PointerEvent) => {
    if (!interactive || !svgRef?.current) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY)
    drag.current = { mode, start: p, px: pt.x, py: pt.y }
    onInteract?.()
  }

  const move = (e: React.PointerEvent) => {
    if (!drag.current || !svgRef?.current) return
    const { mode, start, px, py } = drag.current
    const pt = clientToSvg(svgRef.current, e.clientX, e.clientY)
    if (mode === 'move') {
      onChange?.({
        ...start,
        cx: clamp(start.cx + (pt.x - px) / VIEW, 0.05, 0.95),
        cy: clamp(start.cy + (pt.y - py) / VIEW, 0.05, 0.95),
      })
    } else if (mode === 'rotate') {
      const ang =
        (Math.atan2(pt.y - start.cy * VIEW, pt.x - start.cx * VIEW) * 180) / Math.PI + 90
      onChange?.({ ...start, angleDeg: ((ang + 180) % 360) - 180 })
    } else {
      const local = toLocal(pt.x - start.cx * VIEW, pt.y - start.cy * VIEW, start.angleDeg)
      onChange?.({
        ...start,
        w: clamp((Math.abs(local.x) * 2) / VIEW, 0.08, 1.05),
        h: clamp((Math.abs(local.y) * 2) / VIEW, 0.08, 1.05),
      })
    }
  }

  const up = () => {
    drag.current = null
  }

  const cls = ghost ? 'overlay ghost' : 'overlay student'
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]

  return (
    <g className={cls} transform={`translate(${cx} ${cy}) rotate(${p.angleDeg})`}>
      <rect
        className="shape"
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        fill="transparent"
        style={interactive ? { cursor: 'move', pointerEvents: 'all' } : { pointerEvents: 'none' }}
        onPointerDown={down('move')}
        onPointerMove={move}
        onPointerUp={up}
      />
      {interactive && !ghost && (
        <>
          <line className="stem" x1={0} y1={-h / 2} x2={0} y2={-h / 2 - ROT_STEM} />
          {/* rotate: small visible knob + a large transparent touch target */}
          <circle className="handle" cx={0} cy={-h / 2 - ROT_STEM} r={2} />
          <circle
            className="hit"
            cx={0}
            cy={-h / 2 - ROT_STEM}
            r={6}
            style={{ cursor: 'grab' }}
            onPointerDown={down('rotate')}
            onPointerMove={move}
            onPointerUp={up}
          >
            <title>Rotate</title>
          </circle>
          {corners.map(([sx, sy], i) => (
            <g key={i}>
              <rect
                className="handle"
                x={(sx * w) / 2 - 1.6}
                y={(sy * h) / 2 - 1.6}
                width={3.2}
                height={3.2}
              />
              <rect
                className="hit"
                x={(sx * w) / 2 - 5}
                y={(sy * h) / 2 - 5}
                width={10}
                height={10}
                style={{ cursor: 'nwse-resize' }}
                onPointerDown={down('resize')}
                onPointerMove={move}
                onPointerUp={up}
              >
                <title>Resize</title>
              </rect>
            </g>
          ))}
        </>
      )}
    </g>
  )
}
