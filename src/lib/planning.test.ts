import { describe, expect, it } from 'vitest'
import examsJson from '../data/exams.json'
import type { Exam, FovPlacement } from '../types'
import { PLANES } from '../types'
import { defaultPlane, examForPlane, groupFamilies } from './exams'
import { angleDiffDeg, deltas, feedbackForView } from './scoring'
import { coverageMm, defaultPrescription, slicesForCoverage, studentRender } from './prescription'
import { hasSeen, markSeen } from './preferences'

const exams = examsJson as Exam[]
describe('approved content and prescription coupling', () => {
  for (const exam of exams) it(`${exam.id}: every view shares coverage and slice count`, () => {
    const rx = { ...defaultPrescription(exam, 250), nSlices: 35, thickness_mm: 5, gap_mm: 1 }
    expect(coverageMm(rx)).toBe(209)
    expect(slicesForCoverage(209, rx)).toBe(35)
    for (const plane of PLANES) {
      const rendered = studentRender(exam, plane, { cx: .5, cy: .5, angleDeg: 0 }, rx, 250)
      if (rendered.placement.type === 'lines') {
        expect(rendered.placement.extent).toBe(209 / 250)
        expect(rendered.lines?.offsets).toHaveLength(35)
        expect(rendered.lines!.offsets[34] - rendered.lines!.offsets[0]).toBeCloseTo(204 / 250)
      } else expect(rendered.placement.w).toBe(rx.fovReadout_mm / 250)
    }
  })
  it('chooses an available default plane for every family', () => {
    for (const family of groupFamilies(exams)) expect(examForPlane(family, defaultPlane(family))).toBeDefined()
  })
  it('preserves distinct sequences sharing one target plane', () => {
    const first = exams[0]
    const family = groupFamilies([first, { ...first, id: 'another-sequence', sequenceNote: 'Another sequence' }])[0]
    expect(family.exams.map((exam) => exam.id)).toEqual([first.id, 'another-sequence'])
  })
})
describe('feedback geometry', () => {
  it('recognizes line angle wraparound', () => expect(angleDiffDeg(178, -2)).toBe(0))
  it('recognizes the same rectangle rotated 90 degrees with sides exchanged', () => {
    const a: FovPlacement = { type: 'fov', cx: .5, cy: .5, w: .8, h: .6, angleDeg: 0 }
    expect(deltas(a, { ...a, w: .6, h: .8, angleDeg: 90 })).toEqual({ offsetFrac: 0, angleDeg: 0, sizeFrac: 0 })
  })
  it('does not grant equal size for a 90-degree turn without exchanging unequal sides', () => {
    const a: FovPlacement = { type: 'fov', cx: .5, cy: .5, w: .8, h: .6, angleDeg: 0 }
    expect(deltas(a, { ...a, angleDeg: 90 }).sizeFrac).toBeGreaterThan(.2)
  })
  it('preserves source coverage in feedback', () => {
    const coverage = exams[0].coverage.axial
    expect(feedbackForView({ offsetFrac: 0, angleDeg: 14, sizeFrac: 0 }, coverage)[0]).toContain(coverage)
  })
  it('keeps onboarding usable without browser storage', () => {
    markSeen('test-optional-flag')
    expect(hasSeen('test-optional-flag')).toBe(true)
    expect(hasSeen('test-unseen-flag')).toBe(false)
  })
})
