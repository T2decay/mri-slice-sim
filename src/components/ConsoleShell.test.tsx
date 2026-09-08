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

import spineJson from '../data/spine.json'
import { ghostRender, studentRender } from '../lib/prescription'
import { PLANES } from '../types'
for (const entry of spineJson) it(`${entry.id}: source references and missing views are safe`, () => {
  const exam = entry as Exam
  const family = { name: exam.exam, exams: [exam] }
  const noop = () => {}
  const rx = defaultPrescription(exam, 250)
  const markup = renderToStaticMarkup(<ConsoleShell exam={exam} family={family} families={[family]}
    plane={exam.targetPlane} onSelectFamily={noop} onSelectPlane={noop} onSelectSequence={noop}
    rx={rx} onRxChange={noop} imageWidthMm={250} keyOn={true} onToggleKey={noop} />)
  expect(markup).not.toContain('NaN')
  expect(markup).not.toContain('src="/null"')
  expect(markup).toContain('numerical match feedback is not available')
  for (const plane of PLANES) {
    expect(ghostRender(exam, plane, rx, 250)).toBeNull()
    if (!exam.views[plane].image) expect(markup).toContain(`${plane} localizer unavailable`)
    else {
      expect(markup).toContain(exam.views[plane].referenceImage)
      expect(studentRender(exam, plane, { cx: .5, cy: .5, angleDeg: 0 }, rx, 250).placement).toBeDefined()
    }
  }
})
