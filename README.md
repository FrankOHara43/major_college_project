# VoiceFlow — Voice-to-Text AI

Full-stack voice-to-text app with React + FastAPI.

## Stack

- Frontend: React 18, Vite, Tailwind CSS, Framer Motion
- Backend: FastAPI, Uvicorn
- Speech: Web Speech API (live), Google ASR via `SpeechRecognition` (server)
- Audio Processing: `pydub` + `ffmpeg`
- Storage: JSON file at `backend/data/history.json`

## Project Structure

```
mini-project/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── data/history.json
│   └── services/
│       ├── audio_utils.py
│       ├── transcription_service.py
│       └── history_service.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── hooks/
        ├── components/
        └── utils/api.js
```

## Backend Defaults (No `.env`)

- `MAX_UPLOAD_MB = 25`
- `HISTORY_PATH = "data/history.json"`
- `PORT = 8000`

## Run Locally

### 1) Start Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2) Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## API Endpoints

- `GET /` → health check
- `POST /transcribe` → upload audio file
- `GET /history?page=1&limit=20` → paginated transcript history

## Notes

- No Axios is used; frontend API calls use `fetch` only.
- No `.env` is required.
- `ffmpeg` must be installed on your system for `pydub` audio conversion.
