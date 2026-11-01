from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
from database import engine, Base, get_db
import models
import schemas
import auth
import scoring
from fastapi.middleware.cors import CORSMiddleware
import chat_service
import demo_data
import face_service
import voice_service
import nlp_service
import os
Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "MindBridge backend running"}

@app.post("/signup", response_model=schemas.UserResponse)
def signup(payload: schemas.SignupRequest, db: Session = Depends(get_db)):
    existing = db.execute(
        select(models.User).where(models.User.email == payload.email)
    ).scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=auth.hash_password(payload.password),
        age=payload.age,
        role=payload.role,
        terms_agreed_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(models.User).where(models.User.email == payload.email)
    ).scalar_one_or_none()

    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth.create_access_token({"sub": str(user.id)})
    return {"access_token": token}

@app.post("/checkins")
def create_checkin(
    payload: schemas.CheckInCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
    face = db.execute(
        select(models.FaceSignal)
        .where(models.FaceSignal.user_id == user.id, models.FaceSignal.created_at >= cutoff)
        .order_by(models.FaceSignal.created_at.desc())
    ).scalars().first()
    voice = db.execute(
        select(models.VoiceSignal)
        .where(models.VoiceSignal.user_id == user.id, models.VoiceSignal.created_at >= cutoff)
        .order_by(models.VoiceSignal.created_at.desc())
    ).scalars().first()
    texts = db.execute(
        select(models.TextSignal)
        .where(
            models.TextSignal.user_id == user.id,
            models.TextSignal.created_at >= cutoff,
            models.TextSignal.confidence >= 0.4,
        )
        .order_by(models.TextSignal.created_at.desc())
        .limit(5)
    ).scalars().all()
    text_stress = round(sum(t.stress_score for t in texts) / len(texts), 1) if texts else None

    score, band, message, show_support = scoring.calculate_score(
        payload,
        face.negative_share if face else None,
        voice.strain_share if voice else None,
        text_stress,
    )
    checkin = models.CheckIn(user_id=user.id, score=score, band=band, **payload.model_dump())
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return {
        "id": checkin.id,
        "score": score,
        "band": band,
        "message": message,
        "show_support_options": show_support,
        "face_included": face is not None,
        "voice_included": voice is not None,
        "text_included": bool(texts),
        "stress_level": checkin.stress_level,
        "created_at": checkin.created_at,
    }

@app.post("/auth/register", response_model=schemas.AuthResponse)
def register(payload: schemas.SignupRequest, db: Session = Depends(get_db)):
    user = signup(payload, db)
    token = auth.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": user}

@app.post("/auth/login", response_model=schemas.AuthResponse)
def auth_login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(models.User).where(models.User.email == payload.email)
    ).scalar_one_or_none()
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = auth.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": user}

