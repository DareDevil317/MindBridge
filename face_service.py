import base64

NEGATIVE = ["angry", "fear", "sad", "disgust"]

def _decode(data_url: str):
    import cv2
    import numpy as np
    b64 = data_url.split(",", 1)[1] if "," in data_url else data_url
    arr = np.frombuffer(base64.b64decode(b64), dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not read the image")
    return img

def analyze_frames(data_urls):
    from deepface import DeepFace
    totals, used = {}, 0
    for url in data_urls:
        try:
            result = DeepFace.analyze(_decode(url), actions=["emotion"], enforce_detection=True)[0]
        except Exception as e:
            print("Face frame skipped:", e)
            continue
        for name, value in result["emotion"].items():
            totals[name] = totals.get(name, 0.0) + float(value)
        used += 1

    if used == 0:
        return None

    avg = {name: round(v / used, 1) for name, v in totals.items()}
    negative_share = round(sum(avg[n] for n in NEGATIVE), 1)
    if negative_share < 30:
        signal, text = "Relaxed", "Your expression looked fairly relaxed in this sample."
    elif negative_share < 60:
        signal, text = "Mixed", "Your expression showed some mixed signals in this sample."
    else:
        signal, text = "Tense", "Your expression showed some tension in this sample."

    return {
        "emotion": max(avg, key=avg.get),
        "emotions": avg,
        "negative_share": negative_share,
        "signal": signal,
        "frames_used": used,
        "message": text + " This is one experimental signal, not a diagnosis.",
    }