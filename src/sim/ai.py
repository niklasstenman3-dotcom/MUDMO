from __future__ import annotations

from typing import Any, Dict

from src.core.entity import Entity


def choose_verb(ai_cfg: Dict[str, Any], self_entity: Entity, target: Entity, verbs: Dict[str, Any]) -> str:
    weights = dict(ai_cfg.get("weights", {}))
    rules = ai_cfg.get("rules", [])

    target_prone = target.status("prone") is not None
    stamina_ratio = 0.0
    if self_entity.has_component("combatant"):
        c = self_entity.comp("combatant")
        if c.get("stamina_max", 0):
            stamina_ratio = c.get("stamina", 0) / c.get("stamina_max", 1)

    for rule in rules:
        cond = rule.get("if", "")
        if "target.status.prone" in cond and target_prone:
            for v in rule.get("then_prefer", []):
                weights[v] = weights.get(v, 0.0) + 0.4
        if "self.stamina < 0.2" in cond and stamina_ratio < 0.2:
            for v in rule.get("then_prefer", []):
                weights[v] = weights.get(v, 0.0) + 0.4

    candidates = [v for v in weights.keys() if v in verbs]
    if not candidates:
        return "observe"

    # deterministic pick: highest score, then lexical tie-break
    candidates.sort(key=lambda v: (-weights[v], v))
    return candidates[0]
