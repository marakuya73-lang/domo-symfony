#!/usr/bin/env python3
"""Extract 24fps WebP frame sequences for the canvas scrub."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "public/media/experience"
OUT = MEDIA / "seq"
FPS = 24

CLIPS = {
    "hero": "01_hero.mp4",
    "road": "02a_hill.mp4",
    "walk": "v5/path-4498.mp4",
    "dome": "03a_orbit.mp4",
    "deck": "03b_view.mp4",
    "interior": "v7/stay-1.mp4",
    "stay2": "v7/stay-2.mp4",
    "retiro1": "v7/retiro-1.mp4",
    "retiro2": "v7/retiro-2.mp4",
    "retiro3": "v7/retiro-3.mp4",
    "stairs": "08a_stairs.mp4",
    "sign": "08b_sign.mp4",
    "gate": "08c_gate.mp4",
    "rajaaram": "08d_dome.mp4",
}


def width_of(src: Path) -> int:
    raw = subprocess.check_output(
        [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width", "-of", "csv=p=0", str(src),
        ],
        text=True,
    ).strip()
    return int(raw)


def extract(src: Path, dest: Path, width: int) -> int:
    dest.mkdir(parents=True, exist_ok=True)
    existing = list(dest.glob("*.webp"))
    if existing:
        return len(existing)
    pattern = str(dest / "%04d.webp")
    subprocess.run(
        [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(src),
            "-vf", f"fps={FPS},scale={width}:-2:flags=lanczos",
            "-c:v", "libwebp", "-quality", "60",
            pattern,
        ],
        check=True,
    )
    return len(list(dest.glob("*.webp")))


def main() -> None:
    manifest = {}
    for key, rel in CLIPS.items():
        src = MEDIA / rel
        native = width_of(src)
        mobile = extract(src, OUT / key / "m", min(720, native))
        if native >= 1200:
            desktop = extract(src, OUT / key / "d", 1280)
        else:
            desktop = mobile
        frames = mobile
        manifest[key] = {
            "frames": frames,
            "mobile": f"media/experience/seq/{key}/m",
            "desktop": f"media/experience/seq/{key}/d" if native >= 1200 else f"media/experience/seq/{key}/m",
            "fps": FPS,
        }
        print(key, frames, "desktop" if native >= 1200 else "mobile-only", flush=True)
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    first = OUT / "hero" / "m"
    payload = sum(p.stat().st_size for p in first.glob("*.webp"))
    print(f"hero mobile frames {manifest['hero']['frames']} bytes {payload}")


if __name__ == "__main__":
    main()
