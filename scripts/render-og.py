from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PRODUCT = ROOT / "public" / "products" / "hero-ancestors-crest-hoodie.png"
CUTOUT = ROOT / "public" / "products" / "hero-ancestors-crest-hoodie-cutout.png"
OUTPUT = ROOT / "public" / "og-dominion.png"

W, H = 1744, 910
INK = (6, 5, 8)
MAGENTA = (255, 0, 129)
GOLD = (255, 184, 28)
CYAN = (0, 196, 255)
PURPLE = (123, 44, 255)
CREAM = (247, 239, 219)


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


IMPACT = r"C:\Windows\Fonts\impact.ttf"
ARIAL_BOLD = r"C:\Windows\Fonts\arialbd.ttf"
ARIAL = r"C:\Windows\Fonts\arial.ttf"


def glow_line(base: Image.Image, points, color, width=4, blur=16):
    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    draw.line(points, fill=(*color, 210), width=width * 4, joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(glow)
    sharp = Image.new("RGBA", base.size, (0, 0, 0, 0))
    ImageDraw.Draw(sharp).line(points, fill=(*color, 245), width=width, joint="curve")
    base.alpha_composite(sharp)


def outlined_text(draw, xy, text, face, fill, stroke=3, stroke_fill=(0, 0, 0)):
    draw.text(xy, text, font=face, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill)


def fit_impact(text: str, max_width: int, start_size: int) -> ImageFont.FreeTypeFont:
    size = start_size
    while size > 24:
        face = font(IMPACT, size)
        if face.getbbox(text)[2] <= max_width:
            return face
        size -= 2
    return font(IMPACT, size)


def remove_white_background(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    px = rgb.load()
    alpha = Image.new("L", rgb.size, 0)
    apx = alpha.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = px[x, y]
            brightness = min(r, g, b)
            if brightness >= 250:
                a = 0
            elif brightness >= 225:
                a = int((250 - brightness) / 25 * 255)
            else:
                a = 255
            apx[x, y] = a
    rgba = rgb.convert("RGBA")
    rgba.putalpha(alpha.filter(ImageFilter.GaussianBlur(0.7)))
    bbox = rgba.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def build() -> None:
    random.seed(23)
    canvas = Image.new("RGBA", (W, H), (*INK, 255))
    pix = canvas.load()

    # Coarse asphalt-like texture with controlled brand-color flecks.
    for y in range(H):
        for x in range(W):
            vignette = math.dist((x, y), (W * 0.56, H * 0.48)) / 1150
            noise = random.randrange(0, 15)
            base = max(3, int(15 + noise - vignette * 12))
            pix[x, y] = (base, max(3, base - 3), base + 3, 255)

    texture = ImageDraw.Draw(canvas)
    for _ in range(1100):
        x = random.randrange(W)
        y = random.randrange(H)
        color = random.choice([MAGENTA, GOLD, CYAN, PURPLE])
        alpha = random.randrange(18, 58)
        radius = random.choice([1, 1, 1, 2])
        texture.ellipse((x, y, x + radius, y + radius), fill=(*color, alpha))

    # Fine cracks frame the composition without crossing the garment.
    cracks = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cracks)
    for start_x, start_y, color in [
        (0, 70, GOLD), (120, 0, MAGENTA), (0, 790, CYAN),
        (620, 0, CYAN), (W - 20, 100, GOLD), (W, 760, MAGENTA),
    ]:
        pts = [(start_x, start_y)]
        x, y = start_x, start_y
        for _ in range(8):
            x += random.randint(-80, 110)
            y += random.randint(-50, 75)
            pts.append((x, y))
        cd.line(pts, fill=(*color, 135), width=2)
    canvas.alpha_composite(cracks)

    # Neon orbital stage: no product card, just the real garment floating in space.
    rings = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for bbox, color, width in [
        ((820, 60, 1680, 230), MAGENTA, 5),
        ((845, 62, 1700, 235), GOLD, 3),
        ((800, 720, 1690, 895), CYAN, 5),
        ((805, 735, 1670, 900), MAGENTA, 4),
    ]:
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse(bbox, outline=(*color, 240), width=width * 4)
        rings.alpha_composite(glow.filter(ImageFilter.GaussianBlur(18)))
        ImageDraw.Draw(rings).ellipse(bbox, outline=(*color, 245), width=width)
    canvas.alpha_composite(rings)

    # Exact Shopify product image; only its white studio background is removed.
    product = remove_white_background(Image.open(PRODUCT))
    product.save(CUTOUT)
    scale = min(790 / product.height, 880 / product.width)
    product = product.resize((int(product.width * scale), int(product.height * scale)), Image.Resampling.LANCZOS)
    product = ImageEnhance.Contrast(product).enhance(1.05)
    px = 910 + (770 - product.width) // 2
    py = 72 + (770 - product.height) // 2

    product_alpha = product.getchannel("A")
    glow_mask = product_alpha.filter(ImageFilter.GaussianBlur(28))
    magenta_glow = Image.new("RGBA", product.size, (*MAGENTA, 0))
    magenta_glow.putalpha(glow_mask.point(lambda p: int(p * 0.38)))
    canvas.alpha_composite(magenta_glow, (px - 10, py))
    gold_glow = Image.new("RGBA", product.size, (*GOLD, 0))
    gold_glow.putalpha(glow_mask.point(lambda p: int(p * 0.28)))
    canvas.alpha_composite(gold_glow, (px + 14, py + 4))
    canvas.alpha_composite(product, (px, py))

    # Foreground ring makes the garment feel suspended, not boxed into a card.
    front_ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(front_ring)
    fd.arc((800, 720, 1690, 895), 0, 180, fill=(*GOLD, 245), width=5)
    fd.arc((800, 720, 1690, 895), 180, 360, fill=(*MAGENTA, 245), width=5)
    canvas.alpha_composite(front_ring.filter(ImageFilter.GaussianBlur(12)))
    canvas.alpha_composite(front_ring)

    draw = ImageDraw.Draw(canvas)
    text_x = 76
    max_text = 725
    y = 92
    lines = [
        ("TURNED", MAGENTA, 150),
        ("A DISS", MAGENTA, 150),
        ("INTO", GOLD, 145),
        ("DOMINION.", GOLD, 138),
    ]
    for label, color, size in lines:
        face = fit_impact(label, max_text, size)
        outlined_text(draw, (text_x, y), label, face, color, stroke=4, stroke_fill=(7, 5, 8))
        y += int(face.size * 0.88)

    draw.rounded_rectangle((77, 678, 716, 724), radius=4, fill=(8, 7, 10, 232), outline=(*MAGENTA, 225), width=2)
    draw.text((94, 686), "REAL PIECE. LIVE IN THE CATALOG.", font=font(ARIAL_BOLD, 22), fill=CREAM)

    draw.text((79, 754), "ANCESTORS CREST", font=font(ARIAL_BOLD, 31), fill=CREAM)
    draw.text((79, 791), "BOXY ZIP HOODIE — EDITION 03", font=font(ARIAL, 22), fill=(202, 194, 184))

    brand_box = (78, 842, 540, 888)
    draw.rectangle(brand_box, fill=(6, 5, 8, 238), outline=(*GOLD, 230), width=2)
    draw.text((93, 850), "LION ASS BITCH", font=font(ARIAL_BOLD, 24), fill=GOLD)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT, quality=96, subsampling=0)


if __name__ == "__main__":
    build()
