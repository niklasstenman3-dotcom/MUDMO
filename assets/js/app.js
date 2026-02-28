import { Schema, U, escapeHtml, escapeAttr, titleCase } from "./config/schema.js";
import { ThemeBg, RoomDefs, renderMiniMapSVG } from "./config/world.js";
import { ensureSpawns } from "./engine/systems/spawn-system.js";
import { pickRandomFrom, emitRoomAmbient, roomHasActiveCombat } from "./engine/systems/ambient-system.js";

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
          state: { objectType:o.objectType, locked:!!o.locked, opened:false }
        };
      }
    }
  }

  _spawnEnemy(rule){
    return {
      id:"enemy_"+U.uid(),
      kind:Schema.EntityKind.ENEMY,
      name:rule.name,
      state:{
        enemyDefId:rule.defId,
        hp:rule.hp, hpMax:rule.hp,
        stats:{atk:rule.atk, def:rule.def, spd:rule.spd},
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
    return {
      id, name,
      roomId:"room_1",
      hp:60, hpMax:60,
      lvl:1, xp:0, xpNext:200,
      stats:{atk:10, def:4, spd:4},
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

    if (!p.engagedEnemyId){
      this._emitEvent(Schema.EventKind.SYSTEM, `You're not engaged.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    const enemyId = p.engagedEnemyId;
    const combat = this._ensureCombat(room, enemyId, pid);

    if (combat.turn.phase !== "player" || combat.turn.turnPid !== pid){
      this._emitEvent(Schema.EventKind.SYSTEM, `Wait…`, null, { actorPlayerId: pid, roomId: room.id, enemyId });
      return;
    }

    combat.actions[pid] = action;
    // Resolve immediately in MVP (no queue batching)
    this._resolveTurnedCombat(room.id, enemyId, pid);
  }

  _resolveTurnedCombat(roomId, enemyId, actorPid){
    const room = this.state.rooms[roomId];
    if (!room) return;

    const combat = room.combats?.[enemyId];
    const enemy  = room.entities?.[enemyId];
    if (!combat || !enemy || enemy.kind !== Schema.EntityKind.ENEMY) return;

    combat.turn = combat.turn || { phase:"player", turnPid: actorPid, busyUntil:0 };
    if (combat.turn.phase !== "player") return;
    if (combat.turn.turnPid !== actorPid) return;

    const engagedIds = Object.keys(combat.engaged || {});
    if (!engagedIds.length) return;

    const p = this.state.players[actorPid];
    if (!p || p.hp <= 0) return;
    if (p.engagedEnemyId !== enemyId) return;

    const a = combat.actions?.[actorPid] || { type:"attack", targetId: enemyId };

    // log your action first (personal)
    const prevEnemyHp = enemy.state.hp;
    const emitEnemyStateNarrative = (beforeHp, afterHp) => {
      const max = enemy.state.hpMax || 1;
      const beforePct = (beforeHp / max) * 100;
      const afterPct = (afterHp / max) * 100;
      const states = [
        { t:75, msg:`${enemy.name} is faltering.` },
        { t:40, msg:`${enemy.name} is badly wounded.` },
        { t:15, msg:`${enemy.name} is near death.` },
      ];
      for (const st of states){
        if (beforePct > st.t && afterPct <= st.t && afterHp > 0){
          this._emitEvent(Schema.EventKind.SYSTEM, st.msg, null, { actorPlayerId: p.id, roomId: room.id, enemyId }, "room");
        }
      }
    };

    if (a.type === "defend"){
      p._defending = true;
      this._emitEvent(Schema.EventKind.SYSTEM, `You brace for impact.`, null, { actorPlayerId: p.id, roomId: room.id, enemyId, targetPlayerId:p.id }, "personal");
    } else {
      let dmg = Math.max(1, p.stats.atk - enemy.state.stats.def);
      if (a.type === "skill") dmg = Math.round(dmg * 1.8);
      enemy.state.hp = Math.max(0, enemy.state.hp - dmg);

      this._emitEvent(Schema.EventKind.COMBAT, `Steel clashes in the dust.`, null, { actorPlayerId: p.id, roomId: room.id, enemyId }, "room");
      this._emitEvent(Schema.EventKind.COMBAT, `You hit ${enemy.name} for ${dmg} (${enemy.state.hp} HP left).`, null, {
        actorPlayerId: p.id, targetPlayerId: p.id, roomId: room.id, enemyId
      }, "personal");

      emitEnemyStateNarrative(prevEnemyHp, enemy.state.hp);
    }

    delete combat.actions[actorPid];

    // enemy dead -> loot -> focus
    if (enemy.state.hp <= 0){
      const loot = this._spawnLoot(`${enemy.name} Coin`, "common");
      room.entities[loot.id] = loot;

      this._emitEvent(Schema.EventKind.SYSTEM, `The ${enemy.name} collapses.`, null, {
        roomId: room.id, enemyId, focusEntityId: loot.id
      }, "room");
      this._emitEvent(Schema.EventKind.SYSTEM, `You defeated ${enemy.name}. Loot dropped: ${loot.name}.`, null, {
        actorPlayerId: actorPid, targetPlayerId: actorPid, roomId: room.id, enemyId, focusEntityId: loot.id
      }, "personal");

      for (const pid of engagedIds){
        const pp = this.state.players[pid];
        if (!pp) continue;
        pp._defending = false;
        pp.engagedEnemyId = null;
        const gainedXp = 25;
        pp.xp = (pp.xp || 0) + gainedXp;
        while (pp.xp >= (pp.xpNext || 200)){
          pp.xp -= pp.xpNext;
          pp.lvl = (pp.lvl || 1) + 1;
          pp.xpNext = Math.round(pp.xpNext * 1.25);
          this._emitEvent(Schema.EventKind.SYSTEM, `${pp.name} reached level ${pp.lvl}.`, null, { actorPlayerId: pp.id, roomId: room.id });
        }
        delete combat.actions[pid];
      }

      delete room.combats[enemyId];
      delete room.entities[enemyId];
      room.ambientMeta.lastAmbientAt = 0;
      this._emitRoomAmbient(room);
      this._broadcastState();
      return;
    }

    // enemy phase: disable buttons on client
    combat.turn.phase = "enemy";
    combat.turn.busyUntil = U.now() + 550;
    this._broadcastState();

    setTimeout(() => {
      const r = this.state.rooms[roomId];
      const c = r?.combats?.[enemyId];
      const en = r?.entities?.[enemyId];
      const pl = this.state.players[actorPid];
      if (!r || !c || !en || !pl) return;

      let edmg = Math.max(1, en.state.stats.atk - pl.stats.def);
      if (pl._defending) edmg = Math.ceil(edmg * 0.6);

      pl.hp = Math.max(0, pl.hp - edmg);

      this._emitEvent(Schema.EventKind.COMBAT, `Steel clashes in the dust.`, null, {
        targetPlayerId: pl.id, roomId: r.id, enemyId
      }, "room");
      this._emitEvent(Schema.EventKind.COMBAT, `${en.name} hits You for ${edmg} (${pl.hp} HP left).`, null, {
        targetPlayerId: pl.id, roomId: r.id, enemyId
      }, "personal");

      pl._defending = false;

      if (pl.hp <= 0){
        this._emitEvent(Schema.EventKind.SYSTEM, `You fall unconscious.`, null, {
          targetPlayerId: pl.id, roomId: r.id, enemyId
        });
        this._disengage(pl.id);
        this._broadcastState();
        return;
      }

      c.turn.phase = "player";
      c.turn.turnPid = actorPid;
      c.turn.busyUntil = 0;
      this._broadcastState();
    }, 550);
  }

  _openObject(pid, objId){
    const room = this._roomOf(pid);
    const p = this.state.players[pid];
    if (!room || !p) return;
    if (p.engagedEnemyId){
      this._emitEvent(Schema.EventKind.SYSTEM, `Can't do that while engaged.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    const obj = room.entities[objId];
    if (!obj || obj.kind !== Schema.EntityKind.OBJECT) return;

    if (obj.state.objectType === "chest"){
      if (obj.state.locked){
        this._emitEvent(Schema.EventKind.SYSTEM, `The chest is locked.`, null, { actorPlayerId: pid, roomId: room.id, objectId: objId });
        return;
      }
      if (obj.state.opened){
        this._emitEvent(Schema.EventKind.SYSTEM, `The chest is empty.`, null, { actorPlayerId: pid, roomId: room.id, objectId: objId });
        return;
      }

      obj.state.opened = true;

      // drop loot + focus
      const loot = this._spawnLoot("Iron Sword", "common");
      room.entities[loot.id] = loot;

      this._emitEvent(Schema.EventKind.SYSTEM, `Opened chest. Loot: ${loot.name}.`, null, {
        actorPlayerId: pid, roomId: room.id, objectId: objId, focusEntityId: loot.id
      });
    }
  }

  _unlockObject(pid, objId){
    const room = this._roomOf(pid);
    const p = this.state.players[pid];
    if (!room || !p) return;
    if (p.engagedEnemyId){
      this._emitEvent(Schema.EventKind.SYSTEM, `Can't do that while engaged.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    const obj = room.entities[objId];
    if (!obj || obj.kind !== Schema.EntityKind.OBJECT) return;

    const hasKey = p.inventory.some(it => (it.name||"").toLowerCase().includes("rusty key"));
    if (!obj.state.locked){
      this._emitEvent(Schema.EventKind.SYSTEM, `It's not locked.`, null, { actorPlayerId: pid, roomId: room.id, objectId: objId });
      return;
    }
    if (!hasKey){
      this._emitEvent(Schema.EventKind.SYSTEM, `You need a Rusty Key.`, null, { actorPlayerId: pid, roomId: room.id, objectId: objId });
      return;
    }

    obj.state.locked = false;
    this._emitEvent(Schema.EventKind.SYSTEM, `Unlocked.`, null, { actorPlayerId: pid, roomId: room.id, objectId: objId });
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
    const p = this.state.players[pid];
    if (!room || !p) return;
    if (p.engagedEnemyId){
      this._emitEvent(Schema.EventKind.SYSTEM, `Can't do that while engaged.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    const {door, doorId, ex} = this._exitDoor(room, exitId);
    if (!doorId || !door){
      this._emitEvent(Schema.EventKind.SYSTEM, `No door to unlock.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }
    if (!door.locked){
      this._emitEvent(Schema.EventKind.SYSTEM, `Door isn't locked.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    const hasKey = p.inventory.some(it => (it.name||"").toLowerCase().includes("rusty key"));
    if (!hasKey){
      this._emitEvent(Schema.EventKind.SYSTEM, `You need a Rusty Key.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    door.locked = false;
    this._emitEvent(Schema.EventKind.SYSTEM, `Unlocked the ${titleCase(ex.state.dir)} door.`, null, { actorPlayerId: pid, roomId: room.id });
  }

  _openDoor(pid, exitId){
    const room = this._roomOf(pid);
    const p = this.state.players[pid];
    if (!room || !p) return;
    if (p.engagedEnemyId){
      this._emitEvent(Schema.EventKind.SYSTEM, `Can't do that while engaged.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    const {door, doorId, ex} = this._exitDoor(room, exitId);
    if (!doorId || !door){
      this._emitEvent(Schema.EventKind.SYSTEM, `No door to open.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }
    if (door.locked){
      this._emitEvent(Schema.EventKind.SYSTEM, `Door is locked.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }
    if (door.open){
      this._emitEvent(Schema.EventKind.SYSTEM, `Door is already open.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    door.open = true;
    this._emitEvent(Schema.EventKind.SYSTEM, `Opened the ${titleCase(ex.state.dir)} door.`, null, { actorPlayerId: pid, roomId: room.id });
  }

  _closeDoor(pid, exitId){
    const room = this._roomOf(pid);
    const p = this.state.players[pid];
    if (!room || !p) return;
    if (p.engagedEnemyId){
      this._emitEvent(Schema.EventKind.SYSTEM, `Can't do that while engaged.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    const {door, doorId, ex} = this._exitDoor(room, exitId);
    if (!doorId || !door){
      this._emitEvent(Schema.EventKind.SYSTEM, `No door to close.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }
    if (!door.open){
      this._emitEvent(Schema.EventKind.SYSTEM, `Door is already closed.`, null, { actorPlayerId: pid, roomId: room.id });
      return;
    }

    door.open = false;
    this._emitEvent(Schema.EventKind.SYSTEM, `Closed the ${titleCase(ex.state.dir)} door.`, null, { actorPlayerId: pid, roomId: room.id });
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

    for (const room of Object.values(this.state.rooms)){
      if (this._ensureSpawns(room, false)) dirty = true;

      const now = U.now();
      const lastAmb = room.ambientMeta?.lastAmbientAt || 0;
      if (room.playerIds?.length && (now - lastAmb) >= 4500){
        this._emitRoomAmbient(room);
      }

      for (const ent of Object.values(room.entities)){
        if (ent.kind === Schema.EntityKind.LOOT && ent.state?.expiresAt && now > ent.state.expiresAt){
          delete room.entities[ent.id];
          dirty = true;
        }
      }
    }

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
        { label:"Engage", style:"primary", enabled: !anyEngaged && !youEngagedThis && !full, hint: full?"Crowded":(anyEngaged?"Disengage first":""), intent:{ action:Schema.Action.ENGAGE, targetId: ent.id } },
        { label:"Disengage", style:"", enabled: youEngagedThis, hint: youEngagedThis?"":"Not engaged", intent:{ action:Schema.Action.DISENGAGE } }
      ];

      if (youEngagedThis){
        const hint = isYourTurn ? "" : "Enemy is acting…";
        acts.push(
          { label:"Attack", style:"primary", enabled:isYourTurn, hint, intent:{ action:Schema.Action.QUEUE_ACTION, payload:{ type:"attack", targetId: ent.id } } },
          { label:"Defend", style:"", enabled:isYourTurn, hint, intent:{ action:Schema.Action.QUEUE_ACTION, payload:{ type:"defend" } } },
          { label:"Power Strike", style:"", enabled:isYourTurn, hint, intent:{ action:Schema.Action.QUEUE_ACTION, payload:{ type:"skill", targetId: ent.id } } }
        );
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
      if (ent.state.objectType==="chest"){
        return [
          { label:"Unlock", style:"", enabled: !inCombat && ent.state.locked, hint: inCombat?"In combat":(ent.state.locked?"Requires Rusty Key":"Not locked"), intent:{ action:Schema.Action.UNLOCK, targetId: ent.id } },
          { label:"Open", style:"primary", enabled: !inCombat && !ent.state.locked && !ent.state.opened, hint: inCombat?"In combat":(ent.state.opened?"Already opened":(ent.state.locked?"Locked":"")), intent:{ action:Schema.Action.OPEN, targetId: ent.id } }
        ];
      }
      return [];
    }
  },

  [Schema.EntityKind.LOOT]: {
    inspect(ent){
      return { title: ent.name, kindLabel:"Loot", sections:[{ type:"kv", rows:[["Rarity", ent.state.rarity]] }, { type:"text", text:"Dropped item." }] };
    },
    actions(ent, ctx){
      const inCombat = !!ctx.you?.engagedEnemyId;
      return [{ label:"Pick Up", style:"primary", enabled: !inCombat, hint: inCombat?"Finish combat first":"", intent:{ action:Schema.Action.PICKUP, targetId: ent.id } }];
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

  renderMiniMap(){
    const ctx = this.ctx;
    if (!ctx) return;
    document.getElementById("minimap").innerHTML = renderMiniMapSVG(ctx.room.id);
  }

  render(){
    const ctx = this.ctx;
    if (!ctx) return;

    document.getElementById("youPill").textContent = ctx.you?.name || "—";
    document.getElementById("roomTitle").textContent = ctx.room.name;
    document.getElementById("roomFlavor").textContent = ctx.room.flavor;

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
    root.innerHTML = "";

    this.renderCompass(root, ctx);

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
      btn.className = `compassBtn ${cellClass}`;
      btn.type = "button";
      btn.textContent = label;
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
    center.textContent = "You";
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
    document.getElementById("roomTitle").textContent = ctx.room.name;
    document.getElementById("roomFlavor").textContent = ctx.room.flavor;

    const feedEl = document.getElementById("roomFeed");
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
      if (t.includes("steel clashes")) return "rf-clash";
      if (t.includes("faltering") || t.includes("badly wounded") || t.includes("near death")) return "rf-condition";
      if (t.includes("collapses") || t.includes("fall unconscious")) return "rf-death";
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

    const ambientState = this.renderAmbientStateLine(roomEvents, ctx.room, fmtTime(U.now()));

    const entries = roomEvents.map(e => {
      const time = fmtTime(e.ts);
      return `<div class="rfMsg ${classify(e)}"><div class="rfTime">${escapeHtml(time)}</div><div class="rfText">${escapeHtml(toRoomNarrative(e))}</div></div>`;
    });

    if (ambientState) entries.push(ambientState);

    feedEl.innerHTML = entries.join("") || `<div class="muted" style="font-size:12px">No room events yet.</div>`;

    if (wasAtBottom) feedEl.scrollTop = feedEl.scrollHeight;
  }

  renderAmbientStateLine(roomEvents, room, nowTimeLabel){
    const recent = roomEvents.slice(-10);

    const soundTokenFor = (text) => {
      const low = String(text || "").toLowerCase();
      if (low.includes("drip")) return "drip";
      if (low.includes("wind")) return "wind";
      if (low.includes("shift") || low.includes("skitter") || low.includes("rustle")) return "shift";
      if (low.includes("clink") || low.includes("taps") || low.includes("knock")) return "clink";
      if (low.includes("rattle") || low.includes("clang") || low.includes("rings") || low.includes("slams") || low.includes("steel clashes")) return "CLANG";
      return null;
    };

    const steadyByRoom = {
      catacombs: ["drip", "shift", "drip", "wind"],
      road: ["wind", "shift", "wind", "wind"],
      forest: ["wind", "shift", "wind", "shift"],
      village: ["wind", "clink", "wind", "clink"]
    };

    const steady = steadyByRoom[room?.defId] || ["wind", "shift", "wind", "wind"];
    const recentTokens = recent.map(e => soundTokenFor(e.text)).filter(Boolean);
    const base = recentTokens.length ? recentTokens.slice(-3) : steady.slice(0, 3);

    const impactIndex = [...recent].reverse().findIndex(e => {
      const low = String(e?.text || "").toLowerCase();
      return low.includes("rattle") || low.includes("clang") || low.includes("rings") || low.includes("slams") || low.includes("steel clashes");
    });
    const hasRecentImpact = impactIndex > -1 && impactIndex < 3;

    const sequence = [...base];
    while (sequence.length < 4) sequence.push(steady[sequence.length % steady.length]);
    sequence.length = 4;
    if (hasRecentImpact) sequence[2] = "CLANG";

    const lastNarrative = recent.length ? String(recent[recent.length - 1].text || "").trim() : room?.flavor || "The room settles back into its steady rhythm.";
    const explain = escapeHtml(lastNarrative.replace(/\s+/g, " ").slice(0, 110));

    const renderedTokens = sequence.map((tok, idx) => {
      const cls = tok === "CLANG" ? "rfStateToken rfStateToken--impact" : "rfStateToken rfStateToken--soft";
      return `${idx > 0 ? '<span class="rfStateSep"> … </span>' : ''}<span class="${cls}">${escapeHtml(tok)}</span>`;
    }).join("");

    return `<div class="rfMsg rf-ambient-state"><div class="rfTime">${escapeHtml(nowTimeLabel)}</div><div class="rfText">${renderedTokens}<span class="rfStateExplain"> — ${explain}</span></div></div>`;
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
        { label:"Unlock", style:"", enabled: !inCombat && exists && locked, hint: inCombat?"In combat":(exists ? (locked?"Requires Rusty Key":"Not locked") : "Door missing"), intent:{ action:Schema.Action.UNLOCK_DOOR, targetId: ent.state.exitId } },
        { label:"Open", style:"", enabled: !inCombat && exists && !locked && !open, hint: inCombat?"In combat":(exists ? (locked?"Locked":(open?"Already open":"")) : "Door missing"), intent:{ action:Schema.Action.OPEN_DOOR, targetId: ent.state.exitId } },
        { label:"Close", style:"", enabled: !inCombat && exists && open, hint: inCombat?"In combat":(exists ? (open?"":"Already closed") : "Door missing"), intent:{ action:Schema.Action.CLOSE_DOOR, targetId: ent.state.exitId } }
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

    parts.push(`<div style="font-weight:1000">Actions</div>`);
    parts.push(`<div class="actions">`);
    if (!actions.length){
      parts.push(`<span class="muted" style="font-size:12px">No actions available.</span>`);
    } else {
      for (let i=0;i<actions.length;i++){
        const a = actions[i];
        const cls=["btn","small"];
        if (a.style==="primary") cls.push("primary");
        const disabled = a.enabled ? "" : "disabled";
        const title = a.enabled ? "" : (a.hint||"Unavailable");
        parts.push(`<button class="${cls.join(" ")}" data-act="${i}" ${disabled} title="${escapeAttr(title)}">${escapeHtml(a.label)}</button>`);
      }
    }
    parts.push(`</div>`);

    parts.push(`<details class="inspectorDetails"><summary>Details</summary>`);
    for (const sec of kvSecs){
      parts.push(`<div class="kv">` + sec.rows.map(([k,v])=>`<div>${escapeHtml(k)}</div><div>${escapeHtml(v)}</div>`).join("") + `</div>`);
    }
    for (const sec of textSecs){
      parts.push(`<div class="hint">${escapeHtml(sec.text)}</div>`);
    }
    parts.push(`</details>`);
    parts.push(`</div>`);

    box.innerHTML = parts.join("");

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
    const logEl = document.getElementById("logStream");
    const chatEl = document.getElementById("chatStream");
    const events = this.store.events.slice(-800);

    const chats = events.filter(e => e.kind === Schema.EventKind.CHAT);

    const logs = events.filter(e => {
      if (e.kind !== Schema.EventKind.SYSTEM && e.kind !== Schema.EventKind.COMBAT) return false;
      const aud = e.audience || "both";
      if (aud !== "personal" && aud !== "both") return false;
      const a = e.payload?.actorPlayerId;
      const t = e.payload?.targetPlayerId;
      return (a === this.playerId) || (t === this.playerId);
    });

    const logWasAtBottom = (logEl.scrollTop + logEl.clientHeight) >= (logEl.scrollHeight - 8);
    const chatWasAtBottom = (chatEl.scrollTop + chatEl.clientHeight) >= (chatEl.scrollHeight - 8);

    const fmtTime = (ms) => {
      const d = new Date(ms);
      const hh = String(d.getHours()).padStart(2,"0");
      const mm = String(d.getMinutes()).padStart(2,"0");
      return `${hh}:${mm}`;
    };

    logEl.innerHTML = logs.map(e => {
      const time = fmtTime(e.ts);
      const who = e.payload?.actorPlayerId===this.playerId ? "You" : "Them";
      return `<div class="msg">
        <div class="time">${escapeHtml(time)}</div>
        <div class="who">${escapeHtml(who)}</div>
        <div class="text">${escapeHtml(e.text)}</div>
      </div>`;
    }).join("");

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
    }).join("");

    if (logWasAtBottom) logEl.scrollTop = logEl.scrollHeight;
    if (chatWasAtBottom) chatEl.scrollTop = chatEl.scrollHeight;
  }
}

window.app = new App();
