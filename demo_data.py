PROFESSIONALS = [
    {"id": "p1", "name": "Dr. Demo Sharma", "specialization": "Clinical Psychologist", "experience_years": 8,
     "city": "Kanpur", "bio": "Demo profile. Supports students with exam stress and anxiety.",
     "available_slots": ["10:00 AM", "2:00 PM", "4:30 PM"], "phone_verified": False, "phone": ""},
    {"id": "p2", "name": "Dr. Demo Verma", "specialization": "Psychiatrist", "experience_years": 12,
     "city": "Lucknow", "bio": "Demo profile. Works with working professionals on burnout and sleep.",
     "available_slots": ["11:00 AM", "3:00 PM"], "phone_verified": False, "phone": ""},
    {"id": "p3", "name": "Demo Counsellor Gupta", "specialization": "Counselling Psychologist", "experience_years": 5,
     "city": "Delhi", "bio": "Demo profile. Focuses on stress management and study habits.",
     "available_slots": ["9:30 AM", "1:00 PM", "5:00 PM"], "phone_verified": False, "phone": ""},
    {"id": "p4", "name": "Dr. Demo Singh", "specialization": "Clinical Psychologist", "experience_years": 10,
     "city": "Kanpur", "bio": "Demo profile. Helps with anxiety and work-life balance.",
     "available_slots": ["12:00 PM", "4:00 PM"], "phone_verified": False, "phone": ""},
]

wellness_plans = {}  # user_id -> list of items (in memory, resets on restart)

def default_plan():
    return [
        {"time_of_day": "Morning", "activity": "10-minute stretching", "done": False},
        {"time_of_day": "Afternoon", "activity": "5-minute breathing break", "done": False},
        {"time_of_day": "Evening", "activity": "20-minute walk", "done": False},
        {"time_of_day": "Night", "activity": "Wind down away from screens for 30 minutes", "done": False},
    ]