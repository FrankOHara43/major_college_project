# AI-Powered Real-Time Speech Coaching, Accent Detection, and Fluency Improvement Platform

## 1) Vision
Build a real-time speaking assistant that goes beyond transcription by coaching users during speaking sessions and tracking long-term speaking improvement.

Core outcomes:
- Instant speaking feedback while recording
- Post-session coaching summary with measurable targets
- Accent detection and accent-shift analytics over time
- Existing transcription + NLP enrichment retained

## 2) Product Capabilities
### Existing (already in repo)
- Browser microphone transcription (Web Speech API)
- Audio upload transcription endpoint
- Text analysis: punctuation, intent, entities, summary, keywords
- Transcript history storage and retrieval

### New (to add)
- Real-time speech coaching metrics:
  - filler word rate
  - words-per-minute (pace)
  - pause duration and pause frequency
  - repetition detection
- Accent detection:
  - coarse accent category (for example: Indian English, American English, British English)
  - confidence score
  - optional phoneme-level pronunciation deviation index
- Instant coaching nudges:
  - "You are speaking too fast"
  - "Reduce fillers by 20%"
  - "Long pauses detected"
- Session scorecard:
  - fluency score
  - clarity score
  - pace stability score
  - accent confidence trend

## 3) High-Level Architecture

```text
Frontend (React + Vite)
  ├─ Live Audio Capture (MediaRecorder/Web Speech API)
  ├─ Real-time Metrics UI (coach cards + live gauges)
  ├─ Real-time Events Client (WebSocket)
  └─ Session History & Progress Dashboard
            |
            v
Backend API (FastAPI)
  ├─ REST API Layer
  │   ├─ /transcribe
  │   ├─ /analyze
  │   ├─ /coach/session/start
  │   ├─ /coach/session/{id}/end
  │   ├─ /coach/history
  │   └─ /accent/profile
  ├─ Realtime Stream Layer (WebSocket /ws/coach/{session_id})
  ├─ Speech Intelligence Services
  │   ├─ ASR adapter
  │   ├─ Fluency analyzer
  │   ├─ Repetition detector
  │   ├─ Pause detector
  │   └─ Accent detector
  ├─ NLP/ML pipeline (existing ml_pipeline.py)
  └─ Persistence (JSON now, DB-ready interface)
            |
            v
Storage
  ├─ Session artifacts
  ├─ Transcript + coaching metrics
  └─ User progress snapshots
```

## 4) Frontend Architecture

Source root: frontend/src

Main UI modules:
- App shell and routing: App.jsx
- Capture and controls: components/Recorder.jsx
- Transcript display: components/TranscriptBox.jsx
- History and analytics: components/HistoryPanel.jsx
- Health and status: components/HealthBadge.jsx

New frontend modules to add:
- components/CoachLivePanel.jsx
  - Live pace, filler rate, pause alerts, repetition alerts
- components/AccentInsightCard.jsx
  - Accent label, confidence, pronunciation hints
- components/SessionScorecard.jsx
  - End-of-session summary and suggested goals
- hooks/useRealtimeCoach.js
  - WebSocket lifecycle, event handling, throttled UI updates
- hooks/useSessionMetrics.js
  - client-side rolling counters for instant visual response

UI event flow:
1. User clicks Start Mic
2. Recorder opens session via REST
3. Audio chunks and/or interim transcript stream over WebSocket
4. Backend emits coaching events every 1-2 seconds
5. UI updates cards and badges in near real time
6. User clicks Stop, backend finalizes session summary

## 5) Backend Architecture

Source root: backend

Current modules:
- API app: main.py
- NLP analysis: services/ml_pipeline.py
- text helpers: services/text_cleaning.py
- summaries: services/summarizer.py
- history storage: services/history_service.py
- audio transcription: services/transcription_service.py

New backend modules to add:
- services/realtime_coach_service.py
  - Real-time metric aggregation per session
- services/fluency_metrics.py
  - filler/pace/pause/repetition calculations
- services/accent_detection_service.py
  - accent label + confidence inference
- services/session_service.py
  - session lifecycle (start/end/get)
- models/coach_models.py
  - pydantic schemas for stream and REST payloads

Suggested endpoint contract:
- POST /coach/session/start
  - request: user_id (optional), language
  - response: session_id
