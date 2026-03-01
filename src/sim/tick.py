from src.core.context import SimContext


def tick_statuses(ctx: SimContext, status_defs: dict, dt: float) -> None:
    ctx.time_t += dt
    for ent in ctx.entities.values():
        kept = []
        for st in ent.statuses:
            sdef = status_defs.get(st.id, {})
            st.elapsed += dt
            if st.remaining is not None:
                st.remaining -= dt

            tick = sdef.get("tick", {})
            every = tick.get("every_time")
            if every and st.elapsed >= every:
                st.elapsed = 0.0
                if st.id == "bleeding" and ent.has_component("combatant"):
                    dmg = int(tick.get("hp_damage_per_intensity", 1) * st.intensity)
                    ent.comp("combatant")["hp"] = max(0, ent.comp("combatant")["hp"] - dmg)

            if st.remaining is not None and st.remaining <= 0:
                continue

            if st.id == "bleeding":
                min_i = sdef.get("clears", {}).get("min_intensity_to_persist", 1)
                if st.intensity < min_i:
                    continue
            kept.append(st)
        ent.statuses = kept
