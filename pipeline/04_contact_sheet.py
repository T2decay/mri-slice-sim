#!/usr/bin/env python3
"""04_contact_sheet.py — before/after QA sheets, 12 image-pairs per sheet.

Each tile: BEFORE (original, extracted answer-key geometry drawn in green)
next to AFTER (inpainted PNG). Labels carry slide/plane/type/confidence and
the chosen inpaint method. Review-list entries get a red label.

Sheets → out/sheets/sheet-N.png. Wes reviews every sheet (including all four
corners of every image for burned-in PHI) before anything ships.
"""
import json
import math
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).parent
RAW = ROOT / "pptx_raw"
OUT = ROOT / "out"
SHEETS = OUT / "sheets"

PLANES = ["sagittal", "coronal", "axial"]
TILE_H = 300          # image height inside a tile
LABEL_H = 26
PAIRS_PER_SHEET = 12
COLS = 3

GREEN = (80, 220, 80)
RED = (60, 60, 230)
WHITE = (235, 235, 235)


def draw_geometry(img, view):
    """Draw the extracted answer (green) over the original image."""
    h, w = img.shape[:2]
    typ = view.get("type")
    if typ == "fov" and "fov" in view:
        f = view["fov"]
        box = cv2.boxPoints(((f["cx"] * w, f["cy"] * h),
                             (f["w"] * w, f["h"] * h), f["angleDeg"]))
        cv2.polylines(img, [box.astype(np.int32)], True, GREEN, 2)
    elif typ == "lines" and "lines" in view:
        ln = view["lines"]
        cx, cy = ln["cx"] * w, ln["cy"] * h
        ext = ln["extent"] * h
        rad = math.radians(ln["angleDeg"])
        d = np.array([math.cos(rad), math.sin(rad)])       # along the lines
        p = np.array([-math.sin(rad), math.cos(rad)])      # across the group
        half_len = 0.45 * max(w, h)
        for k in np.linspace(-0.5, 0.5, 5):                # 5 cosmetic lines
            c = np.array([cx, cy]) + p * (k * ext)
            a, b = c - d * half_len, c + d * half_len
            cv2.line(img, tuple(a.astype(int)), tuple(b.astype(int)),
                     GREEN, 2 if k == 0 else 1)
    return img


def tile(before, after, label, flagged):
    """Compose one before/after pair with a label bar."""
    def fit(im):
        s = TILE_H / im.shape[0]
        return cv2.resize(im, (round(im.shape[1] * s), TILE_H),
                          interpolation=cv2.INTER_AREA)
    b, a = fit(before), fit(after)
    gap = np.full((TILE_H, 6, 3), 40, np.uint8)
    row = np.hstack([b, gap, a])
    bar = np.full((LABEL_H, row.shape[1], 3), 25, np.uint8)
    cv2.putText(bar, label, (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5,
                RED if flagged else WHITE, 1, cv2.LINE_AA)
    return np.vstack([bar, row])


def main():
    SHEETS.mkdir(parents=True, exist_ok=True)
    geometry = json.loads((OUT / "geometry.json").read_text())
    report = {(r["slide"], r["plane"]): r
              for r in json.loads((OUT / "clean_report.json").read_text())}
    review = {r["where"]
              for r in json.loads((OUT / "review_list.json").read_text())}

    tiles = []
    for rec in geometry:
        for plane in PLANES:
            view = rec["views"][plane]
            info = report[(rec["slide"], plane)]
            before = cv2.imread(str(RAW / view["image"]))
            before = draw_geometry(before, view)
            after = cv2.imread(str(OUT / "clean" / info["out"]))

            flagged = f"slide {rec['slide']} {plane}" in review
            label = (f"s{rec['slide']:02d} {plane}  {view.get('type') or 'N/A'}"
                     f" conf={view['confidence']:.2f}  {info['method']}")
            if info["method"] == "none":
                label += "  WHITE OVERLAY - NOT CLEANED"
            tiles.append(tile(before, after, label, flagged))

    # pad tiles to uniform width, lay out 12 per sheet
    wmax = max(t.shape[1] for t in tiles)
    tiles = [np.pad(t, ((0, 0), (0, wmax - t.shape[1]), (0, 0)),
                    constant_values=15) for t in tiles]
    for s in range(0, len(tiles), PAIRS_PER_SHEET):
        chunk = tiles[s:s + PAIRS_PER_SHEET]
        rows = []
        for i in range(0, len(chunk), COLS):
            row = chunk[i:i + COLS]
            row += [np.full_like(row[0], 15)] * (COLS - len(row))
            rows.append(np.hstack(row))
        sheet = np.vstack(rows)
        name = SHEETS / f"sheet-{s // PAIRS_PER_SHEET + 1}.png"
        cv2.imwrite(str(name), sheet)
        print(f"{name}  ({len(chunk)} pairs)")


if __name__ == "__main__":
    main()
