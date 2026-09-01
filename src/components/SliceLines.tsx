import { useRef } from 'react'
import type { LinesPlacement } from '../types'
import { VIEW, clientToSvg, clamp, toLocal } from '../lib/svg'

interface Props {
  p: LinesPlacement
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

/** Fixed cosmetic 5-line group (plan §7.3): grading uses center/angle/extent. */
const LINE_OFFSETS = [-0.5, -0.25, 0, 0.25, 0.5]
const LINE_LEN = 75
const ROT_STEM = 9

/** A slice-line group: drag to move, top handle rotates, end handles stretch extent. */
export default function SliceLines({
  p,
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
      onChange?.({ ...start, extent: clamp((Math.abs(local.y) * 2) / VIEW, 0.04, 1.05) })
    }
  }

  const up = () => {
    drag.current = null
  }

  const cls = ghost ? 'overlay ghost' : 'overlay student'

  return (
    <g className={cls} transform={`translate(${cx} ${cy}) rotate(${p.angleDeg})`}>
      {/* the lines themselves, clipped to the image like a real console */}
      <g clipPath={clipId ? `url(#${clipId})` : undefined} transform={`rotate(${-p.angleDeg}) translate(${-cx} ${-cy})`}>
        <g transform={`translate(${cx} ${cy}) rotate(${p.angleDeg})`}>
          {LINE_OFFSETS.map((k) => (
            <line
              key={k}
              className={k === 0 ? 'shape center-line' : 'shape'}
              x1={-LINE_LEN}
              y1={k * ext}
              x2={LINE_LEN}
              y2={k * ext}
            />
          ))}
        </g>
      </g>
      {interactive && !ghost && (
        <>
          <rect
            className="hit"
            x={-LINE_LEN * 0.6}
            y={-ext / 2 - 3}
            width={LINE_LEN * 1.2}
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
                <title>Stretch coverage</title>
              </rect>
            </g>
          ))}
        </>
      )}
    </g>
  )
}
