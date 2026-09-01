export type Plane = 'sagittal' | 'coronal' | 'axial'

export const PLANES: Plane[] = ['sagittal', 'coronal', 'axial']

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

export type Placement = FovPlacement | LinesPlacement

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
