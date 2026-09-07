import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ConsoleShell from './ConsoleShell'
import examsJson from '../data/exams.json'
import type { Exam } from '../types'
import { defaultPrescription } from '../lib/prescription'

it('exposes every same-plane sequence and groups multiple regions', () => {
  const exam = examsJson[0] as Exam
  const family = { name: exam.exam, exams: [exam, { ...exam, id: 'second-sequence', sequenceNote: 'Second sequence' }] }
  const nextRegion = { name: 'Fixture body exam', exams: [{ ...exam, id: 'body-fixture', region: 'Body', exam: 'Fixture body exam' }] }
  const noop = () => {}
  const markup = renderToStaticMarkup(<ConsoleShell exam={exam} family={family}
    families={[family, nextRegion]} plane={exam.targetPlane} onSelectFamily={noop}
    onSelectPlane={noop} onSelectSequence={noop} rx={defaultPrescription(exam, 250)}
    onRxChange={noop} imageWidthMm={250} keyOn={false} onToggleKey={noop} />)
  expect(markup).toContain('aria-label="Sequence"')
  expect(markup).toContain('value="second-sequence"')
  expect(markup).toContain('<optgroup label="Body">')
  expect(markup).toContain('<optgroup label="Neuro">')
})
