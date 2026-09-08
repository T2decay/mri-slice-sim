import type {
  Exam,
  FovPlacement,
  LinesGeometry,
  Placement,
  Plane,
  Pose,
  RenderView,
} from '../types'
import { angleDiffDeg } from './scoring'

/**
 * ONE prescription per exam session — shared by all three views. Sizes on
 * every view are derived from it; only position and angle are per-view.
 */
export interface Prescription {
  fovReadout_mm: number
  fovPhase_mm: number
  nSlices: number
  thickness_mm: number
  gap_mm: number
}

/** Editable ranges/steps for the Parameters panel and drag handles. */
export const LIMITS = {
  fov: { min: 20, step: 5 },
  nSlices: { min: 1, max: 99, step: 1 },
  thickness: { min: 0.5, max: 20, step: 0.5 },
  gap: { min: 0, max: 20, step: 0.5 },
}

/** Largest FOV allowed, slightly wider than the image like the drag clamp. */
export function fovMaxMm(imageWidthMm: number): number {
  return Math.round(imageWidthMm * 1.05)
}

export function coverageMm(p: Prescription): number {
  return p.nSlices * p.thickness_mm + (p.nSlices - 1) * p.gap_mm
}

/** Slice count whose stack best fills `coverage_mm` at the given thickness/gap. */
export function slicesForCoverage(coverage_mm: number, p: Prescription): number {
  const pitch = p.thickness_mm + p.gap_mm
  const n = Math.round((coverage_mm + p.gap_mm) / pitch)
  return clampInt(n, LIMITS.nSlices.min, LIMITS.nSlices.max)
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(v)))
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

export function clampPrescription(p: Prescription, imageWidthMm: number): Prescription {
  const max = fovMaxMm(imageWidthMm)
  return {
    fovReadout_mm: clampInt(p.fovReadout_mm, LIMITS.fov.min, max),
    fovPhase_mm: clampInt(p.fovPhase_mm, LIMITS.fov.min, max),
    nSlices: clampInt(p.nSlices, LIMITS.nSlices.min, LIMITS.nSlices.max),
    thickness_mm: clampNum(p.thickness_mm, LIMITS.thickness.min, LIMITS.thickness.max),
    gap_mm: clampNum(p.gap_mm, LIMITS.gap.min, LIMITS.gap.max),
  }
}

/**
 * The answer-key FOV as it appears on screen. Some keys were captured with the
 * box rotated ±90° (the pptx shape's rotation), so width/height are swapped.
 */
export function answerFovVisual(a: FovPlacement): { w: number; h: number } {
  const swapped = Math.abs(angleDiffDeg(a.angleDeg, 0)) > 45
  return swapped ? { w: a.h, h: a.w } : { w: a.w, h: a.h }
}

/**
 * Default prescription for an exam: FOV from the answer key's box (rounded to
 * 5 mm), slices/thickness/gap from a typical brain protocol.
 */
export function defaultPrescription(exam: Exam, imageWidthMm: number): Prescription {
  const answer = exam.views[exam.targetPlane].answer
  let fovReadout = 240
  let fovPhase = 240
  if (answer?.type === 'fov') {
    const v = answerFovVisual(answer)
    fovReadout = Math.round((v.w * imageWidthMm) / 5) * 5
    fovPhase = Math.round((v.h * imageWidthMm) / 5) * 5
  }
  return clampPrescription(
    { fovReadout_mm: fovReadout, fovPhase_mm: fovPhase, nSlices: 24, thickness_mm: 5, gap_mm: 1 },
    imageWidthMm,
  )
}

/** Anatomical axes each localizer displays: [horizontal, vertical]. */
type Axis = 'LR' | 'AP' | 'SI'
const AXES: Record<Plane, [Axis, Axis]> = {
  sagittal: ['AP', 'SI'],
  coronal: ['LR', 'SI'],
  axial: ['LR', 'AP'],
}

/**
 * In a cross-plane view the slice lines run along the axis that view shares
 * with the target plane. Readout is the target FOV's horizontal dimension,
 * phase its vertical, so the shared axis tells us which one sets line length.
 */
export function lineLengthDim(target: Plane, view: Plane): 'readout' | 'phase' {
  const [tx] = AXES[target]
  const [vx, vy] = AXES[view]
  return tx === vx || tx === vy ? 'readout' : 'phase'
}

/** Evenly spaced slice-center offsets spanning a coverage extent (image units). */
export function lineOffsets(n: number, extent: number, thickness: number): number[] {
  if (n <= 1) return [0]
  const half = Math.max(0, (extent - thickness) / 2)
  return Array.from({ length: n }, (_, i) => -half + (i * (2 * half)) / (n - 1))
}

/** The student's overlay for one view, derived from pose + prescription. */
export function studentRender(
  exam: Exam,
  plane: Plane,
  pose: Pose,
  rx: Prescription,
  W: number,
): RenderView {
  if (plane === exam.targetPlane) {
    return {
      placement: {
        type: 'fov',
        cx: pose.cx,
        cy: pose.cy,
        angleDeg: pose.angleDeg,
        w: rx.fovReadout_mm / W,
        h: rx.fovPhase_mm / W,
      },
    }
  }
  const extent = coverageMm(rx) / W
  const dim = lineLengthDim(exam.targetPlane, plane)
  const lineLen = (dim === 'readout' ? rx.fovReadout_mm : rx.fovPhase_mm) / W
  return {
    placement: { type: 'lines', cx: pose.cx, cy: pose.cy, angleDeg: pose.angleDeg, extent },
    lines: { offsets: lineOffsets(rx.nSlices, extent, rx.thickness_mm / W), lineLen },
  }
}

/**
 * The green reference overlay for one view: the answer key's geometry, drawn
 * with the student's current thickness/gap so it reads like a real stack.
 */
export function ghostRender(exam: Exam, plane: Plane, rx: Prescription, W: number): RenderView | null {
  const answer: Placement | null = exam.views[plane].answer
  if (!answer) return null
  if (answer?.type === 'fov') return { placement: answer }
  const target = exam.views[exam.targetPlane].answer
  let lineLen = 0.75
  if (target?.type === 'fov') {
    const v = answerFovVisual(target)
    lineLen = lineLengthDim(exam.targetPlane, plane) === 'readout' ? v.w : v.h
  }
  const n = slicesForCoverage(answer.extent * W, rx)
  const lines: LinesGeometry = {
    offsets: lineOffsets(n, answer.extent, rx.thickness_mm / W),
    lineLen,
  }
  return { placement: answer, lines }
}
