#!/usr/bin/env python3
"""FUNDAMENTAL FREQUENCIES OF LOVE — animatic music video renderer.
Sources: rendered hero frames + 12 storyboard panels from the production
package. 24 fps, 1920x1080 with baked 2.39:1 letterbox (active 1920x804).
Palette: sovereign black #0A0A0F, metallic purple #7B2CBF, aged gold #C9A227.
"""
import numpy as np, subprocess, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

BASE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.dirname(BASE)
FPS = 24
DUR = 192.0
NF = int(DUR * FPS)
W, H = 1920, 1080
AW, AH = 1920, 804
Y0 = (H - AH) // 2
GOLD = (201, 162, 39)
INK = (10, 10, 15)
GRAY = (168, 168, 178)

SERIF = "/usr/share/fonts/truetype/freefont/FreeSerif.ttf"
SERIF_B = "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf"
SERIF_I = "/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf"

rng = np.random.default_rng(2026)

def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)

# ---------------------------------------------------------------- sources
SRC = {
    'HERO_01': f'{PKG}/frames/HERO_01.png',
    'HERO_02': f'{PKG}/frames/HERO_02.png',
    'HERO_03': f'{PKG}/frames/HERO_03.png',
    'BROTHER': f'{PKG}/frames/BROTHER_006.png',
}
for i in range(1, 13):
    SRC[f'P{i:02d}'] = f'{PKG}/panels/P{i:02d}.png'

PLATE_CACHE = {}
ZMAX_PAD = 1.35  # plates rendered with headroom for max zoom

# ---------------------------------------------------------------- motion clips
# clip key -> directory of frames extracted at 24 fps (clip_<key>/f_%05d.jpg)
CLIP_DIR = os.path.join(BASE, 'clips')
CLIP_FRAMES = {}

def clip_frames(key):
    """sorted frame paths for an extracted clip; empty if absent"""
    if key in CLIP_FRAMES:
        return CLIP_FRAMES[key]
    d = os.path.join(CLIP_DIR, key)
    fs = sorted(os.path.join(d, f) for f in os.listdir(d)) if os.path.isdir(d) else []
    CLIP_FRAMES[key] = fs
    return fs

CLIP_IMG_CACHE = {}

def clip_image(path):
    """frame as float32 array cover-cropped to the active area (tiny LRU)"""
    arr = CLIP_IMG_CACHE.get(path)
    if arr is None:
        im = Image.open(path).convert('RGB')
        s = max(AW / im.width, AH / im.height)
        im = im.resize((int(im.width * s + 0.5), int(im.height * s + 0.5)), Image.BILINEAR)
        x = (im.width - AW) // 2
        y = (im.height - AH) // 2
        arr = np.asarray(im.crop((x, y, x + AW, y + AH)), dtype=np.float32)
        if len(CLIP_IMG_CACHE) > 6:
            CLIP_IMG_CACHE.pop(next(iter(CLIP_IMG_CACHE)))
        CLIP_IMG_CACHE[path] = arr
    return arr

def clip_frame_blended(key, u):
    """time-stretched clip frame at normalized position u with crossfade blend"""
    fs = clip_frames(key)
    if not fs:
        return None
    pos = np.clip(u, 0.0, 1.0) * (len(fs) - 1)
    i0 = int(pos)
    i1 = min(i0 + 1, len(fs) - 1)
    a = pos - i0
    f0 = clip_image(fs[i0])
    if i1 == i0 or a < 0.02:
        return f0.copy()
    return f0 * (1 - a) + clip_image(fs[i1]) * a

def plate(key):
    """cover-resized plate at ZMAX_PAD * active size"""
    if key in PLATE_CACHE:
        return PLATE_CACHE[key]
    im = Image.open(SRC[key]).convert('RGB')
    pw, ph = int(AW * ZMAX_PAD), int(AH * ZMAX_PAD)
    s = max(pw / im.width, ph / im.height)
    im = im.resize((int(im.width * s + 0.5), int(im.height * s + 0.5)), Image.LANCZOS)
    x = (im.width - pw) // 2
    y = (im.height - ph) // 2
    im = im.crop((x, y, x + pw, y + ph))
    PLATE_CACHE[key] = im
    return im

# ---------------------------------------------------------------- text cards
FONTS = {}
def font(path, size):
    k = (path, size)
    if k not in FONTS:
        FONTS[k] = ImageFont.truetype(path, size)
    return FONTS[k]

