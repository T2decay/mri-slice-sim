export type Plane = 'sagittal' | 'coronal' | 'axial'

export const PLANES: Plane[] = ['sagittal', 'coronal', 'axial']

export const PLANE_SHORT: Record<Plane, string> = {
  sagittal: 'Sag',
  coronal: 'Cor',
  axial: 'Ax',
}

export interface FovPlacement {
  type: 'fov'
  cx: number
  cy: number
  w: number
  h: number
  angleDeg: number
}

export interface LinesPlacement {
  type: 'lines'
  cx: number
  cy: number
  angleDeg: number
  extent: number
}

/** Geometry in normalized image units (0–1). Answers come from exams.json. */
export type Placement = FovPlacement | LinesPlacement

/** What the student controls directly per view: position and angle only. */
export interface Pose {
  cx: number
  cy: number
  angleDeg: number
}

/** Extra drawing data for a slice-line set (normalized image units). */
export interface LinesGeometry {
  /** offsets of each slice line from the group center, along the stack axis */
  offsets: number[]
  /** length of each line (the FOV dimension along this view's shared axis) */
  lineLen: number
}

/** Everything a Viewport needs to draw one overlay. */
export interface RenderView {
  placement: Placement
  lines?: LinesGeometry
}

export interface ExamView {
  image: string
  answer: Placement
}

export interface Exam {
  id: string
  exam: string
  region: string
  landmark: string | null
  targetPlane: Plane
  sequenceNote: string
  coverage: Record<Plane, string>
  views: Record<Plane, ExamView>
}

/** Exams grouped by family name (the `exam` field), e.g. "Brain & IAC's". */
export interface ExamFamily {
  name: string
  exams: Exam[]
}
