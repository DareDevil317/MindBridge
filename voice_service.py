import base64
import io
import wave

import numpy as np

FRAME_S = 0.03
MIN_LONG_PAUSE_S = 0.5


def _read_wav(data_url: str):
    b64 = data_url.split(",", 1)[1] if "," in data_url else data_url
    raw = base64.b64decode(b64)
    with wave.open(io.BytesIO(raw), "rb") as w:
        channels = w.getnchannels()
        width = w.getsampwidth()
        rate = w.getframerate()
        frames = w.readframes(w.getnframes())
    if width != 2:
        raise ValueError("Need 16-bit WAV audio")
    audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        audio = audio.reshape(-1, channels).mean(axis=1)
    return audio, rate


def analyze_voice(data_url: str, transcript: str):
    audio, rate = _read_wav(data_url)
    duration = len(audio) / rate
    frame_len = int(rate * FRAME_S)
    n = len(audio) // frame_len
    if duration < 2.0 or n < 10:
        return None

    frames = audio[: n * frame_len].reshape(n, frame_len)
    rms = np.sqrt((frames ** 2).mean(axis=1))
    peak = float(np.percentile(rms, 95))
    if peak < 0.005:
        return None

    speech = rms > max(0.1 * peak, 0.003)
    idx = np.flatnonzero(speech)
    if idx.size < 5:
        return None

    region = speech[idx[0] : idx[-1] + 1]
    silent = ~region
    region_s = region.size * FRAME_S
    pause_ratio = float(silent.sum()) / region.size

    min_run = int(MIN_LONG_PAUSE_S / FRAME_S)
    long_pauses, run = 0, 0
    for s in silent:
        if s:
            run += 1
        else:
            if run >= min_run:
                long_pauses += 1
            run = 0

    words = len(transcript.split())
    wpm = words / (region_s / 60) if words >= 4 else None

    pause_part = min(1.0, max(0.0, (pause_ratio - 0.15) / 0.35))
    if wpm is None:
        strain = 100 * pause_part
    else:
        pace_dev = min(1.0, abs(wpm - 140) / 80)
        strain = 100 * (0.6 * pace_dev + 0.4 * pause_part)
    strain = round(strain, 1)

    if strain < 30:
        signal, text = "Steady", "Your speech pace and pauses looked steady in this sample."
    elif strain < 60:
        signal, text = "Mixed", "Your speech showed some variation in pace or pauses in this sample."
    else:
        signal, text = "Uneven", "Your speech pace or pauses looked uneven in this sample."

    return {
        "duration_s": round(duration, 1),
        "words_per_minute": round(wpm) if wpm is not None else None,
        "pause_ratio": round(pause_ratio, 2),
        "long_pauses": long_pauses,
        "strain_share": strain,
        "signal": signal,
        "message": text + " This is one experimental signal, not a diagnosis.",
    }