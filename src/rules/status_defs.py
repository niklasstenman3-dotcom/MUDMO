from typing import Any, Dict


def can_apply_status(status_def: Dict[str, Any], target_components: set[str]) -> bool:
    applies_to = set(status_def.get("applies_to", []))
    return bool(applies_to.intersection(target_components))
