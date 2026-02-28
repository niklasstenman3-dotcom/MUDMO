import { escapeHtml } from "./schema.js";

export const ThemeBg = Object.freeze({
  road: `radial-gradient(900px 500px at 30% 35%, rgba(255,255,255,.08), transparent 55%),
         radial-gradient(800px 420px at 70% 65%, rgba(122,168,255,.10), transparent 60%),
         linear-gradient(180deg, rgba(255,255,255,.03), transparent 30%),
         url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'%3E%3Crect width='1200' height='700' fill='%230b0f14'/%3E%3Cpath d='M0 520 C 200 420, 420 640, 640 520 C 840 420, 980 640, 1200 500 L 1200 700 L 0 700 Z' fill='%230f1620'/%3E%3Ccircle cx='200' cy='180' r='120' fill='%23121b26'/%3E%3Ccircle cx='980' cy='200' r='150' fill='%23121b26'/%3E%3C/svg%3E")`,
  catacombs: `radial-gradient(900px 500px at 30% 35%, rgba(255,255,255,.05), transparent 55%),
              radial-gradient(800px 420px at 70% 65%, rgba(255,90,106,.08), transparent 60%),
              linear-gradient(180deg, rgba(255,255,255,.02), transparent 30%),
              url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'%3E%3Crect width='1200' height='700' fill='%23090c10'/%3E%3Cpath d='M0 560 C 220 430, 460 650, 680 520 C 860 420, 1000 600, 1200 500 L 1200 700 L 0 700 Z' fill='%230d141d'/%3E%3Cpath d='M120 220 L 240 180 L 300 260 L 180 300 Z' fill='%23121b26' opacity='.85'/%3E%3Cpath d='M900 240 L 1040 200 L 1100 300 L 960 340 Z' fill='%23121b26' opacity='.8'/%3E%3C/svg%3E")`,
  village: `radial-gradient(900px 500px at 30% 35%, rgba(255,255,255,.07), transparent 55%),
            radial-gradient(800px 420px at 70% 65%, rgba(61,220,151,.08), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,.03), transparent 30%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'%3E%3Crect width='1200' height='700' fill='%230b0f14'/%3E%3Cpath d='M0 540 C 220 470, 420 610, 640 520 C 860 430, 980 620, 1200 500 L 1200 700 L 0 700 Z' fill='%230f1620'/%3E%3Crect x='160' y='320' width='180' height='120' fill='%23121b26'/%3E%3Cpolygon points='160,320 250,250 340,320' fill='%230f1620'/%3E%3Crect x='820' y='340' width='160' height='110' fill='%23121b26'/%3E%3Cpolygon points='820,340 900,280 980,340' fill='%230f1620'/%3E%3C/svg%3E")`
});

