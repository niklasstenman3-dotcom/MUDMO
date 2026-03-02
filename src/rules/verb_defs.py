from typing import Any, Dict


def validate_verb(verb_id: str, verbs: Dict[str, Any]) -> Dict[str, Any]:
    if verb_id not in verbs:
        raise KeyError(f"Unknown verb: {verb_id}")
    return verbs[verb_id]
