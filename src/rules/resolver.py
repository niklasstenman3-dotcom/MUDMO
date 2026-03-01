from __future__ import annotations

from dataclasses import asdict
from typing import Any, Dict

from src.core.components import StatusInstance
from src.core.context import SimContext
from src.core.entity import Entity
from .materials import material_ono, material_resist
from .outcome import Outcome
from .soundhooks import noise_to_hook
from .status_defs import can_apply_status
from .textgen import build_text
from .verb_defs import validate_verb


def _tier_from_delta(delta: float) -> str:
    if delta < -5:
        return "fail"
    if delta <= 2:
        return "partial"
    if delta <= 10:
        return "solid"
    return "critical"


def _has_requirements(actor: Entity, requires: list[str]) -> bool:
    skills = actor.components.get("skills")
    data = skills.data if skills else {}
    for req in requires:
        if data.get(req, 0) <= 0:
            return False
    return True


def _apply_status(target: Entity, status_id: str, intensity: int, status_defs: Dict[str, Any]) -> dict[str, Any] | None:
    if not status_id:
        return None
    sdef = status_defs.get(status_id)
    if not sdef:
        return None
    if not can_apply_status(sdef, set(target.components.keys())):
        return None

    stacking = sdef.get("stacking", "refresh")
    cap = int(sdef.get("cap_intensity", 99))
    existing = target.status(status_id)

    if existing is None:
        target.statuses.append(
            StatusInstance(
                id=status_id,
                intensity=max(1, intensity),
                remaining=sdef.get("duration_time"),
            )
        )
        return {"status": status_id, "intensity": max(1, intensity), "mode": "new"}

    if stacking == "none":
        return {"status": status_id, "intensity": existing.intensity, "mode": "kept"}
    if stacking == "refresh":
        existing.remaining = sdef.get("duration_time", existing.remaining)
        return {"status": status_id, "intensity": existing.intensity, "mode": "refresh"}
    if stacking == "intensity":
        existing.intensity = min(cap, existing.intensity + max(1, intensity))
        existing.remaining = sdef.get("duration_time", existing.remaining)
        return {"status": status_id, "intensity": existing.intensity, "mode": "stack"}
    return None


