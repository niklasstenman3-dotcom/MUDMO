import { VERB_BY_ID } from "../config/verbs.js";
import { MATERIALS } from "../config/materials.js";
import { STATUS_DEFS } from "../config/statuses.js";
import { addStatus, getStatus, removeStatus, applyVerbStatusClears } from "./statusEngine.js";

const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));

const NON_DAMAGE_VERBS = new Set(["observe","inspect","brace","guard","block","parry","release","move","walk","run","sprint","retreat","advance","climb","descend","leap","crawl","swim","mount","dismount"]);

function tierFromDelta(delta){
  if (delta < -2) return "fail";
  if (delta < 2) return "partial";
  if (delta < 6) return "solid";
  return "crit";
}

function asActorRuntime(actor){
  const statuses = actor.statuses || [];
  const combatant = actor.combatant || null;
  return { ...actor, statuses, combatant };
}

export function resolveVerb({ actor, verbId, target, ctx }){
  const verb = VERB_BY_ID[verbId] || VERB_BY_ID.observe;
  const out = {
    ok:false, tier:"fail", verbId:verb.id, actorId:actor.id, targetName:target?.name || "target",
    lines:[], personal:[], sound:null,
    timeSpent:verb.cost.time, noise:verb.cost.noise,
    applied:{ damageHp:0, damageIntegrity:0, statusesAdded:[], statusesCleared:[], stateChanges:[] }
  };

  const a = asActorRuntime(actor);
  const t = target;
  const tStatuses = t.statuses || (t.statuses = []);

  if (a.combatant){
    a.combatant.stamina = Math.max(0, (a.combatant.stamina ?? 0) - verb.cost.stamina);
  }
  ctx.time += verb.cost.time;
  ctx.noise = (ctx.noise || 0) + verb.cost.noise;

  applyVerbStatusClears(a, verb.id);
  applyVerbStatusClears(t, verb.id);

  if (getStatus(a,"stunned") && !verb.flags?.isPerception && verb.id !== "release"){
    out.lines.push(`You are stunned and fail to ${verb.label.toLowerCase()}.`);
    return out;
  }
  if (verb.kind === "movement" && (getStatus(a,"pinned") || getStatus(a,"restrained"))){
    out.lines.push(`You can't move while restrained.`);
    return out;
  }

  if (verb.flags?.isPerception || verb.kind === "perception"){
    const k = `${ctx.roomId}:${t.id}`;
    const depth = verb.id === "inspect" ? 2 : 1;
    const cur = ctx.knowledge?.[k] || { depth:0 };
    ctx.knowledge ||= {};
    ctx.knowledge[k] = { depth: Math.max(cur.depth, depth), lastSeenAt: ctx.time };
    const hints = [];
    if (verb.id === "observe"){
      if (t.combatant) hints.push(`${t.name} looks ${t.combatant.hp < t.combatant.hpMax*0.4 ? "wounded" : "steady"}.`);
      if (t.integrity) hints.push(`${t.name} appears ${t.integrity.current <= t.integrity.fractureThreshold ? "fractured" : "intact"}.`);
      hints.push(`It seems made of ${t.material || "unknown material"}.`);
    } else {
      if (t.lockable) hints.push(`Lock quality: ${t.lockable.lockQuality ?? "unknown"}.`);
      const bleeding = getStatus(t, "bleeding");
      if (bleeding) hints.push(`Bleeding intensity: ${bleeding.intensity}.`);
      if (t.integrity) hints.push(`Integrity ${t.integrity.current}/${t.integrity.max}.`);
    }
    out.ok = true; out.tier = "solid";
    out.lines.push(...hints);
    return out;
  }

  if (["brace","guard","block","parry"].includes(verb.id)){
    if (a.combatant){
      if (verb.id === "brace"){
        a.combatant.poise = Math.min(a.combatant.poiseMax || 999, (a.combatant.poise || 0) + 3);
        a.combatant.guard = Math.min(a.combatant.guardMax || 999, (a.combatant.guard || 0) + 2);
      } else if (verb.id === "guard"){
        a.combatant.guard = Math.min(a.combatant.guardMax || 999, (a.combatant.guard || 0) + 3);
      } else if (verb.id === "block"){
        a.combatant.guard = Math.min(a.combatant.guardMax || 999, (a.combatant.guard || 0) + 2);
      } else if (verb.id === "parry"){
        a.combatant.poise = Math.min(a.combatant.poiseMax || 999, (a.combatant.poise || 0) + 2);
      }
    }
    out.ok = true;
    out.tier = "solid";
    out.lines.push(`${verb.label} steadies your stance.`);
    out.sound = { ono:"TCHK!", hook:"soft" };
    return out;
  }

  const required = verb.requires || [];
  const missingTool = required.length && !required.some(r => a.tools?.[r]);

  const mat = MATERIALS[t.material] || MATERIALS.wood;
  const materialResist = mat.resist?.[verb.kind] ?? 0;

  const guard = t.combatant?.guard || 0;
  const poise = t.combatant?.poise || 0;
  let livingDefense = guard*0.2 + poise*0.1;
  if (getStatus(t,"off_balance")) livingDefense *= 0.75;

  let power = verb.basePower || 0;
  if (verb.kind === "edge" && a.tools?.tool_edge) power += 2;
  if (verb.kind === "impact" && a.tools?.tool_blunt) power += 2;
  if (verb.kind === "pierce" && a.tools?.tool_point) power += 2;
  if (verb.kind === "torsion" && a.tools?.tool_leverage) power += 2;
  if (missingTool) power -= 4;

  const delta = power - (materialResist*10 + livingDefense);
  out.tier = tierFromDelta(delta);
  const mult = out.tier === "fail" ? 0 : out.tier === "partial" ? 0.5 : out.tier === "solid" ? 1 : 1.5;
  const resistMult = clamp(1.0 - materialResist, 0.1, 1.0);

  if (verb.id === "open"){
    if (!t.openable) out.lines.push(`You can't open ${t.name}.`);
    else if (t.lockable?.jammed || getStatus(t,"jammed")) out.lines.push(`${t.name} is jammed. Try pry or wrench.`);
    else if (t.lockable?.locked) out.lines.push(`${t.name} is locked.`);
    else if (t.barrable?.barred) out.lines.push(`${t.name} is barred.`);
    else { t.openable.open = true; out.ok = true; out.tier = "solid"; out.applied.stateChanges.push("openable.open=true"); out.lines.push(`You open ${t.name}.`); }
  } else if (verb.id === "close"){
    if (t.openable){ t.openable.open = false; out.ok = true; out.tier="solid"; out.applied.stateChanges.push("openable.open=false"); out.lines.push(`You close ${t.name}.`);} else out.lines.push(`You can't close ${t.name}.`);
  } else if (verb.id === "unlock"){
    if (!t.lockable) out.lines.push(`${t.name} has no lock.`);
    else if (t.lockable.jammed || getStatus(t,"jammed")) out.lines.push(`${t.name} is jammed. Try pry or wrench.`);
    else { t.lockable.locked = false; out.ok = out.tier !== "fail"; out.lines.push(out.ok?`You unlock ${t.name}.`:`You fail to unlock ${t.name}.`); }
  } else if (verb.id === "lock"){
    if (!t.lockable) out.lines.push(`${t.name} cannot be locked.`);
    else if (t.openable?.open) out.lines.push(`You can't lock an open ${t.name}.`);
    else { t.lockable.locked = true; out.ok = true; out.tier="solid"; out.lines.push(`You lock ${t.name}.`);}    
  } else if (verb.id === "bar"){
    if (t.barrable){ t.barrable.barred = true; out.ok=true; out.tier="solid"; out.lines.push(`You bar ${t.name}.`);} else out.lines.push(`${t.name} cannot be barred.`);
  }

  const hasHpDomain = !!t.combatant;
  const hasIntegrityDomain = !!t.integrity;
  const base = hasHpDomain ? verb.damage.hp : hasIntegrityDomain ? verb.damage.integrity : 0;
  const finalDamage = Math.round(base * mult * resistMult);

  if (!out.ok && base > 0 && !NON_DAMAGE_VERBS.has(verb.id)){
    if (hasHpDomain){
      t.combatant.hp = Math.max(0, t.combatant.hp - finalDamage);
      out.applied.damageHp = finalDamage;
      out.ok = out.tier !== "fail";
      out.lines.push(finalDamage>0 ? `${mat.ono[verb.kind] || "THK!"} ${verb.label} hits ${t.name} for ${finalDamage}.` : `${verb.label} fails to harm ${t.name}.`);
    } else if (hasIntegrityDomain){
      let dmg = finalDamage;
      if (getStatus(t,"cracked")) dmg = Math.round(dmg * (STATUS_DEFS.cracked.mods.incomingIntegrityMult || 1.25));
      t.integrity.current = Math.max(0, t.integrity.current - dmg);
      out.applied.damageIntegrity = dmg;
      out.ok = out.tier !== "fail";
      out.lines.push(dmg>0 ? `${mat.ono[verb.kind] || "THK!"} ${verb.label} stresses ${t.name} (${dmg}).` : `${verb.label} skitters off ${t.name}.`);
    } else {
      out.lines.push(`You attempt ${verb.label.toLowerCase()} on ${t.name}, but nothing yields.`);
    }
  }

  if (["shove","pull","hook","drag","throw","advance","retreat"].includes(verb.id)){
    if (t.movable){
      const d = ["pull"].includes(verb.id) ? -1 : 1;
      t.movable.offset = (t.movable.offset || 0) + (out.tier === "fail" ? 0 : d);
      out.applied.stateChanges.push(`movable.offset=${t.movable.offset}`);
    } else if (!out.lines.length) {
      out.lines.push(`${t.name} doesn't budge.`);
    }
  }

  if (["grapple","restrain","pin","trip","choke","unbalance"].includes(verb.id) && t.combatant){
    const sid = verb.id === "trip" ? "prone" : verb.id === "pin" ? "pinned" : verb.id === "choke" ? "winded" : verb.id === "unbalance" ? "off_balance" : "restrained";
    if (out.tier === "solid" || out.tier === "crit"){
      const inst = addStatus(t, sid, { intensity:1, sourceId:a.id });
      if (inst) out.applied.statusesAdded.push(sid);
    }
  }

  if (verb.applyStatus && (out.tier === "solid" || out.tier === "crit")){
    if (Math.random() <= (verb.applyStatus.chance ?? 1)){
      const inst = addStatus(t, verb.applyStatus.id, {
        intensity: verb.applyStatus.intensity || 1,
        duration: verb.applyStatus.duration,
        sourceId: a.id
      });
      if (inst) out.applied.statusesAdded.push(inst.id);
    }
  }

  if (verb.id === "pry" || verb.id === "wrench"){
    if (getStatus(t,"jammed") && (out.tier === "solid" || out.tier === "crit")){
      removeStatus(t,"jammed");
      if (t.lockable) t.lockable.jammed = false;
      out.applied.statusesCleared.push("jammed");
      out.lines.push(`You clear the jam.`);
    }
  }

  if (t.integrity && t.integrity.current <= (t.integrity.fractureThreshold ?? 0)){
    addStatus(t, "cracked", { intensity:1, sourceId:a.id });
  }
  if (t.integrity && t.integrity.current <= 0){
    out.lines.push(`${mat.ono.break || "CRACK!"} ${t.name} breaks.`);
    if (t.openable) t.openable.open = true;
    if (t.lockable) { t.lockable.locked = false; t.lockable.jammed = false; }
    if (t.barrable) t.barrable.barred = false;
  }

  if (!out.lines.length) out.lines.push(`You attempt ${verb.label.toLowerCase()} on ${t.name}.`);
  if (t.combatant && t.combatant.hp <= 0) out.lines.push(`${t.name} is defeated.`);
  out.sound = { ono: mat.ono[verb.kind] || "THK!", hook: out.noise > 0.3 ? "loud" : "soft" };
  return out;
}
