from __future__ import annotations

from typing import Any, Dict

from src.core.entity import Entity


def choose_verb(ai_cfg: Dict[str, Any], self_entity: Entity, target: Entity, verbs: Dict[str, Any]) -> str:
    weights = dict(ai_cfg.get("weights", {}))
    rules = ai_cfg.get("rules", [])

    target_prone = target.status("prone") is not None
    stamina_ratio = 0.0
    hp_ratio = 1.0
    if self_entity.has_component("combatant"):
        c = self_entity.comp("combatant")
        if c.get("stamina_max", 0):
            stamina_ratio = c.get("stamina", 0) / c.get("stamina_max", 1)
        if c.get("hp_max", 0):
            hp_ratio = c.get("hp", 0) / c.get("hp_max", 1)

    for rule in rules:
        cond = rule.get("if", "")
        prefer = rule.get("prefer", rule.get("then_prefer", []))
        if "target.status.prone" in cond and target_prone:
            for v in prefer:
                weights[v] = weights.get(v, 0.0) + 0.4
        if "self.stamina" in cond and stamina_ratio < 0.2:
            for v in prefer:
                weights[v] = weights.get(v, 0.0) + 0.4
        if "self.hp_pct" in cond and hp_ratio < 0.18:
            do = rule.get("do")
            if do:
                weights[do] = weights.get(do, 0.0) + 1.0

    candidates = [v for v in weights.keys() if v in verbs]
    if not candidates:
        return "observe"

    candidates.sort(key=lambda v: (-weights[v], v))
    return candidates[0]
