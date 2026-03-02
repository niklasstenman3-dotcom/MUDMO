import { Schema, U, escapeHtml, escapeAttr, titleCase } from "./config/schema.js";
import { ThemeBg, RoomDefs, renderMiniMapSVG } from "./config/world.js";
import { BrowserData } from "./config/game-data.js";
import { VERBS, VERB_BY_ID, CURATED_COMBAT_VERBS, CURATED_OBJECT_VERBS } from "./config/verbs.js";
import { resolveVerb } from "./engine/resolveVerb.js";
import { tickStatuses } from "./engine/statusEngine.js";
import { pickEnemyVerb } from "./engine/ai.js";
import { ensureSpawns } from "./engine/systems/spawn-system.js";
import { pickRandomFrom, emitRoomAmbient, roomHasActiveCombat } from "./engine/systems/ambient-system.js";


const _deepClone = (obj) => JSON.parse(JSON.stringify(obj || {}));

const _mergeObjects = (base, overlay) => {
  const out = _deepClone(base);
  for (const [k, v] of Object.entries(overlay || {})){
    if (v && typeof v === "object" && !Array.isArray(v)){
      out[k] = _mergeObjects(out[k] || {}, v);
    } else {
      out[k] = _deepClone(v);
    }
  }
  return out;
};

const _entityTemplateFromData = (entityDefId) => {
  const ent = BrowserData.entities?.[entityDefId];
  if (!ent) return null;

  let merged = {};
  for (const archId of (ent.archetypes || [])){
    const arch = BrowserData.archetypes?.[archId] || {};
    merged = _mergeObjects(merged, arch);
  }
  merged = _mergeObjects(merged, ent);
  return merged;
};

const _toRuntimeStats = (combatant = {}) => ({
  atk: Math.max(1, Math.round((Number(combatant.hp_max || combatant.hp || 50) / 10) + (Number(combatant.guard || 0) / 10))),
  def: Math.max(1, Math.round((Number(combatant.guard_max || combatant.guard || 10) / 8))),
  spd: Math.max(1, Math.round((Number(combatant.speed || 10) / 3)))
});

const CORE_PHYSICAL_ACTIONS = Object.freeze(VERBS);
const CORE_PHYSICAL_BY_ID = Object.freeze(VERB_BY_ID);
const DEFAULT_VERB_ID = CORE_PHYSICAL_BY_ID.thrust ? "thrust" : (CORE_PHYSICAL_ACTIONS[0]?.id || "bash");


const OBJECT_TEMPLATE_IDS = Object.freeze({
  chest: "chest_iron",
  door: "door_oak",
  fence: "fence_wood"
});

const _stateFromObjectTemplate = (objectType, overrides = {}) => {
  const tplId = OBJECT_TEMPLATE_IDS[objectType];
  const tpl = tplId ? _entityTemplateFromData(tplId) : null;
  const lockable = tpl?.components?.lockable || {};
  const openable = tpl?.components?.openable || {};
  const integrity = tpl?.components?.integrity || {};

  return {
    objectType,
    locked: Object.prototype.hasOwnProperty.call(overrides, "locked") ? !!overrides.locked : !!lockable.locked,
    opened: Object.prototype.hasOwnProperty.call(overrides, "opened") ? !!overrides.opened : !!openable.open,
    integrity: {
      max: Number(integrity.max || integrity.current || 0),
      current: Number(integrity.current || integrity.max || 0)
    },
    materials: tpl?.materials || null,
    components: tpl?.components || null
  };
};