- WS /ws/coach/{session_id}
  - input events: interim_text, chunk_timestamp, chunk_duration_ms
  - output events: pace_update, filler_alert, pause_alert, repetition_alert, accent_update
- POST /coach/session/{session_id}/end
  - response: scorecard, recommendations, trend_delta
- GET /coach/history
  - response: historical sessions and KPI trend lines
- GET /accent/profile
  - response: dominant accent, confidence trend, pronunciation targets

## 6) Speech Coaching Analytics Design

### Metric formulas
- Pace (WPM):
  - WPM = words_spoken / minutes_elapsed
- Filler ratio:
  - filler_ratio = filler_count / total_words
- Pause rate:
  - pause_rate = pauses_over_threshold / minute
- Repetition score:
  - based on repeated unigrams/bigrams in sliding windows

### Suggested thresholds (configurable)
- Too fast: WPM > 165
- Too slow: WPM < 95
- High filler usage: filler_ratio > 0.06
- Long pause alert: pause > 1200 ms
- Repetition alert: repeated phrase >= 3 times in short span

### Filler dictionary (starter)
- um, uh, like, you know, actually, basically, literally, sort of, kind of

## 7) Accent Detection Strategy

Phase 1 (lightweight, ship fast):
- Use acoustic and lexical proxies from ASR outputs and timing patterns
- Classify into broad accent families with confidence
- Return non-judgmental guidance only

Phase 2 (higher accuracy):
- Add a pretrained speech embedding model (for example wav2vec2/whisper embeddings)
- Train accent classifier on public accent-labeled speech datasets
- Optional phoneme error analysis for pronunciation coaching

Phase 3 (advanced coaching):
- Personalized pronunciation goals
- Accent drift tracking per user over sessions
- Scenario-based coaching (presentation, interview, conversation)

Important UX principle:
- Present accent feedback as communication clarity coaching, not "right/wrong" accent judgment.

## 8) Data Model

Session record (logical schema):
- id
- user_id
- started_at, ended_at
- transcript_final
- language
- pace_avg, pace_variance
- filler_count, filler_ratio
- pause_count, long_pause_count
- repetition_score
- accent_label, accent_confidence
- fluency_score, clarity_score
- recommendations[]

Realtime event payload:
- session_id
- timestamp
- metric_type
- value
- severity
- message

## 9) Non-Functional Architecture

Performance targets:
- real-time event latency: < 500 ms to UI
- coaching refresh cadence: 1-2 s
- end-session report generation: < 2 s

Scalability:
- keep stateless API workers
- move session state to Redis for multi-instance support
- store artifacts in Postgres instead of JSON for production

Reliability:
- degrade gracefully if accent service unavailable
- continue transcription + fluency analysis even on partial failures

Security and privacy:
- explicit consent for audio analysis
- redact PII in persisted transcript fields where possible
- per-user authorization for session history

## 10) Suggested Milestone Plan

Milestone 1: Real-Time Fluency Coach (no accent)
- Add WebSocket stream and live metric cards
- Implement pace/filler/pause/repetition engine
- Save scorecard in history

Milestone 2: Accent Detection v1
- Add accent_detection_service with broad labels and confidence
- Show AccentInsightCard in UI
- Store accent metrics per session

Milestone 3: Progress Intelligence
- Add trend charts and personalized weekly goals
- Add recommendation engine (for example "reduce fillers by 20%")

Milestone 4: Production Hardening
- Replace JSON persistence with DB
- Add auth-required session views
- Add observability and load testing

## 11) Repo Mapping (Current -> Target)

Current implementation anchors:
- backend/main.py
- backend/services/ml_pipeline.py
- backend/services/history_service.py
- frontend/src/components/Recorder.jsx
- frontend/src/hooks/useSpeechRecognition.js
- frontend/src/utils/api.js

Target additions:
- backend/services/realtime_coach_service.py
- backend/services/fluency_metrics.py
- backend/services/accent_detection_service.py
- backend/services/session_service.py
- backend/models/coach_models.py
- frontend/src/components/CoachLivePanel.jsx
- frontend/src/components/AccentInsightCard.jsx
- frontend/src/components/SessionScorecard.jsx
- frontend/src/hooks/useRealtimeCoach.js
- frontend/src/hooks/useSessionMetrics.js

## 12) Recommended Project Name (Long Form)
AI-Powered Real-Time Speech Coaching, Accent Detection, and Fluency Improvement Platform
