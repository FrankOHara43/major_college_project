from __future__ import annotations

from io import BytesIO

from pydub import AudioSegment
from pydub.silence import split_on_silence


def normalize_audio_to_wav(audio_bytes: bytes, filename: str | None = None) -> BytesIO:
    file_ext = "wav"
    if filename and "." in filename:
        file_ext = filename.rsplit(".", 1)[-1].lower()

    source = BytesIO(audio_bytes)
    audio = AudioSegment.from_file(source, format=file_ext)
    audio = audio.set_channels(1).set_frame_rate(16000)

    chunks = split_on_silence(
        audio,
        min_silence_len=400,
        silence_thresh=audio.dBFS - 16 if audio.dBFS != float("-inf") else -50,
        keep_silence=120,
    )

    if chunks:
        processed = chunks[0]
        for chunk in chunks[1:]:
            processed += chunk
    else:
        processed = audio

    wav_buffer = BytesIO()
    processed.export(wav_buffer, format="wav")
    wav_buffer.seek(0)
    return wav_buffer
