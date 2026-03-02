export const STATUS_DEFS = Object.freeze({
  bleeding: { id:"bleeding", stacking:"intensity", intensityCap:5, duration:8.0, tickEvery:1.0 },
  jammed: { id:"jammed", stacking:"refresh", duration:6.0, clearsOnVerbs:["pry","wrench"] },
  cracked: { id:"cracked", stacking:"none", untilCleared:true, mods:{ incomingIntegrityMult:1.25 } },
  off_balance: { id:"off_balance", stacking:"refresh", duration:2.0, mods:{ poiseMult:0.8, guardMult:0.85 } },
  prone: { id:"prone", stacking:"refresh", duration:2.0 },
  restrained: { id:"restrained", stacking:"refresh", duration:3.0 },
  pinned: { id:"pinned", stacking:"refresh", duration:2.0 },
  dazed: { id:"dazed", stacking:"refresh", duration:1.5 },
  winded: { id:"winded", stacking:"refresh", duration:2.0, mods:{ speedMult:0.8 } },
  stunned: { id:"stunned", stacking:"refresh", duration:1.0 }
});
