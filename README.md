# MRI Slice-Planning Simulator

A browser-based slice-planning simulator for MRI students who have never
touched a scanner. Students pick an exam (e.g. *Brain — Axial*), see three
clean localizer images (sagittal, coronal, axial), and prescribe the slice
group themselves — position, rotate, and size an FOV box on the target plane
and slice-group lines on the cross-planes, just like at the console. The app
grades their placement against the instructor's reference geometry and gives
feedback using the same coverage language as the teaching deck.

**Pilot scope:** the Neuro / Brain family (14 exams: Brain, Brain & IAC's,
Brain & Pituitary, Brain & Orbits, Brain for Seizure, MRA Head, MRV Head).

## For instructors

Each exam opens in **Learn mode**: the correct placement is shown as a green
ghost the whole time, with a live readout of the student's offset, angle, and
size error, so the first rep is always guided. Switching to **Practice mode**
hides the reference; the student places all three views from the written
coverage instructions alone, then presses **Scan** for a scored result
(center within 4% of the image diagonal, angle within 4°, size within 10% for
full credit — tunable in `src/lib/scoring.ts` `TOLERANCES`). Feedback quotes
the exact coverage sentence from your deck, so the app reinforces the same
language you teach with. Nothing is stored: no accounts, no student data —
students can retry freely, and a first-run walkthrough (reopenable via the
`?` button) covers the controls in four steps.

## Run locally

```bash
npm install
npm run dev        # → http://localhost:5173/
npm run build      # type-check + production build in dist/
```

## Project layout

- `src/` — Vite + React + TypeScript app (SVG overlays on `<img>`, no backend)
- `src/data/exams.json` — generated content: one entry per exam with coverage
  text and normalized answer geometry
- `public/images/{examId}/{plane}.png` — cleaned localizers
- `pipeline/` — one-time Python asset pipeline (pptx → clean images + answer
  keys); see `pipeline/*.py` headers. Re-run order: `01_extract` →
  `02_geometry` → `03_clean` → `04_contact_sheet` (QA) → `05_assemble`
- `.github/workflows/deploy.yml` — GitHub Pages deploy on push to `main`
  (inactive until the repo is on GitHub)
