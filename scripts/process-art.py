#!/usr/bin/env python
"""Remove backgrounds, trim to content, and rename raw prop art to lesson ids.

Raw drops (any background) live in assets/props/_src/. Output is a transparent,
tightly-cropped PNG named <lesson-id>.png in assets/props/ — the path each lesson
module references. Re-runnable: it always reads from _src and overwrites the PNGs.
"""
import sys
from pathlib import Path

from PIL import Image
from rembg import remove, new_session

# raw filename (in _src/) -> output lesson-id stem
MAPPING = {
    "jars.jpeg": "jars",
    "penny.jpeg": "penny",
    "rocket.jpeg": "seeds",   # the rocket is lesson "seeds"
    "basket.jpeg": "needs",   # the basket is lesson "needs"
    "kite.jpeg": "goal",      # the kite is lesson "goal"
    "coin-stack.jpeg": "earn", # the coin stack is lesson "earn"
}

PAD = 24  # transparent padding (px) kept around the trimmed subject

props = Path(__file__).resolve().parent.parent / "assets" / "props"
src = props / "_src"
session = new_session("u2net")

for raw, stem in MAPPING.items():
    inp = src / raw
    if not inp.exists():
        print(f"skip {raw}: not found in _src/")
        continue
    img = Image.open(inp).convert("RGBA")
    cut = remove(img, session=session)            # -> RGBA with alpha
    bbox = cut.getbbox()                          # tight box of non-transparent pixels
    if bbox:
        l, t, r, b = bbox
        l, t = max(0, l - PAD), max(0, t - PAD)
        r, b = min(cut.width, r + PAD), min(cut.height, b + PAD)
        cut = cut.crop((l, t, r, b))
    out = props / f"{stem}.png"
    cut.save(out)
    print(f"{raw:14s} -> {out.name:10s} {cut.size[0]}x{cut.size[1]}")

print("done")
