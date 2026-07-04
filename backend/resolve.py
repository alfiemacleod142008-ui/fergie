from crops import CROPS, SYNONYMS
from llm import resolve_crop


def _from_kb(name):
    return {"name": name, **CROPS[name]}


def resolve(text, local_only=False):
    if not text or not text.strip():
        return None
    key = text.strip().lower()
    if key in CROPS:
        return _from_kb(key)
    if key in SYNONYMS:
        return _from_kb(SYNONYMS[key])
    if key.endswith("es") and key[:-2] in CROPS:
        return _from_kb(key[:-2])
    if key.endswith("s") and key[:-1] in CROPS:
        return _from_kb(key[:-1])
    for word in key.split():
        if word in CROPS:
            return _from_kb(word)
        if word in SYNONYMS:
            return _from_kb(SYNONYMS[word])
        if word.endswith("es") and word[:-2] in CROPS:
            return _from_kb(word[:-2])
        if word.endswith("s") and word[:-1] in CROPS:
            return _from_kb(word[:-1])
    if local_only:
        return None
    return resolve_crop(text)


if __name__ == "__main__":
    import json
    import sys

    print(json.dumps(resolve(sys.argv[1] if len(sys.argv) > 1 else "spuds"), indent=2))