def resolve_action(
    ctx: SimContext,
    actor_id: str,
    verb_id: str,
    target_id: str,
    *,
    verbs: Dict[str, Any],
    materials: Dict[str, Any],
    statuses: Dict[str, Any],
    subtarget: str | None = None,
) -> Dict[str, Any]:
    actor = ctx.get(actor_id)
    target = ctx.get(target_id)
    verb = validate_verb(verb_id, verbs)

    cost = verb.get("cost", {})
    requires = verb.get("requires", [])
    effect = verb.get("effect", {})
    target_reqs = set(verb.get("targets", {}).get("needs_any_of", []))

    out = Outcome(
        actor_id=actor_id,
        target_id=target_id,
        verb_id=verb_id,
        tier="fail",
        success=False,
        partial=False,
        time_cost=float(cost.get("time", 1.0)),
        stamina_cost=float(cost.get("stamina", 0.0)),
        noise=float(cost.get("noise", 0.0)),
    )

    act_combat = actor.components.get("combatant")
    if act_combat:
        if act_combat.data.get("stamina", 0) < out.stamina_cost:
            out.fail_reason = "not_enough_stamina"
            text = build_text("...", actor.name, verb_id, target.name, "fail")
            return {"outcome": asdict(out), "text": asdict(text), "sound_hook": noise_to_hook(out.noise)}

    if not _has_requirements(actor, requires):
        out.fail_reason = "missing_tool_requirement"
        text = build_text("...", actor.name, verb_id, target.name, "fail")
        return {"outcome": asdict(out), "text": asdict(text), "sound_hook": noise_to_hook(out.noise)}

    if target_reqs and not target_reqs.intersection(target.components.keys()):
        out.fail_reason = "incompatible_target"
        out.noise *= 0.5
        text = build_text("...", actor.name, verb_id, target.name, "fail")
        return {"outcome": asdict(out), "text": asdict(text), "sound_hook": noise_to_hook(out.noise)}

    kind = effect.get("kind", "manipulation")
    intent = effect.get("intent", "act")
    base_power = float(effect.get("base_power", 0))

    skill_bonus = 0.0
    skills = actor.components.get("skills")
    if skills:
        skill_bonus += float(skills.data.get("athletics", 0))

    stamina_spend_bonus = 0.2 * out.stamina_cost
    actor_power = base_power + skill_bonus + stamina_spend_bonus

    resist = material_resist(materials, target.material_primary, kind)
    defense = resist * 10.0
    if target.status("off_balance"):
        defense -= 1.5

    delta = actor_power - defense
    tier = _tier_from_delta(delta)
    out.tier = tier
    out.success = tier in {"solid", "critical"}
    out.partial = tier == "partial"

    # apply component-state and damage effects
    if kind in {"edge", "blunt", "pierce"} and tier != "fail":
        if target.has_component("combatant"):
            hp_dmg = max(1, int((delta if delta > 0 else 1) // 2))
            if tier == "critical":
                hp_dmg += 3
            target.comp("combatant")["hp"] = max(0, target.comp("combatant")["hp"] - hp_dmg)
            out.changes["hp_damage"] = hp_dmg
        if target.has_component("integrity"):
            mult = 1.0
            if target.status("cracked"):
                mult = float(statuses.get("cracked", {}).get("mods", {}).get("incoming_damage_mult", 1.25))
            i_dmg = max(1, int((delta if delta > 0 else 1) // 2 * mult))
            target.comp("integrity")["current"] = max(0, target.comp("integrity")["current"] - i_dmg)
            out.changes["integrity_damage"] = i_dmg
    elif kind == "torsion" and tier != "fail":
        if target.has_component("lockable"):
            if intent in {"unlock", "separate", "force_mechanism"}:
                if tier == "critical" or delta > target.comp("lockable").get("lock_quality", 5):
                    target.comp("lockable")["is_locked"] = False
                    out.changes["unlocked"] = True
                elif tier == "partial":
                    out.changes["lock_stressed"] = True
        if target.has_component("integrity"):
            i_dmg = 2 if tier == "partial" else 6 if tier == "solid" else 10
            target.comp("integrity")["current"] = max(0, target.comp("integrity")["current"] - i_dmg)
            out.changes["integrity_damage"] = i_dmg
    elif kind == "manipulation":
        if intent == "open":
            if target.has_component("lockable") and target.comp("lockable").get("is_locked", False):
                out.fail_reason = "locked"
                out.tier = "fail"
                out.success = False
            elif target.has_component("openable"):
                target.comp("openable")["is_open"] = True
                out.success = True
                out.tier = "solid"
                out.changes["opened"] = True
        elif intent == "unlock":
            if target.has_component("lockable"):
                lock_q = target.comp("lockable").get("lock_quality", 5)
                lockwork = actor.components.get("skills", None)
                lockwork_val = (lockwork.data.get("lockwork", 0) if lockwork else 0)
                if lockwork_val + base_power >= lock_q:
                    target.comp("lockable")["is_locked"] = False
                    out.success = True
                    out.tier = "solid"
                    out.changes["unlocked"] = True
                else:
                    out.success = False
                    out.tier = "fail"
                    out.fail_reason = "lockwork_too_low"
        elif intent == "bar" and target.has_component("barrable"):
            target.comp("barrable")["is_barred"] = True
            out.success = True
            out.tier = "solid"
            out.changes["barred"] = True
    elif kind == "displacement" and tier != "fail":
        sid = "prone" if intent == "destabilize" else "off_balance"
        rec = _apply_status(target, sid, 1, statuses)
        if rec:
            out.statuses_applied.append(rec)
    elif kind == "control" and tier != "fail":
        sid = effect.get("applies_status") or "restrained"
        rec = _apply_status(target, sid, 1, statuses)
        if rec:
            out.statuses_applied.append(rec)
    elif kind == "perception":
        out.success = True
        out.tier = "solid"
        out.info = {
            "target_components": list(target.components.keys()),
            "target_statuses": [s.id for s in target.statuses],
        }

    # derived cracked status from integrity threshold
    if target.has_component("integrity"):
        integ = target.comp("integrity")
        if integ.get("current", 0) <= integ.get("fracture_threshold", 0):
            rec = _apply_status(target, "cracked", 1, statuses)
            if rec:
                out.statuses_applied.append(rec)

    # default status from verb
    if tier in {"partial", "solid", "critical"} and effect.get("applies_status"):
        intensity = int(effect.get("status_intensity", 1))
        if tier == "critical":
            intensity += 1
        rec = _apply_status(target, effect["applies_status"], intensity, statuses)
        if rec:
            out.statuses_applied.append(rec)

    # spend stamina/time
    if act_combat:
        act_combat.data["stamina"] = max(0, act_combat.data.get("stamina", 0) - out.stamina_cost)

    ctx.time_t += out.time_cost

    out.noise = out.noise * (1.5 if tier == "critical" else 1.0 if tier == "solid" else 0.7 if tier == "partial" else 0.4)

    ono = material_ono(materials, target.material_primary, kind, out.tier)
    text = build_text(ono, actor.name, verb_id, target.name, out.tier)
    return {"outcome": asdict(out), "text": asdict(text), "sound_hook": noise_to_hook(out.noise)}
