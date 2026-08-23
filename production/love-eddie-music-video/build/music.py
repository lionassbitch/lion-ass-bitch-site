#!/usr/bin/env python3
"""FUNDAMENTAL FREQUENCIES OF LOVE — original score, synthesized.
Timed to the animatic timeline (192.0 s). 88 BPM core. D minor.
Sections: predawn piano -> wall/rain -> memory -> build -> subway surge ->
hard cut -> invitation -> 22 s meditation (heartbeat + breath) -> beat drop ->
love-languages groove -> wall yields -> embrace -> send -> witness -> cards.
"""
import numpy as np, wave

SR = 44100
DUR = 192.0
N = int(SR * DUR)
t_all = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(88)

def sec(a, b):
    return slice(int(a * SR), int(b * SR))

def env_ar(n, a, r, hold=0.0):
    """attack/hold/release envelope, times in seconds"""
    e = np.ones(n)
    na, nh, nr = int(a*SR), int(hold*SR), int(r*SR)
    na = min(na, n); e[:na] = np.linspace(0, 1, na) if na else 1
    if nr > 0 and na + nh < n:
        nr = min(nr, n - na - nh)
        e[n-nr:] = np.linspace(1, 0, nr)
    return e

NOTE = {}
names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
for octv in range(0, 8):
    for i, nm in enumerate(names):
        NOTE[f'{nm}{octv}'] = 440.0 * 2 ** ((octv*12 + i - 57) / 12)

def piano(freq, dur, vel=1.0):
    """decaying additive 'felt piano' note"""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    out = np.zeros(n)
    for h, amp, dec in [(1,1.0,1.2),(2,0.42,0.8),(3,0.22,0.55),(4,0.09,0.4),(5,0.05,0.3)]:
        detune = 1 + rng.normal(0, 0.0004)
        out += amp * np.sin(2*np.pi*freq*h*detune*tt) * np.exp(-tt/(dec))
    # soft hammer transient
    out += 0.15 * rng.standard_normal(n) * np.exp(-tt/0.012)
    a = int(0.004*SR)
    out[:a] *= np.linspace(0,1,a)
    return vel * out * 0.28

def pad(freqs, dur, vel=1.0, attack=1.5, release=2.0, shimmer=0.0):
    n = int(dur * SR); tt = np.arange(n)/SR
    out = np.zeros(n)
    for f in freqs:
        for det in (-0.15, 0.0, 0.12):
            fr = f * 2 ** (det/1200*8)
            vib = 1 + 0.0015*np.sin(2*np.pi*0.13*tt + rng.uniform(0,6.28))
            out += np.sin(2*np.pi*fr*vib*tt + rng.uniform(0,6.28))
            if shimmer:
                out += shimmer*np.sin(2*np.pi*fr*2*vib*tt + rng.uniform(0,6.28))
    out /= (len(freqs)*3)
    return vel * out * env_ar(n, attack, release)

def kick(dur=0.35, vel=1.0):
    n = int(dur*SR); tt = np.arange(n)/SR
    f = 95*np.exp(-tt/0.035) + 42
    ph = 2*np.pi*np.cumsum(f)/SR
    out = np.sin(ph)*np.exp(-tt/0.16)
    out += 0.4*rng.standard_normal(n)*np.exp(-tt/0.008)
    return vel*out*0.9

def clap(vel=1.0):
    n = int(0.30*SR); tt = np.arange(n)/SR
    noise = rng.standard_normal(n)
    # bandpass-ish via diff smoothing
    noise = np.convolve(noise, np.ones(8)/8, 'same') - np.convolve(noise, np.ones(64)/64, 'same')
    e = np.exp(-tt/0.055) * (1 + 0.5*np.sin(2*np.pi*90*tt)*np.exp(-tt/0.01))
    return vel*noise*e*0.7

def hat(vel=1.0, dur=0.05):
    n = int(dur*SR); tt = np.arange(n)/SR
    noise = rng.standard_normal(n)
    noise = noise - np.convolve(noise, np.ones(6)/6, 'same')
    return vel*noise*np.exp(-tt/(dur*0.35))*0.32

