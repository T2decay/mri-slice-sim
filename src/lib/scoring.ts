import type { Placement } from '../types'

/**
 * Color-coding thresholds for the live readouts (green / amber / red).
 * There is no grading — these only decide the color of the numbers and
 * which metrics get a feedback sentence after Scan. Tune freely.
 */
export const TOLERANCES = {
  /** center offset as a fraction of the image diagonal */
  center: { full: 0.04, partial: 0.1 },
  /** angle difference in degrees */
  angle: { full: 4, partial: 10 },
  /** relative size (fov w/h) or extent (lines) difference */
  size: { full: 0.1, partial: 0.2 },
}

export type Band = 'good' | 'close' | 'off'

export function band(value: number, tol: { full: number; partial: number }): Band {
  if (value <= tol.full) return 'good'
  if (value <= tol.partial) return 'close'
  return 'off'
}

/** Fold an angle difference to [-90, 90] — a lines group at 178° ≈ −2°. */
export function angleDiffDeg(a: number, b: number): number {
  return ((((a - b + 90) % 180) + 180) % 180) - 90
}

/** Center offset as a fraction of the image diagonal (images are square). */
export function centerOffsetFrac(student: Placement, answer: Placement): number {
  return Math.hypot(student.cx - answer.cx, student.cy - answer.cy) / Math.SQRT2
}

export interface Deltas {
  offsetFrac: number
  angleDeg: number
  sizeFrac: number
}

/**
 * Live readout deltas. A rectangle is the same rectangle turned 90° with its
 * sides swapped, so FOV boxes are compared modulo 90° (several answer keys
 * were captured at −90°).
 */
export function deltas(student: Placement, answer: Placement): Deltas {
  const offsetFrac = centerOffsetFrac(student, answer)
  let angle = Math.abs(angleDiffDeg(student.angleDeg, answer.angleDeg))
  let sizeFrac = 1
  if (student.type === 'fov' && answer.type === 'fov') {
    const swapped = angle > 45
    if (swapped) angle = 90 - angle
    const aw = swapped ? answer.h : answer.w
    const ah = swapped ? answer.w : answer.h
    sizeFrac = Math.max(Math.abs(student.w - aw) / aw, Math.abs(student.h - ah) / ah)
  } else if (student.type === 'lines' && answer.type === 'lines') {
    sizeFrac = Math.abs(student.extent - answer.extent) / answer.extent
  }
  return { offsetFrac, angleDeg: angle, sizeFrac }
}

/** Feedback sentences after Scan, quoting the slide's coverage language. */
export function feedbackForView(d: Deltas, coverage: string): string[] {
  const remember = ` — remember: “${coverage}”`
  const out: string[] = []
  if (band(d.offsetFrac, TOLERANCES.center) !== 'good') {
    out.push(`Center off by ${(d.offsetFrac * 100).toFixed(1)}% of the image${remember}`)
  }
  if (band(d.angleDeg, TOLERANCES.angle) !== 'good') {
    out.push(`Angle off by ${d.angleDeg.toFixed(1)}°${remember}`)
  }
  if (band(d.sizeFrac, TOLERANCES.size) !== 'good') {
    out.push(`Coverage size off by ${(d.sizeFrac * 100).toFixed(0)}%${remember}`)
  }
  if (out.length === 0) out.push('Nice placement — matches the reference.')
  return out
}
