/** Overlay SVG coordinate space: 0–100 in both axes (all localizers are square). */
export const VIEW = 100

/** Convert a pointer event's client coords into SVG user units. */
export function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect()
  return {
    x: ((clientX - rect.left) / rect.width) * VIEW,
    y: ((clientY - rect.top) / rect.height) * VIEW,
  }
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/** Rotate a point around the origin by -deg (into a shape's local frame). */
export function toLocal(x: number, y: number, deg: number): { x: number; y: number } {
  const r = (-deg * Math.PI) / 180
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) }
}
