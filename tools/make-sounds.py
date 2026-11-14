"""Synthesises Crimson Eclipse's own sounds as Ogg Vorbis files, from nothing but maths
(no sample, no recording): mod/content/assets/crimson_eclipse/sounds/*.ogg.

Run it with a Python that has numpy and soundfile, for example a local venv:
    python -m venv build/audio-venv
    build/audio-venv/Scripts/python -m pip install numpy soundfile
    build/audio-venv/Scripts/python tools/make-sounds.py

The same seed gives the same sounds. They are mono (the game places them) at 44.1 kHz.
"""
import os

import numpy as np
import soundfile as sf

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mod", "content", "assets", "crimson_eclipse", "sounds")
rng = np.random.default_rng(20261114)


def t(seconds):
    return np.arange(int(SR * seconds)) / SR


def lowpass(x, cutoff, order=2):
    """A smooth low-pass, in the frequency domain."""
    spectrum = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(spectrum / (1 + (freqs / cutoff) ** (2 * order)), len(x))


def bandpass(x, low, high):
    spectrum = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1 / SR)
    gain = 1 / (1 + (freqs / high) ** 4) * (1 - 1 / (1 + (freqs / low) ** 4))
    return np.fft.irfft(spectrum * gain, len(x))


def fade(x, fade_in, fade_out):
    n_in, n_out = int(SR * fade_in), int(SR * fade_out)
    env = np.ones(len(x))
    if n_in:
        env[:n_in] = np.sin(np.linspace(0, np.pi / 2, n_in)) ** 2
    if n_out:
        env[-n_out:] = np.cos(np.linspace(0, np.pi / 2, n_out)) ** 2
    return x * env


def sweep(seconds, f0, f1, curve=4.0):
    """A sine whose pitch falls (or rises) from f0 to f1, fast at first."""
    x = t(seconds)
    freq = f1 + (f0 - f1) * np.exp(-x * curve)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR)


def place(total, pieces):
    """Mixes (start seconds, samples, gain) pieces into `total` seconds."""
    out = np.zeros(int(SR * total))
    for start, piece, gain in pieces:
        a = int(SR * start)
        b = min(len(out), a + len(piece))
        out[a:b] += piece[: b - a] * gain
    return out


def echo(x, delay, feedback, repeats, damp=1800):
    """Echoes that come back duller each time, as off distant hills."""
    out = np.concatenate([x, np.zeros(int(SR * delay * repeats))])
    tail = x
    for i in range(1, repeats + 1):
        tail = lowpass(tail, damp / i) * feedback
        a = int(SR * delay * i)
        out[a : a + len(tail)] += tail
    return out


def save(name, x, peak=0.9):
    x = x / np.max(np.abs(x)) * peak
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + ".ogg")
    sf.write(path, x.astype(np.float32), SR, format="OGG", subtype="VORBIS")
    print(f"{name}.ogg  {len(x) / SR:.1f} s  {os.path.getsize(path) // 1024} KiB")


def thump(strength):
    """One beat of a huge heart: a falling sub tone, a body an octave up, a soft knock."""
    x = t(0.5)
    sub = sweep(0.5, 82, 36, 14) * np.exp(-x * 9)
    body = sweep(0.5, 150, 70, 16) * np.exp(-x * 16) * 0.5
    knock = lowpass(rng.standard_normal(len(x)), 420) * np.exp(-x * 60) * 0.7
    return fade((sub + body + knock) * strength, 0.003, 0.05)


def heartbeat():
    return place(0.85, [(0.0, thump(1.0), 1.0), (0.19, thump(0.8), 0.7)])


def drone():
    """Eight seconds of a deep, uneasy drone; played every five so the swells overlap."""
    seconds = 8.0
    x = t(seconds)
    out = np.zeros(len(x))
    # A low root, its fifth and octaves, each slightly out of tune and breathing on its own.
    for freq, gain in [(36.7, 1.0), (55.3, 0.8), (73.1, 0.7), (110.6, 0.45), (146.2, 0.25), (221.5, 0.12)]:
        for detune in (-0.35, 0.0, 0.42):
            phase = rng.uniform(0, 2 * np.pi)
            wobble = 1 + 0.004 * np.sin(2 * np.pi * rng.uniform(0.05, 0.2) * x + rng.uniform(0, 6))
            saw = 2 * (((freq + detune) * wobble * x + phase / 6.28) % 1) - 1
            breath = 0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(0.08, 0.3) * x + rng.uniform(0, 6))
            out += saw * gain * breath
    out = lowpass(out, 260)
    rumble = lowpass(rng.standard_normal(len(x)), 70) * 6
    return fade(out + rumble, 1.6, 2.2)


