import type { RenderView } from '../types'

/** Choose the group edge facing anatomical superior/inferior (screen up/down). */
export function saturationGeometry(view: RenderView, side: 'superior' | 'inferior') {
  const p = view.placement
  const w = p.type === 'fov' ? p.w : (view.lines?.lineLen ?? 0.75)
  const h = p.type === 'fov' ? p.h : p.extent
  const radians = p.angleDeg * Math.PI / 180
  // Pick the edge whose outward normal has the greatest superior/inferior component.
  const useY = Math.abs(Math.cos(radians)) >= Math.abs(Math.sin(radians))
  let angle = p.angleDeg + (useY ? 0 : 90)
  angle = ((angle + 90) % 180 + 180) % 180 - 90
  const a = angle * Math.PI / 180
  const direction = side === 'superior' ? -1 : 1
  const distance = (useY ? h : w) / 2 + 0.035
  return {
    cx: p.cx - Math.sin(a) * distance * direction,
    cy: p.cy + Math.cos(a) * distance * direction,
    angle,
    width: useY ? w : h,
  }
}
