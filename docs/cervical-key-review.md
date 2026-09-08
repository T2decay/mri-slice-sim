# Cervical reference cleanup — awaiting instructor review

Eight reference overlays for slides 29–31 use clean SVG geometry locally. Three target-plane FOV rectangles and five cross-plane stacks replace the pixel recoloring. Each stack contains five evenly spaced illustrative lines, not a prescribed slice count. Principal boundaries were manually traced from the original images; console extensions, arrowheads, duplicate strokes, and speckles were omitted.

Base MRI PNGs, white saturation bands, original reference PNGs, Brain assets, and other Spine families are unchanged. The borrowed axial view in the sagittal exercise still has no reference key. Answers remain null and numerical scoring stays disabled. Instructor review should confirm the chosen boundaries, coverage, and angulation before this approach is extended or published.

Geometry: `scripts/cervical-key-geometry.json`. Regenerate only these references and their data paths with:

```sh
python3 scripts/cervical_keys.py
```

The Spine assembly script applies the same geometry after its normal assembly so it will not silently restore the noisy keys. The full assembly was not rerun during this cleanup.

Local review gallery (ignored review files, available in this checkout):
http://127.0.0.1:5174/review/cervical-keys.html

Simulator: http://127.0.0.1:5174/ — choose Cervical Spine, then Sag/Cor/Ax, and enable Key. Use the gallery to compare original, previous green overlay, and proposed key.

Validation: all 47 Vitest tests passed; content validation passed for 26 exercises and 78 localizers; production build passed. Browser inspection confirmed clean SVG rendering in the gallery and simulator reference examples. No GitHub push, deployment, or RadBun change was made. Stop here for Wes's visual review.
