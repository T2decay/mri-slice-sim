import { expect, it } from 'vitest'
import { saturationGeometry } from './saturation'
import type { RenderView } from '../types'

it('keeps superior and inferior on the correct anatomical side through rotations', () => {
  for (const angleDeg of [-180, -90, -45, 0, 30, 90, 135, 180]) {
    const view: RenderView = { placement: { type: 'lines', cx: .5, cy: .5, angleDeg, extent: .4 }, lines: { lineLen: .6, offsets: [] } }
    expect(saturationGeometry(view, 'superior').cy).toBeLessThan(.5)
    expect(saturationGeometry(view, 'inferior').cy).toBeGreaterThan(.5)
  }
})
it('tracks translation and stays beyond resized FOV edges', () => {
  const view: RenderView = { placement: { type: 'fov', cx: .4, cy: .4, angleDeg: 0, w: .5, h: .6 } }
  const original = saturationGeometry(view, 'inferior')
  expect(original.cy).toBeGreaterThan(.7)
  const moved = saturationGeometry({placement:{...view.placement, cx:.6, cy:.5}}, 'inferior')
  expect(moved.cx-original.cx).toBeCloseTo(.2)
  expect(moved.cy-original.cy).toBeCloseTo(.1)
  expect(original.width).toBe(.5)
})