@app.get("/profile", response_model=schemas.ProfileData)
def get_profile(
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    profile = db.execute(
        select(models.Profile).where(models.Profile.user_id == user.id)
    ).scalar_one_or_none()
    return profile if profile else schemas.ProfileData()

@app.put("/profile", response_model=schemas.ProfileData)
def save_profile(
    payload: schemas.ProfileData,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    profile = db.execute(
        select(models.Profile).where(models.Profile.user_id == user.id)
    ).scalar_one_or_none()
    if not profile:
        profile = models.Profile(user_id=user.id)
        db.add(profile)
    for field, value in payload.model_dump().items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile

@app.post("/chat")
def chat(
    payload: schemas.ChatRequest,
    background_tasks: BackgroundTasks,
    user: models.User = Depends(auth.get_current_user),
):
    first_name = user.full_name.split()[0]
    cid, reply, crisis = chat_service.get_reply(payload.message, payload.conversation_id, first_name)
    if not crisis:
        background_tasks.add_task(nlp_service.save_text_signal, user.id, payload.message)
    suggestions = [] if crisis else ["Can you suggest a breathing exercise?", "Why might I be feeling this way?"]
    return {"conversation_id": cid, "response": reply, "crisis": crisis, "suggestions": suggestions}

@app.get("/professionals")
def list_professionals(city: str | None = None):
    pros = demo_data.PROFESSIONALS
    if city:
        pros = [p for p in pros if p["city"].lower() == city.lower()]
    return {"professionals": pros}

@app.get("/wellness-plan")
def get_wellness_plan(user: models.User = Depends(auth.get_current_user)):
    items = demo_data.wellness_plans.setdefault(user.id, demo_data.default_plan())
    return {"items": items}

@app.post("/wellness-plan")
def save_wellness_plan(
    items: list[schemas.WellnessItem],
    user: models.User = Depends(auth.get_current_user),
):
    demo_data.wellness_plans[user.id] = [i.model_dump() for i in items]
    return {"items": demo_data.wellness_plans[user.id]}

reminders_store = {}

def appt_to_dict(a):
    return {
        "_id": str(a.id),
        "professional_name": a.professional_name,
        "date": a.date,
        "time": a.time,
        "appointment_type": a.appointment_type,
        "status": a.status,
    }

@app.post("/appointments")
def book_appointment(
    payload: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    pro = next((p for p in demo_data.PROFESSIONALS if p["id"] == payload.professional_id), None)
    if not pro:
        raise HTTPException(status_code=404, detail="Professional not found")

    taken = db.execute(
        select(models.Appointment).where(
            models.Appointment.professional_id == payload.professional_id,
            models.Appointment.date == payload.date,
            models.Appointment.time == payload.time,
            models.Appointment.status != "cancelled",
        )
    ).scalars().first()
    if taken:
        raise HTTPException(status_code=400, detail="That time slot is already booked. Please pick another.")

    appt = models.Appointment(
        user_id=user.id,
        professional_id=pro["id"],
        professional_name=pro["name"],
        date=payload.date,
        time=payload.time,
        appointment_type=payload.appointment_type,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return {"appointment": appt_to_dict(appt)}

@app.get("/appointments")
def list_appointments(
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    rows = db.execute(
        select(models.Appointment)
        .where(models.Appointment.user_id == user.id)
        .order_by(models.Appointment.created_at.desc())
    ).scalars().all()
    return {"appointments": [appt_to_dict(a) for a in rows]}

@app.delete("/appointments/{appt_id}")
def cancel_appointment(
    appt_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    appt = db.get(models.Appointment, appt_id)
    if not appt or appt.user_id != user.id:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.status = "cancelled"
    db.commit()
    return {"message": "Appointment cancelled"}

@app.post("/reminders")
def save_reminder(
    payload: schemas.ReminderCreate,
    user: models.User = Depends(auth.get_current_user),
):
    reminders_store.setdefault(user.id, []).append(payload.model_dump())
    return {"message": "Reminder saved"}

@app.post("/face/analyze")
def face_analyze(
    payload: schemas.FaceRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    if os.getenv("FACE_ENABLED", "true").lower() != "true":
        raise HTTPException(status_code=503, detail="Face analysis is turned off in this deployment.")
    result = face_service.analyze_frames(payload.images)
    if result is None:
        raise HTTPException(status_code=422, detail="No face detected. Face the camera in good light and try again.")
    db.add(models.FaceSignal(
        user_id=user.id,
        emotion=result["emotion"],
        negative_share=result["negative_share"],
        signal=result["signal"],
        frames_used=result["frames_used"],
    ))
    db.commit()
    return result

@app.get("/checkins")
def list_checkins(
    limit: int = 7,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    rows = db.execute(
        select(models.CheckIn)
        .where(models.CheckIn.user_id == user.id)
        .order_by(models.CheckIn.created_at.desc())
        .limit(limit)
    ).scalars().all()
    return {"checkins": [schemas.CheckInResponse.model_validate(r) for r in rows]}

@app.post("/voice/analyze")
def voice_analyze(
    payload: schemas.VoiceRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(auth.get_current_user),
):
    try:
        result = voice_service.analyze_voice(payload.audio, payload.transcript)
    except Exception as e:
        print("Voice analysis error:", e)
        raise HTTPException(status_code=422, detail="Couldn't read that audio. Please try again.")
    if result is None:
        raise HTTPException(status_code=422, detail="Not enough speech detected. Speak a little longer and closer to the microphone.")
    db.add(models.VoiceSignal(
        user_id=user.id,
        signal=result["signal"],
        strain_share=result["strain_share"],
        words_per_minute=result["words_per_minute"],
        pause_ratio=result["pause_ratio"],
        long_pauses=result["long_pauses"],
    ))
    db.commit()
    return result