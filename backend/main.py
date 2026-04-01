from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from services.audio_utils import normalize_audio_to_wav
from services.history_service import add_history_record, get_history_paginated
from services.transcription_service import NoSpeechError, ServiceUnavailableError, transcribe_wav_buffer

MAX_UPLOAD_MB = 25
HISTORY_PATH = "data/history.json"
PORT = 8000

app = FastAPI(title="VoiceFlow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "voiceflow-backend"}


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)) -> dict:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name")

    audio_bytes = await file.read()
    size_mb = len(audio_bytes) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed is {MAX_UPLOAD_MB}MB",
        )

    try:
        wav_buffer = normalize_audio_to_wav(audio_bytes, file.filename)
        transcript = transcribe_wav_buffer(wav_buffer)
    except NoSpeechError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ServiceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to process audio") from exc

    saved = add_history_record(HISTORY_PATH, transcript, source=file.filename)
    return {"transcript": transcript, "record": saved}


@app.get("/history")
def get_history(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    return get_history_paginated(HISTORY_PATH, page=page, limit=limit)
