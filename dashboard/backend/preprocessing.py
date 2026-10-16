import re


TARGET_SECTION_ALIASES = {
    "past medical history": "past medical history",
    "pmh": "past medical history",
    "chief complaint": "chief complaint",
    "chief complaints": "chief complaint",
    "cc": "chief complaint",
    "history of present illness": "history of present illness",
    "history present illness": "history of present illness",
    "hpi": "history of present illness",
    "medications on admission": "medications on admission",
    "admission medications": "medications on admission",
    "preadmission medications": "medications on admission",
    "discharge medications": "discharge medications",
    "medications on discharge": "discharge medications",
    "brief hospital course": "brief hospital course",
    "hospital course": "brief hospital course",
}

SECTION_ORDER = (
    "past medical history",
    "chief complaint",
    "history of present illness",
    "medications on admission",
    "discharge medications",
    "brief hospital course",
)

DEP_LEAK_PATTERN = re.compile(
    r"\b(?:depress\w*|dysthymi\w*|MDD|major depressive(?: disorder)?)\b",
    re.IGNORECASE,
)

ANX_LEAK_PATTERN = re.compile(
    r"\b(?:anxi\w*|panic(?: disorder)?|phobi\w*|agoraphob\w*|"
    r"GAD|generali[sz]ed anxiety(?: disorder)?)\b",
    re.IGNORECASE,
)

LEAK_PATTERN = re.compile(
    f"(?:{DEP_LEAK_PATTERN.pattern})|(?:{ANX_LEAK_PATTERN.pattern})",
    re.IGNORECASE,
)

HEADER_PATTERN = re.compile(
    r"(?im)^\s*([a-z][a-z0-9 /&()'_-]{1,79})\s*:\s*"
)


def _normalise_heading(value: str) -> str:
    value = value.lower().replace("_", " ").replace("-", " ")
    return re.sub(r"\s+", " ", value).strip()


def clean_text(text: str) -> str:
    text = text.replace("\x00", " ").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[\t\f\v]+", " ", text)
    text = re.sub(r"[ ]{2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def select_clinical_sections(text: str) -> tuple[str, list[str]]:
    cleaned = clean_text(text)
    matches = list(HEADER_PATTERN.finditer(cleaned))
    collected = {name: [] for name in SECTION_ORDER}

    for index, match in enumerate(matches):
        heading = _normalise_heading(match.group(1))
        canonical = TARGET_SECTION_ALIASES.get(heading)
        if canonical is None:
            continue
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(cleaned)
        content = clean_text(cleaned[start:end])
        if content:
            collected[canonical].append(content)

    selected_sections = [name for name in SECTION_ORDER if collected[name]]
    if not selected_sections:
        return cleaned, []

    selected_text = "\n\n".join(
        f"{section}: {' '.join(collected[section])}" for section in selected_sections
    )
    return clean_text(selected_text), selected_sections


def mask_explicit_condition_terms(text: str, task: str) -> str:
    if task not in {"depression", "anxiety"}:
        raise ValueError(f"Unsupported task: {task}")
    return LEAK_PATTERN.sub("[MASK]", text)


def preprocess_note(note: str, task: str) -> tuple[str, dict]:
    selected_text, selected_sections = select_clinical_sections(note)
    processed = mask_explicit_condition_terms(selected_text, task)
    processed = clean_text(processed)
    return processed, {
        "selected_sections": selected_sections,
        "used_selected_sections": bool(selected_sections),
        "fallback_to_full_note": not bool(selected_sections),
        "depression_and_anxiety_terms_masked": True,
    }
