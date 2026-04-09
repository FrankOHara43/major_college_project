import json
import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from difflib import SequenceMatcher
from functools import lru_cache
from pathlib import Path
from typing import Any

from services.summarizer import extract_keywords, summarize_text
from services.text_cleaning import (
    apply_common_corrections,
    boost_custom_vocabulary,
    detect_language,
    extract_entities,
    lightweight_translate,
    normalize_text,
    restore_basic_punctuation,
)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATASET_FILE = DATA_DIR / "sample_dataset.json"
TOKEN_PATTERN = re.compile(r"[a-zA-Z0-9_+-]+")


@dataclass
class MLArtifacts:
    dataset: list[dict[str, Any]]
    intent_priors: dict[str, float]
    token_likelihoods: dict[str, dict[str, float]]
    vocabulary: set[str]


class LightweightIntentModel:
    def __init__(self, priors: dict[str, float], likelihoods: dict[str, dict[str, float]], vocabulary: set[str]) -> None:
        self.priors = priors
        self.likelihoods = likelihoods
        self.vocabulary = vocabulary

    def predict(self, text: str) -> tuple[str, float]:
        tokens = [token.lower() for token in TOKEN_PATTERN.findall(text)]
        if not tokens:
            return "general", 0.5

        scores: dict[str, float] = {}
        for intent, prior in self.priors.items():
            score = math.log(max(prior, 1e-9))
            intent_likelihoods = self.likelihoods[intent]

            for token in tokens:
                probability = intent_likelihoods.get(token, intent_likelihoods["<unk>"])
                score += math.log(max(probability, 1e-9))

            scores[intent] = score

        best_intent = max(scores, key=scores.get)
        best_score = scores[best_intent]

        exp_values = {label: math.exp(value - best_score) for label, value in scores.items()}
        denominator = sum(exp_values.values()) or 1.0
        confidence = exp_values[best_intent] / denominator

        return best_intent, float(confidence)


def _seed_examples() -> list[tuple[str, str, str]]:
    return [
        ("hello how are you", "Hello, how are you?", "general"),
        ("i am fine thank you", "I am fine, thank you.", "general"),
        ("what is your name", "What is your name?", "general"),
        ("my name is john", "My name is John.", "general"),
        ("this is a test sentence", "This is a test sentence.", "general"),
        ("can you help me", "Can you help me?", "support"),
        ("i need assistance now", "I need assistance now.", "support"),
        ("where is the nearest store", "Where is the nearest store?", "general"),
        ("please call me later", "Please call me later.", "general"),
        ("i will be there soon", "I will be there soon.", "general"),
        ("this project is amazing", "This project is amazing.", "product"),
        ("we are building something cool", "We are building something cool.", "product"),
        ("fastapi is very efficient", "FastAPI is very efficient.", "technical"),
        ("react makes ui easy", "React makes UI easy.", "technical"),
        ("tailwind is great for styling", "Tailwind is great for styling.", "technical"),
        ("add punctuation to this sentence", "Add punctuation to this sentence.", "editing"),
        ("remove noise from audio", "Remove noise from audio.", "audio"),
        ("speech recognition is interesting", "Speech recognition is interesting.", "technical"),
        ("machine learning is powerful", "Machine learning is powerful.", "technical"),
        ("deploy the app soon", "Deploy the app soon.", "devops"),
    ]


