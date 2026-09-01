# MRI Slice-Planning Simulator — Claude Code Project Plan

**Owner:** Wes Williamson · **GitHub:** `T2decay` · **Deploy target:** GitHub Pages
**Source asset:** `MRI_PlanningGuide.pptx` (103 slides, ~50 exam/plane combinations, ~290 scanner localizer images)

---

## 1. Vision

A browser-based MRI slice-planning simulator for **students who have never touched a scanner** — every design decision favors basic functionality plus built-in direction over feature depth. Students pick an exam (e.g., *Brain — Axial*), see three clean localizer images (sagittal, coronal, axial) with **no yellow graphics**, and prescribe the slice group themselves: position, rotate, and size an FOV box on the target plane and slice-group lines on the cross-planes — just like at the console. The app grades their placement against the instructor's reference geometry and gives feedback using the coverage language already written in the PowerPoint.

## 2. Critical technical findings (verified — do not re-litigate)

1. **Yellow overlays are baked into the JPEG pixels.** They are scanner console renderings captured in screenshots. Removal = image processing, not shape deletion.
2. **Removal is proven feasible.** Pixels where `R − B > 8` AND `G − B > 8` isolate the yellow (including anti-aliased fringe) on these grayscale images. Dilate 1× with a 3×3 kernel, then `cv2.inpaint` (compare `INPAINT_NS` r=3 vs `INPAINT_TELEA` r=3 per image). Residual ghosting where lines cross bright tissue is the known failure mode — the QA loop in Phase 1 addresses it.
3. **The overlays ARE the answer key.** Extract geometry *before* inpainting: `cv2.minAreaRect` on the mask's largest contour gives the FOV rectangle (center, w, h, angle); `cv2.HoughLinesP` on the mask gives slice-group line angles. Store per-image in JSON.
4. **Slide structure is uniform:** Title (exam name + centering landmark), subtitle (target plane / sequence), a 3-row table (Sagittal / Coronal / Axial coverage instructions), and 3 images. The table text becomes in-app feedback and reference copy verbatim.
5. **Image order caution:** Do NOT trust markitdown's image order. Read each slide's XML (`ppt/slides/slideN.xml`), sort `<p:pic>` elements by their `<a:off x=>` value (left → right on the slide), and map left/middle/right → sagittal/coronal/axial. **Verify this assumption visually on 5 random slides before batch processing** — render the slide, eyeball which image is which plane.

## 3. Stack

- **Vite + React + TypeScript** (matches the Ch9 Instrumentation lab — same mental model, same deploy pipeline)
- **SVG overlays** on `<img>` for the interactive FOV box and slice lines (no Three.js needed — this is 2D)
- **No backend.** All content in static JSON + PNG. GitHub Pages compatible.
- Python 3 + OpenCV (`opencv-python-headless`, `Pillow`, `defusedxml`) for the one-time asset pipeline (lives in `/pipeline`, not shipped)

## 4. Repository layout

```
mri-slice-sim/
├── pipeline/                  # one-time asset build (Python)
│   ├── source/MRI_PlanningGuide.pptx
│   ├── 01_extract.py          # unzip pptx, parse slides → slide manifest
│   ├── 02_geometry.py         # yellow mask → answer-key JSON per image
│   ├── 03_clean.py            # inpaint yellow → clean PNGs
│   ├── 04_contact_sheet.py    # before/after grid for visual QA
│   └── out/                   # generated: manifest.json, geometry.json, clean/*.png
├── public/
│   └── images/{examId}/{plane}.png     # clean localizers, web-optimized
├── src/
│   ├── data/exams.json        # content model (below)
│   ├── components/
│   │   ├── ExamPicker.tsx
│   │   ├── Viewport.tsx       # one localizer + SVG overlay layer
│   │   ├── FovBox.tsx         # draggable/rotatable/resizable rect
│   │   ├── SliceLines.tsx     # draggable/rotatable parallel-line group
│   │   ├── ScorePanel.tsx
│   │   └── ConsoleShell.tsx   # dark scanner-console chrome
│   ├── lib/scoring.ts
│   └── App.tsx
└── .github/workflows/deploy.yml   # gh-pages on push to main
```

## 5. Content model (`exams.json`)

One entry per slide (exam + target plane combination):

```jsonc
{
  "id": "brain-axial",
  "exam": "Brain",
  "landmark": "Center to glabella",        // from title where present
  "targetPlane": "axial",                  // the plane being prescribed
  "sequenceNote": "Axial",                 // subtitle text (e.g., "Axial 3D TOF")
  "coverage": {                            // verbatim from the slide table
    "sagittal": "align using the inferior aspect of the Genu and Splenium...",
    "coronal": "align perpendicular to longitudinal fissure",
    "axial": "The FOV will cover the entire brain from L to R and P to A"
  },
  "views": {
    "sagittal": { "image": "images/brain-axial/sagittal.png",
                  "answer": { "type": "lines", "cx": 0.52, "cy": 0.48,
                              "angleDeg": 8.5, "extent": 0.61 } },
    "coronal":  { "image": "images/brain-axial/coronal.png",
                  "answer": { "type": "lines", "cx": 0.50, "cy": 0.47,
                              "angleDeg": 0.0, "extent": 0.63 } },
    "axial":    { "image": "images/brain-axial/axial.png",
                  "answer": { "type": "fov", "cx": 0.50, "cy": 0.50,
                              "w": 0.72, "h": 0.88, "angleDeg": 0.0 } }
  }
}
```

