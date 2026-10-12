import argparse
import json
from pathlib import Path

from PIL import Image


parser = argparse.ArgumentParser(description="Build responsive covers without replacing original photographs.")
parser.add_argument("--projects", type=Path, default=Path("content/projects.js"))
parser.add_argument("--output", type=Path, default=Path("images/projects"))
parser.add_argument("--report", type=Path, required=True)
args = parser.parse_args()
projects = json.loads(args.projects.read_text().split("=", 1)[1].rstrip(";\n "))
args.output.mkdir(parents=True, exist_ok=True)
report = {}
for project in projects:
    cover = project["cover"]
    source = Image.open(cover["src"]).convert("RGB")
    candidates = []
    for width in (480, 960, 1280):
        if width >= source.width:
            continue
        name = f"{project['id']}/thumbnail-{width}.webp"
        (args.output / project['id']).mkdir(parents=True, exist_ok=True)
        height = round(source.height * width / source.width)
        source.resize((width, height), Image.Resampling.LANCZOS).save(
            args.output / name, "WEBP", quality=86, method=6
        )
        candidates.append(f"{args.output.as_posix()}/{name} {width}w")
    candidates.append(f"{cover['src']} {source.width}w")
    report[project["id"]] = {
        "srcset": ", ".join(candidates),
        "sizes": "(max-width: 600px) calc(100vw - 20px), (max-width: 940px) and (max-aspect-ratio: 3/4) and (pointer: coarse) calc(100vw - 20px), 50vw",
    }
args.report.parent.mkdir(parents=True, exist_ok=True)
args.report.write_text(json.dumps(report, indent=2) + "\n")