def sub(freq, dur, vel=1.0):
    n = int(dur*SR); tt = np.arange(n)/SR
    out = np.sin(2*np.pi*freq*tt) + 0.25*np.sin(2*np.pi*freq*2*tt)
    return vel*out*env_ar(n, 0.01, 0.08)*0.5

def lowpass_noise(n, cutoff_smooth=180):
    x = rng.standard_normal(n)
    k = np.ones(cutoff_smooth)/cutoff_smooth
    return np.convolve(x, k, 'same')

def add(sig, start, sl=None, gain=1.0, pan=0.0):
    """mix mono sig at time start (s); pan -1..1"""
    i0 = int(start*SR)
    n = min(len(sig), N - i0)
    if n <= 0: return
    gl = gain * (1 - max(pan, 0) * 0.7)
    gr = gain * (1 + min(pan, 0) * 0.7)
    L[i0:i0+n] += sig[:n] * gl
    R[i0:i0+n] += sig[:n] * gr

# ---------------- harmonic plan ----------------
Dm  = ['D2','D3','F3','A3']
Bb  = ['A#1','A#2','D3','F3']
Fch = ['F2','F3','A3','C4']
Cch = ['C2','C3','E3','G3']
Gm  = ['G2','G3','A#3','D4']
Dmaj= ['D2','D3','F#3','A3','D4']

def chord_freqs(ch): return [NOTE[x] for x in ch]

# ---------------- 0-6 cold open ----------------
add(pad(chord_freqs(Dm), 7, vel=0.25, attack=3.5, release=2.5), 0.0)
add(piano(NOTE['D4'], 4, 0.5), 1.2, pan=-0.2)
add(piano(NOTE['A4'], 4, 0.4), 3.4, pan=0.2)

# ---------------- 6-40 predawn / wall / rain ----------------
prog = [Dm, Bb, Fch, Cch]
tt0 = 6.0
i = 0
while tt0 < 38.0:
    ch = prog[i % 4]
    add(pad(chord_freqs(ch), 9.5, vel=0.30, attack=2.5, release=3.0), tt0)
    i += 1; tt0 += 8.0
# sparse piano motif: D F A G F D ...
motif = [('D4',6.5),('F4',8.2),('A4',9.8),('G4',12.0),('F4',13.6),('D4',15.5),
         ('D4',22.5),('C5',24.2),('A4',26.0),('F4',28.4),('E4',30.2),('D4',32.0),
         ('F4',34.2),('A4',35.8),('G4',37.4)]
for nm, at in motif:
    add(piano(NOTE[nm], 5, 0.55), at, pan=rng.uniform(-0.25,0.25))
# rain 16-40 (fades in/out)
rain_n = int(26*SR)
rain = lowpass_noise(rain_n, 24) * 0.12
rain *= env_ar(rain_n, 4.0, 5.0)
add(rain, 15.0, pan=-0.3); add(lowpass_noise(rain_n,24)*0.12*env_ar(rain_n,4,5), 15.0, pan=0.3)
# low drone
add(pad([NOTE['D1'],NOTE['D2']], 34, vel=0.22, attack=6, release=6), 6.0)

# ---------------- 40-47 memory (warm) ----------------
for j,(ch,at) in enumerate([(Bb,40.0),(Fch,43.5)]):
    add(pad(chord_freqs(ch), 4.6, vel=0.34, attack=1.2, release=1.6, shimmer=0.25), at)
mem = [('F4',40.3),('G4',41.1),('A4',41.9),('C5',42.7),('A4',44.0),('F4',44.9),('G4',45.7)]
for nm, at in mem:
    add(piano(NOTE[nm], 3, 0.6), at, pan=rng.uniform(-0.2,0.2))

# ---------------- 47-62 rise ----------------
tt0 = 47.0
for ch in [Dm, Bb, Fch, Cch]:
    add(pad(chord_freqs(ch)+[chord_freqs(ch)[1]*2], 4.6, vel=0.40, attack=0.8, release=1.2, shimmer=0.35), tt0)
    tt0 += 3.75
