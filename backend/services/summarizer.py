import re
from collections import Counter

from services.text_cleaning import remove_stopwords


def _sentences(text: str) -> list[str]:
    chunks = re.split(r"(?<=[.!?])\s+", text.strip())
    return [chunk.strip() for chunk in chunks if chunk.strip()]


def summarize_text(text: str, max_sentences: int = 2) -> str:
    sentences = _sentences(text)
    if not sentences:
        return ""
    if len(sentences) <= max_sentences:
        return " ".join(sentences)

    words = re.findall(r"[A-Za-z']+", text.lower())
    weighted_words = remove_stopwords(words)
    freq = Counter(weighted_words)

    scored: list[tuple[float, str]] = []
    for sentence in sentences:
        sentence_words = remove_stopwords(re.findall(r"[A-Za-z']+", sentence.lower()))
        if not sentence_words:
            scored.append((0.0, sentence))
            continue

        score = sum(freq[word] for word in sentence_words) / len(sentence_words)
        scored.append((score, sentence))

    top = sorted(scored, key=lambda pair: pair[0], reverse=True)[:max_sentences]
    selected = {sentence for _, sentence in top}

    ordered = [sentence for sentence in sentences if sentence in selected]
    return " ".join(ordered)


def extract_keywords(text: str, limit: int = 8) -> list[str]:
    words = re.findall(r"[A-Za-z0-9_+-]+", text.lower())
    filtered = remove_stopwords(words)

    if not filtered:
        return []

    ranked = Counter(filtered).most_common(limit)
    return [word for word, _ in ranked]
