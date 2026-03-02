export function pickRandomFrom(room, list, key){
  const arr = Array.isArray(list) ? list : [];
  if (!arr.length) return null;
  const meta = room.ambientMeta || (room.ambientMeta = { lastAmbientAt:0, lastChoice:{}, history:{} });
  meta.lastChoice = meta.lastChoice || {};
  meta.history = meta.history || {};

  const recent = meta.history[key] || [];
  const blocked = new Set(recent.slice(-3));

  let candidates = arr.map((_, i) => i).filter(i => !blocked.has(i));
  if (!candidates.length) candidates = arr.map((_, i) => i);

  let idx = candidates[Math.floor(Math.random() * candidates.length)];
  if (arr.length > 1 && Number.isInteger(meta.lastChoice[key]) && idx === meta.lastChoice[key]){
    idx = candidates[(candidates.indexOf(idx) + 1) % candidates.length];
  }

  meta.lastChoice[key] = idx;
  meta.history[key] = [...recent, idx].slice(-5);
  return arr[idx];
}

export function roomHasActiveCombat(room){
  if (!room?.combats) return false;
  for (const c of Object.values(room.combats)){
    const engagedCount = Object.keys(c?.engaged || {}).length;
    if (engagedCount > 0) return true;
  }
  return false;
}

export function emitRoomAmbient(engine, room){
  if (!room || !room.playerIds?.length) return;
  if (roomHasActiveCombat(room)) return;
  const def = engine._getDef(room.defId);
  const hasOthers = room.playerIds.length > 1;
  const line = hasOthers
    ? pickRandomFrom(room, def.crowdAmbientLines, "crowd") || pickRandomFrom(room, def.ambientLines, "ambient")
    : pickRandomFrom(room, def.ambientLines, "ambient");
  if (!line) return;
  room.ambientMeta.lastAmbientAt = engine.U.now();
  engine._emitEvent(engine.Schema.EventKind.SYSTEM, line, null, { roomId: room.id }, "room");
}
