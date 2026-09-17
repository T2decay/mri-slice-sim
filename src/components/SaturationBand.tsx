import { useId } from 'react'
import type { RenderView } from '../types'
import { saturationGeometry } from '../lib/saturation'
import { VIEW } from '../lib/svg'

export default function SaturationBand({ view, side }: { view: RenderView; side: 'superior' | 'inferior' }) {
  const id = useId()
  const g = saturationGeometry(view, side)
  // Keep this illustrative marker readable when the planned group touches the image edge.
  const radians = g.angle * Math.PI / 180
  const halfY = Math.abs(Math.sin(radians)) * g.width * VIEW / 2 + Math.abs(Math.cos(radians)) * 1.2
  const displayY = Math.max(Math.min(halfY, VIEW / 2), Math.min(VIEW - Math.min(halfY, VIEW / 2), g.cy * VIEW))
  return <g pointerEvents="none" aria-label={`${side} saturation band`} data-saturation-band={side}>
    <defs><pattern id={id} width="2" height="2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <path d="M 0 0 V 2" stroke="#7dd3fc" strokeWidth="0.65" />
    </pattern></defs>
    <g transform={`translate(${g.cx * VIEW} ${displayY}) rotate(${g.angle})`}>
      <rect x={-g.width * VIEW / 2} y={-1.2} width={g.width * VIEW} height={2.4} fill={`url(#${id})`} stroke="#7dd3fc" strokeWidth="0.35" />
      <text x="0" y="0" dy="0.8" textAnchor="middle" fontSize="2.6" fontWeight="700" fill="#e0f2fe" stroke="#10151d" strokeWidth="0.65" paintOrder="stroke">SAT</text>
    </g>
  </g>
}
