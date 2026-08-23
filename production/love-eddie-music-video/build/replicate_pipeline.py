#!/usr/bin/env python3
"""FUNDAMENTAL FREQUENCIES OF LOVE — Replicate generation pipeline.

Generates the 104 storyboard frames (identity-locked to the canon sheets)
and image-to-video clips for key shots, per SHOT_LIST.csv and the
production bible.

Usage:
  export REPLICATE_API_TOKEN=r8_...
  python3 replicate_pipeline.py plan            # cost/scope preview, no spend
  python3 replicate_pipeline.py frames          # generate all 104 frames (resumable)
  python3 replicate_pipeline.py frames 1-12     # generate a shot range
  python3 replicate_pipeline.py videos          # animate the key shots (resumable)

Frames land in ../output/frames/FRAME_NNN.png, clips in ../output/clips/.
Every completed asset is skipped on re-run, so the pipeline is resumable.
"""
import base64
import csv
import json
import mimetypes
import os
import sys
import time
import urllib.request
import urllib.error

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
PKG = os.path.join(ROOT, 'package')
OUT_FRAMES = os.path.join(ROOT, 'output', 'frames')
OUT_CLIPS = os.path.join(ROOT, 'output', 'clips')
API = 'https://api.replicate.com/v1'

TOKEN = os.environ.get('REPLICATE_API_TOKEN', '')

# Models (validated at runtime; override via env if a model is retired)
IMAGE_MODEL = os.environ.get('LAB_IMAGE_MODEL', 'google/nano-banana')
VIDEO_MODEL = os.environ.get('LAB_VIDEO_MODEL', 'wan-video/wan-2.2-i2v-fast')
EST_PER_FRAME = 0.039
EST_PER_CLIP = 0.10

CANON_EDDIE = (
    "The lead is Edwin 'Eddie' Colon, matching the attached identity reference "
    "EXACTLY: Puerto Rican man, light-brown complexion, short bleached-blond "
    "tight curls over dark roots with faded sides, narrow brown eyes, precise "
    "mustache and short goatee, lean athletic build, chest eagle and cross "
    "tattoos, TRUST collarbone tattoo, Roman-numeral collarbone tattoo, "
    "dove and LOYALTY neck tattoo. Never substitute a generic model."
)
CANON_CREW = (
    "The mascots match the attached crew reference EXACTLY: Pryde, a muscular "
    "anthropomorphic lion with sandy thick mane in weathered dark tactical "
    "armor; Kickz, a gray anthropomorphic donkey with upright ears, white-gray "
    "muzzle, strapped tactical outfit; Anput, an athletic black anthropomorphic "
    "jackal woman with aged-gold Egyptian jewelry and armor. Maintain species, "
    "proportions, wardrobe, silhouettes."
)
CANON_BROTHER = (
    "Eddie's estranged brother matches the attached brother reference EXACTLY "
    "and stays visually consistent."
)
LOOK = (
    "Cinematic still from a music video shot on ARRI Alexa 65, anamorphic "
    "35-85mm, 2.39:1 composition inside a 16:9 frame, restrained handheld, "
    "tactile photographic skin, fur, concrete, rain and textiles. Palette: "
    "sovereign black #0A0A0F, metallic purple #7B2CBF, aged gold #C9A227. "
    "Photoreal. No cartoon look, no plastic skin, no game-like CGI, no "
    "readable pseudo-text, no extra limbs."
)

# Shots that get an image-to-video pass (key beats of the edit)
VIDEO_SHOTS = [1, 4, 5, 7, 13, 21, 23, 29, 32, 36, 38, 61, 73, 78, 80, 90, 92, 94, 97, 98]
VIDEO_MOTION = {
    1:  "slow push-in, phone screen glow flickers, Eddie breathes slowly",
    4:  "slow dolly forward toward the enormous wall, rain drifts",
    5:  "handheld hold, fingers press into wet concrete, rain streaks down",
    7:  "macro drift, hairline gold cracks slowly spread through concrete",
    13: "handheld warmth, both men laugh, shoulders shake naturally",
    21: "slow aerial rise over rooftop, city lights shimmer before sunrise",
    23: "orbital drift, restrained gold pulses travel across the dark Earth",
    29: "crowd surges past in motion blur while Eddie stands perfectly still",
    32: "meditation stillness, eyes close gently, micro movement only",
    36: "wall pulses softly in heartbeat rhythm, gold light breathes",
    38: "eyes snap open on the beat, gold reflection blooms in pupils",
    61: "warm kitchen bustle, family passes food, laughter, natural motion",
    73: "match-cut montage motion, hands hold and repair and feed",
    78: "thousands of golden cracks shine and slowly widen across the wall",
    80: "stones loosen and drift free one by one, no explosive violence",
    90: "both men step toward each other over fallen stones, sunrise flare",
    92: "held imperfect immediate embrace, hands grip jacket, breathing",
    94: "sunrise floods the reopened street, slow wide drift",
    97: "thumb presses send, screen light reflects, subtle push-in",
    98: "storefront reflection holds, mascots stand as quiet witnesses",
}


