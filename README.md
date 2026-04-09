# Voice-to-Text SaaS (FastAPI + React + Lightweight ML)

A production-ready voice transcription web app upgraded into a true ML-powered pipeline with:
- Real-time speech capture (Web Speech API)
- Backend audio transcription fallback (SpeechRecognition + ffmpeg/pydub)
- Local NLP intelligence (punctuation restoration, intent classification, NER, keyword extraction, summarization, translation)
- Enriched history persistence and premium SaaS-style frontend UX

---

## Tech Stack

### Frontend
- React (hooks)
- Tailwind CSS
- Framer Motion
- Web Speech API

### Backend
- Python
- FastAPI + Uvicorn
- SpeechRecognition + pydub + ffmpeg
- JSON persistence

### ML / NLP (Local Inference)
- Programmatically generated 100-sample dataset (`raw_text | clean_text | intent`)
- Similarity-based punctuation restoration
- Naive Bayes-style lightweight intent classification
- Rule-based entity extraction
- Extractive summarization
- Keyword extraction
- Lightweight language detection + translation dictionary
- Cache for repeated analysis (`lru_cache`)

---

## Updated Folder Structure

```text
mini-project/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── data/
│   │   ├── history.json
│   │   └── sample_dataset.json                # generated programmatically via /datasets or model init
│   └── services/
│       ├── audio_utils.py
│       ├── history_service.py
│       ├── ml_pipeline.py
│       ├── summarizer.py
│       ├── text_cleaning.py
│       └── transcription_service.py
└── frontend/
    ├── index.html
    ├── app.jsx
    └── components/
        ├── Hero.jsx
        ├── Navbar.jsx
        ├── Recorder.jsx
        └── TranscriptBox.jsx
```

---

## Architecture Changes

1. **ASR Layer**
   - Browser live recognition for instant feedback
   - Backend upload/recording fallback for robust transcription

2. **ML Enrichment Layer** (new)
   - `text_cleaning.py`: normalization, punctuation heuristics, language detection, vocabulary boosting, entity extraction
  - `summarizer.py`: extractive summary and keyword extraction
   - `ml_pipeline.py`: dataset generation, lightweight model training, cached inference pipeline

3. **API Layer** (extended)
   - `/analyze`: full NLP analysis for text
   - `/transcribe`: now returns enriched AI analysis
   - `/datasets`: dataset preview + suggested external datasets

4. **Persistence Layer** (enriched history)
   - Each history item now stores transcript + AI metadata:
     - `summary`, `keywords`, `entities`, `confidence_score`, `intent`, `detected_language`, `translated_text`

5. **Frontend UX Layer** (upgraded)
   - Confidence score visualization
   - Entity-highlighted transcript rendering
   - Summarize action
   - Auto-correct toggle
   - Keyword chips
   - Multi-language + translation selector
   - Waveform animation while recording
   - AI suggestions panel

---

## Setup

### 1) Create and Activate venv

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2) Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3) Install ffmpeg

Ubuntu / Debian:
```bash
sudo apt update
sudo apt install ffmpeg
```

Fedora:
```bash
sudo dnf install ffmpeg
```

Arch:
```bash
sudo pacman -S ffmpeg
```

### 4) Run backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5) Run frontend

```bash
cd frontend
python3 -m http.server 5500
```

Open `http://127.0.0.1:5500`.

---

## API Endpoints

### `GET /`
Backend health status.

### `POST /auth/register`
Register user and receive bearer token.

### `POST /auth/login`
Login user and receive bearer token.

### `GET /datasets`
Generates and returns sample dataset metadata + preview + recommended real datasets.

### `POST /analyze`
Analyze transcript text with ML pipeline.

Request body:
```json
{
  "text": "hello how are you",
  "auto_correct": true,
  "target_language": "es",
  "user_vocabulary": ["FastAPI", "Arya"],
  "include_suggestions": true
}
```

### `POST /transcribe`
Multipart audio upload + analysis enrichment.

Form fields:
- `audio` (file)
- `language` (e.g. `en-US`)
- `auto_correct` (`true/false`)
- `target_language` (`auto|en|es|fr|hi`)
- `user_vocabulary` (comma-separated)

### `GET /history`
Returns enriched transcription history.

### `DELETE /history/{entry_id}`
Deletes a specific transcript entry.

### `DELETE /history`
Clears previous transcripts (all for public mode, or user-scoped when authenticated).

### `GET /history/me`
Returns only current user's history when `Authorization: Bearer <token>` is provided.

---

## Example Output (`/analyze`)

```json
{
  "transcript": "im joining from london for fastapi meeting",
  "corrected_text": "I'm joining from London for FastAPI meeting.",
  "summary": "I'm joining from London for FastAPI meeting.",
  "keywords": ["joining", "london", "fastapi", "meeting"],
  "entities": [
    {"text": "London", "label": "LOCATION"},
    {"text": "Fastapi", "label": "ORG"}
  ],
  "confidence_score": 0.83,
  "intent": "meeting",
  "detected_language": "en",
  "translated_text": "I'm joining from London for FastAPI meeting.",
  "suggestions": [
    "Mention specific names, places, or tools for richer entity insights."
  ]
}
```

---

## Dataset Integration Details

- The sample dataset is **expanded programmatically to 100 entries** inside `ml_pipeline.py`.
- Generated entries mix conversational, product, technical, devops, translation, and meeting intents.
- Dataset is used for:
  - punctuation restoration via text similarity
  - intent classification (lightweight probabilistic model)
  - keyword support and training context

### Recommended Real Datasets for Next Phase
- LibriSpeech
- Mozilla Common Voice
- TED-LIUM
- IWSLT

---

## Delivered Features

### Backend Deliverables
- Modular NLP/ML service files
- Cached analysis inference
- New `/analyze` and `/datasets` endpoints
- Enriched `/transcribe` response
- Enriched `history.json` schema

### Frontend Deliverables
- Premium SaaS UI (gradient + glassmorphism)
- Live transcription + upload fallback
- Summarize action
- Confidence visualization
- Entity highlighting in transcript
- Keyword chip display
- Auto-correct toggle
- Translation target selector
- Waveform visualization
- AI suggestions panel

---

## Future Scalability Scope

### Phase 1: Model Quality
- Add transformer-based punctuation model and grammar correction model
- Integrate stronger NER model (spaCy or distilled token classifier)
- Add custom vocabulary profile per user/team

### Phase 2: Platform
- Move history from JSON to PostgreSQL
- Add Redis caching and async task queue for heavy jobs
- Add object storage for audio files

### Phase 3: SaaS Features
- JWT authentication + multi-tenant users
- Per-user transcript collections and sharing
- Export to PDF/DOCX
- Real speaker diarization (WhisperX / pyannote)
- Real-time translation captions over WebSocket
- Collaborative meeting notes + action item extraction

### Phase 4: Production Readiness
- Dockerized deployment
- CI/CD + test automation
- Observability (metrics, tracing, structured logs)
- Rate-limiting, quotas, and billing hooks

---

## Troubleshooting

- If live transcription does not start, check microphone permission.
- If upload transcription fails, verify `ffmpeg -version`.
- If frontend says backend offline, make sure FastAPI is running on `http://127.0.0.1:8000`.
