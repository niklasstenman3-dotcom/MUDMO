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


IMPACT_VERBS = {"pound", "crush", "slam", "ram", "bash"}
EDGE_VERBS = {"slice", "cleave", "carve", "sever", "shred"}
PIERCE_VERBS = {"thrust", "pierce", "impale", "probe"}
TORSION_VERBS = {"pry", "wrench", "torque", "bend", "snap", "jam"}
DISPLACEMENT_VERBS = {"shove", "pull", "drag", "lift", "drop", "flip", "throw", "hook"}
CONTROL_VERBS = {"grapple", "pin", "restrain", "release", "trip", "choke", "brace", "guard", "block", "parry", "disarm", "interrupt", "unbalance"}
MOVEMENT_VERBS = {"move", "walk", "run", "sprint", "retreat", "advance", "climb", "descend", "leap", "crawl", "swim", "mount", "dismount"}
PERCEPTION_VERBS = {"observe", "inspect"}


def _tier_from_delta(delta: float) -> str:
    if delta < -5:
        return "fail"
    if delta <= 2:
        return "partial"
    if delta <= 10:
        return "solid"
    return "critical"


def _has_any(actor: Entity, names: list[str]) -> bool:
    skills = actor.components.get("skills")
    data = skills.data if skills else {}
    for req in names:
        if data.get(req, data.get(req.replace("tool_", "weapon_"), 0)) > 0:
            return True
    return False


def _has_requirements(actor: Entity, requires: list[str], verb_id: str) -> bool:
    if not requires:
        return True
    # Allow broad OR cases requested by design notes.
    if verb_id in {"pound", "crush", "slam", "ram"}:
        return _has_any(actor, ["tool_blunt", "weapon_blunt", "athletics", "grappling"])
    if verb_id in {"thrust"}:
        return _has_any(actor, ["tool_point", "weapon_point", "tool_edge", "weapon_edge"])
    if verb_id in {"wrench"}:
        return _has_any(actor, ["tool_leverage", "tool_blunt", "weapon_blunt"])
    return _has_any(actor, list(requires))


def _apply_status(target: Entity, status_id: str, intensity: int, status_defs: Dict[str, Any]) -> dict[str, Any] | None:
    if not status_id:
        return None
    sdef = status_defs.get(status_id)
    if not sdef:
        return None
    if not can_apply_status(sdef, set(target.components.keys())):
        return None

    stacking = sdef.get("stacking", "refresh")
    cap = int(sdef.get("cap_intensity", sdef.get("intensity_cap", 99)))
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


def _scale_damage(base: float, tier: str) -> int:
    mult = 0.0 if tier == "fail" else 0.65 if tier == "partial" else 1.0 if tier == "solid" else 1.35
    return max(0, int(round(base * mult)))


def _damage_target(target: Entity, hp_dmg: int, int_dmg: int, out: Outcome) -> None:
    if hp_dmg > 0 and target.has_component("combatant"):
        c = target.comp("combatant")
        c["hp"] = max(0, c.get("hp", 0) - hp_dmg)
        out.changes["hp_damage"] = out.changes.get("hp_damage", 0) + hp_dmg
    if int_dmg > 0 and target.has_component("integrity"):
        i = target.comp("integrity")
        i["current"] = max(0, i.get("current", 0) - int_dmg)
        out.changes["integrity_damage"] = out.changes.get("integrity_damage", 0) + int_dmg


