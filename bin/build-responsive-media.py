#!/usr/bin/env python3
"""Build AVIF, WebP and JPEG variants plus a tiny LQIP for experience images."""

from __future__ import annotations

import base64
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "public/media/experience"
OUT = MEDIA / "r"
MANIFEST = MEDIA / "responsive-manifest.json"
WIDTHS = (480, 828, 1280, 1920)
CATALOG = ROOT / "src/Experience/ExperienceCatalog.php"


def referenced() -> list[str]:
    text = CATALOG.read_text()
    found = re.findall(r"""['"]([^'"]+\.(?:jpg|jpeg|png))['"]""", text)
    unique = []
    for item in found:
        if item not in unique:
            unique.append(item)
    return unique


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, capture_output=True)


def probe(src: Path) -> tuple[int, int]:
    raw = subprocess.check_output(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=p=0",
            str(src),
        ],
        text=True,
    ).strip()
    width, height = raw.split(",")
    return int(width), int(height)


def color_of(src: Path) -> str:
    raw = subprocess.check_output(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(src),
            "-vf",
            "scale=1:1",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "-",
        ]
    )
    red, green, blue = raw[:3]
    # A near-black average would flash as an empty frame. Warm it just enough to read as a tone.
    if 0.2126 * red + 0.7152 * green + 0.0722 * blue < 42:
        red = min(255, red + 48)
        green = min(255, green + 36)
        blue = min(255, blue + 24)
    return f"#{red:02x}{green:02x}{blue:02x}"


def lqip(src: Path) -> str:
    blob = subprocess.check_output(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(src),
            "-vf",
            "scale=20:-2,gblur=sigma=1.2",
            "-q:v",
            "12",
            "-f",
            "image2",
            "-vcodec",
            "mjpeg",
            "-",
        ]
    )
    return "data:image/jpeg;base64," + base64.b64encode(blob).decode()


def encode(src: Path, dest: Path, width: int, kind: str) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    scale = f"scale={width}:-2:flags=lanczos"
    if kind == "avif":
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(src), "-vf", scale,
            "-c:v", "libaom-av1", "-still-picture", "1", "-cpu-used", "8", "-crf", "36",
            str(dest),
        ]
    elif kind == "webp":
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(src), "-vf", scale,
            "-c:v", "libwebp", "-quality", "65",
            str(dest),
        ]
    else:
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(src), "-vf", scale,
            "-q:v", "7",
            str(dest),
        ]
    run(cmd)


def main() -> None:
    manifest: dict[str, dict] = {}
    for rel in referenced():
        src = MEDIA / rel
        if not src.exists():
            raise SystemExit(f"missing {src}")
        width, height = probe(src)
        digest = hashlib.sha1(src.read_bytes()).hexdigest()[:10]
        folder = Path("r") / digest
        use = [size for size in WIDTHS if size <= width + 16]
        if not use or use[-1] < width:
            use.append(width if width % 2 == 0 else width - 1)
        files: dict[str, dict[str, str]] = {"avif": {}, "webp": {}, "jpg": {}}
        for size in use:
            for kind, ext in (("avif", "avif"), ("webp", "webp"), ("jpg", "jpg")):
                name = f"{size}.{ext}"
                target = OUT / digest / name
                if not target.exists() or target.stat().st_size == 0:
                    encode(src, target, size, kind)
                files[kind][str(size)] = f"media/experience/{folder.as_posix()}/{name}"
        manifest[rel] = {
            "width": width,
            "height": height,
            "color": color_of(src),
            "lqip": lqip(src),
            "widths": use,
            **files,
        }
        print(rel, width, manifest[rel]["color"], flush=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2))
    print(f"wrote {MANIFEST} ({len(manifest)} images)")


if __name__ == "__main__":
    main()
