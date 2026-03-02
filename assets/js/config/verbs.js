const V = (id, kind, cfg={}) => ({
  id,
  label: id.replaceAll('_',' ').replace(/\b\w/g, m=>m.toUpperCase()),
  kind,
  requires: cfg.requires || [],
  cost: { stamina: cfg.stamina ?? 4, time: cfg.time ?? 1.0, noise: cfg.noise ?? 0.2 },
  basePower: cfg.basePower ?? 8,
  damage: { hp: cfg.hp ?? 6, integrity: cfg.integrity ?? 6 },
  applyStatus: cfg.applyStatus || null,
  flags: cfg.flags || {}
});

const impact = ["pound","crush","slam","ram","bash"];
const edge = ["slice","cleave","carve","sever","shred"];
const pierce = ["thrust","pierce","impale","probe"];
const torsion = ["pry","wrench","torque","bend","snap","jam"];
const displacement = ["shove","pull","drag","lift","drop","flip","throw","hook"];
const control = ["grapple","pin","restrain","release","trip","choke","brace","guard","block","parry","disarm","interrupt","unbalance"];
const manipulation = ["open","close","lock","unlock","bar","seal","fasten","anchor","tie","attach","insert","remove","pour","light","extinguish","sharpen","reinforce","dismantle","assemble","place","take","use","activate","deactivate"];
const movement = ["move","walk","run","sprint","retreat","advance","climb","descend","leap","crawl","swim","mount","dismount"];
const perception = ["observe","inspect"]; // only allowed perception verbs

const defs = [];
impact.forEach(id=>defs.push(V(id,"impact",{ requires:["tool_blunt"], hp:10, integrity:9, basePower:11, stamina:id==="crush"||id==="ram"?8:6, noise:id==="crush"||id==="ram"?0.4:0.3, applyStatus:["bash","pound"].includes(id)?{id:"dazed",chance:0.25,intensity:1,duration:1.5}:null })));
edge.forEach(id=>defs.push(V(id,"edge",{ requires:["tool_edge"], hp:id==="sever"?14:id==="cleave"?11:9, integrity:id==="sever"?12:id==="cleave"?9:7, basePower:id==="sever"?14:11, stamina:id==="sever"?9:6, applyStatus:{id:"bleeding",chance:id==="sever"?0.9:id==="cleave"?0.6:0.45,intensity:id==="sever"?3:id==="cleave"?2:1,duration:7.0} })));
pierce.forEach(id=>defs.push(V(id,"pierce",{ requires:id==="thrust"?["tool_point","tool_edge"]:["tool_point"], hp:id==="impale"?12:id==="probe"?2:8, integrity:id==="probe"?2:6, basePower:id==="probe"?4:10, stamina:id==="impale"?8:5, applyStatus:id==="impale"?{id:"restrained",chance:0.4,intensity:1,duration:2.0}:{id:"bleeding",chance:id==="probe"?0.1:0.35,intensity:1,duration:5.0} })));
torsion.forEach(id=>defs.push(V(id,"torsion",{ requires:["tool_leverage"], hp: id==="wrench"?7:3, integrity:id==="snap"?13:id==="torque"?10:id==="pry"?9:6, basePower:id==="snap"?13:10, stamina:id==="snap"?8:6, applyStatus:id==="jam"?{id:"jammed",chance:1,intensity:1,duration:6.0}:id==="torque"||id==="bend"||id==="snap"?{id:"cracked",chance:0.35,intensity:1,duration:0}:null })));
displacement.forEach(id=>defs.push(V(id,"displacement",{ hp:id==="throw"?8:3, integrity:id==="throw"?7:2, basePower:id==="throw"?10:7, stamina:id==="throw"?8:4, applyStatus:["shove","hook","throw"].includes(id)?{id:"off_balance",chance:0.45,intensity:1,duration:2.0}:null })));
control.forEach(id=>defs.push(V(id,"control",{ hp: id==="choke"?5:1, integrity:0, basePower:id==="pin"?9:7, stamina:id==="pin"?8:4, applyStatus:id==="grapple"||id==="restrain"?{id:"restrained",chance:0.75,intensity:1,duration:3.0}:id==="pin"?{id:"pinned",chance:0.7,intensity:1,duration:2.0}:id==="trip"?{id:"prone",chance:0.55,intensity:1,duration:2.0}:id==="unbalance"?{id:"off_balance",chance:0.9,intensity:1,duration:2.0}:id==="choke"?{id:"winded",chance:0.6,intensity:1,duration:2.0}:null })));
manipulation.forEach(id=>defs.push(V(id,"manipulation",{ hp:2, integrity:3, basePower:6, stamina:3, noise:0.15 })));
movement.forEach(id=>defs.push(V(id,"movement",{ hp:0, integrity:0, basePower:0, stamina:id==="sprint"?8:id==="run"?5:3, noise:id==="sprint"?0.4:0.2 })));
perception.forEach(id=>defs.push(V(id,"perception",{ requires:[], hp:0, integrity:0, basePower:0, stamina:1, noise:0.0, flags:{isPerception:true} })));

export const VERBS = Object.freeze(defs);
export const VERB_BY_ID = Object.freeze(Object.fromEntries(VERBS.map(v=>[v.id,v])));

export const CURATED_COMBAT_VERBS = Object.freeze(["observe","inspect","bash","slice","thrust","shove","grapple","trip","brace","guard","parry","block","cleave","pierce","wrench"]);
export const CURATED_OBJECT_VERBS = Object.freeze(["observe","inspect","open","close","lock","unlock","pry","bash","jam","wrench","reinforce","dismantle"]);
