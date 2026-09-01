#!/usr/bin/env python3
"""05_assemble.py — Phase 2 content assembly.

Merge out/manifest.json + out/geometry.json into src/data/exams.json and copy
the cleaned PNGs to public/images/{examId}/{plane}.png.

Exam IDs, display names, and landmarks come from an explicit per-slide table:
display names fix source-deck typos (SIEZURE → Seizure), coverage text stays
verbatim. All geometry is normalized 0–1 (already, from 02_geometry.py).
"""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
OUT = ROOT / "out"
REPO = ROOT.parent
DATA = REPO / "src" / "data"
IMAGES = REPO / "public" / "images"

PLANES = ["sagittal", "coronal", "axial"]

# slide → id, display exam name, centering landmark (None if not on the slide)
SLIDES = {
    2:  ("brain-sagittal",        "Brain",             "Center to glabella"),
    3:  ("brain-axial",           "Brain",             "Center to glabella"),
    4:  ("brain-coronal",         "Brain",             "Center to glabella"),
    5:  ("brain-iacs-axial",      "Brain & IAC's",     None),
    6:  ("brain-iacs-coronal",    "Brain & IAC's",     None),
    7:  ("brain-pituitary-sagittal", "Brain & Pituitary", None),
    8:  ("brain-pituitary-coronal",  "Brain & Pituitary", None),
    9:  ("brain-orbits-coronal",  "Brain & Orbits",    None),
    10: ("brain-orbits-axial",    "Brain & Orbits",    None),
    11: ("brain-seizure-coronal", "Brain for Seizure", None),  # deck: SIEZURE
    12: ("mra-head-axial-3dtof",  "MRA Head",          "Center at glabella"),
    13: ("mrv-head-axial-2dtof",  "MRV Head",          None),
    14: ("mrv-head-coronal-2dtof", "MRV Head",         None),
    15: ("mrv-head-sagittal-pc",  "MRV Head",          None),
}


def answer_of(view):
    typ = view["type"]
    g = view[typ]
    if typ == "fov":
        return {"type": "fov", "cx": g["cx"], "cy": g["cy"],
                "w": g["w"], "h": g["h"], "angleDeg": g["angleDeg"]}
    return {"type": "lines", "cx": g["cx"], "cy": g["cy"],
            "angleDeg": g["angleDeg"], "extent": g["extent"]}


def main():
    manifest = {s["slide"]: s for s in json.loads((OUT / "manifest.json").read_text())}
    geometry = {s["slide"]: s for s in json.loads((OUT / "geometry.json").read_text())}

    exams = []
    for slide, (exam_id, exam_name, landmark) in SLIDES.items():
        man, geo = manifest[slide], geometry[slide]
        target = geo["targetPlane"]

        views = {}
        for plane in PLANES:
            src = OUT / "clean" / f"slide{slide:02d}_{plane}.png"
            dst = IMAGES / exam_id / f"{plane}.png"
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dst)
            views[plane] = {"image": f"images/{exam_id}/{plane}.png",
                            "answer": answer_of(geo["views"][plane])}

        exams.append({
            "id": exam_id,
            "exam": exam_name,
            "region": "Neuro",
            "landmark": landmark,
            "targetPlane": target,
            "sequenceNote": man["subtitle"],
            "coverage": man["coverage"],       # verbatim from the deck
            "views": views,
        })

    # ---- validation (definition-of-done: 3 views, 3 answers, coverage) ----
    problems = []
    ids = set()
    for e in exams:
        if e["id"] in ids:
            problems.append(f"{e['id']}: duplicate id")
        ids.add(e["id"])
        for plane in PLANES:
            if plane not in e["views"]:
                problems.append(f"{e['id']}: missing view {plane}")
                continue
            v = e["views"][plane]
            a = v["answer"]
            expected = "fov" if plane == e["targetPlane"] else "lines"
            if a["type"] != expected:
                problems.append(f"{e['id']}/{plane}: answer type {a['type']}, expected {expected}")
            keys = {"fov": ["cx", "cy", "w", "h", "angleDeg"],
                    "lines": ["cx", "cy", "angleDeg", "extent"]}[a["type"]]
            for k in keys:
                if not isinstance(a.get(k), (int, float)):
                    problems.append(f"{e['id']}/{plane}: answer missing {k}")
            if not (REPO / "public" / v["image"]).exists():
                problems.append(f"{e['id']}/{plane}: image file missing")
            if not e["coverage"].get(plane, "").strip():
                problems.append(f"{e['id']}: missing coverage text for {plane}")

    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "exams.json").write_text(json.dumps(exams, indent=2) + "\n")

    print(f"Wrote {DATA / 'exams.json'} ({len(exams)} exams)")
    n_img = sum(1 for _ in IMAGES.rglob("*.png"))
    print(f"Copied images → {IMAGES} ({n_img} PNGs)")
    if problems:
        print(f"\nVALIDATION FAILED ({len(problems)}):")
        for p in problems:
            print(" ", p)
        raise SystemExit(1)
    print("Validation passed: every exam has 3 views, 3 typed answers, "
          "3 coverage rows, and image files on disk.")


if __name__ == "__main__":
    main()
