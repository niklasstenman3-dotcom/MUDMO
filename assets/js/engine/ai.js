import { VERB_BY_ID } from "../config/verbs.js";

export function pickEnemyVerb(enemy, player, weights={}){
  const entries = Object.entries(weights).filter(([id,w]) => VERB_BY_ID[id] && w > 0);
  if (!entries.length) return "observe";
  const approximateDefense = (player?.combatant?.guard || 0) * 0.2 + (player?.combatant?.poise || 0) * 0.1;
  const scored = entries.map(([id,w]) => {
    const v = VERB_BY_ID[id];
    const est = (v.basePower || 0) - approximateDefense;
    return { id, score: w * (1 + Math.max(-2, est)) };
  }).sort((a,b)=>b.score-a.score);
  const top = scored.slice(0, Math.min(4, scored.length));
  const sum = top.reduce((n,x)=>n+Math.max(0.1,x.score),0);
  let r = Math.random() * sum;
  for (const t of top){
    r -= Math.max(0.1,t.score);
    if (r <= 0) return t.id;
  }
  return top[0]?.id || "observe";
}
