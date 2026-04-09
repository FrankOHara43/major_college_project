import re
from difflib import get_close_matches
from typing import Iterable

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he", "in", "is", "it", "its", "of", "on", "that", "the", "to", "was", "were", "will", "with", "you", "your", "i", "we", "they", "this", "those", "these", "or", "but", "me", "my",
}

KNOWN_TECH_ENTITIES = {
    "fastapi": "ORG",
    "react": "ORG",
    "tailwind": "ORG",
    "python": "TECH",
    "javascript": "TECH",
    "docker": "TECH",
    "kubernetes": "TECH",
    "aws": "ORG",
    "google": "ORG",
    "github": "ORG",
    "linear": "ORG",
    "stripe": "ORG",
}

KNOWN_LOCATIONS = {
    "new york", "london", "delhi", "paris", "tokyo", "berlin", "san francisco", "mumbai", "singapore"
}

COMMON_CORRECTIONS = {
    "im": "I'm",
    "dont": "don't",
    "cant": "can't",
    "wont": "won't",
    "ive": "I've",
    "id": "I'd",
    "ill": "I'll",
    "doesnt": "doesn't",
    "isnt": "isn't",
    "arent": "aren't",
    "wasnt": "wasn't",
    "werent": "weren't",
}

QUESTION_STARTERS = {
    "what", "why", "when", "where", "who", "whom", "whose", "which", "how", "can", "could", "would", "should", "do", "does", "did", "is", "are", "am", "will"
}

LANGUAGE_HINTS = {
    "en": {"the", "and", "is", "are", "please", "help", "meeting"},
    "es": {"hola", "gracias", "por", "favor", "como", "que", "donde", "reunion"},
    "fr": {"bonjour", "merci", "s'il", "vous", "plait", "comment", "reunion"},
    "hi": {"namaste", "dhanyavaad", "kripya", "hai", "kya", "meeting"},
}

TRANSLATION_DICTIONARY = {
    ("en", "es"): {
        "hello": "hola",
        "meeting": "reunión",
        "project": "proyecto",
        "summary": "resumen",
        "transcript": "transcripción",
        "please": "por favor",
        "thank": "gracias",
    },
    ("en", "fr"): {
        "hello": "bonjour",
        "meeting": "réunion",
        "project": "projet",
        "summary": "résumé",
        "transcript": "transcription",
        "please": "s'il vous plaît",
        "thank": "merci",
    },
    ("en", "hi"): {
        "hello": "namaste",
        "meeting": "baithak",
        "project": "pariyojana",
        "summary": "saar",
        "transcript": "lipyantaran",
        "please": "kripya",
        "thank": "dhanyavaad",
    },
}


def normalize_text(text: str) -> str:
    lowered = text.replace("\n", " ").strip()
    lowered = re.sub(r"\s+", " ", lowered)
    lowered = re.sub(r"\s([?.!,])", r"\1", lowered)
    return lowered


def apply_common_corrections(text: str) -> str:
    words = text.split()
    normalized_words: list[str] = []
    for word in words:
        plain = re.sub(r"[^\w']", "", word).lower()
        if plain in COMMON_CORRECTIONS:
            suffix = word[len(re.sub(r"[A-Za-z']+", "", word)):] if re.sub(r"[^\w']", "", word) else ""
            normalized_words.append(COMMON_CORRECTIONS[plain] + suffix)
        else:
            normalized_words.append(word)
    return " ".join(normalized_words)


def restore_basic_punctuation(text: str) -> str:
    text = normalize_text(text)
    if not text:
        return text

    text = text[0].upper() + text[1:]
    first_word = re.sub(r"[^A-Za-z]", "", text.split()[0]).lower() if text.split() else ""
    if text.endswith((".", "?", "!")):
        return text

    ending = "?" if first_word in QUESTION_STARTERS else "."
    return text + ending


def detect_language(text: str) -> str:
    lowered = normalize_text(text).lower()
    tokens = set(re.findall(r"[a-zA-Z']+", lowered))

    if not tokens:
        return "en"

    scored = {
        code: len(tokens.intersection(hints))
        for code, hints in LANGUAGE_HINTS.items()
    }

    best = max(scored.items(), key=lambda pair: pair[1])
    return best[0] if best[1] > 0 else "en"


def lightweight_translate(text: str, source_language: str, target_language: str) -> str:
    if source_language == target_language or target_language == "auto":
        return text

    dictionary = TRANSLATION_DICTIONARY.get((source_language, target_language))
    if not dictionary:
        return text

    translated_parts: list[str] = []
    for token in text.split():
        stripped = re.sub(r"[^A-Za-z]", "", token).lower()
        punctuation = ""
        if token and token[-1] in ".,!?":
            punctuation = token[-1]

        translated = dictionary.get(stripped)
        translated_parts.append((translated or token) + punctuation)

    translated = " ".join(translated_parts)
    return normalize_text(translated)


def boost_custom_vocabulary(text: str, custom_words: Iterable[str]) -> str:
    if not custom_words:
        return text

    working = text
    text_tokens = re.findall(r"[A-Za-z0-9_+-]+", working)
    for custom in custom_words:
        if not custom or len(custom) < 2:
            continue

        candidates = get_close_matches(custom.lower(), [token.lower() for token in text_tokens], n=1, cutoff=0.88)
        if not candidates:
            continue

        match = candidates[0]
        working = re.sub(rf"\b{re.escape(match)}\b", custom, working, flags=re.IGNORECASE)

    return working


def extract_entities(text: str) -> list[dict[str, str]]:
    entities: list[dict[str, str]] = []
    normalized = normalize_text(text)
    lowered = normalized.lower()

    for location in KNOWN_LOCATIONS:
        if location in lowered:
            entities.append({"text": location.title(), "label": "LOCATION"})

    for tech, label in KNOWN_TECH_ENTITIES.items():
        if re.search(rf"\b{re.escape(tech)}\b", lowered):
            entities.append({"text": tech.title(), "label": label})

    title_case_matches = re.findall(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b", normalized)
    for phrase in title_case_matches:
        if phrase.lower() not in KNOWN_LOCATIONS and phrase.lower() not in KNOWN_TECH_ENTITIES:
            entities.append({"text": phrase, "label": "PERSON"})

    unique: dict[tuple[str, str], dict[str, str]] = {}
    for item in entities:
        unique[(item["text"], item["label"])] = item

    return list(unique.values())


def remove_stopwords(words: list[str]) -> list[str]:
    return [word for word in words if word.lower() not in STOPWORDS and len(word) > 2]
