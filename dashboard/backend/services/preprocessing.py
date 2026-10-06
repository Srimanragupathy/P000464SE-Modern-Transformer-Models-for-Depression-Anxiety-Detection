import re
from collections import defaultdict

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

MASK_REPLACEMENT = "[MASK]"

MULTISPACE_PATTERN = re.compile(r"[ \t]+")
EXCESS_NEWLINE_PATTERN = re.compile(r"\n{3,}")

SECTION_HEADER_PATTERN = re.compile(
    r"^[ \t]*([A-Z][A-Za-z][A-Za-z /,'&\-]{1,58}):",
    re.MULTILINE,
)

SECTION_PROFILES = {
    "clinical": [
        "past medical history",
        "chief complaint",
        "history of present illness",
        "social history",
        "medications on admission",
        "discharge medications",
        "brief hospital course",
    ],
}


def prepare_text(value):
    if not isinstance(value, str):
        return ""

    value = value.replace("\x00", " ")
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = MULTISPACE_PATTERN.sub(" ", value)
    value = EXCESS_NEWLINE_PATTERN.sub("\n\n", value)

    return value.strip()


def split_sections(text):
    output = defaultdict(list)
    headings = list(SECTION_HEADER_PATTERN.finditer(text))

    if not headings:
        return {"(preamble)": text}

    if headings[0].start() > 0:
        output["(preamble)"].append(text[:headings[0].start()])

    for heading_number, heading in enumerate(headings):
        if heading_number + 1 < len(headings):
            end = headings[heading_number + 1].start()
        else:
            end = len(text)

        normalized_heading = " ".join(
            heading.group(1).split()
        ).lower()

        output[normalized_heading].append(
            text[heading.end():end]
        )

    return {
        heading: "\n".join(section_bodies)
        for heading, section_bodies in output.items()
    }


def extract_sections_with_status(text, profile="clinical"):
    if not isinstance(text, str) or not text:
        return "", 0, False, []

    if not profile or profile == "none":
        return text, 0, False, []

    sections = split_sections(text)
    selected_parts = []
    selected_section_names = []

    for section_name in SECTION_PROFILES[profile]:
        section_body = sections.get(section_name, "").strip()

        if section_body:
            selected_parts.append(
                f"{section_name}: {section_body}"
            )
            selected_section_names.append(section_name)

    if selected_parts:
        return (
            "\n\n".join(selected_parts),
            len(selected_parts),
            False,
            selected_section_names,
        )

    return text, 0, True, []


def mask_explicit_condition_terms(text):
    if not text:
        return ""

    return LEAK_PATTERN.sub(MASK_REPLACEMENT, text)


def preprocess_note(note):
    cleaned_text = prepare_text(note)

    (
        selected_text,
        matched_section_count,
        used_full_text_fallback,
        matched_sections,
    ) = extract_sections_with_status(
        cleaned_text,
        profile="clinical",
    )

    masked_text = mask_explicit_condition_terms(selected_text)

    return {
        "cleaned_text": cleaned_text,
        "selected_text": selected_text,
        "masked_text": masked_text,
        "matched_section_count": matched_section_count,
        "matched_sections": matched_sections,
        "used_full_text_fallback": used_full_text_fallback,
        "original_character_count": len(cleaned_text),
        "selected_character_count": len(selected_text),
    }