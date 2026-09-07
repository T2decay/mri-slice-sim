# MRI Slice-Planning Simulator

A browser-based slice-planning simulator for MRI students who have never
touched a scanner. Students pick an exam (e.g. *Brain — Axial*), see three
clean localizer images (sagittal, coronal, axial), and prescribe the slice
group themselves — position, rotate, and size an FOV box on the target plane
and slice-group lines on the cross-planes, just like at the console. The app
compares their placement with the instructor's reference geometry and gives
feedback using the same coverage language as the teaching deck.

**Pilot scope:** the Neuro / Brain family (14 exams: Brain, Brain & IAC's,
Brain & Pituitary, Brain & Orbits, Brain for Seizure, MRA Head, MRV Head).

## For instructors

The console opens on **Brain — Sagittal**. An exam dropdown at the top lists
the exam families; the **Sag / Cor / Ax** buttons (hotkeys S, C, A) switch
between the planes that family actually has. **Add Slice Group** drops a
starting prescription on all three localizers; the student moves, rotates,
and resizes it to match the written coverage instructions.

One **prescription** (FOV readout × phase, slice count, thickness, gap) is
shared by all three views, exactly as at the console: resizing the FOV box on
the target plane changes the slice-line length on the cross-planes, and
stretching a slice stack changes the slice count everywhere. The
**Parameters** block under the coverage text is two-way bound to the same
numbers for fine-tuning. Position and angle stay independent per view, so
students still align each localizer themselves.

There is no grading. Under every viewport a live readout shows the offset,
angle, and size difference from the reference, color-coded green / amber /
red (thresholds in `src/lib/scoring.ts` `TOLERANCES`). **Scan** reveals the
green reference placement and gives feedback that quotes the exact coverage
sentence from your deck; the **Key** button shows or hides that reference at
any time. Nothing is stored: no accounts, no student data, no results —
students can retry freely, and a first-run walkthrough (reopenable via `?`)
covers the flow in four steps.

The nominal physical scale of the localizers (250 mm image width) lives in
`src/data/scale.ts` and can be tuned per exam family.

## Run locally

```bash
npm install
npm run dev        # → http://localhost:5173/
npm run build      # type-check + production build in dist/
```

## Project layout

See [ROADMAP.md](ROADMAP.md) for remaining work and review gates, and
[HANDOFF.md](HANDOFF.md) for the current design and approved Brain image swaps.
Run `npm run check:content` to validate exam structure and local image paths.

- `src/` — Vite + React + TypeScript app (SVG overlays on `<img>`, no backend)
- `src/data/exams.json` — generated content: one entry per exam with coverage
  text and normalized answer geometry (do not hand-edit)
- `src/data/scale.ts` — hand-tuned nominal image scale (mm) used to derive
  every overlay size from the shared prescription
- `public/images/{examId}/{plane}.png` — cleaned localizers
- `pipeline/` — one-time Python asset pipeline (pptx → clean images + answer
  keys); see `pipeline/*.py` headers. Re-run order: `01_extract` →
  `02_geometry` → `03_clean` → `04_contact_sheet` (QA) → `05_assemble`
- `.github/workflows/deploy.yml` — GitHub Pages deploy on push to `main`.
  Push only when publishing is explicitly authorized.

**Asset warning:** do not rerun `05_assemble.py` on the current output without
preserving the approved Brain image replacements described in HANDOFF.md;
the old generated images would overwrite them.
