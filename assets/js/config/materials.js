export const MATERIALS = Object.freeze({
  flesh: {
    id: "flesh",
    resist: { impact:0.0, edge:0.0, pierce:0.0, torsion:0.0, control:0.0, displacement:0.0, manipulation:0.0, movement:0.0, perception:0.0 },
    ono: { impact:"THUD!", edge:"SKRCH!", pierce:"THK!", torsion:"CRK!", break:"SPLAT!" }
  },
  wood: {
    id: "wood",
    resist: { impact:0.1, edge:0.3, pierce:0.4, torsion:0.2, control:0.0, displacement:0.0, manipulation:0.0, movement:0.0, perception:0.0 },
    ono: { impact:"THK!", edge:"SKT!", pierce:"THK!", torsion:"KRRK!", break:"KRK!" }
  },
  iron: {
    id: "iron",
    resist: { impact:0.3, edge:0.8, pierce:0.9, torsion:0.6, control:0.0, displacement:0.0, manipulation:0.0, movement:0.0, perception:0.0 },
    ono: { impact:"DONG!", edge:"KLANG!", pierce:"TINK!", torsion:"GRNK!", break:"KRRNNG!" }
  },
  stone: {
    id: "stone",
    resist: { impact:0.45, edge:0.75, pierce:0.85, torsion:0.55, control:0.0, displacement:0.0, manipulation:0.0, movement:0.0, perception:0.0 },
    ono: { impact:"TOK!", edge:"SKREE!", pierce:"TCHK!", torsion:"GRIND!", break:"CRACK!" }
  }
});
