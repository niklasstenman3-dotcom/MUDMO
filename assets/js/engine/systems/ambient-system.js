export function pickRandomFrom(room, list, key){
  const arr = Array.isArray(list) ? list : [];
  if (!arr.length) return null;
  const meta = room.ambientMeta || (room.ambientMeta = { lastAmbientAt:0, lastChoice:{} });
  meta.lastChoice = meta.lastChoice || {};
  let idx = Math.floor(Math.random() * arr.length);
  if (arr.length > 1 && Number.isInteger(meta.lastChoice[key]) && idx === meta.lastChoice[key]){
    idx = (idx + 1 + Math.floor(Math.random() * (arr.length - 1))) % arr.length;
  }
  meta.lastChoice[key] = idx;
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