def api(path, method='GET', payload=None, headers=None, raw=False):
    url = path if path.startswith('http') else API + path
    data = None
    h = {'Authorization': f'Bearer {TOKEN}'}
    if payload is not None:
        data = json.dumps(payload).encode()
        h['Content-Type'] = 'application/json'
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                body = r.read()
                return body if raw else json.loads(body)
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors='replace')[:500]
            if e.code in (429, 500, 502, 503) and attempt < 4:
                time.sleep(2 ** (attempt + 1))
                continue
            raise RuntimeError(f'{method} {url} -> {e.code}: {body}') from e
        except urllib.error.URLError:
            if attempt < 4:
                time.sleep(2 ** (attempt + 1))
                continue
            raise


FILE_CACHE_PATH = os.path.join(BASE, '.replicate_files.json')


def upload_file(path):
    """Upload once via the Files API; cache serving URLs across runs."""
    cache = {}
    if os.path.exists(FILE_CACHE_PATH):
        cache = json.load(open(FILE_CACHE_PATH))
    key = os.path.abspath(path)
    if key in cache:
        return cache[key]
    boundary = '----labform' + str(int(time.time()))
    mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
    content = open(path, 'rb').read()
    body = (
        f'--{boundary}\r\nContent-Disposition: form-data; name="content"; '
        f'filename="{os.path.basename(path)}"\r\nContent-Type: {mime}\r\n\r\n'
    ).encode() + content + f'\r\n--{boundary}--\r\n'.encode()
    req = urllib.request.Request(
        API + '/files', data=body, method='POST',
        headers={'Authorization': f'Bearer {TOKEN}',
                 'Content-Type': f'multipart/form-data; boundary={boundary}'})
    with urllib.request.urlopen(req, timeout=300) as r:
        meta = json.loads(r.read())
    url = meta['urls']['get']
    cache[key] = url
    json.dump(cache, open(FILE_CACHE_PATH, 'w'), indent=1)
    return url


def load_shots():
    shots = []
    with open(os.path.join(PKG, 'instructions', 'SHOT_LIST.csv')) as fh:
        for row in csv.DictReader(fh):
            shots.append({
                'num': int(row['shot']),
                'file': row['target_filename'],
                'chars': row['characters'],
                'inst': row['frame_instruction'],
            })
    return shots


def build_prompt(shot, has_brother_ref):
    chars = shot['chars'].lower()
    parts = [LOOK, f"Shot: {shot['inst']}."]
    if 'eddie' in chars:
        parts.append(CANON_EDDIE)
    if any(m in chars for m in ('pryde', 'kickz', 'anput')):
        parts.append(CANON_CREW)
    if 'brother' in chars and has_brother_ref:
        parts.append(CANON_BROTHER)
    elif 'brother' in chars:
        parts.append(
            "Eddie's estranged brother: Puerto Rican man in his thirties, "
            "close-cropped dark hair, short beard, slightly heavier build than "
            "Eddie, gold chain, dark tee.")
    return ' '.join(parts)


def refs_for(shot, brother_ref_url):
    chars = shot['chars'].lower()
    refs = []
    if 'eddie' in chars:
        refs.append(upload_file(os.path.join(PKG, 'character_sheets', 'EDDIE_CANON.jpeg')))
    if any(m in chars for m in ('pryde', 'kickz', 'anput')):
        refs.append(upload_file(os.path.join(PKG, 'character_sheets', 'LAB_CREW_CANON.png')))
    if 'brother' in chars and brother_ref_url:
        refs.append(brother_ref_url)
    return refs


