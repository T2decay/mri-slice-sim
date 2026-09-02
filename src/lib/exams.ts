import type { Exam, ExamFamily, Plane } from '../types'

/** Group exams by family name, preserving exams.json order. */
export function groupFamilies(exams: Exam[]): ExamFamily[] {
  const out: ExamFamily[] = []
  for (const exam of exams) {
    let fam = out.find((f) => f.name === exam.exam)
    if (!fam) {
      fam = { name: exam.exam, exams: [] }
      out.push(fam)
    }
    fam.exams.push(exam)
  }
  return out
}

/** Sagittal by default; otherwise the family's first listed plane. */
export function defaultPlane(family: ExamFamily): Plane {
  const sag = family.exams.find((e) => e.targetPlane === 'sagittal')
  return sag ? 'sagittal' : family.exams[0].targetPlane
}

export function examForPlane(family: ExamFamily, plane: Plane): Exam | undefined {
  return family.exams.find((e) => e.targetPlane === plane)
}