All geometry normalized 0–1 relative to image dimensions so it survives resizing. The **target plane gets a `fov` answer** (rectangle); the two cross-planes get `lines` answers (group of parallel lines: center, angle, extent). The pipeline classifies each image's overlay automatically (closed rectangle contour → fov; dominant parallel Hough lines → lines) but writes a `"confidence"` field; low-confidence entries go on a manual-review list.

## 6. Build phases

### Phase 1 — Asset pipeline (Python, in `/pipeline`)

1. `01_extract.py`: Unzip pptx. For each slide: parse title/subtitle/table with `defusedxml`, list `<p:pic>` elements sorted by x-offset, resolve relationship IDs → media files. Emit `manifest.json`. **Gate:** render 5 random slides and visually confirm left→right = sag/cor/ax before proceeding.
2. `02_geometry.py`: For each image, build the yellow mask (`R−B>8 & G−B>8`), extract answer geometry (minAreaRect + HoughLinesP), classify fov vs lines, write `geometry.json` with confidence scores.
3. `03_clean.py`: Dilate mask (3×3, 1 iter), inpaint (try NS r=3 and Telea r=3, keep the one with lower residual yellow + lower local variance disturbance), export PNG. Resize to max 800px, strip metadata.
4. `04_contact_sheet.py`: Before/after grid, 12 per sheet. **Human QA gate: Wes reviews every sheet.** Flagged images get parameter overrides (per-image JSON: mask threshold, dilation, radius) and re-run. Iterate until clean.
5. **PHI sweep (required before anything is pushed to a public repo):** Verify no patient names, MRNs, dates-of-birth, or accession numbers are burned into any image (check all four corners of every image on the contact sheets — scanner captures sometimes carry annotation text). The "ACS" plane labels are fine. If anything identifying appears, crop or mask it in the pipeline. *This gate blocks deployment.*

### Phase 2 — Content assembly

Merge `manifest.json` + `geometry.json` → `src/data/exams.json`. Normalize exam IDs (`brain-axial`, `brain-iacs-coronal`, `mra-head-axial-3dtof`...). Group exams by body region for the picker (Neuro, Spine, Body, MSK, Vascular). Fix typos from the source deck (e.g., "SIEZURE" → "Seizure", "ARTIERIES" → "Arteries") in display names only — keep coverage text verbatim.

### Phase 3 — Simulator UI

- **ConsoleShell:** dark theme, three side-by-side viewports (stacked on mobile), exam name + landmark header, and a **collapsible Instructions panel available in BOTH modes** — coverage text for all three planes plus a small reference example thumbnail. Students should be able to glance at the instructions while actively dragging a slice group; never make them leave the exam to see how it's supposed to be done. (A "hide instructions for testing" toggle is a v2 idea, not v1.)
- **Viewport interaction:**
  - FOV box (target plane): drag to move, corner handles to resize, rotation handle above top edge. Rendered as yellow SVG stroke to match the real console look.
  - Slice lines (cross planes): a group of parallel lines inside a bounding extent; drag to move, rotate handle, drag ends to change extent.
  - Touch support required (students will use tablets).
- **Core student flow (in this exact order, mirroring a real console):**
  1. Student clicks a scan type from the exam list (e.g., *Brain — Axial*).
  2. The three clean localizer images load immediately — no overlays yet. Instructions panel is visible.
  3. Student clicks a prominent **"Add Slice Group"** button (the console-equivalent of dragging a sequence onto the localizers).
  4. The slice group appears pre-placed — centered, unrotated — across all three viewports (FOV box on the target plane, line groups on the cross-planes).
  5. Student adjusts position/rotation/size in each view, then hits **Scan** to check (Learn: live match vs ghost; Practice: scored).
- **Beginner-first principles (target audience: students who have NEVER touched a scanner):**
  - **Never a blank canvas to draw on.** The slice group always appears pre-placed when added; the student's task is *adjust and align*, never *create from nothing*.
  - **First-run walkthrough:** a skippable 4-step overlay shown once ("These are your localizer images → click Add Slice Group → drag to move, top handle to rotate → tap Scan when it matches the instructions"). Re-openable anytime from a `?` icon.
  - **Plain language with the jargon, not instead of it.** First use of each term gets a short parenthetical: "FOV (field of view — the box that sets what gets scanned)", "localizer (the quick scout image you plan on)". Students must learn the real vocabulary, but never hit it cold.
  - **Learn mode is the default landing mode** for every exam, so the first rep is always guided.
  - Every interactive handle gets a hover/touch hint on first encounter (move / rotate / resize).