def _expand_dataset(target_size: int = 100) -> list[dict[str, Any]]:
    base = _seed_examples()

    templates = [
        ("schedule a meeting with {name}", "Schedule a meeting with {name}.", "meeting"),
        ("send the summary to {name}", "Send the summary to {name}.", "meeting"),
        ("translate this into spanish", "Translate this into Spanish.", "translation"),
        ("generate action items from transcript", "Generate action items from transcript.", "meeting"),
        ("im joining from {city}", "I'm joining from {city}.", "general"),
        ("please add {tool} to the project", "Please add {tool} to the project.", "product"),
        ("the api response time is slow", "The API response time is slow.", "support"),
        ("can we deploy on kubernetes", "Can we deploy on Kubernetes?", "devops"),
        ("create documentation for onboarding", "Create documentation for onboarding.", "product"),
        ("this sprint needs better planning", "This sprint needs better planning.", "meeting"),
    ]

    names = ["John", "Maya", "Aria", "Rohan", "Nina", "Chris", "Sam", "Ishita", "Ali", "Emma"]
    cities = ["London", "Delhi", "Paris", "Tokyo", "Mumbai", "Berlin", "Singapore", "New York", "Sydney", "Dubai"]
    tools = ["FastAPI", "React", "Docker", "Tailwind", "Redis", "PostgreSQL", "Whisper", "Kubernetes", "PyTorch", "Numpy"]

    entries: list[dict[str, Any]] = []
    for raw, clean, intent in base:
        entries.append({"raw_text": raw, "clean_text": clean, "intent": intent})

    cursor = 0
    while len(entries) < target_size:
        raw_tmpl, clean_tmpl, intent = templates[cursor % len(templates)]
        name = names[cursor % len(names)]
        city = cities[cursor % len(cities)]
        tool = tools[cursor % len(tools)]

        raw = raw_tmpl.format(name=name.lower(), city=city.lower(), tool=tool.lower())
        clean = clean_tmpl.format(name=name, city=city, tool=tool)

        entries.append({"raw_text": raw, "clean_text": clean, "intent": intent})
        cursor += 1

    for idx, item in enumerate(entries, start=1):
        item["id"] = idx
        item["keywords"] = extract_keywords(item["clean_text"], limit=4)

    return entries[:target_size]


def ensure_sample_dataset(target_size: int = 100) -> list[dict[str, Any]]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    dataset = _expand_dataset(target_size=target_size)
    DATASET_FILE.write_text(json.dumps(dataset, indent=2), encoding="utf-8")
    return dataset


def _train_intent_model(dataset: list[dict[str, Any]]) -> LightweightIntentModel:
    examples_by_intent: dict[str, list[str]] = defaultdict(list)
    all_tokens: list[str] = []

    for item in dataset:
        intent = item["intent"]
        text = item["clean_text"].lower()
        examples_by_intent[intent].append(text)
        all_tokens.extend(TOKEN_PATTERN.findall(text))

    vocabulary = set(all_tokens)
    priors: dict[str, float] = {}
    likelihoods: dict[str, dict[str, float]] = {}

    total_examples = sum(len(items) for items in examples_by_intent.values())
    vocab_size = max(len(vocabulary), 1)

    for intent, texts in examples_by_intent.items():
        priors[intent] = len(texts) / total_examples

        token_counts = Counter()
        for text in texts:
            token_counts.update(TOKEN_PATTERN.findall(text))

        total_tokens = sum(token_counts.values())
        probs: dict[str, float] = {}
        for token in vocabulary:
            probs[token] = (token_counts[token] + 1) / (total_tokens + vocab_size)

        probs["<unk>"] = 1 / (total_tokens + vocab_size)
        likelihoods[intent] = probs

    return LightweightIntentModel(priors=priors, likelihoods=likelihoods, vocabulary=vocabulary)


@lru_cache(maxsize=1)
def get_artifacts() -> MLArtifacts:
    dataset = ensure_sample_dataset(target_size=100)
    model = _train_intent_model(dataset)
    return MLArtifacts(
        dataset=dataset,
        intent_priors=model.priors,
        token_likelihoods=model.likelihoods,
        vocabulary=model.vocabulary,
    )


def _punctuation_restore_with_similarity(text: str, dataset: list[dict[str, Any]]) -> str:
    if not text.strip():
        return text

    best_entry = None
    best_score = 0.0
    normalized = text.lower().strip()

    for item in dataset:
        score = SequenceMatcher(a=normalized, b=item["raw_text"]).ratio()
        if score > best_score:
            best_score = score
            best_entry = item

    if best_entry and best_score >= 0.72:
        return best_entry["clean_text"]

    return restore_basic_punctuation(text)


