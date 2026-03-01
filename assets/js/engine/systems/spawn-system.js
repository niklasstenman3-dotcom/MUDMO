export function ensureSpawns(engine, room, initial){
  const def = engine._getDef(room.defId);
  const t = engine.U.now();
  let spawnedAny = false;

  for (const rule of (def.spawn?.enemies || [])){
    const alive = Object.values(room.entities)
      .filter(e => e.kind===engine.Schema.EntityKind.ENEMY && e.state?.enemyDefId===rule.defId).length;
    if (alive >= rule.maxAlive) continue;

    const last = room.spawnMeta.lastSpawnAt[rule.defId] || 0;
    const ms = (rule.respawnSec ?? 10) * 1000;

    if (initial || (t-last>=ms)){
      const e = engine._spawnEnemy(rule);
      room.entities[e.id] = e;
      room.spawnMeta.lastSpawnAt[rule.defId] = t;
      spawnedAny = true;
      if (!initial) engine._emitEvent(engine.Schema.EventKind.SYSTEM, `A ${rule.name} appears.`, null, { roomId: room.id });
    }
  }
  return spawnedAny;
}
