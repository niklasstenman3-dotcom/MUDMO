import { STATUS_DEFS } from "../config/statuses.js";

const list = (ent) => {
  if (!ent.statuses) ent.statuses = [];
  return ent.statuses;
};

export function getStatus(target, id){
  return list(target).find(s => s.id === id) || null;
}

export function removeStatus(target, id){
  target.statuses = list(target).filter(s => s.id !== id);
}

export function addStatus(target, id, { intensity=1, duration=null, sourceId=null } = {}){
  const def = STATUS_DEFS[id];
  if (!def) return null;
  const statuses = list(target);
  const ex = statuses.find(s=>s.id===id);
  const dur = duration ?? def.duration ?? null;
  if (!ex){
    const inst = { id, intensity:Math.max(1,intensity), remaining:dur, nextTickAt:def.tickEvery?0:null, sourceId };
    statuses.push(inst);
    return inst;
  }
  if (def.stacking === "none") return ex;
  if (def.stacking === "refresh"){
    ex.remaining = dur;
    return ex;
  }
  if (def.stacking === "intensity"){
    const cap = def.intensityCap ?? 99;
    ex.intensity = Math.min(cap, ex.intensity + Math.max(1,intensity));
    ex.remaining = dur;
  }
  return ex;
}

export function applyVerbStatusClears(target, verbId){
  const statuses = [...list(target)];
  for (const st of statuses){
    const def = STATUS_DEFS[st.id];
    if (!def) continue;
    if (def.clearsOnVerbs?.includes(verbId)) removeStatus(target, st.id);
    if (def.reduceOnVerbs?.[verbId]){
      st.intensity = Math.max(0, st.intensity - def.reduceOnVerbs[verbId]);
      if (st.intensity <= 0) removeStatus(target, st.id);
    }
  }
}

export function tickStatuses(entities, ctx){
  const dt = ctx?.dt ?? 0.2;
  for (const ent of entities){
    const statuses = [...list(ent)];
    for (const st of statuses){
      const def = STATUS_DEFS[st.id];
      if (!def) continue;
      if (def.tickEvery){
        st.nextTickAt ??= (ctx.time + def.tickEvery);
        if (ctx.time >= st.nextTickAt){
          if (st.id === "bleeding" && ent.combatant){
            ent.combatant.hp = Math.max(0, ent.combatant.hp - (st.intensity || 1));
          }
          st.nextTickAt += def.tickEvery;
        }
      }
      if (!def.untilCleared && typeof st.remaining === "number"){
        st.remaining -= dt;
        if (st.remaining <= 0) removeStatus(ent, st.id);
      }
    }
  }
}
