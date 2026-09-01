import { useState } from 'react'
import type { Exam } from './types'
import examsJson from './data/exams.json'
import ExamPicker from './components/ExamPicker'
import ConsoleShell from './components/ConsoleShell'

const exams = examsJson as unknown as Exam[]

export default function App() {
  const [examId, setExamId] = useState<string | null>(null)
  const exam = exams.find((e) => e.id === examId)

  if (!exam) {
    return <ExamPicker exams={exams} onPick={(e) => setExamId(e.id)} />
  }
  // key resets all console state when switching exams
  return <ConsoleShell key={exam.id} exam={exam} onBack={() => setExamId(null)} />
}
