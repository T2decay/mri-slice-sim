import { readFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const exams = []
for (const file of ['exams.json', 'spine.json']) exams.push(...JSON.parse(await readFile(path.join(root, 'src/data', file), 'utf8')))
let localizers = 0
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
    if (exam.referenceMode === 'source') {
      requireValue(view?.answer === null, `${label}: source-reference exercise must not carry an unverified numeric key`)
      if (view?.image === null) {
        requireValue(nonempty(view?.unavailableReason), `${label}: missing view needs an explanation`)
        requireValue(!view?.referenceImage, `${label}: missing view cannot have a reference`)
      } else {
        for (const key of view?.substitution ? ['image'] : ['image', 'referenceImage']) {
          const value = view?.[key]
          if (!nonempty(value) || !value.startsWith('images/') || value.split('/').includes('..')) errors.push(`${label}: invalid ${key}`)
          else { try { await access(path.join(root, 'public', value)) } catch { errors.push(`${label}: missing ${key}: ${value}`) } }
        }
        if (view?.substitution) {
          const donor = exams.find((entry) => entry.id === view.substitution.donorExamId)
          requireValue(donor && donor.exam === exam.exam && donor.id !== exam.id, `${label}: donor must be a different exercise in the same family`)
          requireValue(view.substitution.plane === plane && donor?.views?.[plane]?.image === view.image, `${label}: donor plane/image mismatch`)
          requireValue(!donor?.views?.[plane]?.substitution, `${label}: chained substitution is unsupported`)
          requireValue(!view.referenceImage && nonempty(view.referenceUnavailableReason), `${label}: substitution must disclose absent reference lines`)
        }
        localizers++
      }
      continue
    }
    localizers++
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
  console.log(`Content valid: ${exams.length} exams, ${localizers} localizers. No files modified.`)
}
