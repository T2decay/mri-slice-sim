#!/usr/bin/env python3
"""03_clean.py — inpaint the yellow overlays out of every localizer image.

Mask (R−B>8 & G−B>8), dilate 3×3 ×1, then inpaint with both INPAINT_NS r=3
and INPAINT_TELEA r=3; keep whichever leaves less residual yellow plus less
high-frequency disturbance in the inpainted region. Output max 800 px PNGs
(no metadata) to out/clean/slideNN_plane.png.

Images with no detectable yellow (slide 14's white overlays) are passed
through untouched and flagged in out/clean_report.json.

Per-image overrides in overrides.json:
  { "ppt/media/imageN.jpg": { "thresh": 12, "dilate": 2, "radius": 5 } }
"""
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).parent
RAW = ROOT / "pptx_raw"
OUT = ROOT / "out"
CLEAN = OUT / "clean"

PLANES = ["sagittal", "coronal", "axial"]


def yellow_mask(img, thresh=8):
    b, g, r = cv2.split(img.astype(np.int16))
    return ((r - b > thresh) & (g - b > thresh)).astype(np.uint8) * 255


def disturbance(img, region):
    """High-frequency energy in the inpainted region (ghosting proxy)."""
    if not region.any():
        return 0.0
    lap = cv2.Laplacian(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), cv2.CV_64F)
    return float(np.abs(lap)[region > 0].mean())


def clean_image(img, params):
    thresh = params.get("thresh", 8)
    dil = params.get("dilate", 1)
    radius = params.get("radius", 3)

    mask = yellow_mask(img, thresh)
    n_yellow = int(np.count_nonzero(mask))
    if n_yellow < 200:
        return img, {"method": "none", "yellowPixels": n_yellow,
                     "note": "no yellow detected — passed through"}

    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=dil)
    cands = {"ns": cv2.inpaint(img, mask, radius, cv2.INPAINT_NS),
             "telea": cv2.inpaint(img, mask, radius, cv2.INPAINT_TELEA)}

    def score(res):
        residual = int(np.count_nonzero(yellow_mask(res, thresh)))
        return residual * 10 + disturbance(res, mask)

    scores = {k: score(v) for k, v in cands.items()}
    method = min(scores, key=scores.get)
    result = cands[method]
    return result, {"method": method, "yellowPixels": n_yellow,
                    "residualYellow": int(np.count_nonzero(yellow_mask(result, thresh))),
                    "scores": {k: round(v, 1) for k, v in scores.items()}}


def main():
    CLEAN.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((OUT / "manifest.json").read_text())
    overrides = json.loads((ROOT / "overrides.json").read_text()) \
        if (ROOT / "overrides.json").exists() else {}

    report = []
    substitutions = []  # (report index, source clean name) — resolved after loop
    for slide in manifest:
        for plane in PLANES:
            media = slide["images"][plane]
            img = cv2.imread(str(RAW / media))
            result, info = clean_image(img, overrides.get(media, {}))

            h, w = result.shape[:2]
            if max(h, w) > 800:
                s = 800 / max(h, w)
                result = cv2.resize(result, (round(w * s), round(h * s)),
                                    interpolation=cv2.INTER_AREA)

            # localizers are grayscale; dropping chroma erases the colored
            # smears inpainting leaves where lines crossed bright tissue
            result = cv2.cvtColor(result, cv2.COLOR_BGR2GRAY)
            name = f"slide{slide['slide']:02d}_{plane}.png"
            cv2.imwrite(str(CLEAN / name), result)  # PNG carries no EXIF
            info.update({"slide": slide["slide"], "plane": plane,
                         "source": media, "out": name})
            sub = overrides.get(media, {}).get("substitute")
            if sub:
                substitutions.append((len(report), sub))
            report.append(info)
            flag = " ⚠ passed through" if info["method"] == "none" else ""
            print(f"{name}: {info['method']}"
                  f" residual={info.get('residualYellow', '-')}{flag}")

    # substitutions after the loop, so a later slide's clean can stand in
    # for an uncleanable earlier one (slide 14's white overlays ← slide 15)
    for idx, sub in substitutions:
        info = report[idx]
        src = CLEAN / sub
        img = cv2.imread(str(src), cv2.IMREAD_GRAYSCALE)
        cv2.imwrite(str(CLEAN / info["out"]), img)
        info.update({"method": "substitute", "substituteOf": sub})
        info.pop("note", None)
        print(f"{info['out']}: substituted with {sub}")

    (OUT / "clean_report.json").write_text(json.dumps(report, indent=2))
    print(f"\n{len(report)} images → {CLEAN}")


if __name__ == "__main__":
    main()
