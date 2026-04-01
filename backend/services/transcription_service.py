from __future__ import annotations

from io import BytesIO

import speech_recognition as sr


class NoSpeechError(Exception):
    pass


class ServiceUnavailableError(Exception):
    pass


def transcribe_wav_buffer(wav_buffer: BytesIO) -> str:
    recognizer = sr.Recognizer()

    try:
        with sr.AudioFile(wav_buffer) as source:
            audio_data = recognizer.record(source)
        text = recognizer.recognize_google(audio_data)
    except sr.UnknownValueError as exc:
        raise NoSpeechError("No speech detected in audio") from exc
    except sr.RequestError as exc:
        raise ServiceUnavailableError("Speech service unavailable") from exc

    transcript = text.strip()
    if not transcript:
        raise NoSpeechError("No speech detected in audio")

    return transcript
