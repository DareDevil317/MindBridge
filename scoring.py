SLEEP = {"Poor": 1, "Fair": 0.6, "Good": 0.2, "Very Good": 0}
OVERWHELMED = {"Yes": 1, "Sometimes": 0.5, "No": 0}
ENERGY = {"Very Low": 1, "Low": 0.65, "Normal": 0.2, "High": 0}
FREQUENCY = {"Rarely": 0, "Sometimes": 0.4, "Often": 0.75, "Almost every day": 1}

FACE_WEIGHT = 0.10   # face can lower the score by at most 10 points
VOICE_WEIGHT = 0.05  # voice can lower the score by at most 5 points
TEXT_WEIGHT = 0.05   # chat text can lower the score by at most 5 points

def calculate_score(c, face_negative_share=None, voice_strain_share=None, text_stress=None):
    penalty = (
        0.25 * (c.stress_level - 1) / 4
        + 0.15 * SLEEP.get(c.sleep_quality, 0.5)
        + 0.15 * OVERWHELMED.get(c.overwhelmed, 0.5)
        + 0.10 * ENERGY.get(c.energy_level, 0.5)
        + 0.15 * (c.concentration_difficulty - 1) / 4
        + 0.20 * FREQUENCY.get(c.stress_frequency, 0.5)
    )
    if face_negative_share is not None:
        penalty = min(1.0, penalty + FACE_WEIGHT * face_negative_share / 100)
    if voice_strain_share is not None:
        penalty = min(1.0, penalty + VOICE_WEIGHT * voice_strain_share / 100)
    if text_stress is not None:
        penalty = min(1.0, penalty + TEXT_WEIGHT * text_stress / 100)
    score = round(100 * (1 - penalty))
    if score >= 75:
        return score, "Low", "Your check-in suggests you're managing well today. Keep up the routines that help you.", False
    if score >= 55:
        return score, "Moderate", "Your check-in suggests some stress. A short break or a calming exercise may help.", True
    if score >= 35:
        return score, "Elevated", "Your check-in suggests elevated stress. Consider talking it through or trying a calming exercise.", True
    return score, "High", "Your check-in suggests high stress right now. Please consider talking to someone you trust or a professional.", True