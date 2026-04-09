import tempfile
from pathlib import Path
from typing import Any

import speech_recognition as sr
from fastapi import UploadFile
from pydub import AudioSegment
from pydub.silence import split_on_silence

from services.audio_utils import AudioConversionError, convert_audio_to_wav


class TranscriptionError(Exception):
    def __init__(self, message: str, debug: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.debug = debug or {}


recognizer = sr.Recognizer()


def _transcribe_with_chunk_fallback(wav_path: str, language: str) -> tuple[str, int, int]:
    """
    Fallback path for harder audio:
    split speech by silence and transcribe each chunk.
    """
    audio_segment = AudioSegment.from_wav(wav_path)
    if len(audio_segment) < 400:
        return "", 0, 0

    # Dynamic threshold based on the file's average loudness.
    silence_threshold = audio_segment.dBFS - 16 if audio_segment.dBFS != float("-inf") else -40

    chunks = split_on_silence(
        audio_segment,
        min_silence_len=450,
        silence_thresh=silence_threshold,
        keep_silence=250,
    )

    if not chunks:
        chunks = [audio_segment]

    transcripts: list[str] = []
    recognized_chunk_count = 0

    with tempfile.TemporaryDirectory() as chunk_dir:
        for index, chunk in enumerate(chunks):
            if len(chunk) < 300:
                continue

            chunk_path = Path(chunk_dir) / f"chunk_{index}.wav"
            chunk.export(chunk_path, format="wav", parameters=["-acodec", "pcm_s16le"])

            try:
                with sr.AudioFile(str(chunk_path)) as source:
                    chunk_audio = recognizer.record(source)
                chunk_text = recognizer.recognize_google(chunk_audio, language=language)
                if chunk_text.strip():
                    transcripts.append(chunk_text.strip())
                    recognized_chunk_count += 1
            except sr.UnknownValueError:
                continue

    return " ".join(transcripts).strip(), len(chunks), recognized_chunk_count


async def transcribe_audio_file(upload_file: UploadFile, language: str = "en-US") -> dict[str, Any]:
    """
    Reads uploaded audio, converts it to WAV, then transcribes to text.
    """
    content = await upload_file.read()
    if not content:
        raise TranscriptionError("Uploaded audio is empty.")

    suffix = Path(upload_file.filename or "audio.webm").suffix or ".webm"

    with tempfile.TemporaryDirectory() as temp_dir:
        raw_audio_path = Path(temp_dir) / f"input{suffix}"
        raw_audio_path.write_bytes(content)

        try:
            wav_path = convert_audio_to_wav(str(raw_audio_path), temp_dir)
        except AudioConversionError as error:
            raise TranscriptionError(str(error)) from error

        try:
            with sr.AudioFile(wav_path) as source:
                total_duration_seconds = round(source.DURATION, 2)

            used_chunk_fallback = False
            chunk_count = 0
            recognized_chunks = 0

            with sr.AudioFile(wav_path) as source:
                audio_data = recognizer.record(source)

            text = recognizer.recognize_google(audio_data, language=language)
        except sr.UnknownValueError:
            used_chunk_fallback = True
            text, chunk_count, recognized_chunks = _transcribe_with_chunk_fallback(wav_path, language)
            if not text:
                raise TranscriptionError(
                    "Voice was not clear, give a clear voice and check your internet speed.",
                    debug={
                        "duration_seconds": total_duration_seconds,
                        "used_chunk_fallback": used_chunk_fallback,
                        "chunk_count": chunk_count,
                        "recognized_chunk_count": recognized_chunks,
                    },
                )
        except sr.RequestError as error:
            raise TranscriptionError(
                "Voice was not clear, give a clear voice and check your internet speed."
            ) from error
        except Exception as error:
            raise TranscriptionError(f"Transcription failed: {error}") from error

    return {
        "text": text.strip(),
        "debug": {
            "duration_seconds": total_duration_seconds,
            "used_chunk_fallback": used_chunk_fallback,
            "chunk_count": chunk_count,
            "recognized_chunk_count": recognized_chunks,
        },
    }
