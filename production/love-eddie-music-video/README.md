# FUNDAMENTAL FREQUENCIES OF LOVE — Music Video Production

Production of the "LOVE, EDDIE" music video from the creator-supplied storyboard
package (104-shot roadmap, Eddie canon identity sheet, LAB crew canon sheet,
production bible).

## What is produced here

`output/LOVE_EDDIE_ANIMATIC.mp4` — a complete 3:12 animatic cut of the full
video, built entirely from the rendered assets physically present in the
package (3 hero frames + the 12 storyboard panels sliced from the visual
development board), with:

- 2.39:1 letterboxed 1080p master, ARRI-style grade: vignette, warm gold bias,
  film grain, sovereign-black floor (`#0A0A0F` / `#7B2CBF` / `#C9A227` canon palette)
- Ken Burns camera moves per shot, subway shake, gold bloom on the beat drop
- The meditation passage at **exactly 22.0 seconds** (74.0s–96.0s), heartbeat
  and restrained breathing only, final two seconds complete black — per the
  production bible
- Love-words montage with native-script typography (Latin, Cyrillic,
  Devanagari, Arabic, Hebrew, Bengali — shaped via raqm)
- Title, AMOR, "Love, Eddie", pride-warning, and signature cards
- An original synthesized score (D minor, 88 BPM core; predawn piano → rain →
  build → subway surge → hard cut → 22s meditation → beat drop → embrace →
  Picardy resolve) — `build/music.py`

## Layout

- `package/` — the creator production package: instructions (bible, 104-shot
  CSV), character sheets, hero frames, plus `panels/` (the 12 board panels
  sliced from `VISUAL_DEVELOPMENT_BOARD.png`)
- `build/music.py` — score synthesizer (writes `score.wav`, 192.0s)
- `build/render.py` — animatic renderer (writes the MP4; needs `numpy`,
  `pillow`, `imageio-ffmpeg`, GNU FreeFont)
- `output/` — the finished animatic and reference stills

## Rebuild

```bash
pip install numpy pillow imageio-ffmpeg
cd build && python3 music.py && python3 render.py
```

## Status of the full 104-shot render

The 104-shot CSV is the authoritative roadmap for the final photoreal video.
Rendering the remaining shots (FRAME_001–FRAME_104) requires image/video
generation credits (Higgsfield balance was 0.06 credits at production time —
effectively empty). When credits are available, the shot list, identity
references, and this animatic (as the timing/edit blueprint) are everything
needed to generate the final frames and re-conform the cut.
