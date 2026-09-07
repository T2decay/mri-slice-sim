import { readFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const exams = JSON.parse(await readFile(path.join(root, 'src/data/exams.json'), 'utf8'))
const planes = ['sagittal', 'coronal', 'axial']
const errors = []
const ids = new Set()
const requireValue = (condition, message) => { if (!condition) errors.push(message) }
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0

if (!Array.isArray(exams) || !exams.length) throw new Error('Expected a nonempty exam array')
for (const exam of exams) {
  const id = exam?.id
  requireValue(nonempty(id) && !ids.has(id), `Invalid or duplicate exam ID: ${id}`)
  ids.add(id)
  for (const key of ['exam', 'region', 'sequenceNote']) {
    requireValue(nonempty(exam?.[key]), `${id}: missing ${key}`)
  }
  requireValue(planes.includes(exam?.targetPlane), `${id}: invalid target plane`)
  for (const plane of planes) {
    const label = `${id}/${plane}`
    requireValue(nonempty(exam?.coverage?.[plane]), `${label}: missing coverage`)
    const view = exam?.views?.[plane]
    const answer = view?.answer
    const type = plane === exam?.targetPlane ? 'fov' : 'lines'
    requireValue(answer?.type === type, `${label}: expected ${type} answer`)
    for (const key of ['cx', 'cy', 'angleDeg', ...(type === 'fov' ? ['w', 'h'] : ['extent'])]) {
      requireValue(Number.isFinite(answer?.[key]), `${label}: invalid ${key}`)
    }
    for (const key of ['cx', 'cy']) {
      requireValue(answer?.[key] >= 0 && answer?.[key] <= 1, `${label}: ${key} outside image`)
    }
    for (const key of type === 'fov' ? ['w', 'h'] : ['extent']) {
      requireValue(answer?.[key] > 0, `${label}: ${key} must be positive`)
    }
    const image = view?.image
    if (typeof image !== 'string' || !image.startsWith('images/') || image.split('/').includes('..')) {
      errors.push(`${label}: invalid image path`)
    } else {
      try { await access(path.join(root, 'public', image)) }
      catch { errors.push(`${label}: image missing: ${image}`) }
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Content valid: ${exams.length} exams, ${exams.length * planes.length} localizers. No files modified.`)
}
