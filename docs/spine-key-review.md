# Spine vector key cleanup

Cervical cleanup was approved by Wes. The same visual-only method now covers the remaining 22 original-reference views: Thoracic 7, Lumbar 7, and Sacrum 8. All 30 original-reference views across the 12 Spine exercises now use SVG keys. Six borrowed localizers still have no transferred answer key.

Each target-plane reference is a crisp rectangle. Each cross-plane reference uses five evenly spaced illustrative lines traced within the original principal planning boundaries. Five lines are a display convention, not a prescribed slice count. Centers, angles, and coverage were manually traced from source slides 32–40 in square-padded coordinates. Console extensions, arrowheads, and duplicate strokes are omitted. Original PNG references are retained for comparison.

The cropped Thoracic sagittal source only shows part of its FOV. Its SVG is clipped to the source crop, with the right edge left out of view; the separate inferior guide is omitted. The Lumbar coronal exercise's axial source spans the entire crop, so its lines stop at the image boundary. These decisions are recorded alongside the geometry for instructor review.

Base MRI images and white saturation bands were not changed. Brain data, pipeline files, approved Cervical geometry, student interaction behavior, and scoring were preserved. No numerical answers were invented. Existing cleanup artifacts inside the MRI pixels remain outside this overlay-only change.

## Reproduce and review locally

From the repository root:

```sh
python3 scripts/spine_keys.py
python3 scripts/review-spine-keys.py
npm run dev -- --host 127.0.0.1 --port 5174
```

A dev server is already running at http://127.0.0.1:5174/ in this session. Choose Thoracic Spine, Lumbar Spine, or Sacrum; select Sag/Cor/Ax and enable Key. The review gallery is http://127.0.0.1:5174/review/spine-keys.html and provides original/before/proposed comparisons grouped by region. Gallery generation requires the original source files already in the ignored `review/expansion/spine` folder.

Geometry lives in `scripts/spine-key-geometry.json` and `scripts/cervical-key-geometry.json`. The shared SVG generator is used by standalone key generation and the Spine assembly script so future assembly preserves these references. The full asset assembly was not rerun.

Validation: content checks passed for 26 exercises / 78 localizers; all 47 tests passed; production build passed. Browser comparisons were inspected across all three regions. Data validation confirms only the intended 22 reference paths changed in this step, with borrowed views and all other exam fields unchanged. Existing tracked PNGs were compared against Git and are byte-identical.

Changes are local only. No GitHub push, remote change, deployment, or radbun.com update. Remaining region keys await Wes's visual review.
