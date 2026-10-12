import argparse
from pathlib import Path

from PIL import Image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path("icons"))
    parser.add_argument("--font", type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    source = Image.open(args.source).convert("RGBA")
    if source.width != source.height:
        raise ValueError("The supplied disc must be square")
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    source.save(args.output / "favicon.ico", sizes=sizes)
    for size in [16, 32, 192, 512]:
        icon = source.resize((size, size), Image.Resampling.LANCZOS)
        icon.save(args.output / f"favicon-{size}.png", optimize=True)
    paper = (245, 244, 241, 255)
    apple = Image.new("RGBA", (180, 180), paper)
    apple.alpha_composite(source.resize((180, 180), Image.Resampling.LANCZOS))
    apple.convert("RGB").save(args.output / "apple-touch-icon.png", optimize=True)
    maskable = Image.new("RGBA", (512, 512), paper)
    maskable.alpha_composite(source.resize((384, 384), Image.Resampling.LANCZOS), (64, 64))
    maskable.convert("RGB").save(args.output / "favicon-maskable-512.png", optimize=True)
    if args.font:
        from fontTools.ttLib import TTFont

        font = TTFont(args.font)
        font.flavor = "woff2"
        font.save(args.font.with_suffix(".woff2"))
    print("Created ICO, PNG, Apple touch and maskable icons from the supplied artwork")


if __name__ == "__main__":
    main()
