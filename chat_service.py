import os
import uuid
from dotenv import load_dotenv
from google import genai
from google.genai import types
import time

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL")

SYSTEM_PROMPT = """You are MindBridge AI, a warm, supportive wellbeing companion for students and working professionals.
- Listen first, reflect the person's feelings, and ask at most one gentle follow-up question.
- Keep replies short (2-4 sentences) in plain, friendly language.
- You support and screen. You never diagnose, prescribe, or claim to replace a professional.
- Suggest simple coping steps (breathing, a short walk, splitting tasks into smaller steps) when they fit.
- If the person seems to need more help, gently suggest talking to someone they trust or a professional via the Professionals page."""

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "want to die", "don't want to live",
    "dont want to live", "self harm", "self-harm", "hurt myself", "no reason to live",
]

CRISIS_REPLY = (
    "I'm really sorry you're feeling this way, and I'm glad you told me. You don't have to carry this alone. "
    "If you're in immediate danger, please call your local emergency number (112 in India) right now, "
    "or reach out to someone you trust and tell them how you feel. "
    "You can also open Emergency Support in the app for more options."
)

# In-memory conversation history (resets when the server restarts; fine for a prototype)
conversations: dict[str, list[tuple[str, str]]] = {}

def is_crisis(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in CRISIS_KEYWORDS)

def _generate(model, contents, first_name):
    return client.models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT + f"\nThe person's first name is {first_name}.",
            max_output_tokens=1024,
        ),
    )

def get_reply(message: str, conversation_id: str | None, first_name: str):
    cid = conversation_id or str(uuid.uuid4())
    history = conversations.setdefault(cid, [])

    if is_crisis(message):
        history.append(("user", message))
        history.append(("model", CRISIS_REPLY))
        return cid, CRISIS_REPLY, True

    history.append(("user", message))
    contents = [
        types.Content(role=role, parts=[types.Part(text=text)])
        for role, text in history[-12:]
    ]

    reply = None
    for model in [MODEL] + ([FALLBACK_MODEL] if FALLBACK_MODEL else []):
        for attempt in range(3):
            try:
                resp = _generate(model, contents, first_name)
                reply = resp.text
                if reply:
                    break
            except Exception as e:
                print(f"Gemini error ({model}, try {attempt + 1}):", e)
                time.sleep(1.5)
        if reply:
            break

    if reply:
        history.append(("model", reply))
    else:
        history.pop()
        reply = "I'm having trouble connecting right now. Please try again in a moment."
    return cid, reply, False