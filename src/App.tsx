import { useEffect, useState } from 'react'
import type { Exam, Plane } from './types'
import examsJson from './data/exams.json'
import spineJson from './data/spine.json'
import { imageWidthMm } from './data/scale'
import { defaultPlane, examForPlane, groupFamilies } from './lib/exams'
import { defaultPrescription, type Prescription } from './lib/prescription'
import ConsoleShell from './components/ConsoleShell'

// RadBun publishes the approved Brain and IAC image sets; the full build retains all exams.
const allExams = [...examsJson, ...spineJson] as unknown as Exam[]
const exams = import.meta.env.MODE === 'radbun'
  ? allExams.filter((exam) => ['Brain', "Brain & IAC's"].includes(exam.exam))
  : allExams
const families = groupFamilies(exams)

const PLANE_HOTKEYS: Record<string, Plane> = { s: 'sagittal', c: 'coronal', a: 'axial' }

/**
 * Exam session: which family/plane is open, the shared prescription, and the
 * reference toggle. The prescription survives plane switches within a family
 * and is re-initialized when the family changes. Nothing here is persisted.
 */
export default function App() {
  const [familyName, setFamilyName] = useState(families[0].name)
  const family = families.find((f) => f.name === familyName) ?? families[0]
  const [examId, setExamId] = useState(() => (examForPlane(family, defaultPlane(family)) ?? family.exams[0]).id)
  const exam = family.exams.find((entry) => entry.id === examId) ?? family.exams[0]
  const W = imageWidthMm(family.name)
  const [rx, setRx] = useState<Prescription>(() => defaultPrescription(exam, W))
  const [keyOn, setKeyOn] = useState(false)

  const selectFamily = (name: string) => {
    const f = families.find((x) => x.name === name)
    if (!f) return
    const p = defaultPlane(f)
    const e = examForPlane(f, p) ?? f.exams[0]
    setFamilyName(name)
    setExamId(e.id)
    setRx(defaultPrescription(e, imageWidthMm(f.name)))
  }

  const selectPlane = (p: Plane) => {
    const next = examForPlane(family, p)
    if (next) setExamId(next.id)
  }

  // S / C / A hotkeys (ignored while typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const p = PLANE_HOTKEYS[e.key.toLowerCase()]
      const next = p && examForPlane(family, p)
      if (next) setExamId(next.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [family])

  // key resets placements (position/angle) when the exam changes
  return (
    <ConsoleShell
      key={exam.id}
      exam={exam}
      families={families}
      family={family}
      plane={exam.targetPlane}
      onSelectFamily={selectFamily}
      onSelectPlane={selectPlane}
      onSelectSequence={setExamId}
      rx={rx}
      onRxChange={setRx}
      imageWidthMm={W}
      keyOn={keyOn}
      onToggleKey={() => setKeyOn((k) => !k)}
    />
  )
}
