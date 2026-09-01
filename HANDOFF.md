# Overnight Handoff — Phases 3, 4, and local Phase 5

Everything below was built, type-checked (`npm run build` passes clean), and
verified end-to-end in headless Chrome (mouse *and* touch emulation): picker →
walkthrough → Add Slice Group → drag/rotate/resize → keyboard nudge → Scan →
Practice mode → score panel → reference reveal. Nothing was pushed, no remote
exists, `pipeline/`, `public/images/`, and `src/data/exams.json` are untouched.

## 1. What was built

| Component | What it does |
|---|---|
| `src/App.tsx` | Picker ↔ console routing; `key={exam.id}` resets all state per exam |
| `components/ExamPicker.tsx` | Flat 14-exam list (name, sequence, landmark, target-plane chip) |
| `components/ConsoleShell.tsx` | Header (exam + landmark, Learn/Practice toggle, `?`), Add Slice Group / Scan / Reset flow, hint bubble, all state |
| `components/Viewport.tsx` | One localizer `<img>` + SVG overlay layer; keyboard nudging; live delta readout (Learn) |
| `components/FovBox.tsx` | Yellow FOV rect: drag body to move, corner handles resize (symmetric about center), stem handle above rotates. Every handle has an invisible ~3× touch target |
| `components/SliceLines.tsx` | Fixed cosmetic 5-line group: drag to move, top handle rotates, end handles stretch extent; lines clipped to the image like a real console |
| `components/InstructionsPanel.tsx` | Collapsible, open by default, present in BOTH modes; coverage text (target row highlighted), three mini reference thumbnails with green answers, FOV/localizer glossary |
| `components/ScorePanel.tsx` | Composite %, per-view metric chips (green/amber/red), feedback quoting the slide's coverage sentence |
| `components/Walkthrough.tsx` | 4-step skippable first-run overlay; localStorage-gated; reopens via `?` |
| `lib/scoring.ts` | Phase 4 in full: `TOLERANCES` config object, angle wraparound (178° ≈ −2°), center/angle/size grading, composite, feedback strings. Unit-sanity-tested (wraparound, all three grade bands, lines extent) |
| `lib/svg.ts` | Pointer→SVG coordinate mapping, clamping, local-frame rotation |
| README, deploy workflow | Instructor paragraph in README; `.github/workflows/deploy.yml` written but **inert** — nothing deployed |

Git history: 4 local commits (pipeline/content, app+scoring, verification fixes,
docs). `git log --oneline` shows the checkpoints.

## 2. Judgment calls (plan didn't specify — chose simpler/beginner-friendly)

1. **Default placement sizes**: fov 60% × 60%, lines extent 50% — centered,
   unrotated per the plan; big enough to grab on touch, clearly not the answer.
2. **Corner resize is symmetric about the center** (dragging a corner moves the
   opposite corner too). Simpler mental model, and it matches how the size
   metric is scored. Real consoles anchor the opposite corner — revisit if
   students find it odd.
3. **Keyboard nudge unit**: "1px" = 1/256 of the image (localizers are mostly
   256px). Shift+←/→ *and* Shift+↑/↓ both rotate (±1°) so it works one-handed.
4. **Adjusting after a Scan clears the score** and (in Practice) re-hides the
   green reference — keeps "scored state" unambiguous and stops students from
   tracing the ghost in Practice. Re-scan any time.
5. **Learn mode also has the Scan button** — same panel, so the flow students
   rehearse in Learn is identical to Practice.
6. **Reference thumbnails** in the Instructions panel are the clean images with
   the green answer overlay rendered live (mini viewports) rather than shipped
   thumbnail files — zero extra assets, always in sync with the answer key.
7. **Walkthrough/hint "seen" flags live in localStorage** (two booleans). I
   read the no-student-data fence as no *performance/identity* data; these
   store nothing about the student. Delete the two keys to demo the first-run
   experience again (DevTools → Application → Local Storage).
8. **Size metric uses the worse of width/height error** on FOV views (strict
   dimension governs) — simplest defensible rule; tune in `TOLERANCES` review.
9. **On narrow screens the Instructions panel sits above the viewports** (plan
   says stacked viewports; it didn't place the panel). It's collapsible there
   to reclaim space.
10. **Vite `base`** is `/mri-slice-sim/` for production builds only, so dev
    stays at `http://localhost:5173/` and Pages will work under
    `t2decay.github.io/mri-slice-sim/` when you eventually push.

## 3. Skipped / blocked

- **README screenshots** — headless-Chrome screenshots exist in the scratchpad
  from verification, but I didn't want to invent a `docs/` convention for repo
  images without you; two minutes tomorrow: pick 1–2, commit, reference in README.
- **Nothing else.** No blockers; all planned Phase 3/4 features and the local
  Phase 5 items are in.

## 4. Run it

```bash
cd ~/Projects/mri-slice-sim
npm run dev
```

Open **http://localhost:5173/** — the dev server should already be running
from tonight (if the page doesn't load, run the command above).

## 5. Test-first checklist for tomorrow

1. **iPad/tablet**: drag, rotate, and resize all three overlay types by touch —
   are the invisible enlarged touch targets big enough on real glass?
2. **Instructions while dragging**: desktop — can you read the coverage text
   mid-drag? Tablet — collapse/expand the panel; is the collapsed state obvious?
3. **Walkthrough**: loads once on first exam open, Skip works, `?` reopens it,
   it does NOT reappear on the second exam.
4. **Handle hint bubble**: appears after first Add Slice Group, disappears the
   moment you touch anything, never comes back (localStorage).
5. **Scoring tolerances**: place a "pretty good" prescription on Brain — Axial
   and see if 4%/4°/10% full-credit bands feel right for teaching; tune
   `TOLERANCES` in `src/lib/scoring.ts`.
6. **Feedback language**: miss the angle on Brain — Coronal deliberately — does
   the quoted coverage sentence read correctly next to the metric?
7. **MRV Head — Coronal 2D TOF** (slide 14): the images here are the
   substituted slide-15 localizers with the white-overlay answer key — check
   the green reference placements look anatomically right to you.
8. **MRV Head — Sagittal PC cross views**: answer extents are tiny (single
   midline slice) — is matching them reasonable or should those two views get
   a looser size tolerance?
9. **Learn readout**: numbers go green/amber/red at sensible thresholds while
   you drag toward/away from the ghost.
10. **Keyboard**: click a viewport (yellow focus ring), arrows nudge, Shift+
    arrows rotate; check it doesn't scroll the page.

## Notes

- Scoring "1px" nudges and the 5-line cosmetic group are cosmetic/UX choices —
  grading only uses center/angle/extent per the plan.
- The deploy workflow is committed but does nothing until you create the
  GitHub repo, push, and enable Pages → GitHub Actions. Repo should stay
  private until you re-verify the PHI position (your call per plan §7.4).