def _intent_predict(text: str, artifacts: MLArtifacts) -> tuple[str, float]:
    lightweight_model = LightweightIntentModel(
        priors=artifacts.intent_priors,
        likelihoods=artifacts.token_likelihoods,
        vocabulary=artifacts.vocabulary,
    )
    return lightweight_model.predict(text)


@lru_cache(maxsize=256)
def analyze_text_cached(cache_key: str) -> dict[str, Any]:
    payload = json.loads(cache_key)
    return analyze_text(
        text=payload["text"],
        auto_correct=payload.get("auto_correct", True),
        target_language=payload.get("target_language", "auto"),
        user_vocabulary=payload.get("user_vocabulary", []),
        include_suggestions=payload.get("include_suggestions", True),
    )


def analyze_text(
    text: str,
    auto_correct: bool = True,
    target_language: str = "auto",
    user_vocabulary: list[str] | None = None,
    include_suggestions: bool = True,
) -> dict[str, Any]:
    artifacts = get_artifacts()

    normalized = normalize_text(text)
    corrected = normalized

    if auto_correct:
        corrected = apply_common_corrections(corrected)
        corrected = _punctuation_restore_with_similarity(corrected.lower(), artifacts.dataset)

    boosted = boost_custom_vocabulary(corrected, user_vocabulary or [])
    detected_language = detect_language(boosted)

    translated = lightweight_translate(boosted, detected_language, target_language)
    summary = summarize_text(boosted, max_sentences=2)
    keywords = extract_keywords(boosted, limit=8)
    entities = extract_entities(boosted)

    intent, intent_prob = _intent_predict(boosted, artifacts)

    suggestions: list[str] = []
    if include_suggestions:
        if len(boosted.split()) < 5:
            suggestions.append("Add more context to improve summary quality.")
        if not entities:
            suggestions.append("Mention specific names, places, or tools for richer entity insights.")
        if detected_language != "en":
            suggestions.append("Enable target translation to generate English meeting notes.")

    confidence_score = round(min(0.98, 0.45 + (intent_prob * 0.5) + (0.03 if entities else 0.0)), 3)

    return {
        "transcript": normalized,
        "corrected_text": boosted,
        "summary": summary,
        "keywords": keywords,
        "entities": entities,
        "confidence_score": confidence_score,
        "intent": intent,
        "detected_language": detected_language,
        "translated_text": translated,
        "suggestions": suggestions,
        "model_metadata": {
            "dataset_size": len(artifacts.dataset),
            "pipeline": [
                "similarity_punctuation_restoration",
                "naive_bayes_intent_classifier",
                "rule_based_ner",
                "extractive_summarizer",
            ],
        },
    }


def analyze_with_cache(
    text: str,
    auto_correct: bool = True,
    target_language: str = "auto",
    user_vocabulary: list[str] | None = None,
    include_suggestions: bool = True,
) -> dict[str, Any]:
    key = json.dumps(
        {
            "text": text,
            "auto_correct": auto_correct,
            "target_language": target_language,
            "user_vocabulary": user_vocabulary or [],
            "include_suggestions": include_suggestions,
        },
        sort_keys=True,
    )
    return analyze_text_cached(key)


def recommended_real_datasets() -> list[dict[str, str]]:
    return [
        {
            "name": "LibriSpeech",
            "use_case": "ASR pretraining and speaker-independent transcription",
            "url": "https://www.openslr.org/12",
        },
        {
            "name": "Mozilla Common Voice",
            "use_case": "multilingual speech recognition fine-tuning",
            "url": "https://commonvoice.mozilla.org",
        },
        {
            "name": "TED-LIUM",
            "use_case": "long-form talk transcription",
            "url": "https://www.openslr.org/51",
        },
        {
            "name": "IWSLT",
            "use_case": "speech translation and multilingual captioning",
            "url": "https://iwslt.org",
        },
    ]
