import type { Exam, Placement, Plane } from '../types'
import { PLANES } from '../types'

/**
 * Grading tolerances (plan §4). All in one object so Wes can tune them
 * after classroom trials without touching any other code.
 */
export const TOLERANCES = {
  /** center offset as a fraction of the image diagonal */
  center: { full: 0.04, partial: 0.1 },
  /** angle difference in degrees */
  angle: { full: 4, partial: 10 },
  /** relative size (fov w/h) or extent (lines) difference */
  size: { full: 0.1, partial: 0.2 },
}

export type Grade = 'full' | 'partial' | 'miss'

export interface MetricResult {
  metric: 'center' | 'angle' | 'size'
  /** human-readable amount, e.g. "6.2%" or "14°" */
  amount: string
  grade: Grade
}

export interface ViewScore {
  plane: Plane
  metrics: MetricResult[]
  /** 0..1 */
  score: number
  feedback: string[]
}

export interface ExamScore {
  views: ViewScore[]
  /** 0..100 */
  composite: number
}

const GRADE_POINTS: Record<Grade, number> = { full: 1, partial: 0.5, miss: 0 }

function grade(value: number, tol: { full: number; partial: number }): Grade {
  if (value <= tol.full) return 'full'
  if (value <= tol.partial) return 'partial'
  return 'miss'
}

/** Fold an angle difference to [-90, 90] — a lines group at 178° ≈ −2°. */
export function angleDiffDeg(a: number, b: number): number {
  return ((a - b + 90) % 180 + 180) % 180 - 90
}

/** Center offset as a fraction of the image diagonal (images are square). */
export function centerOffsetFrac(student: Placement, answer: Placement): number {
  return Math.hypot(student.cx - answer.cx, student.cy - answer.cy) / Math.SQRT2
}

/** Relative size (fov) or extent (lines) difference, 0 = perfect. */
export function sizeDiffFrac(student: Placement, answer: Placement): number {
  if (student.type === 'fov' && answer.type === 'fov') {
    return Math.max(
      Math.abs(student.w - answer.w) / answer.w,
      Math.abs(student.h - answer.h) / answer.h,
    )
  }
  if (student.type === 'lines' && answer.type === 'lines') {
    return Math.abs(student.extent - answer.extent) / answer.extent
  }
  return 1
}

export interface Deltas {
  offsetFrac: number
  angleDeg: number
  sizeFrac: number
}

/** Live readout for Learn mode. */
export function deltas(student: Placement, answer: Placement): Deltas {
  return {
    offsetFrac: centerOffsetFrac(student, answer),
    angleDeg: Math.abs(angleDiffDeg(student.angleDeg, answer.angleDeg)),
    sizeFrac: sizeDiffFrac(student, answer),
  }
}

function feedbackFor(m: MetricResult, coverage: string): string {
  const remember = ` — remember: “${coverage}”`
  switch (m.metric) {
    case 'center':
      return `Center off by ${m.amount} of the image${remember}`
    case 'angle':
      return `Angle off by ${m.amount}${remember}`
    case 'size':
      return `Coverage size off by ${m.amount}${remember}`
  }
}

export function scoreView(
  plane: Plane,
  student: Placement,
  answer: Placement,
  coverage: string,
): ViewScore {
  const d = deltas(student, answer)
  const metrics: MetricResult[] = [
    {
      metric: 'center',
      amount: `${(d.offsetFrac * 100).toFixed(1)}%`,
      grade: grade(d.offsetFrac, TOLERANCES.center),
    },
    {
      metric: 'angle',
      amount: `${d.angleDeg.toFixed(1)}°`,
      grade: grade(d.angleDeg, TOLERANCES.angle),
    },
    {
      metric: 'size',
      amount: `${(d.sizeFrac * 100).toFixed(0)}%`,
      grade: grade(d.sizeFrac, TOLERANCES.size),
    },
  ]
  const score =
    metrics.reduce((s, m) => s + GRADE_POINTS[m.grade], 0) / metrics.length
  const feedback = metrics
    .filter((m) => m.grade !== 'full')
    .map((m) => feedbackFor(m, coverage))
  if (feedback.length === 0) {
    feedback.push('Nice placement — matches the reference.')
  }
  return { plane, metrics, score, feedback }
}

export function scoreExam(
  exam: Exam,
  placements: Record<Plane, Placement>,
): ExamScore {
  const views = PLANES.map((plane) =>
    scoreView(plane, placements[plane], exam.views[plane].answer, exam.coverage[plane]),
  )
  const composite = Math.round(
    (views.reduce((s, v) => s + v.score, 0) / views.length) * 100,
  )
  return { views, composite }
}
