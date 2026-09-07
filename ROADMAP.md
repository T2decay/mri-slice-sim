# Project roadmap

Updated September 7, 2026. This is the remaining-work index; the original
project plan records the initial design, and HANDOFF.md records subsequent
implementation and asset decisions.

## Current baseline

- 14 Brain-family exam variants, three localizers per exam.
- Family dropdown, plane selection, shared FOV/slice parameters, independent
  per-view position and angle, Key, Scan feedback, and walkthrough.
- Feedback without grades is intentional. Do not restore the original
  Learn/Practice split or percentage scores just to match the older plan.
- Physical dimensions use a nominal scale, not calibrated patient geometry.

## 1. Organize and verify the current simulator

- [x] Add a read-only content validation command.
- [x] Add regression coverage for prescription coupling, rectangle angle
  equivalence and family defaults (22 automated checks). Scan feedback clearing
  and keyboard interaction also checked in the local browser.
- [ ] Verify desktop and tablet flows; improve focus and touch targets where
  needed, while keeping instructions available during manipulation.
- [ ] Add README screenshots of the current console and parameters.
- [ ] Have Wes trial the physical scale and feedback thresholds with students.

## 2. Expand content in reviewed region batches

Wes selected both: organize first, then expand. Candidate processing happens
in isolated review output; approved assets stay unchanged until image review.

1. Inventory the remaining slides read-only. Record region, family, sequence,
   available localizers, missing views, and source-text irregularities.
2. Prepare an isolated staging workflow for one region at a time; never write
   unreviewed output into the approved Brain assets or live exam data.
3. Extract source coverage verbatim and candidate geometry with confidence
   and provenance. Missing views need an explicit content decision.
4. Present before/after contact sheets and reference overlays for Wes's
   review, including an inspection for identifying annotations.
5. Assemble only approved content, then validate and test it locally.
6. Add region navigation when multiple regions are actually available.

## 3. Release gate

- Human image review and student/tablet trial remain human checks.
- Publishing requires a separate go-ahead; local work does not authorize a
  push or deploy. The existing workflow deploys on pushes to main.
- No accounts, analytics, or stored student results.

## Asset preservation

Do not rerun `pipeline/05_assemble.py` against the current output: it would
overwrite six approved Brain scout replacements. HANDOFF.md section 0 lists
the exact source/destination copies. Keep `pipeline/`, `public/images/`, and
`src/data/exams.json` unchanged until the asset scope is explicitly reopened.

## Local verification

Run `npm run check:content` and `npm run build` before reviewing changes.
Content validation checks structure and file presence, not image quality,
clinical correctness, or PHI clearance.

## September 7 checkpoint

- Local UI improvements and 22 regression checks pass; approved Brain assets
  and exam data are unchanged.
- Full source inventory: 88 remaining slides and 257 pictures. See
  [expansion inventory](docs/EXPANSION_INVENTORY.md).
- First Body batch: 39 slides / 117 candidate localizers / 10 contact sheets.
  One Body slide (24) is held for a crop/transform issue.
- Spine, MSK, and Vascular originals are inventoried for subsequent batches;
  their cleaning and geometry are not yet prepared.
- The next gate is Wes's review of Body candidates. Flagged geometry is
  provisional, including visibly incorrect line directions in some views;
  confidence alone does not establish correctness. No candidates enter the
  simulator until reviewed and corrected.