/* ---------------- Room definitions (room “subclasses”) ---------------- */
export const RoomDefs = Object.freeze({
  road: {
    defId:"road",
    theme:"road",
    name:"South Country Road",
    flavor:"A dusty path. Wind. Distant footsteps.",
    exits: [
      { dir:"north", toRoomId:"room_2", gate:{ type:"door", doorId:"door_north" } },
      { dir:"east",  toRoomId:"room_3", gate:{ type:"door", doorId:"door_east"  } },
      { dir:"south", toRoomId:"room_4", gate:{ type:"open" } }, // village
      { dir:"west",  toRoomId:"room_1", gate:{ type:"open" } }, // loops to itself
    ],
    doors: {
      door_north: { locked:false, open:false, keyItemDefId:null },
      door_east:  { locked:true,  open:false, keyItemDefId:"rusty_key" }
    },
    staticObjects: [
      { objectType:"chest", id:"chest_road", name:"Old Chest", locked:false }
    ],
    spawn: {
      enemies: [
        {defId:"bandit", name:"Bandit", hp:50, atk:8, def:2, spd:3, maxAlive:1, respawnSec:8},
      ]
    },
    enterLines:[
      "You return to the South Country Road; wind worries the dust at your boots.",
      "The road stretches dimly ahead, and somewhere far off a cart wheel groans.",
      "You step back onto the road as torn banners snap overhead.",
      "Moonlight spills over ruts and hoof marks as you rejoin the road."
    ],
    ambientLines:[
      "A loose sign chain taps softly in the wind.",
      "Dry gravel shifts like something pacing just out of sight.",
      "A crow gives one rough cry, then the fields go silent.",
      "Somewhere beyond the bend, wood creaks under unseen weight.",
      "Dust curls around your boots, then scatters across the track.",
      "A weathered milepost knocks faintly against its own brace.",
      "Distant harness rings jingle and fade into the dark.",
      "The wind drags brittle grass across packed earth with a hiss."
    ],
    crowdAmbientLines:[
      "You hear other travelers' boots grinding over the road grit.",
      "Muted voices drift past you, swallowed by the open night.",
      "Someone nearby checks a blade; metal whispers against leather.",
      "A wagon team snorts and stamps while strangers argue in low tones.",
      "Overlapping footsteps pass behind you, then peel off into the dark.",
      "A lantern is raised somewhere close; glass clinks on its hook."
    ]
  },

  catacombs: {
    defId:"catacombs",
    theme:"catacombs",
    name:"Catacombs Entrance",
    flavor:"Cold air. Dripping water. Your footsteps echo.",
    exits: [
      { dir:"south", toRoomId:"room_1", gate:{ type:"door", doorId:"door_south" } },
      { dir:"west",  toRoomId:"room_1", gate:{ type:"open" } },
    ],
    doors: {
      door_south: { locked:false, open:false, keyItemDefId:null }
    },
    staticObjects: [
      { objectType:"chest", id:"reliquary", name:"Stone Reliquary", locked:true }
    ],
    spawn: {
      enemies: [
        {defId:"skeleton", name:"Skeleton", hp:40, atk:10, def:1, spd:3, maxAlive:2, respawnSec:10},
        {defId:"bandit", name:"Lost Bandit", hp:55, atk:9, def:2, spd:3, maxAlive:1, respawnSec:14}
      ]
    },
    enterLines:[
      "You descend into the catacombs; cold drips count the seconds in the dark.",
      "Stale air closes in as the catacomb stone drinks every footfall.",
      "The vault breathes mildew and bone dust as you cross the threshold.",
      "Torchlight shivers along cracked crypt walls as you enter."
    ],
    ambientLines:[
      "Water drips from unseen arches, slow and relentless.",
      "A rusted chain clinks once, then silence swallows it.",
      "Pebbles skitter somewhere below, like claws on old stone.",
      "A hollow clang rolls through the passage and dies far away.",
      "Moist air carries the scent of iron and extinguished torches.",
      "Something rattles behind a sealed niche, then stills.",
      "Your breath fogs briefly in a sudden vein of cold air.",
      "A distant gate slams, the echo counting down the hall."
    ],
    crowdAmbientLines:[
      "More than one tread stirs dust here; echoes answer from the vaults.",
      "You catch the scrape of someone else's steel against old stone.",
      "Whispered voices rebound from the crypt and blur together.",
      "Someone's torch sputters nearby, followed by hurried footsteps.",
      "Mail links chime faintly in the dark as others move in the gloom.",
      "A startled oath from another corridor vanishes into the echo."
    ]
  },

  forest: {
    defId:"forest",
    theme:"road",
    name:"Mossy Forest Path",
    flavor:"Birds. Leaves. Something watching you from the trees.",
    exits: [
      { dir:"west", toRoomId:"room_1", gate:{ type:"open" } },
      { dir:"south", toRoomId:"room_4", gate:{ type:"open" } },
    ],
    doors: {},
    staticObjects: [
      { objectType:"chest", id:"stash", name:"Hidden Stash", locked:false }
    ],
    spawn: {
      enemies: [
        {defId:"wolf", name:"Wolf", hp:45, atk:9, def:2, spd:5, maxAlive:2, respawnSec:9},
      ]
    },
    enterLines:[
      "You slip onto the mossy path; branches whisper above like old gossip.",
      "The forest closes around you, wet leaves hushing your steps.",
      "Mist hangs low between the trunks as you enter the path.",
      "You duck beneath bent limbs and rejoin the shadowed trail."
    ],
    ambientLines:[
      "Somewhere in the canopy, wings burst and settle again.",
      "Twigs crack deeper in the trees, then all goes still.",
      "A fox-bark snaps through the brush and vanishes.",
      "Pine boughs groan softly as the wind threads through them.",
      "Raindrops fall from leaves long after the storm has passed.",
      "Brush rustles in a ring around you, then drifts quiet.",
      "An owl calls once from high branches to your left.",
      "Fern fronds hiss together as something slips between them."
    ],
    crowdAmbientLines:[
      "You hear others brushing through fern and branch nearby.",
      "A distant shout carries between trunks before fading.",
      "Someone's boots slog through wet loam just beyond the path.",
      "Voices trade quick warnings from deeper among the trees.",
      "A second lantern glow flickers through the brush and disappears.",
      "Steel taps bark nearby as another traveler forces through thicket."
    ]
  },

  village: {
    defId:"village",
    theme:"village",
    name:"Shire Village",
    flavor:"Warm lanterns. Quiet chatter. Safety… for now.",
    exits: [
      { dir:"north", toRoomId:"room_1", gate:{ type:"open" } },
      { dir:"east",  toRoomId:"room_3", gate:{ type:"open" } }, // forest
    ],
    doors: {},
    staticObjects: [
      { objectType:"chest", id:"crate", name:"Supply Crate", locked:false }
    ],
    spawn: { enemies: [] }, // safe zone
    enterLines:[
      "Lanternlight warms the Shire Village, and for a moment the road feels far away.",
      "You step into village calm; low chatter and hearth smoke greet you.",
      "You enter the square as amber light spills from open doorways.",
      "The village gathers around you in warm firelight and distant song."
    ],
    ambientLines:[
      "A smith's hammer rings once from a nearby forge.",
      "Wooden shutters knock softly as the evening breeze turns.",
      "A tavern door opens and closes, letting out a burst of laughter.",
      "A cart axle squeaks as someone drags supplies across the square.",
      "Hearth smoke curls over rooftops and carries sweet spice.",
      "A dog barks twice, answered by another across the lane.",
      "Pots clatter in a nearby kitchen before fading to murmurs.",
      "The chapel bell gives a soft, lonely note."
    ],
    crowdAmbientLines:[
      "Villagers and travelers mingle, their talk rising and falling around you.",
      "You catch overlapping footsteps and a laugh from just beyond the square.",
      "Someone hails a friend across the market stalls.",
      "A cluster of voices swells near the inn, then drifts apart.",
      "You hear armor straps tightened as another adventurer passes close.",
      "Coins clink at a stall while two strangers haggle nearby."
    ]
  }
});


