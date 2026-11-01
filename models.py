from sqlalchemy import Column, Integer, String, SmallInteger, TIMESTAMP, Enum, ForeignKey, JSON, Float
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(str, enum.Enum):
    student = "student"
    working_professional = "professional"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    age = Column(SmallInteger, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    terms_agreed_at = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

class CheckIn(Base):
    __tablename__ = "check_ins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    stress_level = Column(SmallInteger, nullable=False)
    sleep_quality = Column(String(20), nullable=False)
    overwhelmed = Column(String(20), nullable=False)
    energy_level = Column(String(20), nullable=False)
    stress_cause = Column(String(30), nullable=False)
    concentration_difficulty = Column(SmallInteger, nullable=False)
    stress_frequency = Column(String(30), nullable=False)
    score = Column(SmallInteger, nullable=False)
    band = Column(String(20), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    course_or_job = Column(String(255))
    interests = Column(JSON)
    daily_routine = Column(String(1000))
    sleep_hours = Column(Float)
    exercise_frequency = Column(String(20))
    wellness_goals = Column(JSON)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    
class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    professional_id = Column(String(20), nullable=False)
    professional_name = Column(String(255), nullable=False)
    date = Column(String(10), nullable=False)
    time = Column(String(20), nullable=False)
    appointment_type = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, default="confirmed")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
class FaceSignal(Base):
    __tablename__ = "face_signals"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    emotion = Column(String(20), nullable=False)
    negative_share = Column(Float, nullable=False)
    signal = Column(String(20), nullable=False)
    frames_used = Column(SmallInteger, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
class VoiceSignal(Base):
    __tablename__ = "voice_signals"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    signal = Column(String(20), nullable=False)
    strain_share = Column(Float, nullable=False)
    words_per_minute = Column(Integer)
    pause_ratio = Column(Float, nullable=False)
    long_pauses = Column(SmallInteger, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
class TextSignal(Base):
    __tablename__ = "text_signals"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    stress_score = Column(SmallInteger, nullable=False)
    confidence = Column(Float, nullable=False)
    stressors = Column(String(200), nullable=False, default="")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())