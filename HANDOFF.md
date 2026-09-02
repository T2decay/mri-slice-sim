# Handoff — v1 revisions (branch `v1-revisions`)

All eight revision items are implemented, type-checked (`npm run build`
passes clean), and verified in the in-app Chrome pane. Nothing was pushed, no
remote exists, and `pipeline/`, `public/images/`, and `src/data/exams.json`
are untouched (`git diff main --stat` confirms). The dev server is still
running at **http://localhost:5173/**.

## 1. What changed

| Area | Change |
|---|---|
| `src/lib/prescription.ts` (new) | The shared prescription model: `{ fovReadout_mm, fovPhase_mm, nSlices, thickness_mm, gap_mm }`, `coverageMm()`, `slicesForCoverage()`, clamps/limits, the default prescription, and the two derivations every view draws from: `studentRender()` and `ghostRender()` |
| `src/data/scale.ts` (new) | `IMAGE_WIDTH_MM = 250` — the single nominal scale, plus an (empty) per-family override map. This is the "easy to tune later" knob |
| `src/lib/exams.ts` (new) | Groups `exams.json` into families, picks the default plane (sagittal, else first listed) |
| `src/lib/scoring.ts` | Grading removed. Keeps `TOLERANCES` (color bands only), `band()`, `deltas()`, and `feedbackForView()` |
| `src/App.tsx` | Now the exam *session*: family, plane, shared prescription, Key toggle, S/C/A hotkeys. Prescription survives plane switches within a family and re-initializes when the family changes |
| `components/ConsoleShell.tsx` | Header = brand · exam dropdown · Sag/Cor/Ax · sequence + landmark · Key · ?. Holds per-view poses (position/angle only). Folds any drag-handle size change back into the shared prescription |
| `components/ParametersPanel.tsx` (new) | Numeric fields + − / + steppers for the five prescription values and a read-only Coverage. Two-way bound |
| `components/SliceLines.tsx` | Draws one line per real slice (`offsets` + `lineLen` come from the prescription). Thin 0.45-unit strokes; verified readable at 35 slices |
| `components/Viewport.tsx` | Readout always rendered (placeholders before Add Slice Group); pointer-down/focus reports the active plane; takes `RenderView` objects instead of raw placements |
| `components/InstructionsPanel.tsx` | Coverage rows highlight the active plane (click-to-highlight); Parameters block sits under Coverage; reference thumbnails now use `ghostRender` |
| `components/FeedbackPanel.tsx` | Renamed from ScorePanel; only the "Green shows the reference placement" lead and per-view feedback sentences remain |
| `components/Walkthrough.tsx` | Text rewritten for dropdown → plane buttons → Add Slice Group → adjust → Scan; mentions the Key button by its constant |
| `src/lib/labels.ts` (new) | `KEY_LABEL = 'Key'` — the provisional toggle name, one string |
| Removed | `ExamPicker.tsx`, Learn/Practice mode, composite/percent/pass bands |
| README | Instructor paragraph rewritten for the new flow; layout section mentions `scale.ts` |

Commits on the branch: one for the build (`8bac4f8`), one for docs.

## 2. How the shared model works (for reviewing the two things you care about)

- Only **position and angle** are stored per view. Every size on screen is
  computed at render time from the prescription and the scale:
  `w = fovReadout / 250`, `h = fovPhase / 250`, `extent = coverage / 250`.
- **Line length** on a cross-plane = the FOV dimension along the anatomical
  axis that view shares with the target plane (sagittal↔axial share A-P,
  coronal↔axial share L-R, sagittal↔coronal share S-I). Readout is the FOV
  box's horizontal side, phase its vertical side.
- A corner drag on the FOV writes `fovReadout/fovPhase` (rounded to 1 mm).
  A line-end drag writes `nSlices = round((coverage + gap) / (thickness + gap))`
  — so the handle **snaps in slice-sized steps**, holding thickness and gap.
  Nothing else is written by the graphics, which is why the numbers and the
  drawing cannot disagree: the drawing is a pure function of the numbers.
- Verified in-browser: FOV 250×225 → box 100×90 units, cross-line lengths
  90 and 100; dragging the corner to 165×164 changed both cross views' line
  lengths; dragging a coronal line-end to 34 slices redrew 34 lines on both
  cross views spanning `(203 − 5)/250` of the image; typing 200 in FOV
  readout resized the box and the axial lines; the stepper bumped slices to
  35 everywhere.

## 3. Judgment calls

1. **Nominal scale 250 mm** for every family. The answer keys were never
   calibrated, so with one scale the Brain reference FOV comes out 250×225 mm
   (plausible) but a few reference stacks look long or short in mm. Tune
   `FAMILY_IMAGE_WIDTH_MM` in `src/data/scale.ts` if a family's numbers look
   wrong to you.
2. **Defaults**: 24 slices × 5 mm + 1 mm gap = 143 mm coverage. FOV is
   initialized from the target plane's answer-key box rounded to 5 mm, so the
   size readout on the target view starts near green — that was the ask.
3. **Line-end drag is quantized** to whole slices (see §2). It feels slightly
   "notchy" on purpose; if you'd rather it feel continuous, the alternative is
   to let the drag change thickness instead of slice count.