- **Two modes:**
  - **Learn:** reference overlay shown as a green ghost; student matches it; live delta readout (offset %, angle °).
  - **Practice:** overlays start centered/neutral (not hidden), student adjusts all three views, hits **Scan** → scored.
- Keyboard nudging (arrows = 1px, shift+arrows = rotate 1°) for precision and accessibility.

### Phase 4 — Scoring & feedback (`lib/scoring.ts`)

Per view, compare student vs answer:

| Metric | Full credit | Partial | Miss |
|---|---|---|---|
| Center offset (% of image diagonal) | ≤ 4% | ≤ 10% | > 10% |
| Angle difference | ≤ 4° | ≤ 10° | > 10° |
| Size/extent difference (fov views) | ≤ 10% | ≤ 20% | > 20% |

- Handle angle wraparound (a lines-group at 178° ≈ −2°).
- Composite per-exam score; per-view feedback pairs the metric that failed with the slide's coverage sentence: *"Angle off by 14° — remember: 'align parallel with the longitudinal fissure.'"*
- Tolerances live in one config object — Wes will tune them after classroom trials.

### Phase 5 — Polish & deploy

- Simple flat exam list for the pilot (region grouping comes when more regions ship). No accounts, no stored student data.
- After scoring, show the reference overlay in green on top of the student's yellow placement in the same viewports — no separate results screen needed.
- `vite.config.ts` `base` set for project pages; GitHub Actions workflow deploys `dist/` to Pages on push.
- README with screenshots and a one-paragraph instructor guide.

## 7. Scope decisions (defaults — Wes can override at kickoff)

1. **Per-view grading (no 3D cross-view sync) for v1.** True console behavior — where moving the axial FOV live-updates the lines in sagittal/coronal — requires calibrating all three images into a shared 3D frame per exam. Not feasible across 100 slides. Per-view placement is still highly instructive. *Stretch goal:* hand-calibrate the shared frame for the plain Brain exams only as a flagship demo.
2. **Brain-family pilot — DECIDED.** v1 ships ONLY the Neuro exams (slides 2–15: Brain, Brain & IAC's, Brain & Pituitary, Brain & Orbits, Brain for Seizure, MRA Head, MRV Head). Build the pipeline so it works generically, but only run/QA the brain slides for launch. Adding regions later = run the pipeline on more slides + review the contact sheet. Guiding principle throughout: **lightweight and intuitive beats polished** — when a feature adds friction or build time without helping a student place slices better, cut it.
3. **Slice-line count is cosmetic.** Render a fixed 5-line group per prescription; grading uses center/angle/extent only. (Slice thickness/gap parameters are out of scope for v1 — good v2 candidates.)
4. **Repo private until the PHI sweep passes**, then Wes decides public vs private.

## 8. Working proof-of-concept (seed for `pipeline/03_clean.py`)

```python
import cv2, numpy as np

def yellow_mask(img):
    b, g, r = cv2.split(img.astype(np.int16))
    m = ((r - b > 8) & (g - b > 8)).astype(np.uint8) * 255
    return cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=1)

def extract_answer(mask, w, h):
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    big = max(cnts, key=cv2.contourArea)
    (cx, cy), (rw, rh), ang = cv2.minAreaRect(big)
    lines = cv2.HoughLinesP(mask, 1, np.pi/180, 60, minLineLength=int(0.15*h), maxLineGap=10)
    return {"cx": cx/w, "cy": cy/h, "w": rw/w, "h": rh/h, "angleDeg": ang,
            "nLines": 0 if lines is None else len(lines)}

def clean(img, mask):
    a = cv2.inpaint(img, mask, 3, cv2.INPAINT_NS)
    b = cv2.inpaint(img, mask, 3, cv2.INPAINT_TELEA)
    # keep whichever leaves less residual yellow
    res = lambda x: int(yellow_mask(x).sum())
    return a if res(a) <= res(b) else b
```

Verified on `ppt/media/image3.jpg` (Brain coronal localizer): 5,509 raw yellow pixels detected, 18 Hough segments found, inpainting ~95% clean with minor ghosting over tissue — tune per-image where the contact sheet flags it.

## 9. Definition of done (v1)

- [ ] All Brain-family images (slides 2–15) cleaned, QA'd, PHI-swept
- [ ] `exams.json` validated (every entry has 3 views, 3 answers, coverage text)
- [ ] Instructions panel readable while manipulating overlays, both modes, desktop and tablet
- [ ] Student can complete Learn and Practice modes for Brain–Axial on desktop and tablet
- [ ] Scoring feedback references coverage text correctly
- [ ] Deployed to GitHub Pages under `T2decay`
- [ ] Wes has tuned tolerance config with at least one student trial run