# arpeggio eighths
arp = ['D4','F4','A4','C5','A4','F4']
at = 47.0; k=0
while at < 61.5:
    add(piano(NOTE[arp[k%6]], 1.4, 0.42), at, pan=(k%2)*0.5-0.25)
    at += 0.469; k += 1
# riser 55-62
rn = int(7*SR); rt = np.arange(rn)/SR
riser = lowpass_noise(rn, 10) * (rt/7)**2 * 0.5
add(riser, 55.0)

# ---------------- 62-70 subway surge (hard cut at 70) ----------------
sn = int(8*SR); st = np.arange(sn)/SR
rumble = lowpass_noise(sn, 300) * 0.9
grind = lowpass_noise(sn, 6) * 0.35
surge = (rumble + grind) * (0.35 + 0.65*(st/8)**1.5)
surge += 0.28*np.sin(2*np.pi*49*st) * (st/8)
add(surge, 62.0)
add(pad([NOTE['D2'],NOTE['D#2']], 8, vel=0.5, attack=4, release=0.01), 62.0)  # dissonant press
# HARD CUT: zero everything from 70.00 for a breath
L[sec(69.98, 70.9)] *= np.linspace(1,0,len(L[sec(69.98,70.9)]))**8
R[sec(69.98, 70.9)] *= np.linspace(1,0,len(R[sec(69.98,70.9)]))**8

# ---------------- 70-74 invitation (near silence) ----------------
add(piano(NOTE['D4'], 3.5, 0.30), 71.0)
add(pad(chord_freqs(Dm), 4.5, vel=0.10, attack=2.0, release=1.5), 70.5)

# ---------------- 74-96 meditation: 22.0 s exactly ----------------
# heartbeat 60 bpm lub-dub, soft
def heart(vel):
    n = int(0.5*SR); tt = np.arange(n)/SR
    lub = np.sin(2*np.pi*55*tt)*np.exp(-tt/0.06)
    dub = np.roll(np.sin(2*np.pi*48*tt)*np.exp(-tt/0.05)*0.7, int(0.18*SR))
    return (lub+dub)*vel*0.5
bt = 74.0
while bt < 95.6:
    add(heart(0.55), bt)
    bt += 1.0
# breathing: 4 cycles x 5.5 s (inhale swell / exhale swell)
for c in range(4):
    b0 = 74.0 + c*5.5
    bn = int(2.4*SR)
    breath_in = lowpass_noise(bn, 40)*0.05*env_ar(bn, 1.3, 1.0)
    breath_out = lowpass_noise(bn, 60)*0.06*env_ar(bn, 0.8, 1.5)
    add(breath_in, b0+0.2); add(breath_out, b0+2.8)
# faint pad, dies before final black (94-96 heartbeat only)
add(pad([NOTE['D3'],NOTE['A3']], 18, vel=0.07, attack=6, release=6), 75.0)

# ---------------- 96 beat drop -> 140 groove (88 BPM) ----------------
BPM = 88.0; beat = 60.0/BPM
bars = [Dm, Dm, Bb, Bb, Fch, Fch, Cch, Gm] * 2  # 16 bars ~ 43.6 s -> 96..139.6
roots = {'D':'D1','A#':'A#0','F':'F1','C':'C1','G':'G1'}
t0 = 96.0
for bar_i, ch in enumerate(bars):
    bar_t = t0 + bar_i * 4 * beat
    if bar_t > 139.0: break
    # kick: 1 and 3.5
    add(kick(vel=1.0), bar_t)
    add(kick(vel=0.85), bar_t + 2.5*beat)
    # clap on 2 and 4
    add(clap(0.8), bar_t + 1*beat)
    add(clap(0.85), bar_t + 3*beat)
    # hats 8ths with swing
    for e in range(8):
        sw = 0.06*beat if e % 2 else 0
        add(hat(0.5 if e%2 else 0.7), bar_t + e*0.5*beat + sw, pan=0.3 if e%2 else -0.1)
    # sub bass
    root_name = ch[0][:-1]
    rf = NOTE[roots[root_name]]
    add(sub(rf*2, 4*beat*0.95, 0.9), bar_t)
    # pads + shimmer
    add(pad(chord_freqs(ch), 4*beat*1.05, vel=0.34, attack=0.4, release=0.8, shimmer=0.3), bar_t)
