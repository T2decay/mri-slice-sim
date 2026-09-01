import type { Exam } from '../types'

interface Props {
  exams: Exam[]
  onPick: (exam: Exam) => void
}

/** Simple flat exam list for the pilot (plan §Phase 5). */
export default function ExamPicker({ exams, onPick }: Props) {
  return (
    <div className="picker">
      <header className="picker-header">
        <h1>MRI Slice-Planning Simulator</h1>
        <p>
          Pick an exam, then prescribe the slice group on the localizers
          (the quick scout images you plan on) — just like at the console.
        </p>
      </header>
      <ul className="exam-list">
        {exams.map((exam) => (
          <li key={exam.id}>
            <button className="exam-card" onClick={() => onPick(exam)}>
              <span className="exam-name">{exam.exam}</span>
              <span className="exam-seq">{exam.sequenceNote}</span>
              {exam.landmark && <span className="exam-landmark">{exam.landmark}</span>}
              <span className={`plane-chip ${exam.targetPlane}`}>{exam.targetPlane}</span>
            </button>
          </li>
        ))}
      </ul>
      <footer className="picker-footer">
        Neuro pilot — Brain family. No accounts, nothing you do here is stored.
      </footer>
    </div>
  )
}
