import json

from google.genai import types

import models
from chat_service import client, MODEL, FALLBACK_MODEL
from database import SessionLocal

STRESSORS = ["Studies", "Work", "Relationships", "Financial", "Health", "Family", "Sleep", "Other"]

PROMPT = """You analyze one message from a wellbeing app user and return ONLY a JSON object, with no other text:
{"stress": <integer 0-100, how much stress or distress the message expresses; 0 = none or positive, 100 = severe>,
 "stressors": [<zero or more of: Studies, Work, Relationships, Financial, Health, Family, Sleep, Other>],
 "confidence": <number 0-1, how sure you are given how much the message says>}
Judge only what the message says. Short or neutral messages (greetings, questions) get low stress and low confidence.
This is a rough screening signal, not a diagnosis."""


def analyze_text(message: str):
    for model in [MODEL] + ([FALLBACK_MODEL] if FALLBACK_MODEL else []):
        try:
            resp = client.models.generate_content(
                model=model,
                contents=message[:1500],
                config=types.GenerateContentConfig(
                    system_instruction=PROMPT,
                    response_mime_type="application/json",
                    max_output_tokens=1024,
                ),
            )
            data = json.loads(resp.text)
            return {
                "stress": max(0, min(100, int(data.get("stress", 0)))),
                "confidence": round(max(0.0, min(1.0, float(data.get("confidence", 0)))), 2),
                "stressors": [s for s in data.get("stressors", []) if s in STRESSORS],
            }
        except Exception as e:
            print(f"NLP read failed ({model}):", e)
    return None


def save_text_signal(user_id: int, message: str):
    result = analyze_text(message)
    if result is None:
        return
    db = SessionLocal()
    try:
        db.add(models.TextSignal(
            user_id=user_id,
            stress_score=result["stress"],
            confidence=result["confidence"],
            stressors=", ".join(result["stressors"]),
        ))
        db.commit()
    finally:
        db.close()