# drop melody (calls the motif home)
lead = [('D5',0.0),('F5',0.75),('A5',1.5),('G5',2.5),('F5',3.0),('D5',3.5)]
for bar_i in range(0, 16, 2):
    bar_t = t0 + bar_i*4*beat
    if bar_t > 136: break
    for nm, off in lead:
        add(piano(NOTE[nm], 2.2, 0.5), bar_t + off*beat, pan=rng.uniform(-0.3,0.3))
# gold bloom cymbal-swell at the drop
gn = int(1.2*SR); gt = np.arange(gn)/SR
gold = (rng.standard_normal(gn) - np.convolve(rng.standard_normal(gn), np.ones(4)/4,'same'))
add(gold*np.exp(-gt/0.5)*0.4, 96.0)

# ---------------- 140-152 embrace (drums out) ----------------
for ch, at, d in [(Bb,140.0,4.2),(Fch,143.8,4.2),(Gm,147.6,4.2),(Dm,151.2,5.0)]:
    add(pad(chord_freqs(ch)+[chord_freqs(ch)[2]*2], d+1, vel=0.42, attack=1.2, release=2.0, shimmer=0.4), at)
emb = [('A4',140.5),('C5',141.6),('D5',142.8),('F5',144.4),('E5',146.0),('D5',147.4),('C5',148.8),('A4',150.2)]
for nm, at in emb:
    add(piano(NOTE[nm], 4, 0.55), at, pan=rng.uniform(-0.2,0.2))
# heartbeat returns under embrace, gentle
bt = 141.0
while bt < 151.0:
    add(heart(0.3), bt); bt += 1.0

# ---------------- 152-163 send / Love, Eddie ----------------
add(pad(chord_freqs(Dm), 8, vel=0.22, attack=2.5, release=3.0), 152.5)
for nm, at in [('D4',153.2),('F4',155.0),('A4',156.8),('D5',159.0)]:
    add(piano(NOTE[nm], 5, 0.5), at)

# ---------------- 163-177 witness ----------------
add(pad([NOTE['D2'],NOTE['A2'],NOTE['D3']], 13, vel=0.26, attack=3.0, release=4.0), 163.0)
add(piano(NOTE['F4'], 5, 0.4), 165.5); add(piano(NOTE['A4'], 5, 0.4), 168.5)
add(piano(NOTE['G4'], 5, 0.38), 171.5); add(piano(NOTE['F4'], 5, 0.36), 174.0)
bt = 164.0
while bt < 175.0:
    add(heart(0.22), bt); bt += 1.0

# ---------------- 177-192 final cards: Picardy resolve ----------------
add(pad(chord_freqs(Dmaj), 13, vel=0.30, attack=3.0, release=6.0, shimmer=0.45), 177.5)
for nm, at in [('D4',178.5),('F#4',180.5),('A4',182.5),('D5',185.0)]:
    add(piano(NOTE[nm], 6, 0.45), at)

# ---------------- master ----------------
mix = np.stack([L, R])
# gentle glue + soft clip
mix = np.tanh(mix * 1.15)
peak = np.abs(mix).max()
mix = mix / peak * 0.891  # -1 dBFS
# global fade-out last 4 s and fade-in first 50 ms
fo = int(4*SR); mix[:, -fo:] *= np.linspace(1,0,fo)[None,:]**1.5
fi = int(0.05*SR); mix[:, :fi] *= np.linspace(0,1,fi)[None,:]
pcm = (mix.T * 32767).astype(np.int16)
with wave.open('score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("score.wav written:", pcm.shape[0]/SR, "s")
