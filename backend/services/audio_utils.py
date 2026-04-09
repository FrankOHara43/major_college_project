import os
from pathlib import Path

from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
from pydub.effects import normalize


class AudioConversionError(Exception):
    pass


def convert_audio_to_wav(input_path: str, output_dir: str) -> str:
    """
    Converts any ffmpeg-supported audio format to WAV format.
    SpeechRecognition works reliably with WAV/AIFF/FLAC,
    so we normalize all uploads to WAV.
    """
    output_path = Path(output_dir) / "normalized_audio.wav"

    try:
        segment = AudioSegment.from_file(input_path)
    except CouldntDecodeError as error:
        raise AudioConversionError(
            "Could not decode audio file. Please upload a valid audio format."
        ) from error
    except Exception as error:
        raise AudioConversionError(f"Audio conversion failed: {error}") from error

    # Normalize volume and convert to mono 16kHz for recognition stability.
    if segment.dBFS != float("-inf"):
        segment = normalize(segment)

    segment = segment.set_channels(1).set_frame_rate(16000)

    try:
        segment.export(output_path, format="wav", parameters=["-acodec", "pcm_s16le"])
    except Exception as error:
        raise AudioConversionError(f"Could not export WAV file: {error}") from error

    if not os.path.exists(output_path):
        raise AudioConversionError("WAV output file was not created.")

    return str(output_path)
