from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from services.history_service import (
    add_history_entry,
    clear_history,
    delete_history_entry,
    get_history,
    get_history_by_user,
)
from services.ml_pipeline import analyze_with_cache, ensure_sample_dataset, recommended_real_datasets
from services.transcription_service import TranscriptionError, transcribe_audio_file


app = FastAPI(title="Voice-to-Text API", version="1.0.0")


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1)
    auto_correct: bool = True
    target_language: str = "auto"
    user_vocabulary: list[str] = Field(default_factory=list)
    include_suggestions: bool = True


class AnalyzeResponse(BaseModel):
    transcript: str
    corrected_text: str
    summary: str
    keywords: list[str]
    entities: list[dict[str, str]]
    confidence_score: float
    intent: str
    detected_language: str
    translated_text: str
    suggestions: list[str]
    model_metadata: dict


class AuthRequest(BaseModel):
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)


def _current_user(authorization: str | None) -> dict | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        return None

    try:
        payload = decode_token(token)
        return {
            "id": str(payload["sub"]),
            "email": payload["email"],
        }
    except Exception:
        return None

# CORS is open for local development so the static frontend can call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root() -> dict:
    return {"message": "Voice-to-Text API is running"}


@app.get("/datasets")
def datasets_info() -> dict:
    dataset = ensure_sample_dataset(target_size=100)
    return {
        "sample_dataset": {
            "description": "Programmatically generated 100-entry clean/raw dataset for punctuation and intent tasks.",
            "size": len(dataset),
            "format": "raw_text | clean_text | intent",
            "preview": dataset[:3],
        },
        "recommended_real_datasets": recommended_real_datasets(),
    }


@app.post("/auth/register")
def auth_register(request: AuthRequest) -> dict:
    try:
        user = register_user(request.email, request.password)
        token = create_token(user_id=user["id"], email=user["email"])
        return {"user": user, "access_token": token, "token_type": "bearer"}
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@app.post("/auth/login")
def auth_login(request: AuthRequest) -> dict:
    user = authenticate_user(request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    token = create_token(user_id=user["id"], email=user["email"])
    return {"user": user, "access_token": token, "token_type": "bearer"}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> dict:
    try:
        return analyze_with_cache(
            text=request.text,
            auto_correct=request.auto_correct,
            target_language=request.target_language,
            user_vocabulary=request.user_vocabulary,
            include_suggestions=request.include_suggestions,
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {error}") from error


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form("en-US"),
    auto_correct: bool = Form(True),
    target_language: str = Form("auto"),
    user_vocabulary: str = Form(""),
    authorization: str | None = Header(default=None),
) -> dict:
    """
    Receives an audio file from the frontend, converts speech to text,
    and stores the transcription in history.
    """
    if not audio.filename:
        raise HTTPException(status_code=400, detail="Audio file is required.")

    try:
        transcription_result = await transcribe_audio_file(audio, language)
    except TranscriptionError as error:
        raise HTTPException(
            status_code=400,
            detail={
                "message": str(error),
                "debug": getattr(error, "debug", {}),
            },
        ) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {error}") from error

    custom_vocabulary = [item.strip() for item in user_vocabulary.split(",") if item.strip()]

    analysis = analyze_with_cache(
        text=transcription_result["text"],
        auto_correct=auto_correct,
        target_language=target_language,
        user_vocabulary=custom_vocabulary,
        include_suggestions=True,
    )

    user = _current_user(authorization)

    history_item = add_history_entry(
        text=analysis["corrected_text"],
        language=language,
        source_filename=audio.filename,
        summary=analysis["summary"],
        keywords=analysis["keywords"],
        entities=analysis["entities"],
        confidence_score=analysis["confidence_score"],
        translated_text=analysis["translated_text"],
        intent=analysis["intent"],
        detected_language=analysis["detected_language"],
        user_id=user["id"] if user else None,
    )

    return {
        "text": analysis["corrected_text"],
        "language": language,
        "debug": transcription_result["debug"],
        "analysis": analysis,
        "history_item": history_item,
    }


@app.get("/history")
def history() -> dict:
    """Returns all previously saved transcriptions."""
    return {"items": get_history()}


@app.delete("/history/{entry_id}")
def delete_history(entry_id: int, authorization: str | None = Header(default=None)) -> dict:
    user = _current_user(authorization)
    deleted = delete_history_entry(entry_id=entry_id, user_id=user["id"] if user else None)
    if not deleted:
        raise HTTPException(status_code=404, detail="Transcript not found.")

    return {"deleted": True, "entry_id": entry_id}


@app.delete("/history")
def clear_all_history(authorization: str | None = Header(default=None)) -> dict:
    user = _current_user(authorization)
    deleted_count = clear_history(user_id=user["id"] if user else None)
    return {"deleted": True, "deleted_count": deleted_count}


@app.get("/history/me")
def my_history(authorization: str | None = Header(default=None)) -> dict:
    user = _current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Missing or invalid auth token.")

    return {"items": get_history_by_user(user["id"])}
