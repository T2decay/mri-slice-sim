#!/usr/bin/env python3
"""02_geometry.py — extract answer-key geometry from the yellow overlays.

For each image in out/manifest.json: build the yellow mask (R−B>8 & G−B>8),
find the bounding rectangle (minAreaRect on the gap-closed mask — this is the
FOV box on target-plane views and the extent box on cross-plane views), and
detect slice lines as Hough segments INTERIOR to that rectangle. Classify:
substantial interior parallel lines → "lines", otherwise "fov". Write
out/geometry.json with per-image confidence; low-confidence or
expectation-mismatched entries go on out/review_list.json.

Per-image overrides can be placed in overrides.json:
  { "ppt/media/imageN.jpg": { "thresh": 12 } }
"""
import json
import math
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).parent
RAW = ROOT / "pptx_raw"
OUT = ROOT / "out"

PLANES = ["sagittal", "coronal", "axial"]


def load_overrides():
    p = ROOT / "overrides.json"
    return json.loads(p.read_text()) if p.exists() else {}


def yellow_mask(img, thresh=8):
    b, g, r = cv2.split(img.astype(np.int16))
    return ((r - b > thresh) & (g - b > thresh)).astype(np.uint8) * 255


def white_mask(img, thresh=245):
    """For slides whose console overlays are white (e.g. slide 14)."""
    return (img.min(axis=2) >= thresh).astype(np.uint8) * 255


def build_mask(img, params):
    if params.get("mask") == "white":
        m = white_mask(img, params.get("thresh", 245))
    else:
        m = yellow_mask(img, params.get("thresh", 8))
    clip = params.get("clipBottom")  # drop sat-band crosshatch rows
    if clip:
        m[int(clip * m.shape[0]):, :] = 0
    left = params.get("clipLeft")    # drop the white "ACS" corner label
    if left:
        m[:, :int(left * m.shape[1])] = 0
    return m


def norm_angle(deg):
    """Fold to (-90, 90]."""
    return (deg + 90) % 180 - 90


def angle_families(segments, tol=6.0):
    """Group segments by angle (mod 180). Returns list of dicts."""
    fams = []
    for x1, y1, x2, y2 in segments:
        length = math.hypot(x2 - x1, y2 - y1)
        ang = math.degrees(math.atan2(y2 - y1, x2 - x1)) % 180.0
        placed = False
        for f in fams:
            d = abs((ang - f["angle"] + 90) % 180 - 90)
            if d <= tol:
                w = f["length"]
                # length-weighted running mean on the circle (mod 180)
                diff = (ang - f["angle"] + 90) % 180 - 90
                f["angle"] = (f["angle"] + diff * length / (w + length)) % 180
                f["length"] += length
                f["segments"].append((x1, y1, x2, y2, length))
                placed = True
                break
        if not placed:
            fams.append({"angle": ang, "length": length,
                         "segments": [(x1, y1, x2, y2, length)]})
    return sorted(fams, key=lambda f: -f["length"])