4. **Ghost (reference) line sets** draw the answer key's exact extent, with
   as many lines as the student's current thickness/gap would fit in it — so
   the ghost stack looks like the same protocol, and the size readout reaches
   0% exactly when the student's coverage equals the reference extent.
5. **FOV boxes are compared modulo 90°.** Six answer keys were captured with
   the box rotated −90° (the pptx shape's rotation). A rectangle turned 90°
   with its sides swapped is the same rectangle, so the readout now shows
   angle Δ 0° for an unrotated student box on those exams (previously 90°).
6. **Switching planes remounts the console**: placements need a fresh
   Add Slice Group, the walkthrough/hint flags don't re-fire, the Key toggle
   and prescription persist. **Reset** clears placements but keeps the
   prescription (it's session-level state, like on a console); flip that in
   `ConsoleShell.reset` if you'd rather Reset restore the defaults.
7. **Active coverage row** starts on the target plane, then follows clicks
   (and keyboard focus) on the viewports; the active viewport also gets a
   thin yellow border so the link is visible.
8. **Any adjustment after Scan** — drag, arrow nudge, or a Parameters edit —
   clears the feedback and hides the reference unless Key is on.
9. **Hotkeys are ignored while typing** in the Parameters fields or the
   dropdown, so "5" in a field never switches planes (there is no digit
   hotkey, but S/C/A could otherwise fire from a text field).
10. **The picker page is gone** entirely: the app opens on Brain — Sagittal.
    The "nothing you do here is stored" line moved to the glossary under the
    Instructions panel; a small brand label sits at the left of the header.
11. Parameters fields commit **live** while typing whenever the text is a
    valid in-range number, and snap back to the model on blur — so a
    half-typed "2" (below the 20 mm minimum) never reaches the graphics.

## 4. No student data — confirmed

`grep -rn "localStorage\|sessionStorage\|indexedDB\|document.cookie" src`
finds only the two first-run flags in `ConsoleShell.tsx`
(`mri-sim-walkthrough-seen`, `mri-sim-handle-hint-seen`). No results,
placements, or parameters are written anywhere; a reload starts clean.

## 5. Skipped

- **README screenshots** — still not added (same reason as before: didn't
  want to invent a `docs/` image convention without you).
- **Real-glass touch test** — handles and hit targets are unchanged from the
  version you approved; the new stepper buttons are 32 px squares.
- Nothing else. All eight items are in.

## 6. Test checklist

**(a) Resizing in one view changes the other two**

1. Brain → Sag → Add Slice Group. Drag a *corner* of the sagittal FOV
   inward. Watch: the coronal lines get shorter (they follow FOV phase — the
   vertical side) and the axial lines get shorter (they follow FOV readout —
   the horizontal side). Drag only horizontally: only the axial lines change.
2. Drag the *bottom end handle* of the coronal stack. Watch: the axial stack
   grows/shrinks identically; Slices and Coverage in Parameters step along.
3. Press **A** (axial target). Add Slice Group. Now the FOV box is on the
   axial view; corner-drag it and watch sagittal (phase, vertical) and
   coronal (readout, horizontal) line lengths change.
4. Is the readout/phase naming right for you? Readout = box horizontal side
   is a convention; if your deck teaches phase-horizontal for some planes,
   it's a one-line swap in `studentRender`.

**(b) Parameters and graphics never disagree**

5. Type **200** in FOV readout, press Tab: box narrows immediately. Type
   **2** (invalid, < 20): nothing moves; Tab: field snaps back to 200.
6. Use − / + on Slices: line count changes on both cross views each click;
   Coverage = slices × thickness + (slices − 1) × gap.
7. Change Thickness or Gap: line spacing changes, Coverage updates, slice
   count stays.
8. Drag a line end, then read Slices/Coverage; drag a FOV corner, then read
   FOV readout/phase. They should match the visible geometry (250 mm = the
   full image width).

**Everything else**

9. Dropdown: each family loads its Sagittal variant, or its first plane when
   there is no sagittal (Brain & IAC's → Axial; MRA Head → Axial only, one
   button). S / C / A only act on planes that exist.
10. Plane switch keeps the numbers in Parameters and clears placements.
11. Click each viewport: its coverage row (and the viewport border) lights
    up; the others don't.
12. Readouts are visible under every viewport before Add Slice Group
    ("offset —"), while adjusting (colored), and after Scan.
13. Scan: green reference appears on all three views, feedback quotes the
    coverage sentence, no numbers or percentages anywhere except the readouts.
14. Key: toggles the green reference on/off any time; Scan still shows it
    while Key is off; adjusting after Scan hides it again unless Key is on.
15. Brain & Orbits → Ax → Add Slice Group: angle Δ reads 0° (not 90°) for
    the unrotated box — that's judgment call 5.
16. Walkthrough: reads correctly for the new flow; `?` reopens it.
17. 35+ slices: lines still readable on the coronal/axial images (they're
    thinner than the FOV box stroke).
18. Tablet: stepper buttons and the dropdown are easy to hit.

## 7. Run it

```bash
cd ~/Projects/mri-slice-sim
npm run dev
```

Open **http://localhost:5173/** (the server should already be running).