def draw_tracked(d, cx, cy, text, f, fill, tracking=0.0):
    """centered text with letter-spacing (Latin only)"""
    widths = [d.textlength(c, font=f) for c in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = cx - total / 2
    asc, desc = f.getmetrics()
    y = cy - (asc + desc) / 2
    for c, w in zip(text, widths):
        d.text((x, y), c, font=f, fill=fill)
        x += w + tracking

def hairline(d, cx, cy, half=110, color=GOLD):
    d.line([(cx - half, cy), (cx + half, cy)], fill=color, width=2)

def card_base():
    im = Image.new('RGB', (AW, AH), INK)
    return im, ImageDraw.Draw(im)

def make_cards():
    cards = {}
    # title
    im, d = card_base()
    draw_tracked(d, AW/2, AH/2 - 118, "LION ASS BITCH PRESENTS", font(SERIF, 30), GRAY, 14)
    draw_tracked(d, AW/2, AH/2 - 22, "FUNDAMENTAL", font(SERIF_B, 96), GOLD, 26)
    draw_tracked(d, AW/2, AH/2 + 78, "FREQUENCIES OF LOVE", font(SERIF_B, 96), GOLD, 26)
    hairline(d, AW/2, AH/2 + 170)
    draw_tracked(d, AW/2, AH/2 + 214, "A VISUAL LETTER", font(SERIF, 28), GRAY, 12)
    cards['title'] = im
    # amor
    im, d = card_base()
    draw_tracked(d, AW/2, AH/2 - 30, "AMOR", font(SERIF_B, 220), GOLD, 40)
    hairline(d, AW/2, AH/2 + 128)
    draw_tracked(d, AW/2, AH/2 + 176, "EVERY LANGUAGE  ·  ONE FREQUENCY", font(SERIF, 30), GRAY, 10)
    cards['amor'] = im
    # love, eddie (handwriting-adjacent italic)
    im, d = card_base()
    f = font(SERIF_I, 150)
    d.text((AW/2, AH/2 - 20), "Love, Eddie", font=f, fill=(232, 226, 210), anchor='mm')
    draw_tracked(d, AW/2, AH/2 + 130, "SEND IT WHILE THEY CAN STILL READ IT", font(SERIF, 26), GRAY, 10)
    cards['loveeddie'] = im
    # pride warning
    im, d = card_base()
    draw_tracked(d, AW/2, AH/2 - 66, "PRIDE BUILDS WALLS.", font(SERIF_B, 84), (226, 222, 210), 16)
    draw_tracked(d, AW/2, AH/2 + 44, "LOVE MOVES THEM.", font(SERIF_B, 84), GOLD, 16)
    draw_tracked(d, AW/2, AH/2 + 172, "DON'T LET PRIDE COST YOU YOUR PEOPLE", font(SERIF, 28), GRAY, 10)
    cards['pride'] = im
    # signature
    im, d = card_base()
    d.text((AW/2, AH/2 - 96), "Love, Eddie", font=font(SERIF_I, 128), fill=GOLD, anchor='mm')
    hairline(d, AW/2, AH/2 + 6)
    draw_tracked(d, AW/2, AH/2 + 62, "LION ASS BITCH", font(SERIF_B, 44), (226, 222, 210), 20)
    draw_tracked(d, AW/2, AH/2 + 128, "FUNDAMENTAL FREQUENCIES OF LOVE", font(SERIF, 26), GRAY, 12)
    cards['sig'] = im
    return {k: np.asarray(v, dtype=np.float32) for k, v in cards.items()}

CARDS = make_cards()

# invitation overlay (transparent-on-black additive)
def make_overlay(lines):
    """lines: list of (text, fontpath, size, fill, dy, tracking)"""
    im = Image.new('RGB', (AW, AH), (0, 0, 0))
    d = ImageDraw.Draw(im)
    for text, fp, size, fill, dy, tr in lines:
        if tr > 0:
            draw_tracked(d, AW/2, AH/2 + dy, text, font(fp, size), fill, tr)
        else:
            d.text((AW/2, AH/2 + dy), text, font=font(fp, size), fill=fill, anchor='mm')
    return np.asarray(im, dtype=np.float32)

INVITE = make_overlay([
    ("CLOSE YOUR EYES", SERIF, 34, (230, 226, 214), 240, 14),
    ("TWENTY-TWO SECONDS", SERIF_B, 46, GOLD, 296, 18),
])

# love-word caption overlays (native scripts, shaped by raqm)
WORDS = [
    ("amor", "español"), ("amour", "français"), ("iubire", "română"),
    ("Liebe", "Deutsch"), ("любовь", "русский"), ("प्रेम", "हिन्दी"),
    ("حب", "العربية"), ("אהבה", "עברית"), ("ভালোবাসা", "বাংলা"),
    ("aşk", "Türkçe"), ("upendo", "Kiswahili"), ("ìfẹ́", "Yorùbá"),
]
def has_glyphs(fp, text, size=64):
    """True if no character maps to .notdef in this font"""
    f = font(fp, size)
    def mask_bytes(s):
        m = f.getmask(s)
        return bytes(m), m.size
    notdef = mask_bytes('͸')  # unassigned codepoint -> .notdef
    for c in text:
        if c.isspace():
            continue
        if mask_bytes(c) == notdef:
            return False
    return True

WORD_OVERLAYS = []
for wtext, lab in WORDS:
    wf = SERIF_B if has_glyphs(SERIF_B, wtext) else (SERIF if has_glyphs(SERIF, wtext) else None)
    lf = SERIF if has_glyphs(SERIF, lab) else None
    if wf is None:
        continue  # drop words no installed font can draw
    im = Image.new('RGB', (AW, AH), (0, 0, 0))
    d = ImageDraw.Draw(im)
    # soft shadow then fill
    d.text((AW/2 + 3, AH - 190 + 3), wtext, font=font(wf, 110), fill=(20, 16, 4), anchor='mm')
    d.text((AW/2, AH - 190), wtext, font=font(wf, 110), fill=GOLD, anchor='mm')
    if lf:
        d.text((AW/2, AH - 104), lab, font=font(lf, 34), fill=(210, 206, 196), anchor='mm')
    WORD_OVERLAYS.append(np.asarray(im, dtype=np.float32))

# ---------------------------------------------------------------- grade layers
yy, xx = np.mgrid[0:AH, 0:AW].astype(np.float32)
cxn = (xx / AW - 0.5) * 2
cyn = (yy / AH - 0.5) * 2
r2 = cxn ** 2 + (cyn * 1.25) ** 2
VIGNETTE = (1.0 - 0.34 * np.clip(r2 - 0.18, 0, 1.4) ** 1.2)[..., None].astype(np.float32)
BLOOM_MASK = np.exp(-r2 * 1.4).astype(np.float32)[..., None]
WARM = np.array([1.035, 1.0, 0.945], dtype=np.float32)[None, None, :]

def grain(strength=2.6):
    g = rng.standard_normal((AH // 2, AW // 2, 1)).astype(np.float32) * strength
    return np.repeat(np.repeat(g, 2, axis=0), 2, axis=1)

# ---------------------------------------------------------------- timeline
# each: (t0, t1, src|card, dict opts)
#   z0,z1 zoom; px/py pan -1..1 (start->end); bright; fin/fout fade sec;
#   fx: 'pulse' | 'bloom' | 'shake'; warmboost
T = [
    (0.0,   6.0, 'card:title', dict(fin=1.6, fout=1.0)),
    (6.0,  16.0, 'HERO_03', dict(z0=1.05, z1=1.20, py0=-0.1, py1=0.15, bright=0.92, fin=1.4, fout=0.8)),
    (16.0, 24.0, 'P02',     dict(z0=1.26, z1=1.08, bright=0.95, fin=0.8, fout=0.6)),
    (24.0, 33.0, 'HERO_02', dict(z0=1.04, z1=1.22, px0=-0.15, px1=0.35, fin=0.6, fout=0.6, clip='wall_palm')),
    (33.0, 36.5, 'BROTHER', dict(z0=1.06, z1=1.16, bright=0.95, fin=0.5, fout=0.5)),
    (36.5, 40.0, 'P03',     dict(z0=1.20, z1=1.32, px0=0.25, px1=0.45, fin=0.5, fout=0.8)),
    (40.0, 47.0, 'P04',     dict(z0=1.06, z1=1.18, bright=1.06, warmboost=1.35, fin=0.8, fout=0.8)),
    (47.0, 55.0, 'P05',     dict(z0=1.16, z1=1.02, bright=1.03, fin=0.6, fout=0.5)),
    (55.0, 62.0, 'P09',     dict(z0=1.02, z1=1.16, bright=0.98, fin=0.5, fout=0.4)),
    (62.0, 70.0, 'P06',     dict(z0=1.05, z1=1.30, fx='shake', bright=0.96, fin=0.4, fout=0.05)),
    (70.0, 74.0, 'P07',     dict(z0=1.16, z1=1.20, bright=0.82, fin=0.7, fout=0.5)),
    # ---- meditation: 74.0 -> 96.0, exactly 22 s ----
    (74.0, 79.0, 'P07',     dict(z0=1.20, z1=1.24, bright=0.55, fin=0.5, fout=1.0)),
    (79.0, 90.0, 'P03',     dict(z0=1.28, z1=1.10, bright=0.45, fx='pulse', fin=1.2, fout=1.2)),
    (90.0, 94.0, 'P07',     dict(z0=1.24, z1=1.27, bright=0.5, fin=1.0, fout=1.4)),
    (94.0, 96.0, 'black',   dict()),
    # ---- beat drop ----
    (96.0, 100.0, 'P07',    dict(z0=1.32, z1=1.10, bright=1.06, fx='bloom', fin=0.0, fout=0.4, clip='eyes_open')),
    (100.0, 104.0, 'card:amor', dict(fin=0.35, fout=0.35)),
    (104.0, 111.0, 'P08',   dict(z0=1.05, z1=1.18, bright=1.05, warmboost=1.3, fin=0.35, fout=0.3)),
    (111.0, 117.0, 'P09',   dict(z0=1.16, z1=1.04, fin=0.3, fout=0.3)),
    (117.0, 124.0, 'P08',   dict(z0=1.30, z1=1.14, px0=0.35, px1=-0.3, bright=1.04, warmboost=1.3, fin=0.3, fout=0.5)),
    (124.0, 132.0, 'P02',   dict(z0=1.10, z1=1.22, bright=1.10, warmboost=1.5, fin=0.5, fout=0.4)),
    (132.0, 140.0, 'P10',   dict(z0=1.03, z1=1.18, bright=1.02, fin=0.4, fout=0.6, clip='wall_yields')),
    (140.0, 152.0, 'P11',   dict(z0=1.14, z1=1.02, bright=1.02, warmboost=1.25, fin=0.8, fout=1.2, clip='embrace')),
    (152.0, 158.0, 'HERO_03', dict(z0=1.20, z1=1.08, bright=1.0, fin=0.8, fout=0.6)),
    (158.0, 163.0, 'card:loveeddie', dict(fin=0.5, fout=0.8)),
    (163.0, 171.0, 'HERO_01', dict(z0=1.02, z1=1.16, bright=0.98, fin=0.8, fout=0.6)),
    (171.0, 177.0, 'P12',   dict(z0=1.08, z1=1.18, bright=1.02, warmboost=1.2, fin=0.6, fout=1.0)),
    (177.0, 183.0, 'card:pride', dict(fin=0.8, fout=0.8)),
    (183.0, 190.0, 'card:sig',   dict(fin=0.8, fout=1.6)),
    (190.0, 192.0, 'black', dict()),
]

# overlays: (t0, t1, array, gain, fin, fout)
OVERLAYS = [(70.8, 73.8, INVITE, 1.0, 0.6, 0.6)]
mt0, mt1 = 104.0, 124.0
step = (mt1 - mt0) / len(WORDS)
for i, ov in enumerate(WORD_OVERLAYS):
    OVERLAYS.append((mt0 + i * step, mt0 + (i + 1) * step, ov, 1.0, 0.25, 0.25))

# ---------------------------------------------------------------- render
def render_shot_frame(key, opts, u, tglob, tloc):
    if key == 'black':
        return np.zeros((AH, AW, 3), dtype=np.float32)
    if key.startswith('card:'):
        return CARDS[key[5:]].copy()
    clip_key = opts.get('clip')
    if clip_key:
        fr = clip_frame_blended(clip_key, u)
        if fr is not None:
            b = opts.get('bright', 1.0)
            fr *= b
            wb = opts.get('warmboost', 1.0)
            fr *= (1 + (WARM - 1) * wb)
            if opts.get('fx') == 'bloom' and tloc < 1.0:
                k = np.exp(-tloc / 0.35) * 210.0
                fr += BLOOM_MASK * np.array([k, k * 0.8, k * 0.25],
                                            dtype=np.float32)[None, None, :]
            return fr
        # clip missing on disk -> fall through to the still plate
    pl = plate(key)
    z0, z1 = opts.get('z0', 1.05), opts.get('z1', 1.15)
    z = z0 + (z1 - z0) * smoothstep(u)
    cw, ch = int(AW * ZMAX_PAD / z), int(AH * ZMAX_PAD / z)
    slack_x = (pl.width - cw) / 2
    slack_y = (pl.height - ch) / 2
    px = opts.get('px0', 0.0) + (opts.get('px1', 0.0) - opts.get('px0', 0.0)) * smoothstep(u)
    py = opts.get('py0', 0.0) + (opts.get('py1', 0.0) - opts.get('py0', 0.0)) * smoothstep(u)
    ox = slack_x * (1 + px)
    oy = slack_y * (1 + py)
    if opts.get('fx') == 'shake':
        amp = 1.0 + 10.0 * u * u
        ox += rng.normal(0, amp); oy += rng.normal(0, amp * 0.6)
    ox = float(np.clip(ox, 0, pl.width - cw))
    oy = float(np.clip(oy, 0, pl.height - ch))
    crop = pl.crop((int(ox), int(oy), int(ox) + cw, int(oy) + ch))
    fr = np.asarray(crop.resize((AW, AH), Image.BILINEAR), dtype=np.float32)
    b = opts.get('bright', 1.0)
    if opts.get('fx') == 'pulse':
        b *= 1.0 + 0.10 * np.sin(2 * np.pi * 1.0 * tglob) ** 21  # heartbeat glints
        fr[..., 0] *= 1.0 + 0.05 * np.sin(2 * np.pi * 1.0 * tglob) ** 21
    fr *= b
    wb = opts.get('warmboost', 1.0)
    fr *= (1 + (WARM - 1) * wb)
    if opts.get('fx') == 'bloom' and tloc < 1.0:
        k = np.exp(-tloc / 0.35) * 210.0
        fr += BLOOM_MASK * np.array([k, k * 0.8, k * 0.25], dtype=np.float32)[None, None, :]
    return fr

def main():
    out = os.path.join(BASE, 'LOVE_EDDIE_ANIMATIC.mp4')
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ff, '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
           '-r', str(FPS), '-i', '-', '-i', os.path.join(BASE, 'score.wav'),
           '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p',
           '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    stills = {int(s * FPS): s for s in
              [3, 10, 20, 28, 36, 44, 51, 58, 66, 72, 85, 97, 102, 107, 114, 121,
               128, 136, 146, 155, 160, 167, 174, 180, 186]}
    os.makedirs(os.path.join(BASE, 'stills'), exist_ok=True)
    frame_full = np.zeros((H, W, 3), dtype=np.uint8)
    si = 0
    for f in range(NF):
        tg = f / FPS
        while si < len(T) - 1 and tg >= T[si][1] - 1e-9:
            si += 1
        t0, t1, key, opts = T[si]
        u = (tg - t0) / max(t1 - t0, 1e-6)
        fr = render_shot_frame(key, opts, u, tg, tg - t0)
        # overlays
        for (o0, o1, arr, g, fi_, fo_) in OVERLAYS:
            if o0 <= tg < o1:
                a = 1.0
                if tg - o0 < fi_: a = (tg - o0) / fi_
                if o1 - tg < fo_: a = min(a, (o1 - tg) / fo_)
                fr = np.maximum(fr, arr * (g * a))
        # fades
        fade = 1.0
        fin, fout = opts.get('fin', 0.0), opts.get('fout', 0.0)
        if fin > 0 and tg - t0 < fin: fade *= smoothstep((tg - t0) / fin)
        if fout > 0 and t1 - tg < fout: fade *= smoothstep((t1 - tg) / fout)
        fr = fr * fade
        # grade
        if not key.startswith('card:') and key != 'black':
            fr *= VIGNETTE
            fr += grain(2.6)
            # sovereign-black floor
            fr = fr * (1 - 0.045) + np.array([10, 10, 15], dtype=np.float32)[None, None, :] * 0.045 * fade
        arr8 = np.clip(fr, 0, 255).astype(np.uint8)
        frame_full[:] = 0
        frame_full[Y0:Y0 + AH] = arr8
        proc.stdin.write(frame_full.tobytes())
        if f in stills:
            Image.fromarray(frame_full).save(os.path.join(BASE, 'stills', f't{stills[f]:03.0f}.png'))
        if f % 480 == 0:
            print(f'frame {f}/{NF} ({tg:.0f}s)', flush=True)
    proc.stdin.close()
    proc.wait()
    print('done ->', out, proc.returncode)

if __name__ == '__main__':
    main()