function _seedFromText(text){
  let h = 2166136261;
  const str = String(text || "");
  for (let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}

function _pickThreeCombatActions(enemyId, turn){
  const pool = CORE_PHYSICAL_ACTIONS.filter(a=>a.id !== "brace");
  const picks = [];
  let seed = _seedFromText(`${enemyId}:${turn?.phase || "player"}:${turn?.busyUntil || 0}:${turn?.turnPid || ""}`);
  while (picks.length < 3 && picks.length < pool.length){
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const idx = seed % pool.length;
    const cand = pool[idx];
    if (!picks.find(x=>x.id===cand.id)) picks.push(cand);
  }
  return picks;
}

function _legacyActionToVerb(a){
  if (!a) return { type:"verb", verbId:DEFAULT_VERB_ID };
  if (a.type === "verb" && CORE_PHYSICAL_BY_ID[a.verbId]) return a;
  if (a.type === "defend") return { type:"verb", verbId:"brace" };
  if (a.type === "skill") return { type:"verb", verbId:CORE_PHYSICAL_BY_ID.cleave ? "cleave" : DEFAULT_VERB_ID, targetId:a.targetId };
  if (a.type === "attack") return { type:"verb", verbId:DEFAULT_VERB_ID, targetId:a.targetId };
  return { type:"verb", verbId:DEFAULT_VERB_ID, targetId:a.targetId };
}

/* ---------------- Engine ---------------- */
class GameEngine {
  constructor(worldId){
    this.worldId = worldId;
    this.Schema = Schema;
    this.U = U;
    this.onSend = (_)=>{};
    this.state = this._initWorld();
    setInterval(()=>this._tick(), 200);
  }

  _initWorld(){
    const rooms = {
      room_1: this._newRoom("room_1", RoomDefs.road),
      room_2: this._newRoom("room_2", RoomDefs.catacombs),
      room_3: this._newRoom("room_3", RoomDefs.forest),
      room_4: this._newRoom("room_4", RoomDefs.village),
    };
    for (const r of Object.values(rooms)){
      this._rebuildRoomEntities(r, rooms);
      this._ensureSpawns(r, true);
    }
    return { worldId:this.worldId, rooms, players:{} };
  }

  _newRoom(id, def){
    const doorsState = {};
    for (const [doorId, d] of Object.entries(def.doors || {})){
      doorsState[doorId] = { locked:!!d.locked, open:!!d.open, keyItemDefId: d.keyItemDefId || null };
    }
    return {
      id, defId:def.defId,
      name:def.name, flavor:def.flavor, theme:def.theme,
      doors: doorsState,
      entities:{}, playerIds:[],
      combats:{},
      spawnMeta:{ lastSpawnAt:{} },
      ambientMeta:{ lastAmbientAt:0, lastChoice:{} }
    };
  }

  _getDef(defId){
    const def = Object.values(RoomDefs).find(d => d.defId === defId);
    if (!def) throw new Error("Unknown def: "+defId);
    return def;
  }

  _rebuildRoomEntities(room, rooms){
    const def = this._getDef(room.defId);
    room.name = def.name;
    room.flavor = def.flavor;
    room.theme = def.theme ?? room.theme;

    // exits (id stable per dir)
    for (const ex of def.exits){
      const exitId = `exit_${ex.dir}`;
      const destRoom = rooms?.[ex.toRoomId];
      const destName = destRoom ? destRoom.name : ex.toRoomId;

      room.entities[exitId] = {
        id: exitId,
        kind: Schema.EntityKind.EXIT,
        name: ex.dir,
        state: { dir: ex.dir, toRoomId: ex.toRoomId, toRoomName: destName, gate: ex.gate }
      };
    }

    // objects (stable id)
    for (const o of (def.staticObjects || [])){
      const objId = `obj_${o.id}`;
      if (!room.entities[objId]){
        room.entities[objId] = {
          id: objId,
          kind: Schema.EntityKind.OBJECT,
          name: o.name,
          state: _stateFromObjectTemplate(o.objectType, { locked:o.locked, opened:false })
        };
      }
    }
  }

  _spawnEnemy(rule){
    const tpl = _entityTemplateFromData(rule.defId);
    const combatant = tpl?.components?.combatant || {};
    const hpMax = Number(rule.hp || combatant.hp_max || combatant.hp || 50);
    const stats = _toRuntimeStats(combatant);

    if (Number(rule.atk) > 0) stats.atk = Number(rule.atk);
    if (Number(rule.def) > 0) stats.def = Number(rule.def);
    if (Number(rule.spd) > 0) stats.spd = Number(rule.spd);

    return {
      id:"enemy_"+U.uid(),
      kind:Schema.EntityKind.ENEMY,
      name:tpl?.name || rule.name,
      state:{
        enemyDefId:rule.defId,
        hp:hpMax, hpMax,
        stats,
        material: tpl?.materials?.primary || "flesh",
        statuses: [],
        tools: { tool_edge:false, tool_blunt:true, tool_point:false, tool_leverage:false },
        combatant: {
          hpMax, hp:hpMax,
          staminaMax: Number(combatant.stamina_max || combatant.stamina || 60),
          stamina: Number(combatant.stamina || combatant.stamina_max || 60),
          poiseMax: Number(combatant.poise_max || combatant.poise || 25),
          poise: Number(combatant.poise || combatant.poise_max || 25),
          guardMax: Number(combatant.guard_max || combatant.guard || 15),
          guard: Number(combatant.guard || combatant.guard_max || 15),
          speed: Number(combatant.speed || 10)
        },
        orbit:{ slots:6, assignments:{} }
      }
    };
  }

  _spawnLoot(name, rarity="common"){
    return {
      id:"loot_"+U.uid(),
      kind:Schema.EntityKind.LOOT,
      name,
      state:{ rarity, createdAt: U.now(), expiresAt: U.now()+60000 }
    };
  }

  _pickRandomFrom(list, room, key){
    return pickRandomFrom(room, list, key);
  }

  _roomHasActiveCombat(room){
    return roomHasActiveCombat(room);
  }

  _emitRoomAmbient(room){
    return emitRoomAmbient(this, room);
  }

  _ensureSpawns(room, initial){
    return ensureSpawns(this, room, initial);
  }

  _newPlayer(id, name){
    const tpl = _entityTemplateFromData("player") || {};
    const combatant = tpl?.components?.combatant || {};
    const skills = tpl?.components?.skills || {};
    const hpMax = Number(combatant.hp_max || combatant.hp || 80);

    return {
      id, name,
      roomId:"room_1",
      hp:hpMax, hpMax,
      lvl:1, xp:0, xpNext:200,
      stats:_toRuntimeStats(combatant),
      material: tpl?.materials?.primary || "flesh",
      statuses: [],
      tools: {
        tool_edge: Number(skills.tool_edge || skills.weapon_edge || 0) > 0,
        tool_blunt: Number(skills.tool_blunt || skills.weapon_blunt || 0) > 0,
        tool_point: Number(skills.tool_point || skills.weapon_point || 0) > 0,
        tool_leverage: Number(skills.tool_leverage || 0) > 0
      },
      combatant: {
        hpMax, hp:hpMax,
        staminaMax: Number(combatant.stamina_max || combatant.stamina || 80),
        stamina: Number(combatant.stamina || combatant.stamina_max || 80),
        poiseMax: Number(combatant.poise_max || combatant.poise || 35),
        poise: Number(combatant.poise || combatant.poise_max || 35),
        guardMax: Number(combatant.guard_max || combatant.guard || 25),
        guard: Number(combatant.guard || combatant.guard_max || 25),
        speed: Number(combatant.speed || 12)
      },
      engagedEnemyId:null,
      inventory:[],
      _defending:false
    };
  }

  connect(playerId, name){
    if (this.state.players[playerId]) return;
    this.state.players[playerId] = this._newPlayer(playerId, name || "Adventurer");
    this._enterRoom(playerId, "room_1");
    this._emitEvent(Schema.EventKind.SYSTEM, `${this.state.players[playerId].name} connected.`, null, { actorPlayerId: playerId });
    this._broadcastState();
  }

  _playerEntId(pid){ return "playerEnt_"+pid; }

  _enterRoom(playerId, roomId){
    const p = this.state.players[playerId];
    if (!p) return;

    if (p.roomId && this.state.rooms[p.roomId]){
      const old = this.state.rooms[p.roomId];
      old.playerIds = old.playerIds.filter(x => x!==playerId);
      delete old.entities[this._playerEntId(playerId)];
      p.engagedEnemyId = null;
      p._defending = false;
    }

    const room = this.state.rooms[roomId];
    if (!room) return;

    p.roomId = roomId;
    if (!room.playerIds.includes(playerId)) room.playerIds.push(playerId);

    this._rebuildRoomEntities(room, this.state.rooms);

    room.entities[this._playerEntId(playerId)] = {
      id:this._playerEntId(playerId),
      kind:Schema.EntityKind.PLAYER,
      name:p.name,
      state:{ playerId }
    };

    this._ensureSpawns(room, false);

    const def = this._getDef(room.defId);
    const enterLine = this._pickRandomFrom(def.enterLines, room, "enter");
    if (enterLine) this._emitEvent(Schema.EventKind.SYSTEM, enterLine, playerId, { actorPlayerId: playerId, roomId: room.id }, "room");
  }

  _roomOf(pid){
    const p = this.state.players[pid];
    return p ? this.state.rooms[p.roomId] : null;
  }

  _asActorEntity(pidOrEnemyId, room){
    const player = this.state.players[pidOrEnemyId];
    if (player){
      return {
        id: player.id,
        name: player.name,
        material: player.material || "flesh",
        statuses: player.statuses || (player.statuses=[]),
        tools: player.tools || {},
        combatant: player.combatant || {
          hpMax: player.hpMax, hp: player.hp,
          staminaMax: 80, stamina: 80,
          poiseMax: 35, poise: 35,
          guardMax: 25, guard: 25,
          speed: player.stats?.spd || 10
        },
        playerRef: player
      };
    }
    const enemy = room?.entities?.[pidOrEnemyId];
    if (enemy?.kind === Schema.EntityKind.ENEMY){
      return {
        id: enemy.id,
        name: enemy.name,
        material: enemy.state.material || "flesh",
        statuses: enemy.state.statuses || (enemy.state.statuses=[]),
        tools: enemy.state.tools || {},
        combatant: enemy.state.combatant || {
          hpMax: enemy.state.hpMax, hp: enemy.state.hp,
          staminaMax: 60, stamina: 60,
          poiseMax: 25, poise: 25,
          guardMax: 15, guard: 15,
          speed: enemy.state.stats?.spd || 8
        },
        enemyRef: enemy
      };
    }
    return null;
  }

  _targetEntityFromRef(room, targetRef){
    if (!room || !targetRef) return null;
    const key = typeof targetRef === "string" ? targetRef : (targetRef?.targetId || targetRef?.id);
    if (typeof key === "string" && this.state.players[key]){
      return this._asActorEntity(key, room);
    }
    const raw = key ? room.entities[key] : null;
    if (raw){
      if (raw.kind === Schema.EntityKind.ENEMY){
        return {
          id: raw.id, name: raw.name, material: raw.state.material || "flesh",
          statuses: raw.state.statuses || (raw.state.statuses=[]),
          combatant: raw.state.combatant || { hpMax:raw.state.hpMax, hp:raw.state.hp, guard:10, poise:10 },
          movable: raw.state.movable || (raw.state.movable={mass:80, anchored:false, offset:0})
        };
      }
      if (raw.kind === Schema.EntityKind.OBJECT){
        const st = raw.state;
        return {
          id: raw.id, name: raw.name, material: st.materials?.primary || "wood",
          statuses: st.statuses || (st.statuses=[]),
          integrity: st.integrity || (st.integrity = { max:80, current:80, fractureThreshold:25 }),
          openable: { open: !!st.opened },
          lockable: { locked: !!st.locked, jammed: !!st.jammed, lockQuality: 8 },
          barrable: st.barrable || { barred:false },
          movable: st.movable || { mass:120, anchored:true, offset:0 },
          commit: ()=>{ st.opened = !!(st.openable?.open ?? st.opened); }
        };
      }
      if (raw.kind === Schema.EntityKind.PLAYER){
        const p = this.state.players[raw.state.playerId];
        return this._asActorEntity(p?.id, room);
      }
      if (raw.kind === Schema.EntityKind.EXIT){
        const gate = raw.state?.gate || { type:"open" };
        if (gate.type === "door") return this._targetEntityFromRef(room, { type:"door", exitId: raw.id });
      }
    }

    if (typeof targetRef === "object" && (targetRef.type === "door" || targetRef.exitId)){
      const ex = room.entities[targetRef.exitId || targetRef.id];
      if (!ex) return null;
      const gate = ex.state?.gate || { type:"open" };
      const door = room.doors?.[gate.doorId];
      if (!door) return null;
      door.statuses ||= [];
      door.integrity ||= { max:80, current:80, fractureThreshold:25 };
      door.jammed = !!door.jammed;
      return {
        id: `door_${ex.id}`,
        name: `Door (${titleCase(ex.state.dir)})`,
        material: "wood",
        statuses: door.statuses,
        integrity: door.integrity,
        openable: { get open(){ return !!door.open; }, set open(v){ door.open = !!v; } },
        lockable: { get locked(){ return !!door.locked; }, set locked(v){ door.locked = !!v; }, get jammed(){ return !!door.jammed; }, set jammed(v){ door.jammed = !!v; }, lockQuality: 8 },
        barrable: { get barred(){ return !!door.barred; }, set barred(v){ door.barred = !!v; } },
        movable: { mass:100, anchored:true, offset:0 }
      };
    }
    return null;
  }

  _emitOutcome(room, actorPid, outcome, targetPayload={}){
    const lines = outcome?.lines?.length ? outcome.lines : ["Nothing happens."];
    const ono = outcome?.sound?.ono || "";
    for (const raw of lines){
      const line = ono && !String(raw).includes("!") ? `${ono} ${raw}` : raw;
      this._emitEvent(Schema.EventKind.SYSTEM, line, null, { actorPlayerId: actorPid, roomId: room.id, ...targetPayload }, "room");
    }
  }

  _emitHealthStateNarrative(room, entityName, beforeHp, afterHp, hpMax, payload={}){
    if (!hpMax || afterHp <= 0) return;
    const b = (beforeHp / hpMax) * 100;
    const a = (afterHp / hpMax) * 100;
    const cuts = [
      { t:75, msg:`${entityName} is faltering.` },
      { t:40, msg:`${entityName} is badly wounded.` },
      { t:15, msg:`${entityName} is near death.` },
    ];
    for (const c of cuts){
      if (b > c.t && a <= c.t){
        this._emitEvent(Schema.EventKind.SYSTEM, c.msg, null, { roomId: room.id, ...payload }, "room");
      }
    }
  }

  _handleEnemyDefeat(room, enemyId, actorPid){
    const enemy = room.entities?.[enemyId];
    if (!enemy || enemy.kind !== Schema.EntityKind.ENEMY) return;

    this._emitEvent(Schema.EventKind.SYSTEM, `${enemy.name} is defeated.`, null, { actorPlayerId: actorPid, roomId: room.id, enemyId }, "room");

    const loot = this._spawnLoot(`${enemy.name} Loot`, "common");
    room.entities[loot.id] = loot;
    this._emitEvent(Schema.EventKind.SYSTEM, `${enemy.name} collapses and drops loot.`, null, { actorPlayerId: actorPid, roomId: room.id, enemyId, focusEntityId: loot.id }, "room");

    for (const p of Object.values(this.state.players)){
      if (p.roomId !== room.id) continue;
      if (p.engagedEnemyId === enemyId) p.engagedEnemyId = null;
    }
    delete room.combats?.[enemyId];
    delete room.entities[enemyId];
  }

  _applyResolveOutcomeToRuntime(actorEnt, targetEnt){
    if (actorEnt?.playerRef && actorEnt.combatant){
      actorEnt.playerRef.hp = actorEnt.combatant.hp;
      actorEnt.playerRef.hpMax = actorEnt.combatant.hpMax;
    }
    if (actorEnt?.enemyRef && actorEnt.combatant){
      actorEnt.enemyRef.state.hp = actorEnt.combatant.hp;
      actorEnt.enemyRef.state.hpMax = actorEnt.combatant.hpMax;
    }
    if (targetEnt?.id && this.state.players[targetEnt.id] && targetEnt.combatant){
      const p = this.state.players[targetEnt.id];
      p.hp = targetEnt.combatant.hp;
      p.hpMax = targetEnt.combatant.hpMax;
    }
    const maybeEnemy = Object.values(this.state.rooms).flatMap(r=>Object.values(r.entities)).find(e=>e.id===targetEnt?.id && e.kind===Schema.EntityKind.ENEMY);
    if (maybeEnemy && targetEnt?.combatant){
      maybeEnemy.state.hp = targetEnt.combatant.hp;
      maybeEnemy.state.hpMax = targetEnt.combatant.hpMax;
    }
  }

  _resolveVerbIntent(actorId, verbId, targetRef, room){
    const actor = this._asActorEntity(actorId, room);
    const target = this._targetEntityFromRef(room, targetRef);
    if (!actor || !target){
      return { ok:false, tier:"fail", lines:["No valid target."], applied:{} };
    }
    const outcome = resolveVerb({ actor, verbId, target, ctx: { time: U.now()/1000, roomId: room.id, noise:0, knowledge: (this.state.knowledge ||= {}) } });
    this._applyResolveOutcomeToRuntime(actor, target);
    if (target.commit) target.commit();
    return outcome;
  }

  handleMessage(msg){
    if (!msg || msg.type !== Schema.MsgType.INTENT) return;
    const { playerId, intent } = msg;
    const p = this.state.players[playerId];
    if (!p) return;

    switch(intent.action){
      case Schema.Action.CHAT:
        this._emitEvent(
          Schema.EventKind.CHAT,
          `${p.name}: ${String(intent.payload?.text||"").slice(0,200)}`,
          null,
          { actorPlayerId: playerId, roomId: p.roomId }
        );
        break;

      case Schema.Action.ENGAGE: this._engage(playerId, intent.targetId); break;
      case Schema.Action.DISENGAGE: this._disengage(playerId); break;
      case Schema.Action.QUEUE_ACTION: this._queueAction(playerId, intent.payload); break;

      case Schema.Action.OPEN: this._openObject(playerId, intent.targetId); break;
      case Schema.Action.UNLOCK: this._unlockObject(playerId, intent.targetId); break;
      case Schema.Action.PICKUP: this._pickup(playerId, intent.targetId); break;

      case Schema.Action.UNLOCK_DOOR: this._unlockDoor(playerId, intent.targetId); break;
      case Schema.Action.OPEN_DOOR: this._openDoor(playerId, intent.targetId); break;
      case Schema.Action.CLOSE_DOOR: this._closeDoor(playerId, intent.targetId); break;

      case Schema.Action.TRAVEL: this._travel(playerId, intent.targetId); break;
      case Schema.Action.SCOUT_NEXT: this._scout(playerId, intent.targetId); break;
    }

    this._broadcastState();
  }

  _emitEvent(kind, text, toPlayerId=null, payload=null, audience="room"){
    const p = { ...(payload || {}) };
    if (!p.roomId && p.actorPlayerId && this.state.players[p.actorPlayerId]){
      p.roomId = this.state.players[p.actorPlayerId].roomId;
    }
    if (!p.roomId && p.targetPlayerId && this.state.players[p.targetPlayerId]){
      p.roomId = this.state.players[p.targetPlayerId].roomId;
    }
    this.onSend({ type:Schema.MsgType.EVENT, kind, text, ts:U.now(), toPlayerId, payload:p, audience });
  }
  _broadcastState(){
    this.onSend({ type:Schema.MsgType.STATE, state: JSON.parse(JSON.stringify(this.state)) });
  }

  _ensureCombat(room, enemyId, initialTurnPid){
    if (!room.combats[enemyId]){
      room.combats[enemyId] = {
        engaged:{},
        actions:{},
        turn:{ phase:"player", turnPid: initialTurnPid, busyUntil:0 }
      };
    } else {
      room.combats[enemyId].turn = room.combats[enemyId].turn || { phase:"player", turnPid: initialTurnPid, busyUntil:0 };
    }
    return room.combats[enemyId];
  }

  _engage(pid, enemyId){
    const room = this._roomOf(pid);
    const p = this.state.players[pid];
    if (!room || !p) return;

    const e = room.entities[enemyId];
    if (!e || e.kind !== Schema.EntityKind.ENEMY) return;

    if (p.engagedEnemyId && p.engagedEnemyId !== enemyId) this._disengage(pid);

    const orbit = e.state.orbit;
    let slot = null;
    for (let i=0;i<orbit.slots;i++){
      if (!orbit.assignments[i]) { slot=i; break; }
    }
    if (slot == null){
      this._emitEvent(Schema.EventKind.SYSTEM, `Tried to engage ${e.name}, but it's crowded.`, null, { actorPlayerId: pid, roomId: room.id, enemyId });
      return;
    }

    orbit.assignments[slot] = pid;
    p.engagedEnemyId = enemyId;

    const combat = this._ensureCombat(room, enemyId, pid);
    combat.engaged[pid] = true;
    combat.turn.turnPid = pid; // MVP: single player “turn owner”

    room.ambientMeta.lastAmbientAt = U.now();
    this._emitEvent(Schema.EventKind.SYSTEM, `You engage the ${e.name}.`, null, { actorPlayerId: pid, roomId: room.id, enemyId }, "room");
  }

  _disengage(pid){
    const room = this._roomOf(pid);
    const p = this.state.players[pid];
    if (!room || !p || !p.engagedEnemyId) return;

    const enemyId = p.engagedEnemyId;
    const e = room.entities[enemyId];
    if (e && e.kind === Schema.EntityKind.ENEMY){
      for (const [slot, who] of Object.entries(e.state.orbit.assignments)){
        if (who === pid) delete e.state.orbit.assignments[slot];
      }
    }

    if (room.combats[enemyId]){
      delete room.combats[enemyId].engaged[pid];
      delete room.combats[enemyId].actions[pid];
    }

    p.engagedEnemyId = null;
    p._defending = false;

    this._emitEvent(Schema.EventKind.SYSTEM, `Disengaged.`, null, { actorPlayerId: pid, roomId: room.id, enemyId });
  }

  _queueAction(pid, action){
    const room = this._roomOf(pid);
    const p = this.state.players[pid];
    if (!room || !p) return;

    const chosen = _legacyActionToVerb(action || {});
    const targetId = chosen.targetId || p.engagedEnemyId || action?.targetRef?.targetId;
    const targetRef = action?.targetRef || targetId;

    const enemy = p.engagedEnemyId ? room.entities[p.engagedEnemyId] : null;
    const enemyBeforeHp = enemy?.state?.combatant?.hp ?? enemy?.state?.hp ?? null;

    const outcome = this._resolveVerbIntent(pid, chosen.verbId || DEFAULT_VERB_ID, targetRef, room);
    this._emitOutcome(room, pid, outcome, { targetId: typeof targetRef === 'string' ? targetRef : targetRef?.id || targetRef?.exitId });

    const enemyAfter = p.engagedEnemyId ? room.entities[p.engagedEnemyId] : null;
    const enemyAfterHp = enemyAfter?.state?.combatant?.hp ?? enemyAfter?.state?.hp ?? null;
    if (enemy && enemyBeforeHp != null && enemyAfterHp != null){
      this._emitHealthStateNarrative(room, enemy.name, enemyBeforeHp, enemyAfterHp, enemy.state?.combatant?.hpMax || enemy.state?.hpMax || 1, { enemyId: enemy.id, actorPlayerId: pid });
      if (enemyAfterHp <= 0){
        this._handleEnemyDefeat(room, enemy.id, pid);
        this._broadcastState();
        return;
      }
    }

    if (p.engagedEnemyId){
      this._resolveTurnedCombat(room.id, p.engagedEnemyId, pid);
    }
  }

  _resolveTurnedCombat(roomId, enemyId, actorPid){
    const room = this.state.rooms[roomId];
    if (!room) return;
    const combat = room.combats?.[enemyId];
    const enemy = room.entities?.[enemyId];
    if (!combat || !enemy || enemy.kind !== Schema.EntityKind.ENEMY) return;

    const p = this.state.players[actorPid];
    if (!p || !p.engagedEnemyId || p.engagedEnemyId !== enemyId) return;

    combat.turn = combat.turn || { phase:"player", turnPid: actorPid, busyUntil:0 };
    combat.turn.phase = "enemy";
    combat.turn.busyUntil = U.now() + 700;

    setTimeout(()=>{
      const r = this.state.rooms[roomId];
      const en = r?.entities?.[enemyId];
      const pl = this.state.players[actorPid];
      if (!r || !en || !pl || pl.hp <= 0 || en.state.hp <= 0) return;

      const aiWeights = en.state?.aiWeights || { bash:0.35, shove:0.15, grapple:0.12, guard:0.15, observe:0.23 };
      const enemyActor = this._asActorEntity(enemyId, r);
      const playerTarget = this._asActorEntity(actorPid, r);
      const pick = pickEnemyVerb(enemyActor, playerTarget, aiWeights);
      const playerBeforeHp = pl.hp;
      const out = this._resolveVerbIntent(enemyId, pick, actorPid, r);
      this._emitOutcome(r, actorPid, out, { enemyId, actorPlayerId: actorPid, targetPlayerId: actorPid });
      this._emitHealthStateNarrative(r, pl.name, playerBeforeHp, pl.hp, pl.hpMax || 1, { enemyId, actorPlayerId: actorPid, targetPlayerId: actorPid });

      if (pl.hp <= 0){
        this._emitEvent(Schema.EventKind.SYSTEM, `You fall unconscious.`, null, { actorPlayerId: actorPid, roomId: r.id, enemyId });
        this._disengage(actorPid);
      }

      combat.turn.phase = "player";
      combat.turn.turnPid = actorPid;
      combat.turn.busyUntil = U.now();
      delete combat.actions?.[actorPid];
      this._broadcastState();
    }, 720);
  }

  _openObject(pid, objId){
    const room = this._roomOf(pid);
    if (!room) return;
    const out = this._resolveVerbIntent(pid, "open", objId, room);
    this._emitOutcome(room, pid, out, { objectId: objId });
  }

  _unlockObject(pid, objId){
    const room = this._roomOf(pid);
    if (!room) return;
    const out = this._resolveVerbIntent(pid, "unlock", objId, room);
    this._emitOutcome(room, pid, out, { objectId: objId });
  }

  _pickup(pid, lootId){
    const room = this._roomOf(pid);
    const p = this.state.players[pid];
    if (!room || !p) return;
    if (p.engagedEnemyId){
      this._emitEvent(Schema.EventKind.SYSTEM, `Finish combat first.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    const loot = room.entities[lootId];
    if (!loot || loot.kind !== Schema.EntityKind.LOOT) return;

    p.inventory.push({ name:loot.name, rarity:loot.state.rarity });

    // small chance to get a key (so doors/chests can be tested)
    if (Math.random() < 0.30) p.inventory.push({ name:"Rusty Key", rarity:"uncommon" });

    delete room.entities[lootId];
    this._emitEvent(Schema.EventKind.SYSTEM, `Picked up ${loot.name}.`, null, { actorPlayerId: pid, roomId: room.id, lootId });
  }

  _exitDoor(room, exitId){
    const ex = room.entities[exitId];
    if (!ex || ex.kind !== Schema.EntityKind.EXIT) return { ex:null, doorId:null, door:null };
    const gate = ex.state.gate || {type:"open"};
    if (gate.type !== "door") return { ex, doorId:null, door:null };
    const doorId = gate.doorId;
    const door = room.doors?.[doorId] || null;
    return { ex, doorId, door };
  }

  _unlockDoor(pid, exitId){
    const room = this._roomOf(pid);
    if (!room) return;
    const out = this._resolveVerbIntent(pid, "unlock", { type:"door", exitId }, room);
    this._emitOutcome(room, pid, out, { exitId });
  }

  _openDoor(pid, exitId){
    const room = this._roomOf(pid);
    if (!room) return;
    const out = this._resolveVerbIntent(pid, "open", { type:"door", exitId }, room);
    this._emitOutcome(room, pid, out, { exitId });
  }

  _closeDoor(pid, exitId){
    const room = this._roomOf(pid);
    if (!room) return;
    const out = this._resolveVerbIntent(pid, "close", { type:"door", exitId }, room);
    this._emitOutcome(room, pid, out, { exitId });
  }

  _travel(pid, exitId){
    const room = this._roomOf(pid);
    const p = this.state.players[pid];
    if (!room || !p) return;
    if (p.engagedEnemyId){
      this._emitEvent(Schema.EventKind.SYSTEM, `Can't move while engaged.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    const ex = room.entities[exitId];
    if (!ex || ex.kind !== Schema.EntityKind.EXIT) return;

    const gate = ex.state.gate || {type:"open"};
    if (gate.type === "door"){
      const door = room.doors?.[gate.doorId];
      if (!door){ this._emitEvent(Schema.EventKind.SYSTEM, `The way is blocked.`, null, { actorPlayerId: pid, roomId: room.id }); return; }
      if (door.locked){ this._emitEvent(Schema.EventKind.SYSTEM, `Door is locked.`, null, { actorPlayerId: pid, roomId: room.id }); return; }
      if (!door.open){ this._emitEvent(Schema.EventKind.SYSTEM, `Door is closed.`, null, { actorPlayerId: pid, roomId: room.id }); return; }
    }

    const dest = this.state.rooms[ex.state.toRoomId];
    if (!dest){
      this._emitEvent(Schema.EventKind.SYSTEM, `That path leads nowhere (yet).`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    this._emitEvent(Schema.EventKind.SYSTEM, `Moved ${titleCase(ex.state.dir)}.`, null, { actorPlayerId: pid, roomId: room.id });
    this._enterRoom(pid, ex.state.toRoomId);
  }

  _scout(pid, exitId){
    const room = this._roomOf(pid);
    if (!room) return;

    const ex = room.entities[exitId];
    if (!ex || ex.kind !== Schema.EntityKind.EXIT) return;

    const next = this.state.rooms[ex.state.toRoomId];
    if (!next){
      this._emitEvent(Schema.EventKind.SYSTEM, `Only void beyond.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    const enemies = Object.values(next.entities).filter(e=>e.kind===Schema.EntityKind.ENEMY).map(e=>e.name);
    const objects = Object.values(next.entities).filter(e=>e.kind===Schema.EntityKind.OBJECT).map(e=>e.name);

    const enemyHint = enemies.length===0 ? "no movement"
      : enemies.length===1 ? `movement (${enemies[0]})`
      : `multiple movements (${enemies.slice(0,2).join(", ")}${enemies.length>2?", …":""})`;

    const objHint = objects.some(n=>n.toLowerCase().includes("chest") || n.toLowerCase().includes("crate"))
      ? "You spot something that might be loot."
      : "Nothing of interest stands out.";

    this._emitEvent(Schema.EventKind.SYSTEM, `Scouted ${titleCase(ex.state.dir)}: ${enemyHint}. ${objHint}`, null, { actorPlayerId: pid, roomId: room.id });
  }

  _tick(){
    let dirty = false;

    const statusEntities = [];
    for (const p of Object.values(this.state.players)){
      p.combatant ||= { hpMax:p.hpMax, hp:p.hp, staminaMax:80, stamina:80, poiseMax:30, poise:30, guardMax:20, guard:20, speed:p.stats?.spd || 10 };
      p.statuses ||= [];
      statusEntities.push({ id:p.id, combatant:p.combatant, statuses:p.statuses });
    }

    for (const room of Object.values(this.state.rooms)){
      if (this._ensureSpawns(room, false)) dirty = true;

      const now = U.now();
      const lastAmb = room.ambientMeta?.lastAmbientAt || 0;
      if (room.playerIds?.length && (now - lastAmb) >= 4500 && !this._roomHasActiveCombat(room)){
        this._emitRoomAmbient(room);
      }

      for (const ent of Object.values(room.entities)){
        if (ent.kind === Schema.EntityKind.LOOT && ent.state?.expiresAt && now > ent.state.expiresAt){
          delete room.entities[ent.id];
          dirty = true;
          continue;
        }
        if (ent.kind === Schema.EntityKind.ENEMY){
          ent.state.combatant ||= { hpMax:ent.state.hpMax, hp:ent.state.hp, staminaMax:60, stamina:60, poiseMax:25, poise:25, guardMax:15, guard:15, speed:ent.state.stats?.spd || 9 };
          ent.state.statuses ||= [];
          statusEntities.push({ id:ent.id, combatant:ent.state.combatant, statuses:ent.state.statuses });
          ent.state.hp = ent.state.combatant.hp;
        }
      }

      for (const d of Object.values(room.doors || {})){
        d.statuses ||= [];
        statusEntities.push({ id:`door_${room.id}`, statuses:d.statuses, integrity:d.integrity || { max:80, current:80, fractureThreshold:25 }, lockable:d, openable:d });
      }
    }

    tickStatuses(statusEntities, { time: U.now()/1000, dt: 0.2 });
    for (const p of Object.values(this.state.players)) p.hp = p.combatant?.hp ?? p.hp;

    if (dirty) this._broadcastState();
  }
}

/* ---------------- Local transport / Store ---------------- */
class LocalTransport{
  constructor(engine){
    this.engine=engine;
    this.onMessage=(_)=>{};
    engine.onSend=(msg)=>this.onMessage(msg);
  }
  send(msg){ this.engine.handleMessage(msg); }
}
class Store{
  constructor(transport, playerId){
    this.transport=transport; this.playerId=playerId;
    this.state=null; this.events=[]; this.subs=new Set();
    transport.onMessage=(msg)=>this._recv(msg);
  }
  subscribe(fn){ this.subs.add(fn); return ()=>this.subs.delete(fn); }
  _notify(){ for (const fn of this.subs) fn(); }
  dispatch(action, targetId=null, payload=null){
    this.transport.send({ type:Schema.MsgType.INTENT, playerId:this.playerId, intent:{ action, targetId, payload } });
  }
  _recv(msg){
    if (!msg || !msg.type) return;
    if (msg.toPlayerId && msg.toPlayerId!==this.playerId) return;
    if (msg.type===Schema.MsgType.STATE){ this.state=msg.state; this._notify(); return; }
    if (msg.type===Schema.MsgType.EVENT){
      this.events.push(msg);
      if (this.events.length>1200) this.events=this.events.slice(-800);
      this._notify();
    }
  }
}

/* ---------------- Inspector handlers ---------------- */
const Handlers = {
  [Schema.EntityKind.EXIT]: {
    inspect(ent, ctx){
      const title = `${titleCase(ent.state.dir)} (${ent.state.toRoomName || ent.state.toRoomId})`;
      const gate = ent.state.gate || {type:"open"};
      let gateLabel = "Open path";
      if (gate.type==="door"){
        const door = ctx.room.doors?.[gate.doorId];
        gateLabel = door ? `Door (${door.locked ? "locked" : "unlocked"}, ${door.open ? "open" : "closed"})` : "Door (missing)";
      }
      return {
        title,
        kindLabel:"Direction",
        sections:[
          {type:"kv", rows:[["Destination", ent.state.toRoomName || ent.state.toRoomId],["Gate", gateLabel]]},
          {type:"text", text:"If gated: Unlock → Open → Move. You can also scout."}
        ]
      };
    },
    actions(ent, ctx){
      const you = ctx.you;
      const inCombat = !!you?.engagedEnemyId;
      const gate = ent.state.gate || {type:"open"};
      const acts = [];

      if (gate.type==="door"){
        const door = ctx.room.doors?.[gate.doorId] || null;
        const locked = !!door?.locked;
        const open = !!door?.open;

        acts.push({
          label:"Unlock Door",
          style:"",
          enabled: !inCombat && !!door && locked,
          hint: inCombat ? "In combat" : (locked ? "Requires Rusty Key (drops randomly)" : "Not locked"),
          intent:{ action:Schema.Action.UNLOCK_DOOR, targetId: ent.id }
        });
        acts.push({
          label:"Open Door",
          style:"primary",
          enabled: !inCombat && !!door && !locked && !open,
          hint: inCombat ? "In combat" : (locked ? "Locked" : (open ? "Already open" : "")),
          intent:{ action:Schema.Action.OPEN_DOOR, targetId: ent.id }
        });
        acts.push({
          label:"Close Door",
          style:"",
          enabled: !inCombat && !!door && open,
          hint: inCombat ? "In combat" : (open ? "" : "Already closed"),
          intent:{ action:Schema.Action.CLOSE_DOOR, targetId: ent.id }
        });
      }

      let moveEnabled = !inCombat;
      let moveHint = inCombat ? "Can't move while engaged" : "";

      if (gate.type==="door"){
        const door = ctx.room.doors?.[gate.doorId] || null;
        if (!door){ moveEnabled=false; moveHint="Blocked"; }
        else if (door.locked){ moveEnabled=false; moveHint="Locked"; }
        else if (!door.open){ moveEnabled=false; moveHint="Closed"; }
      }

      acts.push({
        label:"Move",
        style:"primary",
        enabled: moveEnabled,
        hint: moveHint,
        intent:{ action:Schema.Action.TRAVEL, targetId: ent.id }
      });

      acts.push({
        label:"Inspect next",
        style:"",
        enabled:true,
        hint:"",
        intent:{ action:Schema.Action.SCOUT_NEXT, targetId: ent.id }
      });

      return acts;
    }
  },

  [Schema.EntityKind.PLAYER]: {
    inspect(ent, ctx){
      const p = ctx.players[ent.state.playerId];
      if (!p) return { title: ent.name, kindLabel:"Player", sections:[{type:"text", text:"Player not found."}] };
      const isYou = p.id === ctx.playerId;

      return {
        title: p.name,
        kindLabel: isYou ? "You" : "Player",
        sections:[
          {type:"kv", rows:[
            ["HP", U.fmtHp(p.hp,p.hpMax)],
            ["Status", p.engagedEnemyId ? "Engaged" : "Idle"],
            ...(isYou ? [["ATK",String(p.stats.atk)],["DEF",String(p.stats.def)],["Inventory",String(p.inventory.length)]] : [])
          ]}
        ]
      };
    },
    actions(){ return []; }
  },

  [Schema.EntityKind.ENEMY]: {
    inspect(ent, ctx){
      const hp = ent.state.hp, hpMax = ent.state.hpMax;
      const combat = ctx.room.combats?.[ent.id] || null;
      const turn = combat?.turn || null;
      const phaseLabel = turn ? (turn.phase === "enemy" ? "Enemy acting…" : "Your turn") : "—";

      return {
        title: ent.name,
        kindLabel:"Enemy",
        sections:[
          { type:"hp", hp, hpMax },
          { type:"kv", rows:[
            ["Engaged", `${Object.keys(ent.state.orbit.assignments||{}).length}/${ent.state.orbit.slots}`],
            ["ATK", String(ent.state.stats.atk)],
            ["DEF", String(ent.state.stats.def)],
            ["Turn", phaseLabel]
          ]},
          { type:"text", text:"All actions here are YOU acting on this enemy." }
        ]
      };
    },
    actions(ent, ctx){
      const you = ctx.you;
      const youEngagedThis = you?.engagedEnemyId === ent.id;
      const anyEngaged = !!you?.engagedEnemyId;

      const combat = ctx.room.combats?.[ent.id] || null;
      const turn = combat?.turn || { phase:"player", turnPid: ctx.playerId, busyUntil:0 };
      const isYourTurn = youEngagedThis && (turn.phase === "player") && (turn.turnPid === ctx.playerId);

      const orbit = ent.state.orbit;
      const full = Object.keys(orbit.assignments||{}).length >= orbit.slots;

      const acts = [
        { label:"Engage", style:"primary", enabled: !anyEngaged && !youEngagedThis && !full, hint: full?"Crowded":(anyEngaged?"Disengage first":""), menuPath:["Interact","Combat"], intent:{ action:Schema.Action.ENGAGE, targetId: ent.id } },
        { label:"Disengage", style:"", enabled: youEngagedThis, hint: youEngagedThis?"":"Not engaged", menuPath:["Interact","Combat"], intent:{ action:Schema.Action.DISENGAGE } }
      ];

      const hint = isYourTurn ? "" : "Enemy is acting…";
      const ids = CURATED_COMBAT_VERBS.filter(id => CORE_PHYSICAL_BY_ID[id]);
      for (const vid of ids){
        const pick = CORE_PHYSICAL_BY_ID[vid];
        acts.push({
          label: pick.label || pick.name,
          style: ["bash","thrust","slice"].includes(pick.id) ? "primary" : "",
          enabled: youEngagedThis ? isYourTurn : ["observe","inspect"].includes(pick.id),
          hint: youEngagedThis ? hint : (anyEngaged ? "Engage to use combat verbs" : "Can use perception now"),
          intent:{ action:Schema.Action.QUEUE_ACTION, payload:{ type:"verb", verbId:pick.id, targetId: ent.id, targetRef: ent.id } }
        });
      }
      return acts;
    }
  },

  [Schema.EntityKind.OBJECT]: {
    inspect(ent){
      if (ent.state.objectType==="chest"){
        return {
          title: ent.name,
          kindLabel:"Chest",
          sections:[
            { type:"kv", rows:[["Locked", ent.state.locked?"Yes":"No"],["Opened", ent.state.opened?"Yes":"No"]] },
            { type:"text", text: ent.state.opened ? "Opened." : "Might contain loot." }
          ]
        };
      }
      return { title: ent.name, kindLabel:"Object", sections:[{ type:"text", text:"An object." }] };
    },
    actions(ent, ctx){
      const inCombat = !!ctx.you?.engagedEnemyId;
      const vids = CURATED_OBJECT_VERBS.filter(id => CORE_PHYSICAL_BY_ID[id]);
      return vids.map((vid, i) => ({
        label: CORE_PHYSICAL_BY_ID[vid].label || vid,
        style: ["open","unlock","pry"].includes(vid) ? "primary" : "",
        enabled: !inCombat || ["observe","inspect"].includes(vid),
        hint: inCombat && !["observe","inspect"].includes(vid) ? "In combat" : "",
        menuPath:["Interact","Object"],
        intent:{ action:Schema.Action.QUEUE_ACTION, payload:{ type:"verb", verbId:vid, targetId: ent.id, targetRef: ent.id } }
      }));
    }
  },

  [Schema.EntityKind.LOOT]: {
    inspect(ent){
      return { title: ent.name, kindLabel:"Loot", sections:[{ type:"kv", rows:[["Rarity", ent.state.rarity]] }, { type:"text", text:"Dropped item." }] };
    },
    actions(ent, ctx){
      const inCombat = !!ctx.you?.engagedEnemyId;
      return [{ label:"Pick Up", style:"primary", enabled: !inCombat, hint: inCombat?"Finish combat first":"", menuPath:["Use","Loot"], intent:{ action:Schema.Action.PICKUP, targetId: ent.id } }];
    }
  }
};

/* ---------------- Mini-map layout (static, deterministic) ---------------- */
/* ---------------- App ---------------- */
class App {
  constructor(){
    this.playerId = "p_" + U.uid();
    this.playerName = "You-" + this.playerId.slice(-4);

    this.engine = new GameEngine("world_demo");
    this.transport = new LocalTransport(this.engine);
    this.store = new Store(this.transport, this.playerId);

    this.selectedEntityId = null;

    // defaults: directions + enemies open; loot open because it's important to see drops quickly
    this.groupOpen = { directions:true, players:false, enemies:true, objects:true, loot:true };

    // loot focus plumbing
    this._lastConsumedEventIndex = 0;
    this._pendingFocusEntityId = null;

    // transient ambient action-sound dedupe
    this._lastAmbientActionSoundKey = null;
    this._lastRoomId = null;

    this.engine.connect(this.playerId, this.playerName);

    this._wire();
    this.store.subscribe(()=>this.render());
    this.render();
  }

  get ctx(){
    const st = this.store.state;
    if (!st) return null;
    const you = st.players[this.playerId];
    const room = st.rooms[you?.roomId || "room_1"];
    return { playerId:this.playerId, players:st.players, rooms:st.rooms, you, room };
  }

  _wire(){
    const input = document.getElementById("chatInput");
    document.getElementById("sendChat").onclick = ()=>this.sendChat();
    input.addEventListener("keydown",(e)=>{ if(e.key==="Enter") this.sendChat(); });
  }

  sendChat(){
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    this.store.dispatch(Schema.Action.CHAT, null, { text });
  }

  consumeFocusEvents(){
    const events = this.store.events;
    if (!events || !events.length) return;

    for (let i = this._lastConsumedEventIndex; i < events.length; i++){
      const e = events[i];
      const fid = e?.payload?.focusEntityId;
      if (fid) this._pendingFocusEntityId = fid;
    }
    this._lastConsumedEventIndex = events.length;

    if (this._pendingFocusEntityId){
      const ctx = this.ctx;
      const fid = this._pendingFocusEntityId;
      if (ctx?.room?.entities?.[fid]){
        this._pendingFocusEntityId = null;
        this.focusEntity(fid, { openLoot:true, scrollLoot:true });
      }
    }
  }

  _doorProxyIdForExitId(exitId){ return `doorProxy_${exitId}`; }

  _getDoorProxyFromId(id, ctx=this.ctx){
    if (!id || !String(id).startsWith("doorProxy_")) return null;
    const room = ctx?.room;
    if (!room) return null;
    const exitId = String(id).slice("doorProxy_".length);
    const ex = room.entities[exitId];
    if (!ex || ex.kind !== Schema.EntityKind.EXIT) return null;
    const gate = ex.state?.gate || { type:"open" };
    if (gate.type !== "door" || !gate.doorId) return null;
    const door = room.doors?.[gate.doorId] || null;
    return {
      id,
      kind: Schema.EntityKind.OBJECT,
      name: `Door (${titleCase(ex.state.dir)})`,
      _proxyType: "door",
      state: {
        objectType: "door",
        dir: ex.state.dir,
        exitId: ex.id,
        doorId: gate.doorId,
        doorExists: !!door,
        locked: !!door?.locked,
        open: !!door?.open,
        destination: ex.state.toRoomName || ex.state.toRoomId || "Unknown"
      }
    };
  }

  _getDoorProxyFromExit(ex, ctx=this.ctx){
    if (!ex || ex.kind !== Schema.EntityKind.EXIT) return null;
    const gate = ex.state?.gate || { type:"open" };
    if (gate.type !== "door" || !gate.doorId) return null;
    return this._getDoorProxyFromId(this._doorProxyIdForExitId(ex.id), ctx);
  }

  _getSelectableEntity(entityId, ctx=this.ctx){
    const room = ctx?.room;
    if (!room) return null;
    return room.entities[entityId] || this._getDoorProxyFromId(entityId, ctx);
  }

  _defaultSelectionId(ctx=this.ctx){
    const room = ctx?.room;
    const you = ctx?.you;
    if (!room || !you) return null;

    const entities = Object.values(room.entities || {});

    const engagedEnemy = entities.find(ent => ent.kind === Schema.EntityKind.ENEMY && ent.id === you.engagedEnemyId);
    if (engagedEnemy) return engagedEnemy.id;

    const firstEnemy = entities.find(ent => ent.kind === Schema.EntityKind.ENEMY);
    if (firstEnemy) return firstEnemy.id;

    const firstClosedDoorExit = entities.find(ent => {
      if (ent.kind !== Schema.EntityKind.EXIT) return false;
      const gate = ent.state?.gate || { type:"open" };
      if (gate.type !== "door" || !gate.doorId) return false;
      const door = room.doors?.[gate.doorId] || null;
      return !!door && (!door.open || door.locked);
    });
    if (firstClosedDoorExit) return this._doorProxyIdForExitId(firstClosedDoorExit.id);

    const firstChest = entities.find(ent => ent.kind === Schema.EntityKind.OBJECT && ent.state?.objectType === "chest");
    if (firstChest) return firstChest.id;

    const firstExit = entities.find(ent => ent.kind === Schema.EntityKind.EXIT);
    if (firstExit) return firstExit.id;

    return null;
  }

  _ensureSelectedEntity(){
    const ctx = this.ctx;
    if (!ctx?.room) return;

    const existing = this.selectedEntityId ? this._getSelectableEntity(this.selectedEntityId, ctx) : null;
    if (existing) return;

    this.selectedEntityId = this._defaultSelectionId(ctx);
  }

  focusEntity(entityId, opts={openLoot:false, scrollLoot:false}){
    const ctx = this.ctx;
    if (!ctx) return;

    const ent = this._getSelectableEntity(entityId, ctx);
    if (!ent){
      this._pendingFocusEntityId = entityId;
      return;
    }

    this.selectedEntityId = entityId;

    if (opts.openLoot && ent.kind === Schema.EntityKind.LOOT) this.groupOpen.loot = true;
    if (ent?._proxyType === "door") this.groupOpen.objects = true;

    const label = ent.kind === Schema.EntityKind.EXIT
      ? `${titleCase(ent.state.dir)} (${ent.state.toRoomName || ent.state.toRoomId})`
      : ent.name;

    document.getElementById("selectedName").textContent = label;

    this.renderGroups();
    this.renderInspector();

    requestAnimationFrame(()=>{
      if (opts.scrollLoot && ent.kind === Schema.EntityKind.LOOT){
        const lootGroup = document.getElementById("group_loot");
        if (lootGroup) lootGroup.scrollIntoView({ block:"start" });
      }
      const row = document.querySelector(`[data-entity-id="${CSS.escape(entityId)}"]`);
      if (row) row.scrollIntoView({ block:"nearest" });
    });
  }

  _buildMiniMapNode(roomId){
    const svgMarkup = renderMiniMapSVG(roomId);
    const tpl = document.createElement("template");
    tpl.innerHTML = String(svgMarkup || "").trim();
    const svg = tpl.content.firstElementChild;
    if (svg && String(svg.tagName || "").toLowerCase() === "svg") return svg;
    return null;
  }

  renderMiniMap(){
    const ctx = this.ctx;
    if (!ctx) return;

    const mount = document.getElementById("minimap");
    if (!mount) return;

    const svgNode = this._buildMiniMapNode(ctx.room.id);
    if (!svgNode){
      mount.replaceChildren();
      const fallback = document.createElement("div");
      fallback.className = "muted";
      fallback.textContent = "Map unavailable.";
      mount.appendChild(fallback);
      return;
    }

    mount.replaceChildren(svgNode);
  }

  render(){
    const ctx = this.ctx;
    if (!ctx) return;

    this._ensureSelectedEntity();

    document.getElementById("youPill").textContent = ctx.you?.name || "—";
    document.getElementById("roomPanelTitle").textContent = ctx.room.name;
    document.getElementById("roomTitle").textContent = "Area Chronicle";
    this._renderRoomFlavor(ctx.room);

    this.renderRoomPanel();
    this.renderGroups();
    this.renderInspector();
    this.renderStreams();
    this.consumeFocusEvents();
    this.renderMiniMap();
  }

  renderGroups(){
    const ctx = this.ctx;
    const root = document.getElementById("entityGroups");
    const compassRoot = document.getElementById("compassMount") || root;
    root.innerHTML = "";
    if (compassRoot && compassRoot !== root) compassRoot.innerHTML = "";

    this.renderCompass(compassRoot, ctx);

    const entities = Object.values(ctx.room.entities);
    const doorObjects = Object.values(ctx.room.entities)
      .filter(e => e.kind===Schema.EntityKind.EXIT)
      .map(ex => this._getDoorProxyFromExit(ex, ctx))
      .filter(Boolean);

    const groups = [
      { key:"players", label:"Players", kinds:[Schema.EntityKind.PLAYER] },
      { key:"enemies", label:"Enemies", kinds:[Schema.EntityKind.ENEMY] },
      { key:"objects", label:"Objects", kinds:[Schema.EntityKind.OBJECT] },
      { key:"loot", label:"Loot", kinds:[Schema.EntityKind.LOOT] },
    ];

    for (const g of groups){
      const baseItems = entities.filter(e => g.kinds.includes(e.kind));
      if (g.key === "objects") baseItems.push(...doorObjects);

      const items = baseItems.sort((a,b) => {
        if (g.key === "loot"){
          const ta = a.state?.createdAt ?? 0;
          const tb = b.state?.createdAt ?? 0;
          if (tb !== ta) return tb - ta;
          return a.name.localeCompare(b.name);
        }
        if (g.key === "objects"){
          const ad = a._proxyType === "door" ? 0 : 1;
          const bd = b._proxyType === "door" ? 0 : 1;
          if (ad !== bd) return ad - bd;
        }
        return a.name.localeCompare(b.name);
      });

      const d = document.createElement("details");
      d.className = "group";
      d.id = "group_" + g.key;
      d.open = !!this.groupOpen[g.key];
      d.addEventListener("toggle", ()=>{ this.groupOpen[g.key] = d.open; });

      const s = document.createElement("summary");
      s.innerHTML = `<span>${escapeHtml(g.label)}</span><span class="countPill">${items.length}</span>`;
      d.appendChild(s);

      const list = document.createElement("div");
      list.className = "elist";

      if (!items.length){
        const empty = document.createElement("div");
        empty.className="muted"; empty.style.fontSize="12px"; empty.textContent="(none)";
        list.appendChild(empty);
      } else {
        for (const ent of items){
          const row = document.createElement("div");
          row.className = "entity";
          row.setAttribute("data-entity-id", ent.id);
          if (ent.id === this.selectedEntityId) row.classList.add("selected");

          const left = document.createElement("div");
          left.className = "row";
          left.style.minWidth = "0";

          const dot = document.createElement("div");
          dot.className = "dot";
          if (ent.kind===Schema.EntityKind.PLAYER){ dot.style.borderColor="rgba(122,168,255,.55)"; dot.style.background="rgba(122,168,255,.20)"; }
          if (ent.kind===Schema.EntityKind.ENEMY){ dot.style.borderColor="rgba(255,90,106,.55)"; dot.style.background="rgba(255,90,106,.18)"; }
          if (ent.kind===Schema.EntityKind.OBJECT){ dot.style.borderColor="rgba(255,204,102,.40)"; dot.style.background="rgba(255,204,102,.10)"; }
          if (ent.kind===Schema.EntityKind.LOOT){ dot.style.borderColor="rgba(61,220,151,.50)"; dot.style.background="rgba(61,220,151,.12)"; }

          const name = document.createElement("div");
          name.className = "name";
          name.textContent = ent.name;

          left.appendChild(dot);
          left.appendChild(name);

          const tag = document.createElement("div");
          tag.className = "tag";
          tag.textContent = ent._proxyType === "door" ? "door" : ent.kind;

          row.appendChild(left);
          row.appendChild(tag);

          row.onclick = ()=> this.focusEntity(ent.id);

          list.appendChild(row);
        }
      }

      d.appendChild(list);
      root.appendChild(d);
    }
  }

  renderCompass(root, ctx){
    const exits = Object.values(ctx.room.entities).filter(e => e.kind === Schema.EntityKind.EXIT);
    const exitsByDir = {};
    for (const ex of exits){
      exitsByDir[ex.state?.dir] = ex;
    }

    const wrap = document.createElement("div");
    wrap.className = "compassWrap";

    const title = document.createElement("div");
    title.className = "compassTitle";
    title.textContent = "Directions";
    wrap.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "compassGrid";

    const makeBtn = (dir, label, cellClass) => {
      const ex = exitsByDir[dir] || null;
      const btn = document.createElement("button");
      btn.className = `compassBtn dir-${dir} ${cellClass}`;
      btn.type = "button";
      btn.setAttribute("aria-label", label);
      btn.innerHTML = `<span class="compassLetter">${escapeHtml(label[0])}</span>`;
      btn.disabled = !ex;
      if (ex){
        btn.title = ex.state.toRoomName || ex.state.toRoomId || titleCase(dir);
        btn.addEventListener("click", ()=>{
          const gate = ex.state?.gate || { type:"open" };
          if (gate.type === "door"){
            const door = ctx.room.doors?.[gate.doorId] || null;
            const blocked = !door || door.locked || !door.open;
            if (blocked){
              const doorProxy = this._getDoorProxyFromExit(ex, ctx);
              if (doorProxy) this.focusEntity(doorProxy.id);
              return;
            }
          }
          this.store.dispatch(Schema.Action.TRAVEL, ex.id, null);
        });
      } else {
        btn.title = "No exit";
      }
      return btn;
    };

    grid.appendChild(makeBtn("north", "North", "cellNorth"));
    grid.appendChild(makeBtn("west", "West", "cellWest"));

    const center = document.createElement("div");
    center.className = "compassCenter cellCenter";
    center.setAttribute("aria-hidden", "true");
    center.textContent = "";
    grid.appendChild(center);

    grid.appendChild(makeBtn("east", "East", "cellEast"));
    grid.appendChild(makeBtn("south", "South", "cellSouth"));

    wrap.appendChild(grid);
    root.appendChild(wrap);
  }

  renderRoomPanel(){
    const ctx = this.ctx;
    if (!ctx) return;

    const you = ctx.you || {};
    const xp = you.xp ?? 0;
    const xpNext = you.xpNext ?? 200;
    const lvl = you.lvl ?? 1;
    document.getElementById("statusStrip").textContent = `HP ${U.fmtHp(you.hp ?? 0, you.hpMax ?? 0)} | LVL ${lvl} | XP ${xp}/${xpNext}`;
    document.getElementById("roomPanelTitle").textContent = ctx.room.name;
    document.getElementById("roomTitle").textContent = "Area Chronicle";
    this._renderRoomFlavor(ctx.room);

    const feedEl = document.querySelector(".roomPanel #roomFeed") || document.getElementById("roomFeed");
    if (!feedEl) return;
    const events = this.store.events.slice(-1200);
    const roomId = ctx.room.id;
    const roomEvents = events.filter(e => {
      if (e.kind !== Schema.EventKind.SYSTEM && e.kind !== Schema.EventKind.COMBAT) return false;
      const aud = e.audience || "both";
      if (aud !== "room" && aud !== "both") return false;
      return e.payload?.roomId === roomId;
    }).slice(-200);

    const wasAtBottom = (feedEl.scrollTop + feedEl.clientHeight) >= (feedEl.scrollHeight - 8);
    const fmtTime = (ms) => {
      const d = new Date(ms);
      return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
    };
    const classify = (e) => {
      const t = String(e.text || "").toLowerCase();

      if (t.includes("connected") || t.includes("traveler") || t.includes("voices drift") || t.includes("overlapping footsteps")) return "rf-presence";

      if (/^you return|^you descend|^you slip|^you step into|^you enter/.test(t)) return "rf-enter";

      if (t.includes("drip") || t.includes("clink") || t.includes("chain taps") || t.includes("gravel shifts") || t.includes("wings burst") || t.includes("twigs crack") || t.includes("hammer rings") || t.includes("shutters knock")) return "rf-ambient";

      if (t.startsWith("moved ") || t.startsWith("scouted ") || t.includes("door is ") || t.includes("opened the") || t.includes("closed the") || t.includes("unlocked the")) return "rf-move";

      if (t.includes("engage the")) return "rf-engage";
      if (t.includes("steel clashes") || t.includes(" hits ") || t.includes(" misses ") || t.includes("skitters") || t.includes("stresses")) return "rf-clash";
      if (t.includes("faltering") || t.includes("badly wounded") || t.includes("near death")) return "rf-condition";
      if (t.includes("collapses") || t.includes("fall unconscious") || t.includes("is defeated")) return "rf-death";
      if (/^a\s.+\sappears\./.test(t)) return "rf-spawn";

      if (t.includes("loot") || t.includes("picked up") || t.includes("opened chest") || t.includes("unlocked")) return "rf-loot";
      return "rf-system";
    };

    const toRoomNarrative = (e) => {
      const txt = String(e.text || "");
      if (e.kind === Schema.EventKind.COMBAT){
        if (/\bhits\b/i.test(txt) || /\bstrikes\b/i.test(txt)) return "Steel clashes in the dust.";
      }
      const mEngaged = txt.match(/^Engaged\s+(.+)\.$/i);
      if (mEngaged) return `You engage the ${mEngaged[1]}.`;
      const mDefeated = txt.match(/^(.+)\s+is defeated\./i);
      if (mDefeated) return `The ${mDefeated[1]} collapses.`;
      return txt;
    };

    const hasActiveCombat = Object.values(ctx.room?.combats || {}).some(c => Object.keys(c?.engaged || {}).length > 0);
    const ambientState = hasActiveCombat ? null : this.renderAmbientStateLine(roomEvents, ctx.room, fmtTime(U.now()));

    const entries = roomEvents.map(e => {
      const time = fmtTime(e.ts);
      return `<div class="rfMsg ${classify(e)}"><div class="rfTime">${escapeHtml(time)}</div><div class="rfText">${escapeHtml(toRoomNarrative(e))}</div></div>`;
    });

    if (ambientState) entries.push(ambientState);

    feedEl.innerHTML = entries.join("") || `<div class="muted" style="font-size:12px">No room events yet.</div>`;

    if (wasAtBottom) feedEl.scrollTop = feedEl.scrollHeight;
  }

  _renderRoomFlavor(room){
    const flavorEl = document.getElementById("roomFlavor");
    if (!flavorEl || !room) return;
    flavorEl.textContent = room.flavor || "";
    const changed = this._lastRoomId !== room.id;
    flavorEl.classList.remove("roomFlavor--enter");
    if (changed){
      void flavorEl.offsetWidth;
      flavorEl.classList.add("roomFlavor--enter");
      this._lastRoomId = room.id;
    }
  }

  _menuPathForAction(action){
    if (Array.isArray(action?.menuPath) && action.menuPath.length) return action.menuPath;
    const intentAction = action?.intent?.action;
    if (intentAction === Schema.Action.QUEUE_ACTION) return ["Physical Attacks", "Core Verbs"];
    if (intentAction === Schema.Action.ENGAGE || intentAction === Schema.Action.DISENGAGE) return ["Interact", "Combat"];
    if (intentAction === Schema.Action.UNLOCK || intentAction === Schema.Action.OPEN || intentAction === Schema.Action.UNLOCK_DOOR || intentAction === Schema.Action.OPEN_DOOR || intentAction === Schema.Action.CLOSE_DOOR) return ["Interact", "Environment"];
    if (intentAction === Schema.Action.PICKUP) return ["Use", "Loot"];
    if (intentAction === Schema.Action.TRAVEL || intentAction === Schema.Action.SCOUT_NEXT) return ["Interact", "Movement"];
    return ["Interact", "General"];
  }

  _renderActionDropdown(actions){
    let html = `<div class="actionMenuFlat"><div class="actionRow">`;
    html += `<select class="actionSelect" data-action-select>`;
    for (let i=0;i<actions.length;i++){
      const a = actions[i];
      const disabled = a.enabled ? "" : "disabled";
      const label = `${a.label}${a.enabled ? "" : " (unavailable)"}`;
      html += `<option value="${i}" ${disabled}>${escapeHtml(label)}</option>`;
    }
    html += `</select>`;
    html += `<button class="btn small" type="button" data-action-run>Do</button>`;
    html += `</div></div>`;
    return html;
  }

  renderAmbientStateLine(roomEvents, room, nowTimeLabel){
    const recent = roomEvents.slice(-24);
    const now = U.now();
    const hasActiveCombat = Object.values(room?.combats || {}).some(c => Object.keys(c?.engaged || {}).length > 0);

    const isInteractiveEvent = (e) => {
      const low = String(e?.text || "").toLowerCase();
      if (e?.kind === Schema.EventKind.COMBAT) return true;
      return low.startsWith("moved ")
        || low.startsWith("scouted ")
        || low.includes("opened")
        || low.includes("closed")
        || low.includes("unlocked")
        || low.includes("picked up")
        || low.includes("engage the")
        || low.includes("brace for impact");
    };

    const newestAction = [...recent].reverse().find(isInteractiveEvent);
    if (!newestAction) return null;

    const actionAge = now - (newestAction.ts || 0);
    if (actionAge > 1500) return null;

    const low = String(newestAction.text || "").toLowerCase();
    const payload = newestAction.payload || {};
    const entityRef = payload.enemyId || payload.objectId || payload.lootId || payload.exitId || payload.roomId || "room";

    const actionType = newestAction.kind === Schema.EventKind.COMBAT
      ? (low.includes("critical") ? "combat-crit" : low.includes("miss") ? "combat-miss" : "combat-hit")
      : (low.includes("opened") ? "interact-open"
        : low.includes("closed") ? "interact-close"
        : low.includes("unlocked") ? "interact-unlock"
        : low.includes("picked up") ? "interact-loot"
        : low.includes("moved") ? "interact-move"
        : low.includes("scouted") ? "interact-scout"
        : low.includes("engage") ? "interact-engage"
        : "interact");

    const eventKey = `${actionType}:${entityRef}:${newestAction.ts}`;

    if (this._lastAmbientActionSoundKey !== eventKey){
      this._lastAmbientActionSoundKey = eventKey;
    } else if (actionAge > 900){
      // same action has already been displayed; let it disappear quickly
      return null;
    }

    const pick = (arr) => arr[(Number(newestAction.ts) || now) % arr.length];
    const ono = actionType === "combat-crit" ? pick(["KRANG", "SKRAK", "KRAANG"])
      : actionType === "combat-miss" ? pick(["WHIFF", "SWISH", "FWIP"])
      : actionType === "combat-hit" ? pick(["CLANG", "KLANG", "CLASH"])
      : actionType === "interact-open" ? pick(["CREAK", "KNOCK", "CLACK"])
      : actionType === "interact-close" ? pick(["THUD", "CLACK", "TOK"])
      : actionType === "interact-unlock" ? pick(["CLICK", "TCHK", "SNICK"])
      : actionType === "interact-loot" ? pick(["JINGLE", "CHINK", "CLINK"])
      : actionType === "interact-move" ? pick(["SCUFF", "STEP", "TRUDGE"])
      : actionType === "interact-scout" ? pick(["HUSH", "RUSTLE", "SIFT"])
      : pick(["CLINK", "SHIFT", "WIND"]);

    const combatCls = hasActiveCombat ? " is-combat" : "";
    return `<div class="rfMsg rf-ambient-state${combatCls}"><div class="rfTime">${escapeHtml(nowTimeLabel)}</div><div class="rfText"><span class="rfActionSound">${escapeHtml(ono)}</span>.</div></div>`;
  }

  renderInspector(){
    const ctx = this.ctx;
    const box = document.getElementById("inspector");

    if (!this.selectedEntityId){
      document.getElementById("selKindPill").textContent="—";
      box.innerHTML = `<div class="muted">Select an entity to see details and actions.</div>`;
      document.getElementById("selectedName").textContent = "None";
      return;
    }

    const ent = this._getSelectableEntity(this.selectedEntityId, ctx);
    if (!ent){
      document.getElementById("selKindPill").textContent="—";
      box.innerHTML = `<div class="muted">That entity no longer exists.</div>`;
      return;
    }

    const handler = Handlers[ent.kind];
    document.getElementById("selKindPill").textContent = ent._proxyType === "door" ? "door" : ent.kind;

    let vm = handler ? handler.inspect(ent, ctx) : null;
    let actions = handler ? handler.actions(ent, ctx) : [];

    if (ent?._proxyType === "door"){
      const inCombat = !!ctx.you?.engagedEnemyId;
      const open = !!ent.state.open;
      const locked = !!ent.state.locked;
      const exists = !!ent.state.doorExists;

      vm = {
        title: ent.name,
        kindLabel: "Door",
        sections:[
          { type:"kv", rows:[
            ["Direction", titleCase(ent.state.dir)],
            ["Destination", ent.state.destination],
            ["Locked", exists ? (locked ? "Yes" : "No") : "Missing"],
            ["Open", exists ? (open ? "Yes" : "No") : "Missing"]
          ]},
          { type:"text", text:"Unlock, then open to pass through this direction." }
        ]
      };

      actions = [
        { label:"Unlock", style:"", enabled: !inCombat && exists && locked, hint: inCombat?"In combat":(exists ? (locked?"Requires Rusty Key":"Not locked") : "Door missing"), menuPath:["Interact","Door"], intent:{ action:Schema.Action.UNLOCK_DOOR, targetId: ent.state.exitId } },
        { label:"Open", style:"", enabled: !inCombat && exists && !locked && !open, hint: inCombat?"In combat":(exists ? (locked?"Locked":(open?"Already open":"")) : "Door missing"), menuPath:["Interact","Door"], intent:{ action:Schema.Action.OPEN_DOOR, targetId: ent.state.exitId } },
        { label:"Close", style:"", enabled: !inCombat && exists && open, hint: inCombat?"In combat":(exists ? (open?"":"Already closed") : "Door missing"), menuPath:["Interact","Door"], intent:{ action:Schema.Action.CLOSE_DOOR, targetId: ent.state.exitId } }
      ];
    }

    const sections = vm?.sections || [];
    const hpSec = sections.find(sec => sec.type === "hp");
    const kvSecs = sections.filter(sec => sec.type === "kv");
    const textSecs = sections.filter(sec => sec.type === "text");

    const parts=[];
    parts.push(`<div class="card">`);
    parts.push(`<div class="h1">${escapeHtml(vm?.title ?? ent.name)}</div>`);
    parts.push(`<div class="tiny">${escapeHtml(vm?.kindLabel ?? ent.kind)}</div>`);

    if (hpSec){
      const pct = hpSec.hpMax ? Math.round((hpSec.hp/hpSec.hpMax)*100) : 0;
      parts.push(`<div style="display:flex; justify-content:space-between; font-size:12px; color:var(--muted)"><span>HP</span><span>${escapeHtml(U.fmtHp(hpSec.hp, hpSec.hpMax))}</span></div>`);
      parts.push(`<div class="bar bad"><div style="width:${pct}%;"></div></div>`);
    }

    parts.push(`<div class="actionsHeader">Actions</div>`);
    if (!actions.length){
      parts.push(`<div class="actions"><span class="muted" style="font-size:12px">No actions available.</span></div>`);
    } else {
      parts.push(this._renderActionDropdown(actions));
    }

    parts.push(`<div class="inspectorDetails"><div class="tiny" style="margin-top:8px; margin-bottom:4px; color:var(--muted); font-weight:800; text-transform:uppercase;">Details</div>`);
    for (const sec of kvSecs){
      parts.push(`<div class="kv">` + sec.rows.map(([k,v])=>`<div>${escapeHtml(k)}</div><div>${escapeHtml(v)}</div>`).join("") + `</div>`);
    }
    for (const sec of textSecs){
      parts.push(`<div class="hint">${escapeHtml(sec.text)}</div>`);
    }
    parts.push(`</div>`);
    parts.push(`</div>`);

    box.innerHTML = parts.join("");

    const runBtn = box.querySelector("[data-action-run]");
    const selectEl = box.querySelector("[data-action-select]");
    if (runBtn && selectEl){
      runBtn.addEventListener("click", ()=>{
        const idx = Number(selectEl.value);
        const a = actions[idx];
        if (!a || !a.enabled) return;
        const intent = a.intent || {};
        this.store.dispatch(intent.action, intent.targetId || ent.id || null, intent.payload || null);
      });
      selectEl.addEventListener("dblclick", ()=> runBtn.click());
    }

    box.querySelectorAll("button[data-act]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const idx = Number(btn.getAttribute("data-act"));
        const a = actions[idx];
        if (!a || !a.enabled) return;
        const intent = a.intent || {};
        this.store.dispatch(intent.action, intent.targetId || ent.id || null, intent.payload || null);
      });
    });
  }

  renderStreams(){
    const chatEl = document.getElementById("chatStream");
    if (!chatEl) return;

    const events = this.store.events.slice(-800);
    const chats = events.filter(e => e.kind === Schema.EventKind.CHAT);

    const chatWasAtBottom = (chatEl.scrollTop + chatEl.clientHeight) >= (chatEl.scrollHeight - 8);

    const fmtTime = (ms) => {
      const d = new Date(ms);
      const hh = String(d.getHours()).padStart(2,"0");
      const mm = String(d.getMinutes()).padStart(2,"0");
      return `${hh}:${mm}`;
    };

    chatEl.innerHTML = chats.map(e => {
      const time = fmtTime(e.ts);
      let who = "Chat";
      let text = e.text || "";
      const m = text.match(/^([^:]{1,40}):\s*(.*)$/);
      if (m){ who = m[1].trim(); text = m[2]; }
      return `<div class="msg">
        <div class="time">${escapeHtml(time)}</div>
        <div class="who">${escapeHtml(who)}</div>
        <div class="text">${escapeHtml(text)}</div>
      </div>`;
    }).join("") || `<div class="muted">No chat messages yet.</div>`;

    if (chatWasAtBottom) chatEl.scrollTop = chatEl.scrollHeight;
  }
}

window.app = new App();