def analyze(img_path, expected_type, params):
    img = cv2.imread(str(img_path))
    h, w = img.shape[:2]

    # hand-measured answer for images automation can't read (see overrides.json)
    if "answer" in params:
        a = dict(params["answer"])
        typ = a.pop("type")
        return {"image": str(img_path.relative_to(RAW)), "width": w,
                "height": h, "type": typ, "autoType": "manual",
                "expectedType": expected_type, "confidence": 1.0,
                typ: a, "note": "manual geometry from overrides.json"}

    mask = build_mask(img, params)
    n_yellow = int(np.count_nonzero(mask))

    entry = {"image": str(img_path.relative_to(RAW)), "width": w, "height": h,
             "yellowPixels": n_yellow}
    if n_yellow < 200:
        entry.update({"type": None, "expectedType": expected_type,
                      "confidence": 0.0,
                      "note": "no yellow found (overlay may be white/absent) — manual handling"})
        return entry

    # bounding rect on the gap-closed mask (bridges dashed strokes)
    closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE,
                              np.ones((5, 5), np.uint8), iterations=2)
    cnts, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    big = max(cnts, key=cv2.contourArea)
    (rcx, rcy), (rw, rh), rang = cv2.minAreaRect(big)
    if rw < rh:
        rw, rh = rh, rw
        rang += 90.0
    rang = norm_angle(rang)
    rect_quality = min(1.0, cv2.contourArea(big) / (rw * rh + 1e-6))

    lines = cv2.HoughLinesP(mask, 1, np.pi / 180, 60,
                            minLineLength=int(0.15 * h), maxLineGap=10)
    segments = [] if lines is None else np.asarray(lines).reshape(-1, 4).tolist()
    fams = angle_families(segments)

    # rect corners, for projecting spans onto each family's perpendicular
    box = cv2.boxPoints(((rcx, rcy), (rw, rh), rang))

    # A "thin" mask (no bounding box at all) is a lone slice line — e.g. the
    # single dashed midline markers on the MRV sagittal-PC cross views.
    # aspect test is scale-proof: real boxes are ≲1.6:1, a lone line ≳9:1
    thin = rh < rw / 5

    # Classify by mask-pixel density profiles along the two rect axes.
    # Slice lines produce narrow interior peaks (|off| ≤ 0.6·half) on exactly
    # one axis; FOV boxes (even nested doubles) only peak near the border.
    ys, xs = np.nonzero(mask)
    pts = np.stack([xs - rcx, ys - rcy], axis=1).astype(np.float64)

    def hough_len_along(theta_deg):
        return sum(f["length"] for f in fams
                   if abs((f["angle"] - theta_deg + 90) % 180 - 90) <= 8)

    def axis_profile(theta_deg):
        rad = math.radians(theta_deg)
        perp = np.array([-math.sin(rad), math.cos(rad)])
        half = max(abs((c - (rcx, rcy)) @ perp) for c in box)
        offs = pts @ perp
        nbins = max(8, int(half))  # ≈2 px bins across the box
        hist, edges = np.histogram(offs, bins=nbins, range=(-half, half))
        thr = 0.25 * hist.max()
        binw = 2 * half / nbins
        maxw = max(6.0, 0.15 * half)  # reject wide blobs (uniform profiles)
        peaks, start = [], None
        for i, v in enumerate(list(hist) + [0]):
            if v >= thr and thr > 0:
                start = i if start is None else start
            elif start is not None:
                if (i - start) * binw <= maxw:
                    peaks.append((edges[start] + edges[i]) / 2)
                start = None
        interior = [p for p in peaks if abs(p) <= 0.6 * half]
        return {"theta": theta_deg, "half": half, "interior": interior,
                "strokeLen": hough_len_along(theta_deg)}

    ax_a, ax_b = axis_profile(rang), axis_profile(rang + 90)
    lines_axes = [a for a in (ax_a, ax_b) if a["interior"]]
    auto_type = "lines" if (lines_axes or thin) else "fov"

    # line direction: both axes vote — aligned Hough stroke length, tripled
    # when the axis also has interior peaks. Stroke dominance beats peaks
    # alone: aligned dash patterns can fake peaks on the wrong axis.
    if thin and not lines_axes:
        axis = ax_a  # long axis of the lone line
        extent_px = rh
    else:
        axis = max((ax_a, ax_b),
                   key=lambda a: a["strokeLen"] * (3 if a["interior"] else 1))
        extent_px = 2.0 * axis["half"]
    line_ang = axis["theta"]
    for f in fams:
        if abs((f["angle"] - line_ang + 90) % 180 - 90) <= 8:
            line_ang = f["angle"]
            break
    entry["lines"] = {"cx": round(rcx / w, 4), "cy": round(rcy / h, 4),
                      "angleDeg": round(norm_angle(line_ang), 2),
                      "extent": round(extent_px / h, 4)}

    if auto_type == "lines":
        if len(lines_axes) == 2:
            confidence = 0.55  # interior strokes on both axes — eyeball it
        elif thin and not lines_axes:
            confidence = 0.7
        elif not axis["interior"]:
            confidence = 0.75  # stroke dominance overrode a dash-artifact axis
        else:
            confidence = min(1.0, 0.75 + 0.05 * len(axis["interior"]))
    else:
        confidence = 0.5 + 0.5 * rect_quality
    if auto_type != expected_type:
        confidence *= 0.5

    entry.update({
        "type": expected_type,   # deck structure is uniform; auto is the check
        "autoType": auto_type,
        "expectedType": expected_type,
        "confidence": round(confidence, 3),
        "nHoughSegments": len(segments),
        "fov": {"cx": round(rcx / w, 4), "cy": round(rcy / h, 4),
                "w": round(rw / w, 4), "h": round(rh / h, 4),
                "angleDeg": round(rang, 2)},
    })
    return entry


def main():
    manifest = json.loads((OUT / "manifest.json").read_text())
    overrides = load_overrides()
    geometry, review = [], []

    for slide in manifest:
        target = (slide["subtitle"] or "").split()[0].lower()
        rec = {"slide": slide["slide"], "title": slide["title"],
               "targetPlane": target, "views": {}}
        for plane in PLANES:
            media = slide["images"][plane]
            expected = "fov" if plane == target else "lines"
            e = analyze(RAW / media, expected, overrides.get(media, {}))
            rec["views"][plane] = e
            if e["confidence"] < 0.6 or e.get("autoType") not in (expected, "manual"):
                review.append({"where": f"slide {slide['slide']} {plane}",
                               "image": e["image"],
                               "autoType": e.get("autoType"),
                               "expected": expected,
                               "confidence": e["confidence"],
                               "note": e.get("note", "")})
        geometry.append(rec)

    (OUT / "geometry.json").write_text(json.dumps(geometry, indent=2))
    (OUT / "review_list.json").write_text(json.dumps(review, indent=2))
    n = sum(len(r["views"]) for r in geometry)
    print(f"Wrote geometry for {n} images across {len(geometry)} slides")
    print(f"Manual-review list: {len(review)} entries → out/review_list.json")
    for r in review:
        print(f"  {r['where']:22s} auto={r['autoType']} expected={r['expected']} "
              f"conf={r['confidence']} {r['note']}")


if __name__ == "__main__":
    main()
