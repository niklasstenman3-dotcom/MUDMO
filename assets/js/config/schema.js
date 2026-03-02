export const Schema = Object.freeze({
  MsgType: { INTENT:"intent", STATE:"state", EVENT:"event" },
  EntityKind: { EXIT:"exit", PLAYER:"player", ENEMY:"enemy", OBJECT:"object", LOOT:"loot" },
  EventKind: { SYSTEM:"system", COMBAT:"combat", CHAT:"chat" },
  Action: {
    CHAT:"chat",
    ENGAGE:"engage", DISENGAGE:"disengage",
    QUEUE_ACTION:"queue_action",
    EXECUTE_PLAN:"execute_plan", UNDO_PLAN:"undo_plan",
    TRAVEL:"travel", SCOUT_NEXT:"scout_next",
    UNLOCK_DOOR:"unlock_door", OPEN_DOOR:"open_door", CLOSE_DOOR:"close_door",
    OPEN:"open", UNLOCK:"unlock", PICKUP:"pickup"
  }
});

export const U = {
  now: () => Date.now(),
  uid: () => (Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)),
  fmtHp: (hp,max) => `${hp}/${max}`,
  clamp: (n,a,b) => Math.max(a, Math.min(b,n))
};

export function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
export function escapeAttr(s){ return escapeHtml(s).replaceAll("\n"," "); }
export function titleCase(s){ return s ? s[0].toUpperCase() + s.slice(1) : s; }
