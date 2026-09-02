import { useRef } from 'react'
import type { LinesGeometry, LinesPlacement } from '../types'
import { VIEW, clientToSvg, clamp, toLocal } from '../lib/svg'

interface Props {
  p: LinesPlacement
  /** slice offsets + line length, derived from the shared prescription */
  lines: LinesGeometry
  ghost?: boolean
  interactive?: boolean
  svgRef?: React.RefObject<SVGSVGElement | null>
  clipId?: string
  onChange?: (p: LinesPlacement) => void
  onInteract?: () => void
}

type DragMode = 'move' | 'rotate' | 'extent'

interface DragState {
  mode: DragMode
  start: LinesPlacement
  px: number
  py: number
}

const ROT_STEM = 9
/** never let the grab area collapse on a tiny FOV or a single slice */
const MIN_HIT_LEN = 30

/**
 * A slice-line set: one line per real slice. Drag to move, top handle rotates,
 * end handles stretch coverage (the shell turns that into a slice count).
 */
export default function SliceLines({
  p,
  lines,
  ghost,
  interactive,
  svgRef,
  clipId,
  onChange,
  onInteract,
}: Props) {
  const drag = useRef<DragState | null>(null)

  const cx = p.cx * VIEW
  const cy = p.cy * VIEW
  const ext = p.extent * VIEW
  const half = (lines.lineLen * VIEW) / 2

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
      onChange?.({ ...start, extent: clamp((Math.abs(local.y) * 2) / VIEW, 0.01, 1.05) })
    }
  }

  const up = () => {
    drag.current = null
  }

  const cls = ghost ? 'overlay ghost' : 'overlay student'
  const hitHalf = Math.max(half, MIN_HIT_LEN / 2)

  return (
    <g className={cls} transform={`translate(${cx} ${cy}) rotate(${p.angleDeg})`}>
      {/* the lines themselves, clipped to the image like a real console */}
      <g
        clipPath={clipId ? `url(#${clipId})` : undefined}
        transform={`rotate(${-p.angleDeg}) translate(${-cx} ${-cy})`}
      >
        <g transform={`translate(${cx} ${cy}) rotate(${p.angleDeg})`}>
          {lines.offsets.map((off, i) => (
            <line
              key={i}
              className="shape slice"
              x1={-half}
              y1={off * VIEW}
              x2={half}
              y2={off * VIEW}
            />
          ))}
        </g>
      </g>
      {interactive && !ghost && (
        <>
          <rect
            className="hit"
            x={-hitHalf}
            y={-ext / 2 - 3}
            width={hitHalf * 2}
            height={ext + 6}
            style={{ cursor: 'move' }}
            onPointerDown={down('move')}
            onPointerMove={move}
            onPointerUp={up}
          >
            <title>Move slice group</title>
          </rect>
          <line className="stem" x1={0} y1={-ext / 2} x2={0} y2={-ext / 2 - ROT_STEM} />
          <circle className="handle" cx={0} cy={-ext / 2 - ROT_STEM} r={2} />
          <circle
            className="hit"
            cx={0}
            cy={-ext / 2 - ROT_STEM}
            r={6}
            style={{ cursor: 'grab' }}
            onPointerDown={down('rotate')}
            onPointerMove={move}
            onPointerUp={up}
          >
            <title>Rotate</title>
          </circle>
          {[-1, 1].map((s) => (
            <g key={s}>
              <rect
                className="handle"
                x={-1.6}
                y={(s * ext) / 2 - 1.6}
                width={3.2}
                height={3.2}
              />
              <rect
                className="hit"
                x={-5}
                y={(s * ext) / 2 - 5}
                width={10}
                height={10}
                style={{ cursor: 'ns-resize' }}
                onPointerDown={down('extent')}
                onPointerMove={move}
                onPointerUp={up}
              >
                <title>Stretch coverage (changes slice count)</title>
              </rect>
            </g>
          ))}
        </>
      )}
    </g>
  )
}