def _target_has_any(target: Entity, target_reqs: set[str]) -> bool:
    return not target_reqs or bool(target_reqs.intersection(target.components.keys()))


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
    if act_combat and act_combat.data.get("stamina", 0) < out.stamina_cost:
        out.fail_reason = "not_enough_stamina"
        text = build_text("...", actor.name, verb_id, target.name, "fail")
        return {"outcome": asdict(out), "text": asdict(text), "sound_hook": noise_to_hook(out.noise)}

    if not _has_requirements(actor, requires, verb_id):
        out.fail_reason = "missing_tool_requirement"
        text = build_text("...", actor.name, verb_id, target.name, "fail")
        return {"outcome": asdict(out), "text": asdict(text), "sound_hook": noise_to_hook(out.noise)}

    if not _target_has_any(target, target_reqs):
        out.fail_reason = "incompatible_target"
        out.noise *= 0.6
        # good-fail: still spend effort/time/noise for attempted global verbs
        if act_combat:
            act_combat.data["stamina"] = max(0, act_combat.data.get("stamina", 0) - max(0.5, out.stamina_cost * 0.5))
        ctx.time_t += out.time_cost
        text = build_text("...", actor.name, verb_id, target.name, "fail")
        return {"outcome": asdict(out), "text": asdict(text), "sound_hook": noise_to_hook(out.noise)}

    kind = effect.get("kind", "manipulation")
    intent = effect.get("intent", "act")
    base_power = float(effect.get("base_power", 0))
    dmg_cfg = effect.get("damage", {})

    skills = actor.components.get("skills")
    skill_data = skills.data if skills else {}
    combat = actor.components.get("combatant")

    skill_bonus = float(skill_data.get("athletics", 0)) * 0.4
    if verb_id in EDGE_VERBS:
        skill_bonus += float(skill_data.get("weapon_edge", skill_data.get("tool_edge", 0))) * 0.7
    if verb_id in IMPACT_VERBS:
        skill_bonus += float(skill_data.get("weapon_blunt", skill_data.get("tool_blunt", 0))) * 0.7
    if verb_id in PIERCE_VERBS:
        skill_bonus += float(skill_data.get("weapon_point", skill_data.get("tool_point", 0))) * 0.7
    if verb_id in TORSION_VERBS:
        skill_bonus += float(skill_data.get("tool_leverage", 0)) * 0.8
    if verb_id in CONTROL_VERBS:
        skill_bonus += float(skill_data.get("grappling", 0)) * 0.6

    actor_power = base_power + skill_bonus + 0.15 * out.stamina_cost

    resist = material_resist(materials, target.material_primary, kind)
    defense = resist * 10.0
    if target.status("off_balance"):
        defense -= 1.5
    if actor.status("off_balance"):
        defense += 0.8

    delta = actor_power - defense
    tier = _tier_from_delta(delta)
    out.tier = tier
    out.success = tier in {"solid", "critical"}
    out.partial = tier == "partial"

    base_hp = float(dmg_cfg.get("hp", max(0.0, base_power * 0.7)))
    base_int = float(dmg_cfg.get("integrity", max(0.0, base_power * 0.6)))

    if verb_id in IMPACT_VERBS | EDGE_VERBS | PIERCE_VERBS | TORSION_VERBS:
        hp_dmg = _scale_damage(base_hp, tier)
        int_dmg = _scale_damage(base_int, tier)

        if verb_id == "crush":
            out.stamina_cost *= 1.25
            out.time_cost *= 1.2
            out.noise *= 1.15
            hp_dmg = int(hp_dmg * 1.2)
            int_dmg = int(int_dmg * 1.2)
        elif verb_id == "ram":
            out.stamina_cost *= 1.25
            out.noise *= 1.2
            if combat and tier != "fail":
                recoil = 1 if tier == "partial" else 2
                combat.data["hp"] = max(0, combat.data.get("hp", 0) - recoil)
                out.changes["self_recoil_hp"] = recoil
        elif verb_id == "sever":
            hp_dmg = int(hp_dmg * 1.4)
            int_dmg = int(int_dmg * 1.4)
        elif verb_id == "probe":
            hp_dmg = max(0, int(hp_dmg * 0.35))
            int_dmg = max(0, int(int_dmg * 0.35))
            out.info["material"] = target.material_primary
            out.info["target_components"] = list(target.components.keys())
        elif verb_id == "shred":
            hp_dmg = hp_dmg + (1 if tier in {"solid", "critical"} else 0)

        _damage_target(target, hp_dmg, int_dmg, out)

        # mechanical toggles for torsion
        if verb_id in {"pry", "wrench", "torque", "jam"} and target.has_component("lockable"):
            lockable = target.comp("lockable")
            if verb_id == "jam":
                rec = _apply_status(target, "jammed", 1, statuses)
                if rec:
                    out.statuses_applied.append(rec)
                    out.changes["jammed"] = True
            elif tier in {"solid", "critical"} and lockable.get("locked"):
                if verb_id in {"pry", "wrench"} or delta >= float(lockable.get("lock_quality", 5)):
                    lockable["locked"] = False
                    out.changes["unlocked"] = True

        # displacement side effects from impact/torsion attempts
        if verb_id in {"slam", "shove", "pull", "hook", "throw", "advance", "retreat"} and target.has_component("movable"):
            mov = target.comp("movable")
            cur = int(mov.get("offset", 0))
            shift = 0
            if verb_id in {"slam", "shove", "hook", "throw", "retreat"}:
                shift = 1 if tier in {"partial", "solid"} else 2 if tier == "critical" else 0
            elif verb_id in {"pull", "advance"}:
                shift = -1 if tier != "fail" else 0
            if shift:
                mov["offset"] = cur + shift
                out.changes["offset"] = mov["offset"]

    elif verb_id in DISPLACEMENT_VERBS:
        mov = target.comp("movable") if target.has_component("movable") else {}
        cur = int(mov.get("offset", 0))
        if verb_id == "shove":
            mov["offset"] = cur + (1 if tier != "fail" else 0)
        elif verb_id == "pull":
            mov["offset"] = cur - (1 if tier != "fail" else 0)
        elif verb_id == "lift":
            if mov:
                mov["elevated"] = tier in {"partial", "solid", "critical"}
                out.changes["elevated"] = mov.get("elevated", False)
        elif verb_id == "drop":
            if mov:
                mov["elevated"] = False
                out.changes["elevated"] = False
        elif verb_id == "flip":
            if mov and not mov.get("anchored", False):
                mov["orientation"] = "flipped"
                out.changes["orientation"] = "flipped"
            else:
                out.fail_reason = "anchored"
                out.tier = "fail"
                out.success = False
        elif verb_id == "throw":
            if mov:
                mov["offset"] = cur + (2 if tier in {"solid", "critical"} else 1 if tier == "partial" else 0)
                out.changes["offset"] = mov.get("offset", cur)
                _damage_target(target, _scale_damage(base_hp * 0.5, tier), _scale_damage(base_int * 0.6, tier), out)

    elif verb_id in CONTROL_VERBS:
        if verb_id in {"grapple", "restrain"} and tier != "fail":
            rec = _apply_status(target, "restrained", 1 if verb_id == "grapple" else 2 if tier == "critical" else 1, statuses)
            if rec:
                out.statuses_applied.append(rec)
        elif verb_id == "pin" and tier != "fail":
            if target.status("restrained") or target.status("prone") or tier == "critical":
                rec = _apply_status(target, "pinned", 1, statuses)
                if rec:
                    out.statuses_applied.append(rec)
            else:
                out.fail_reason = "needs_advantage"
                out.tier = "fail"
                out.success = False
        elif verb_id == "release":
            before = len(target.statuses)
            target.statuses = [s for s in target.statuses if s.id not in {"restrained", "pinned"}]
            out.changes["released"] = before - len(target.statuses)
            out.success = True
            out.tier = "solid"
        elif verb_id in {"trip", "unbalance"} and tier != "fail":
            sid = "prone" if verb_id == "trip" and tier == "critical" else "off_balance"
            rec = _apply_status(target, sid, 1, statuses)
            if rec:
                out.statuses_applied.append(rec)
        elif verb_id == "choke" and tier != "fail":
            if target.has_component("anatomy"):
                rec = _apply_status(target, "winded", 1, statuses)
                if rec:
                    out.statuses_applied.append(rec)
                if target.has_component("combatant"):
                    tc = target.comp("combatant")
                    tc["stamina"] = max(0, tc.get("stamina", 0) - (2 if tier == "critical" else 1))
                    out.changes["target_stamina_drain"] = 2 if tier == "critical" else 1
            else:
                out.fail_reason = "no_anatomy"
                out.tier = "fail"
                out.success = False
        elif verb_id == "brace":
            if combat:
                combat.data["poise"] = min(combat.data.get("poise_max", 0), combat.data.get("poise", 0) + 3)
                combat.data["guard"] = min(combat.data.get("guard_max", 0), combat.data.get("guard", 0) + 2)
                actor.statuses = [s for s in actor.statuses if s.id != "off_balance"]
                out.changes["poise"] = combat.data.get("poise")
                out.changes["guard"] = combat.data.get("guard")
            out.success = True
            out.tier = "solid"
        elif verb_id == "guard":
            if combat:
                combat.data["guard"] = min(combat.data.get("guard_max", 0), combat.data.get("guard", 0) + 3)
                out.changes["guard"] = combat.data.get("guard")
            out.success = True
            out.tier = "solid"
        elif verb_id in {"block", "parry"}:
            if not hasattr(actor, "flags"):
                actor.flags = {}
            actor.flags["blocking" if verb_id == "block" else "parrying"] = True
            out.success = True
            out.tier = "solid"
        elif verb_id == "disarm":
            eq = target.components.get("equipment")
            if eq and eq.data.get("weapon"):
                eq.data["weapon"] = None
                out.changes["disarmed"] = True
                out.success = True
                out.tier = "solid"
            else:
                out.fail_reason = "no_weapon"
                out.tier = "fail"
                out.success = False
        elif verb_id == "interrupt":
            if hasattr(target, "pending_action") and target.pending_action:
                target.pending_action = None
                out.changes["interrupted"] = True
                out.success = True
                out.tier = "solid"
            else:
                out.fail_reason = "no_opening"
                out.tier = "fail"
                out.success = False

    elif kind == "manipulation":
        lockable = target.comp("lockable") if target.has_component("lockable") else None
        openable = target.comp("openable") if target.has_component("openable") else None
        barrable = target.comp("barrable") if target.has_component("barrable") else None
        container = target.comp("container") if target.has_component("container") else None
        movable = target.comp("movable") if target.has_component("movable") else None

        if verb_id == "open":
            if target.status("jammed"):
                out.fail_reason = "jammed"
                out.tier = "fail"
                out.success = False
            elif lockable and lockable.get("locked", False):
                out.fail_reason = "locked"
                out.tier = "fail"
                out.success = False
            elif barrable and barrable.get("barred", False):
                out.fail_reason = "barred"
                out.tier = "fail"
                out.success = False
            elif openable is not None:
                openable["open"] = True
                out.success = True
                out.tier = "solid"
                out.changes["opened"] = True
        elif verb_id == "close" and openable is not None:
            openable["open"] = False
            out.success = True
            out.tier = "solid"
            out.changes["opened"] = False
        elif verb_id == "lock" and lockable is not None:
            if openable and openable.get("open", False):
                out.fail_reason = "open_cannot_lock"
            else:
                lockable["locked"] = True
                out.success = True
                out.tier = "solid"
                out.changes["locked"] = True
        elif verb_id == "unlock" and lockable is not None:
            if target.status("jammed"):
                out.fail_reason = "jammed"
                out.tier = "fail"
                out.success = False
            else:
                lock_q = float(lockable.get("lock_quality", 5))
                lockwork_val = float(skill_data.get("lockwork", 0))
                if lockwork_val + base_power >= lock_q or tier in {"solid", "critical"}:
                    lockable["locked"] = False
                    out.success = True
                    out.tier = "solid"
                    out.changes["unlocked"] = True
                else:
                    out.fail_reason = "lockwork_too_low"
        elif verb_id == "bar" and barrable is not None:
            barrable["barred"] = True
            out.success = True
            out.tier = "solid"
            out.changes["barred"] = True
        elif verb_id == "seal":
            if not hasattr(target, "flags"):
                target.flags = {}
            target.flags["sealed"] = True
            out.success = True
            out.tier = "solid"
        elif verb_id == "anchor" and movable is not None:
            movable["anchored"] = True
            out.success = True
            out.tier = "solid"
            out.changes["anchored"] = True
        elif verb_id in {"insert", "remove"} and container is not None:
            contents = container.setdefault("contents", [])
            if verb_id == "insert":
                if len(contents) < int(container.get("capacity", 999)):
                    contents.append("item")
                    out.success = True
                    out.tier = "solid"
                else:
                    out.fail_reason = "container_full"
            else:
                if contents:
                    contents.pop()
                    out.success = True
                    out.tier = "solid"
                else:
                    out.fail_reason = "container_empty"
        elif verb_id in {"activate", "deactivate", "light", "extinguish"}:
            if not hasattr(target, "flags"):
                target.flags = {}
            key = "lit" if verb_id in {"light", "extinguish"} else "active"
            target.flags[key] = verb_id in {"activate", "light"}
            out.success = True
            out.tier = "solid"
            out.changes[key] = target.flags[key]
        elif verb_id in {"reinforce", "dismantle"} and target.has_component("integrity"):
            integ = target.comp("integrity")
            if verb_id == "reinforce":
                integ["max"] = integ.get("max", 0) + 5
                integ["current"] = min(integ["max"], integ.get("current", 0) + 3)
                out.changes["integrity_max"] = integ["max"]
            else:
                integ["current"] = max(0, integ.get("current", 0) - 6)
                out.changes["integrity_damage"] = 6
            out.success = True
            out.tier = "solid"
        else:
            # Generic manipulation attempts resolve cleanly.
            out.success = tier in {"partial", "solid", "critical"}

    elif verb_id in MOVEMENT_VERBS:
        out.success = True
        out.tier = "solid" if tier == "fail" else tier
        out.info["movement"] = {"intent": intent, "verb": verb_id}

    elif verb_id in PERCEPTION_VERBS or kind == "perception":
        out.success = True
        out.tier = "solid"
        depth = 1 if verb_id == "observe" else 2
        if not hasattr(ctx, "knowledge"):
            ctx.knowledge = {}
        now = ctx.knowledge.get(target.id, {"depth": 0})
        now["depth"] = max(now.get("depth", 0), depth)
        now["components"] = list(target.components.keys())
        now["statuses"] = [s.id for s in target.statuses]
        now["material"] = target.material_primary
        ctx.knowledge[target.id] = now
        out.info = now

    # default status from data
    status_hit = effect.get("status_on_hit")
    if out.tier in {"partial", "solid", "critical"} and status_hit:
        intensity = int(status_hit.get("intensity", 1))
        if out.tier == "critical":
            intensity += 1
        rec = _apply_status(target, status_hit.get("id"), intensity, statuses)
        if rec:
            out.statuses_applied.append(rec)

    # table-specific statuses by verb family
    if out.tier in {"partial", "solid", "critical"}:
        if verb_id in {"slice", "carve", "thrust", "pierce"} and target.has_component("anatomy"):
            rec = _apply_status(target, "bleeding", 1, statuses)
            if rec:
                out.statuses_applied.append(rec)
        if verb_id in {"cleave"} and target.has_component("anatomy"):
            rec = _apply_status(target, "bleeding", 2, statuses)
            if rec:
                out.statuses_applied.append(rec)
        if verb_id in {"sever"} and target.has_component("anatomy"):
            rec = _apply_status(target, "bleeding", 3, statuses)
            if rec:
                out.statuses_applied.append(rec)
        if verb_id in {"shred"} and target.has_component("anatomy"):
            rec = _apply_status(target, "bleeding", 2 if out.tier == "critical" else 1, statuses)
            if rec:
                out.statuses_applied.append(rec)
        if verb_id in {"slam", "shove", "hook", "unbalance"}:
            rec = _apply_status(target, "off_balance", 1, statuses)
            if rec:
                out.statuses_applied.append(rec)
        if verb_id in {"bash", "pound", "interrupt"} and out.tier in {"solid", "critical"}:
            rec = _apply_status(target, "dazed", 1, statuses)
            if rec:
                out.statuses_applied.append(rec)

    # cracked derived from integrity threshold
    if target.has_component("integrity"):
        integ = target.comp("integrity")
        if integ.get("current", 0) <= integ.get("fracture_threshold", 0):
            rec = _apply_status(target, "cracked", 1, statuses)
            if rec:
                out.statuses_applied.append(rec)

    # spend stamina/time globally
    if act_combat:
        act_combat.data["stamina"] = max(0, act_combat.data.get("stamina", 0) - out.stamina_cost)

    ctx.time_t += out.time_cost

    out.noise = out.noise * (
        1.45 if out.tier == "critical"
        else 1.0 if out.tier == "solid"
        else 0.7 if out.tier == "partial"
        else 0.45
    )

    ono = material_ono(materials, target.material_primary, kind, out.tier)
    text = build_text(ono, actor.name, verb_id, target.name, out.tier)
    return {"outcome": asdict(out), "text": asdict(text), "sound_hook": noise_to_hook(out.noise)}
