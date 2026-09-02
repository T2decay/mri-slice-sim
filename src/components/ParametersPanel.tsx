import { useEffect, useState } from 'react'
import type { Prescription } from '../lib/prescription'
import { LIMITS, clampPrescription, coverageMm, fovMaxMm } from '../lib/prescription'

interface Props {
  rx: Prescription
  onChange: (rx: Prescription) => void
  imageWidthMm: number
}

interface FieldProps {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step: number
  onCommit: (v: number) => void
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/**
 * Numeric field with − / + steppers. Typing commits live whenever the text
 * parses to an in-range number; on blur the text snaps back to the model so
 * a half-typed value can never leave the numbers and graphics disagreeing.
 */
function NumberField({ label, unit, value, min, max, step, onCommit }: FieldProps) {
  const [text, setText] = useState(fmt(value))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setText(fmt(value))
  }, [value, editing])

  const commitText = (t: string) => {
    setText(t)
    const v = Number(t)
    if (t.trim() !== '' && Number.isFinite(v) && v >= min && v <= max) onCommit(v)
  }

  const bump = (dir: 1 | -1) => {
    const v = Math.round((value + dir * step) / step) * step
    onCommit(Math.min(max, Math.max(min, v)))
  }

  return (
    <label className="param-row">
      <span className="param-label">{label}</span>
      <span className="param-control">
        <button
          type="button"
          className="param-step"
          aria-label={`decrease ${label}`}
          disabled={value <= min}
          onClick={() => bump(-1)}
        >
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={text}
          min={min}
          max={max}
          step={step}
          onFocus={() => setEditing(true)}
          onBlur={() => {
            setEditing(false)
            setText(fmt(value))
          }}
          onChange={(e) => commitText(e.target.value)}
        />
        <button
          type="button"
          className="param-step"
          aria-label={`increase ${label}`}
          disabled={value >= max}
          onClick={() => bump(1)}
        >
          +
        </button>
        <span className="param-unit">{unit}</span>
      </span>
    </label>
  )
}

/** The student's fine-tuning tool: two-way bound to the shared prescription. */
export default function ParametersPanel({ rx, onChange, imageWidthMm }: Props) {
  const set = (patch: Partial<Prescription>) =>
    onChange(clampPrescription({ ...rx, ...patch }, imageWidthMm))
  const fovMax = fovMaxMm(imageWidthMm)

  return (
    <div className="parameters">
      <NumberField
        label="FOV readout"
        unit="mm"
        value={rx.fovReadout_mm}
        min={LIMITS.fov.min}
        max={fovMax}
        step={LIMITS.fov.step}
        onCommit={(v) => set({ fovReadout_mm: v })}
      />
      <NumberField
        label="FOV phase"
        unit="mm"
        value={rx.fovPhase_mm}
        min={LIMITS.fov.min}
        max={fovMax}
        step={LIMITS.fov.step}
        onCommit={(v) => set({ fovPhase_mm: v })}
      />
      <NumberField
        label="Slices"
        unit=""
        value={rx.nSlices}
        min={LIMITS.nSlices.min}
        max={LIMITS.nSlices.max}
        step={LIMITS.nSlices.step}
        onCommit={(v) => set({ nSlices: v })}
      />
      <NumberField
        label="Thickness"
        unit="mm"
        value={rx.thickness_mm}
        min={LIMITS.thickness.min}
        max={LIMITS.thickness.max}
        step={LIMITS.thickness.step}
        onCommit={(v) => set({ thickness_mm: v })}
      />
      <NumberField
        label="Gap"
        unit="mm"
        value={rx.gap_mm}
        min={LIMITS.gap.min}
        max={LIMITS.gap.max}
        step={LIMITS.gap.step}
        onCommit={(v) => set({ gap_mm: v })}
      />
      <div className="param-row computed">
        <span className="param-label">Coverage</span>
        <span className="param-control">
          <output>{fmt(coverageMm(rx))}</output>
          <span className="param-unit">mm</span>
        </span>
      </div>
    </div>
  )
}
