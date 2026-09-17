import { useId, useRef, useState } from 'react'
import type { Placement, Plane, RenderView } from '../types'
import type { Deltas } from '../lib/scoring'
import { TOLERANCES, band } from '../lib/scoring'
import { VIEW, clamp } from '../lib/svg'
import FovBox from './FovBox'
import SliceLines from './SliceLines'
import SaturationBand from './SaturationBand'

interface Props {
  plane: Plane
  image: string | null
  saturationSide?: 'superior' | 'inferior'
  alternateImage?: string
  referenceImage?: string
  unavailableReason?: string
  sourceReference?: boolean
  referenceUnavailableReason?: string
  /** green reference overlay (null = hidden) */
  ghost: RenderView | null
  /** the student's yellow overlay (null = no slice group yet) */
  student?: RenderView | null
  interactive?: boolean
  mini?: boolean
  /** highlighted as the plane the student is working on */
  active?: boolean
  onActivate?: () => void
  onChange?: (p: Placement) => void
  onInteract?: () => void
  /** live offset/angle/size readout; null shows placeholders */
  deltas?: Deltas | null
}

/** keyboard nudge: 1 px on a typical 256-px localizer */
const NUDGE = 1 / 256

function renderView(
  v: RenderView,
  opts: {
    ghost?: boolean
    interactive?: boolean
    svgRef?: React.RefObject<SVGSVGElement | null>
    clipId?: string
    onChange?: (p: Placement) => void
    onInteract?: () => void
  },
) {
  const p = v.placement
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
      lines={v.lines ?? { offsets: [0], lineLen: 0.75 }}
      ghost={opts.ghost}
      interactive={opts.interactive}
      svgRef={opts.svgRef}
      clipId={opts.clipId}
      onChange={opts.onChange}
      onInteract={opts.onInteract}
    />
  )
}

/** One localizer image plus its SVG overlay layer and readout. */
export default function Viewport({
  plane,
  image,
  alternateImage,
  saturationSide,
  referenceImage,
  unavailableReason,
  sourceReference,
  referenceUnavailableReason,
  ghost,
  student,
  interactive,
  mini,
  active,
  onActivate,
  onChange,
  onInteract,
  deltas,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const clipId = useId()
  const [showAlternate, setShowAlternate] = useState(false)
  const vascular = Boolean(alternateImage && showAlternate)

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (vascular || !student || !interactive || !onChange) return
    const placement = student.placement
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

  const frameCls = ['viewport-frame', active ? 'active' : ''].join(' ').trim()

  if (!image) return <div className={mini ? 'viewport mini' : 'viewport'}>
    <div className="viewport-frame unavailable"><strong>{plane} localizer unavailable</strong><p>{unavailableReason}</p></div>
  </div>

  return (
    <div className={mini ? 'viewport mini' : 'viewport'}>
      <div
        className={frameCls}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={onKeyDown}
        onPointerDown={onActivate}
        onFocus={onActivate}
        aria-label={`${plane} localizer`}
      >
        <img src={import.meta.env.BASE_URL + (vascular ? alternateImage! : image)} alt={vascular ? "Sagittal vascular reference" : `${plane} localizer`} draggable={false} />
        {!vascular && referenceImage && <img className="source-reference" src={import.meta.env.BASE_URL + referenceImage} alt="Source planning reference" draggable={false} />}
        {!vascular && <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          style={{ overflow: 'visible', touchAction: 'none' }}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={VIEW} height={VIEW} />
            </clipPath>
          </defs>
          {student && saturationSide && <SaturationBand view={student} side={saturationSide} />}
          {ghost && renderView(ghost, { ghost: true, clipId })}
          {student &&
            renderView(student, {
              interactive,
              svgRef,
              clipId,
              onChange,
              onInteract,
            })}
        </svg>}
        {alternateImage && !mini && <button
          type="button" className="view-dogear"
          aria-label={vascular ? "Show anatomical sagittal view" : "Show vascular sagittal reference"}
          aria-pressed={vascular}
          title={vascular ? "Switch to anatomy" : "Switch to vascular reference"}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setShowAlternate((value) => !value) }}
        ><span>{vascular ? "Anatomy" : "Vessels"}</span><span aria-hidden="true">↔</span></button>}
        <span className="plane-label">{vascular ? "Vascular reference" : plane}</span>
      </div>
      {!mini && (
        <div className="readout" aria-live="off">
          {vascular ? <span className="idle">Vascular reference · switch to anatomy to plan</span> : deltas ? (
            <>
              <span className={band(deltas.offsetFrac, TOLERANCES.center)}>
                offset {(deltas.offsetFrac * 100).toFixed(1)}%
              </span>
              <span className={band(deltas.angleDeg, TOLERANCES.angle)}>
                angle Δ {deltas.angleDeg.toFixed(1)}°
              </span>
              <span className={band(deltas.sizeFrac, TOLERANCES.size)}>
                size Δ {(deltas.sizeFrac * 100).toFixed(0)}%
              </span>
            </>
          ) : sourceReference ? <span className="idle">{referenceUnavailableReason ?? 'Compare with the source reference'}</span> : (
            <>
              <span className="idle">offset —</span>
              <span className="idle">angle Δ —</span>
              <span className="idle">size Δ —</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
