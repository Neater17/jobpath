from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["password-checker"])


class PasswordStrengthRequest(BaseModel):
    password: str


class PasswordStrengthResponse(BaseModel):
    score: int
    strength: str
    isStrong: bool
    feedback: list[str]


def evaluate_password(password: str) -> PasswordStrengthResponse:
    score = 0
    feedback: list[str] = []

    if len(password) >= 8:
        score += 1
    else:
        feedback.append("Use at least 8 characters.")

    if any(character.islower() for character in password):
        score += 1
    else:
        feedback.append("Add a lowercase letter.")

    if any(character.isupper() for character in password):
        score += 1
    else:
        feedback.append("Add an uppercase letter.")

    if any(character.isdigit() for character in password):
        score += 1
    else:
        feedback.append("Add a number.")

    if any(not character.isalnum() for character in password):
        score += 1
    else:
        feedback.append("Add a special character.")

    if score <= 2:
        strength = "Weak"
    elif score == 3:
        strength = "Fair"
    elif score == 4:
        strength = "Good"
    else:
        strength = "Strong"

    return PasswordStrengthResponse(
        score=score,
        strength=strength,
        isStrong=score >= 4,
        feedback=feedback,
    )


@router.post("/password-strength", response_model=PasswordStrengthResponse)
def password_strength(payload: PasswordStrengthRequest) -> PasswordStrengthResponse:
    return evaluate_password(payload.password)
