import wave
import numpy as np

rate = 16000
rng = np.random.default_rng(0)
parts = []
for i in range(6):
    parts.append(rng.normal(0, 0.15, rate))                      # 1 s of "speech"
    parts.append(np.zeros(int(rate * (0.8 if i % 2 == 0 else 0.2))))  # gap
audio = np.concatenate(parts)
pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
with wave.open("test_voice.wav", "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(rate)
    w.writeframes(pcm.tobytes())
print("saved", len(audio) / rate, "seconds")