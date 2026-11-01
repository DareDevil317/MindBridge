from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from models import UserRole

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    age: int
    role: UserRole

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    
class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    age: int
    role: UserRole
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
class CheckInCreate(BaseModel):
    stress_level: int = Field(ge=1, le=5)
    sleep_quality: str
    overwhelmed: str
    energy_level: str
    stress_cause: str
    concentration_difficulty: int = Field(ge=1, le=5)
    stress_frequency: str

class CheckInResponse(BaseModel):
    id: int
    stress_level: int
    stress_cause: str
    score: int
    band: str
    message: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    
class ProfileData(BaseModel):
    course_or_job: str | None = None
    interests: list[str] | None = []
    daily_routine: str | None = None
    sleep_hours: float | None = None
    exercise_frequency: str | None = "sometimes"
    wellness_goals: list[str] | None = []

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    
class WellnessItem(BaseModel):
    time_of_day: str
    activity: str
    done: bool = False
    
class AppointmentCreate(BaseModel):
    professional_id: str
    date: str
    time: str
    appointment_type: str

class ReminderCreate(BaseModel):
    kind: str
    time: str
    frequency: str
    
class FaceRequest(BaseModel):
    images: list[str] = Field(min_length=1, max_length=5)
    
class VoiceRequest(BaseModel):
    audio: str
    transcript: str = ""