export const MapLayout = Object.freeze({
  nodes: {
    room_1: { x:0, y:0, label:"Road" },
    room_2: { x:0, y:-1, label:"Cata" },
    room_3: { x:1, y:0, label:"Forest" },
    room_4: { x:0, y:1, label:"Village" },
  },
  edges: [
    { a:"room_1", b:"room_2" },
    { a:"room_1", b:"room_3" },
    { a:"room_1", b:"room_4" },
    { a:"room_4", b:"room_3" },
  ]
});

export function renderMiniMapSVG(currentRoomId){
  const nodes = MapLayout.nodes;
  const edges = MapLayout.edges;

  const xs = Object.values(nodes).map(n=>n.x);
  const ys = Object.values(nodes).map(n=>n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);

  const pad = 22;
  const cell = 56;
  const w = (maxX - minX + 1) * cell + pad*2;
  const h = (maxY - minY + 1) * cell + pad*2;

  const toPx = (x,y) => ({ px: pad + (x - minX) * cell, py: pad + (y - minY) * cell });

  const stroke = "rgba(255,255,255,.22)";
  const roomStroke = "rgba(255,255,255,.18)";
  const roomFill = "rgba(0,0,0,.20)";
  const activeStroke = "rgba(122,168,255,.70)";
  const activeFill = "rgba(122,168,255,.14)";

  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<defs>
    <pattern id="grid" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse">
      <path d="M ${cell} 0 L 0 0 0 ${cell}" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
    </pattern>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;
  svg += `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#grid)"/>`;

  for (const e of edges){
    const A = nodes[e.a], B = nodes[e.b];
    if (!A || !B) continue;
    const ap = toPx(A.x, A.y), bp = toPx(B.x, B.y);
    svg += `<path d="M ${ap.px} ${ap.py} L ${bp.px} ${bp.py}" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>`;
  }

  for (const [id, n] of Object.entries(nodes)){
    const p = toPx(n.x, n.y);
    const isActive = id === currentRoomId;
    const r = 14;
    svg += `<g ${isActive ? `filter="url(#glow)"` : ""}>`;
    svg += `<circle cx="${p.px}" cy="${p.py}" r="${r}" fill="${isActive ? activeFill : roomFill}" stroke="${isActive ? activeStroke : roomStroke}" stroke-width="3"/>`;
    svg += `</g>`;
    svg += `<text x="${p.px + 18}" y="${p.py + 5}" fill="rgba(255,255,255,.78)" font-size="13" font-family="ui-sans-serif, system-ui">${escapeHtml(n.label)}</text>`;
  }

  svg += `</svg>`;
  return svg;
}