def omen():
    """Something huge, far away: a low horn swelling and dying behind the hills."""
    seconds = 5.0
    x = t(seconds)
    swell = np.sin(np.pi * np.clip(x / 4.2, 0, 1)) ** 2
    bend = 1 - 0.03 * x / seconds
    horn = sum(np.sin(2 * np.pi * f * bend * x + rng.uniform(0, 6)) * g for f, g in [(49, 1.0), (73.5, 0.7), (98, 0.5), (147, 0.25), (196, 0.1)])
    growl = 1 + 0.25 * np.sin(2 * np.pi * 23 * x)
    air = lowpass(rng.standard_normal(len(x)), 300) * 0.5
    return fade(echo(lowpass((horn * growl + air) * swell, 500), 0.37, 0.5, 4, 900), 0.4, 1.5)


def crack():
    """The sky breaking: a dry snap, a tearing roll, a sub boom, echoes rolling away."""
    snap = bandpass(rng.standard_normal(int(SR * 0.25)), 900, 9000) * np.exp(-t(0.25) * 28)
    pieces = [(0.0, snap, 1.0)]
    # The tear: dozens of smaller snaps, thinning out.
    for _ in range(46):
        start = rng.exponential(0.32)
        length = rng.uniform(0.02, 0.09)
        n = rng.standard_normal(int(SR * length)) * np.exp(-t(length) * rng.uniform(30, 90))
        pieces.append((0.02 + start, bandpass(n, rng.uniform(300, 1500), rng.uniform(3000, 9000)), rng.uniform(0.15, 0.6) * np.exp(-start * 1.2)))
    x = t(2.6)
    boom = (sweep(2.6, 95, 27, 2.6) + 0.5 * sweep(2.6, 190, 54, 3.2)) * np.exp(-x * 1.5)
    roll = lowpass(rng.standard_normal(len(x)), 160) * np.exp(-x * 1.3) * 5
    pieces += [(0.0, boom, 1.3), (0.03, roll, 1.0)]
    dry = place(3.0, pieces)
    return fade(echo(dry, 0.43, 0.42, 4, 2600), 0.0, 1.2)


def eye():
    """The eye opens: a vast low growl that rises, holds, and settles."""
    seconds = 4.0
    x = t(seconds)
    pitch = 34 + 22 * np.sin(np.pi * np.clip(x / 3.2, 0, 1)) ** 2
    phase = 2 * np.pi * np.cumsum(pitch) / SR
    voice = np.sin(phase) + 0.6 * np.sin(2 * phase + 0.5) + 0.35 * np.sin(3 * phase) + 0.2 * np.sin(5 * phase)
    rough = 0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 27 * x)) * np.abs(np.sin(2 * np.pi * 27 * x)) ** 0.4
    breath = bandpass(rng.standard_normal(len(x)), 120, 900) * 0.35
    swell = np.sin(np.pi * np.clip(x / seconds, 0, 1)) ** 1.5
    return fade(echo(lowpass(voice * rough + breath, 700) * swell, 0.3, 0.35, 3, 1200), 0.25, 1.0)


def fissure():
    """One crack in the sky: a sharp snap like ice, ticks running away as its tip runs, a soft low knock."""
    snap = bandpass(rng.standard_normal(int(SR * 0.12)), 1800, 12000) * np.exp(-t(0.12) * 45)
    pieces = [(0.0, snap, 1.0)]
    for i in range(22):
        start = 0.02 + i * 0.028 * (1 + i * 0.06) + rng.uniform(0, 0.01)
        length = rng.uniform(0.01, 0.035)
        n = rng.standard_normal(int(SR * length)) * np.exp(-t(length) * rng.uniform(60, 140))
        pieces.append((start, bandpass(n, rng.uniform(1500, 3000), rng.uniform(6000, 12000)), 0.5 * np.exp(-i * 0.12)))
    x = t(0.6)
    knock = sweep(0.6, 140, 55, 9) * np.exp(-x * 8) * 0.6
    pieces.append((0.0, knock, 1.0))
    return fade(echo(place(1.4, pieces), 0.21, 0.3, 2, 3500), 0.0, 0.3)


if __name__ == "__main__":
    save("heartbeat", heartbeat())
    save("drone", drone(), peak=0.7)
    save("omen", omen(), peak=0.8)
    save("crack", crack())
    save("eye", eye(), peak=0.85)
    save("fissure", fissure(), peak=0.8)