def create_prediction(model, inputs):
    """Run a model, blocking until done; returns list of output URLs."""
    pred = api(f'/models/{model}/predictions', 'POST',
               {'input': inputs}, headers={'Prefer': 'wait=60'})
    while pred['status'] in ('starting', 'processing'):
        time.sleep(4)
        pred = api(pred['urls']['get'])
    if pred['status'] != 'succeeded':
        raise RuntimeError(f"{model} failed: {pred.get('error')}")
    out = pred['output']
    return out if isinstance(out, list) else [out]


def download(url, dest):
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {TOKEN}'})
    with urllib.request.urlopen(req, timeout=600) as r, open(dest, 'wb') as fh:
        fh.write(r.read())


def cmd_plan():
    shots = load_shots()
    todo_f = [s for s in shots
              if not os.path.exists(os.path.join(OUT_FRAMES, s['file']))]
    todo_v = [n for n in VIDEO_SHOTS
              if not os.path.exists(os.path.join(OUT_CLIPS, f'CLIP_{n:03d}.mp4'))]
    print(f'image model : {IMAGE_MODEL}')
    print(f'video model : {VIDEO_MODEL}')
    print(f'frames to generate : {len(todo_f)} / {len(shots)}'
          f'  (~${len(todo_f) * EST_PER_FRAME:.2f})')
    print(f'clips  to generate : {len(todo_v)} / {len(VIDEO_SHOTS)}'
          f'  (~${len(todo_v) * EST_PER_CLIP:.2f})')
    acct = api('/account')
    print(f"account : {acct.get('username')} ({acct.get('type')})")


def cmd_frames(rng_arg=None):
    os.makedirs(OUT_FRAMES, exist_ok=True)
    shots = load_shots()
    lo, hi = 1, len(shots)
    if rng_arg:
        lo, hi = (int(x) for x in rng_arg.split('-')) if '-' in rng_arg \
            else (int(rng_arg), int(rng_arg))
    brother_ref = None
    brother_ref_path = os.path.join(OUT_FRAMES, 'FRAME_006.png')
    if os.path.exists(brother_ref_path):
        brother_ref = upload_file(brother_ref_path)
    for shot in shots:
        if not (lo <= shot['num'] <= hi):
            continue
        dest = os.path.join(OUT_FRAMES, shot['file'])
        if os.path.exists(dest):
            continue
        prompt = build_prompt(shot, brother_ref is not None)
        inputs = {'prompt': prompt, 'aspect_ratio': '16:9',
                  'output_format': 'png'}
        refs = refs_for(shot, brother_ref)
        if refs:
            inputs['image_input'] = refs
        t0 = time.time()
        urls = create_prediction(IMAGE_MODEL, inputs)
        download(urls[0], dest)
        print(f"{shot['file']}  ok  ({time.time() - t0:.0f}s)", flush=True)
        # the first brother frame becomes the canon brother reference
        if shot['num'] == 6 and brother_ref is None:
            brother_ref = upload_file(dest)


def cmd_videos():
    os.makedirs(OUT_CLIPS, exist_ok=True)
    for n in VIDEO_SHOTS:
        dest = os.path.join(OUT_CLIPS, f'CLIP_{n:03d}.mp4')
        if os.path.exists(dest):
            continue
        frame = os.path.join(OUT_FRAMES, f'FRAME_{n:03d}.png')
        if not os.path.exists(frame):
            print(f'skip clip {n}: frame missing', flush=True)
            continue
        motion = VIDEO_MOTION.get(n, 'subtle cinematic motion, hold composition')
        inputs = {'image': upload_file(frame),
                  'prompt': f'{motion}. Cinematic, photoreal, restrained '
                            f'handheld, no morphing, keep faces stable.'}
        t0 = time.time()
        urls = create_prediction(VIDEO_MODEL, inputs)
        download(urls[0], dest)
        print(f'CLIP_{n:03d}.mp4  ok  ({time.time() - t0:.0f}s)', flush=True)


if __name__ == '__main__':
    if not TOKEN:
        sys.exit('REPLICATE_API_TOKEN is not set')
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'plan'
    if cmd == 'plan':
        cmd_plan()
    elif cmd == 'frames':
        cmd_frames(sys.argv[2] if len(sys.argv) > 2 else None)
    elif cmd == 'videos':
        cmd_videos()
    else:
        sys.exit(f'unknown command {cmd}')
