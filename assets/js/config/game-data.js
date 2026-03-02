// Auto-generated from data/*.yaml for browser-native runtime data.
// Do not hand-edit unless you also update source YAML or generation process.

export const BrowserData = Object.freeze({
  "archetypes": {
    "humanoid": {
      "components": {
        "anatomy": {
          "bleed_tolerance": 20,
          "choke_tolerance": 8,
          "limbs": [
            "head",
            "torso",
            "left_arm",
            "right_arm",
            "left_leg",
            "right_leg"
          ]
        },
        "combatant": {
          "guard": 15,
          "guard_max": 15,
          "hp": 60,
          "hp_max": 60,
          "poise": 25,
          "poise_max": 25,
          "speed": 10,
          "stamina": 60,
          "stamina_max": 60
        },
        "movable": {
          "anchored": false,
          "friction": 0.6,
          "mass": 80
        },
        "skills": {
          "athletics": 0,
          "grappling": 0,
          "lockwork": 0,
          "perception": 0,
          "tool_blunt": 0,
          "tool_edge": 0,
          "tool_leverage": 0,
          "tool_point": 0,
          "weapon_blunt": 0,
          "weapon_edge": 0,
          "weapon_point": 0
        }
      },
      "materials": {
        "primary": "flesh"
      }
    },
    "lockable_door": {
      "components": {
        "barrable": {
          "barred": false
        },
        "lockable": {
          "lock_quality": 8,
          "locked": true
        },
        "openable": {
          "open": false
        }
      }
    },
    "wood_structure": {
      "components": {
        "integrity": {
          "current": 80,
          "fracture_threshold": 25,
          "max": 80
        },
        "movable": {
          "anchored": true,
          "friction": 0.9,
          "mass": 120
        }
      },
      "materials": {
        "primary": "wood"
      }
    }
  },
  "components": {
    "anatomy": {
      "fields": [
        "limbs",
        "bleed_tolerance",
        "choke_tolerance"
      ]
    },
    "barrable": {
      "fields": [
        "barred"
      ]
    },
    "climbable": {
      "fields": [
        "difficulty",
        "height"
      ]
    },
    "combatant": {
      "fields": [
        "hp_max",
        "hp",
        "stamina_max",
        "stamina",
        "poise_max",
        "poise",
        "guard_max",
        "guard",
        "speed"
      ]
    },
    "container": {
      "fields": [
        "capacity",
        "contents"
      ]
    },
    "equipment": {
      "fields": [
        "weapon",
        "armor"
      ]
    },
    "integrity": {
      "fields": [
        "max",
        "current",
        "fracture_threshold"
      ]
    },
    "lockable": {
      "fields": [
        "locked",
        "lock_quality"
      ]
    },
    "movable": {
      "fields": [
        "mass",
        "friction",
        "anchored"
      ]
    },
    "openable": {
      "fields": [
        "open"
      ]
    },
    "skills": {
      "fields": [
        "weapon_edge",
        "weapon_blunt",
        "weapon_point",
        "athletics",
        "grappling",
        "perception",
        "lockwork",
        "tool_edge",
        "tool_blunt",
        "tool_point",
        "tool_leverage"
      ]
    }
  },
  "entities": {
    "bandit_01": {
      "ai": {
        "rules": [
          {
            "if": "target.status.prone",
            "prefer": [
              "crush",
              "cleave"
            ]
          },
          {
            "if": "self.stamina_pct < 0.2",
            "prefer": [
              "guard",
              "retreat"
            ]
          },
          {
            "do": "retreat",
            "if": "self.hp_pct < 0.18"
          }
        ],
        "weights": {
          "assess": 0.2,
          "bash": 0.4,
          "grapple": 0.1,
          "guard": 0.1,
          "shove": 0.2
        }
      },
      "archetypes": [
        "humanoid"
      ],
      "components": {
        "combatant": {
          "guard": 20,
          "guard_max": 20,
          "hp": 65,
          "hp_max": 65,
          "poise": 30,
          "poise_max": 30,
          "speed": 12,
          "stamina": 60,
          "stamina_max": 60
        },
        "equipment": {
          "armor": {
            "torso": "leather_vest"
          },
          "weapon": "club_01"
        },
        "skills": {
          "athletics": 3,
          "grappling": 3,
          "perception": 3,
          "tool_blunt": 1,
          "weapon_blunt": 5
        }
      },
      "id": "bandit_01",
      "name": "Roadside Bandit"
    },
    "chest_iron": {
      "components": {
        "container": {
          "capacity": 20,
          "contents": [
            "gem",
            "map"
          ]
        },
        "integrity": {
          "current": 110,
          "fracture_threshold": 50,
          "max": 110
        },
        "lockable": {
          "lock_quality": 12,
          "locked": true
        },
        "openable": {
          "open": false
        }
      },
      "id": "chest_iron",
      "materials": {
        "primary": "iron"
      },
      "name": "Iron Chest",
      "tags": [
        "container",
        "structure"
      ]
    },
    "door_oak": {
      "archetypes": [
        "wood_structure",
        "lockable_door"
      ],
      "components": {
        "integrity": {
          "current": 120,
          "fracture_threshold": 45,
          "max": 120
        },
        "lockable": {
          "lock_quality": 8,
          "locked": true
        },
        "movable": {
          "anchored": true,
          "friction": 0.95,
          "mass": 140
        }
      },
      "id": "door_oak",
      "name": "Oak Door",
      "tags": [
        "door",
        "structure"
      ]
    },
    "fence_wood": {
      "archetypes": [
        "wood_structure"
      ],
      "components": {
        "integrity": {
          "current": 90,
          "fracture_threshold": 30,
          "max": 90
        },
        "movable": {
          "anchored": true,
          "friction": 0.8,
          "mass": 100
        }
      },
      "id": "fence_wood",
      "name": "Wood Fence",
      "tags": [
        "structure"
      ]
    },
    "player": {
      "affordances": [
        "same_room"
      ],
      "archetypes": [
        "humanoid"
      ],
      "components": {
        "combatant": {
          "guard": 25,
          "guard_max": 25,
          "hp": 80,
          "hp_max": 80,
          "poise": 35,
          "poise_max": 35,
          "speed": 12,
          "stamina": 80,
          "stamina_max": 80
        },
        "equipment": {
          "armor": {
            "torso": "leather_vest"
          },
          "weapon": "club_01"
        },
        "skills": {
          "athletics": 4,
          "grappling": 3,
          "lockwork": 2,
          "perception": 4,
          "tool_blunt": 1,
          "tool_edge": 1,
          "tool_leverage": 1,
          "tool_point": 1,
          "weapon_blunt": 4,
          "weapon_edge": 5,
          "weapon_point": 2
        }
      },
      "id": "player",
      "name": "Player",
      "tags": [
        "actor"
      ]
    }
  },
  "materials": {
    "flesh": {
      "ono": {
        "blunt_hit": "THUD!",
        "edge_hit": "SKRCH!",
        "pierce_hit": "THK!"
      },
      "resist": {
        "blunt": 0.0,
        "edge": 0.0,
        "pierce": 0.0,
        "torsion": 0.0
      }
    },
    "iron": {
      "ono": {
        "blunt_hit": "DONG!",
        "break": "KRRNNG!",
        "edge_hit": "KLANG!",
        "pierce_hit": "TINK!"
      },
      "resist": {
        "blunt": 0.3,
        "edge": 0.8,
        "pierce": 0.9,
        "torsion": 0.6
      }
    },
    "wood": {
      "ono": {
        "blunt_hit": "THK!",
        "break": "KRK!",
        "edge_hit": "SKT!",
        "pierce_hit": "THK!"
      },
      "resist": {
        "blunt": 0.1,
        "edge": 0.3,
        "pierce": 0.4,
        "torsion": 0.2
      }
    }
  },
  "statuses": {
    "bleeding": {
      "applies_to_components": [
        "anatomy",
        "combatant"
      ],
      "clears": {
        "reduce_on_actions": {
          "bind": 2,
          "rest": 1
        }
      },
      "intensity_cap": 5,
      "stacking": "intensity",
      "tick": {
        "every_time": 1.0,
        "hp_damage_per_intensity": 1
      }
    },
    "cracked": {
      "applies_to_components": [
        "integrity"
      ],
      "derived_from_integrity_threshold": true,
      "mods": {
        "incoming_integrity_damage_mult": 1.25
      },
      "stacking": "none"
    },
    "dazed": {
      "applies_to_components": [
        "combatant"
      ],
      "duration_time": 1.5,
      "stacking": "refresh"
    },
    "jammed": {
      "applies_to_components": [
        "lockable",
        "openable"
      ],
      "clears_on_actions": [
        "wrench",
        "pry"
      ],
      "duration_time": 5.0,
      "stacking": "refresh"
    },
    "off_balance": {
      "applies_to_components": [
        "combatant"
      ],
      "duration_time": 2.0,
      "mods": {
        "poise_mult": 0.8
      },
      "stacking": "refresh"
    },
    "pinned": {
      "applies_to_components": [
        "combatant"
      ],
      "duration_time": 2.0,
      "stacking": "refresh"
    },
    "prone": {
      "applies_to_components": [
        "combatant"
      ],
      "clears_on_actions": [
        "stand"
      ],
      "stacking": "none"
    },
    "restrained": {
      "applies_to_components": [
        "combatant"
      ],
      "duration_time": 3.0,
      "stacking": "refresh"
    },
    "stunned": {
      "applies_to_components": [
        "combatant"
      ],
      "duration_time": 1.0,
      "stacking": "refresh"
    },
    "winded": {
      "applies_to_components": [
        "combatant"
      ],
      "duration_time": 2.0,
      "stacking": "refresh"
    }
  },
  "verbs": {
    "activate": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "activate",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "advance": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "anchor": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "anchor",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "assemble": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "assemble",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "assess": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "attach": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "attach",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "bar": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "bar",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "bash": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.35,
        "stamina": 7,
        "time": 1.0
      },
      "effect": {
        "base_power": 12,
        "damage": {
          "hp": 10,
          "integrity": 8
        },
        "intent": "impact",
        "kind": "blunt",
        "status_on_hit": {
          "id": "dazed",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_blunt"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "bend": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.3,
        "stamina": 8,
        "time": 1.0
      },
      "effect": {
        "base_power": 12,
        "damage": {
          "hp": 10,
          "integrity": 8
        },
        "intent": "twist",
        "kind": "torsion",
        "status_on_hit": {
          "id": "jammed",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "block": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "winded",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "brace": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "winded",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "carve": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.25,
        "stamina": 6,
        "time": 1.0
      },
      "effect": {
        "base_power": 11,
        "damage": {
          "hp": 9,
          "integrity": 7
        },
        "intent": "cut",
        "kind": "edge",
        "status_on_hit": {
          "id": "bleeding",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_edge"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "check": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "choke": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "restrained",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "cleave": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.25,
        "stamina": 6,
        "time": 1.0
      },
      "effect": {
        "base_power": 11,
        "damage": {
          "hp": 9,
          "integrity": 7
        },
        "intent": "cut",
        "kind": "edge",
        "status_on_hit": {
          "id": "bleeding",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_edge"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "climb": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "close": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "close",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "crawl": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "crush": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.35,
        "stamina": 7,
        "time": 1.0
      },
      "effect": {
        "base_power": 12,
        "damage": {
          "hp": 10,
          "integrity": 8
        },
        "intent": "impact",
        "kind": "blunt",
        "status_on_hit": {
          "id": "dazed",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "deactivate": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "deactivate",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "descend": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "disarm": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "restrained",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "dismantle": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "dismantle",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "dismount": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "drag": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.24,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "move_target",
        "kind": "displacement",
        "status_on_hit": {
          "id": "off_balance",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "drop": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.24,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "move_target",
        "kind": "displacement",
        "status_on_hit": {
          "id": "off_balance",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "examine": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "extinguish": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "extinguish",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "fasten": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "fasten",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "feel": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "flip": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.24,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "move_target",
        "kind": "displacement",
        "status_on_hit": {
          "id": "off_balance",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "gauge": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "grapple": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "restrained",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "guard": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "winded",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "hook": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.24,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "move_target",
        "kind": "displacement",
        "status_on_hit": {
          "id": "off_balance",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "impale": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.22,
        "stamina": 6,
        "time": 1.0
      },
      "effect": {
        "base_power": 11,
        "damage": {
          "hp": 9,
          "integrity": 7
        },
        "intent": "penetrate",
        "kind": "pierce",
        "status_on_hit": {
          "id": "bleeding",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_point"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "insert": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "insert",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "inspect": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "interrupt": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "restrained",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "jam": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.3,
        "stamina": 8,
        "time": 1.0
      },
      "effect": {
        "base_power": 12,
        "damage": {
          "hp": 10,
          "integrity": 8
        },
        "intent": "twist",
        "kind": "torsion",
        "status_on_hit": {
          "id": "jammed",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "leap": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "lift": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.24,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "move_target",
        "kind": "displacement",
        "status_on_hit": {
          "id": "off_balance",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "light": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "light",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "listen": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "lock": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "lock",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "mount": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "move": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "observe": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "open": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "open",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "parry": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "winded",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "pierce": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.22,
        "stamina": 6,
        "time": 1.0
      },
      "effect": {
        "base_power": 11,
        "damage": {
          "hp": 9,
          "integrity": 7
        },
        "intent": "penetrate",
        "kind": "pierce",
        "status_on_hit": {
          "id": "bleeding",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_point"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "pin": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "restrained",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "place": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "place",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "pound": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.35,
        "stamina": 7,
        "time": 1.0
      },
      "effect": {
        "base_power": 12,
        "damage": {
          "hp": 10,
          "integrity": 8
        },
        "intent": "impact",
        "kind": "blunt",
        "status_on_hit": {
          "id": "dazed",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "pour": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "pour",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "probe": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.22,
        "stamina": 6,
        "time": 1.0
      },
      "effect": {
        "base_power": 11,
        "damage": {
          "hp": 9,
          "integrity": 7
        },
        "intent": "penetrate",
        "kind": "pierce",
        "status_on_hit": {
          "id": "bleeding",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_point"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "pry": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.3,
        "stamina": 8,
        "time": 1.0
      },
      "effect": {
        "base_power": 12,
        "damage": {
          "hp": 10,
          "integrity": 8
        },
        "intent": "twist",
        "kind": "torsion",
        "status_on_hit": {
          "id": "jammed",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_leverage"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "pull": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.24,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "move_target",
        "kind": "displacement",
        "status_on_hit": {
          "id": "off_balance",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "ram": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.35,
        "stamina": 7,
        "time": 1.0
      },
      "effect": {
        "base_power": 12,
        "damage": {
          "hp": 10,
          "integrity": 8
        },
        "intent": "impact",
        "kind": "blunt",
        "status_on_hit": {
          "id": "dazed",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "reinforce": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "reinforce",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "release": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "restrained",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "remove": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "remove",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "restrain": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "restrained",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "retreat": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "run": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "seal": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "seal",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "search": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "sever": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.25,
        "stamina": 6,
        "time": 1.0
      },
      "effect": {
        "base_power": 11,
        "damage": {
          "hp": 9,
          "integrity": 7
        },
        "intent": "cut",
        "kind": "edge",
        "status_on_hit": {
          "id": "bleeding",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_edge"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "sharpen": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "sharpen",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "shove": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.24,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "move_target",
        "kind": "displacement",
        "status_on_hit": {
          "id": "off_balance",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "shred": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.25,
        "stamina": 6,
        "time": 1.0
      },
      "effect": {
        "base_power": 11,
        "damage": {
          "hp": 9,
          "integrity": 7
        },
        "intent": "cut",
        "kind": "edge",
        "status_on_hit": {
          "id": "bleeding",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_edge"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "slam": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.35,
        "stamina": 7,
        "time": 1.0
      },
      "effect": {
        "base_power": 12,
        "damage": {
          "hp": 10,
          "integrity": 8
        },
        "intent": "impact",
        "kind": "blunt",
        "status_on_hit": {
          "id": "dazed",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "slice": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.25,
        "stamina": 6,
        "time": 1.0
      },
      "effect": {
        "base_power": 11,
        "damage": {
          "hp": 9,
          "integrity": 7
        },
        "intent": "cut",
        "kind": "edge",
        "status_on_hit": {
          "id": "bleeding",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_edge"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "smell": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "snap": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.3,
        "stamina": 8,
        "time": 1.0
      },
      "effect": {
        "base_power": 12,
        "damage": {
          "hp": 10,
          "integrity": 8
        },
        "intent": "twist",
        "kind": "torsion",
        "status_on_hit": {
          "id": "jammed",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "sprint": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "study": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "swim": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "take": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "take",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "throw": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.24,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "move_target",
        "kind": "displacement",
        "status_on_hit": {
          "id": "off_balance",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "thrust": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.22,
        "stamina": 6,
        "time": 1.0
      },
      "effect": {
        "base_power": 11,
        "damage": {
          "hp": 9,
          "integrity": 7
        },
        "intent": "penetrate",
        "kind": "pierce",
        "status_on_hit": {
          "id": "bleeding",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_point"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "tie": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "tie",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "torque": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.3,
        "stamina": 8,
        "time": 1.0
      },
      "effect": {
        "base_power": 12,
        "damage": {
          "hp": 10,
          "integrity": 8
        },
        "intent": "twist",
        "kind": "torsion",
        "status_on_hit": {
          "id": "jammed",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_leverage"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    },
    "track": {
      "constraints": {
        "range": "near"
      },
      "cost": {
        "noise": 0.0,
        "stamina": 0,
        "time": 0.6
      },
      "effect": {
        "base_power": 5,
        "damage": {
          "hp": 3,
          "integrity": 1
        },
        "intent": "sense",
        "kind": "perception"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "lockable",
          "openable",
          "anatomy",
          "container"
        ]
      }
    },
    "trip": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "off_balance",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "unbalance": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.2,
        "stamina": 5,
        "time": 1.0
      },
      "effect": {
        "base_power": 9,
        "damage": {
          "hp": 7,
          "integrity": 5
        },
        "intent": "control",
        "kind": "control",
        "status_on_hit": {
          "id": "off_balance",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "combatant",
          "movable",
          "anatomy"
        ]
      }
    },
    "unlock": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "unlock",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "use": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.1,
        "stamina": 2,
        "time": 0.7
      },
      "effect": {
        "base_power": 7,
        "damage": {
          "hp": 5,
          "integrity": 3
        },
        "intent": "use",
        "kind": "manipulation"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "openable",
          "lockable",
          "barrable",
          "container",
          "integrity"
        ]
      }
    },
    "walk": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.15,
        "stamina": 4,
        "time": 0.8
      },
      "effect": {
        "base_power": 8,
        "damage": {
          "hp": 6,
          "integrity": 4
        },
        "intent": "movement",
        "kind": "displacement"
      },
      "requires": [],
      "targets": {
        "needs_any_of": [
          "movable",
          "combatant"
        ]
      }
    },
    "wrench": {
      "constraints": {
        "range": "melee"
      },
      "cost": {
        "noise": 0.3,
        "stamina": 8,
        "time": 1.0
      },
      "effect": {
        "base_power": 12,
        "damage": {
          "hp": 10,
          "integrity": 8
        },
        "intent": "twist",
        "kind": "torsion",
        "status_on_hit": {
          "id": "jammed",
          "intensity": 1,
          "stacking": "intensity"
        }
      },
      "requires": [
        "tool_leverage"
      ],
      "targets": {
        "needs_any_of": [
          "integrity",
          "combatant",
          "anatomy",
          "openable",
          "lockable",
          "barrable",
          "movable"
        ]
      }
    }
  }
});

export const CombatActions = Object.freeze([
  {
    "id": "activate",
    "name": "Activate",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "activate"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "advance",
    "name": "Advance",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "anchor",
    "name": "Anchor",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "anchor"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "assemble",
    "name": "Assemble",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "assemble"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "assess",
    "name": "Assess",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "attach",
    "name": "Attach",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "attach"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "bar",
    "name": "Bar",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "bar"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "bash",
    "name": "Bash",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 10,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "blunt",
      "impact",
      "tool_blunt"
    ],
    "requires": [
      "tool_blunt"
    ],
    "range": "melee"
  },
  {
    "id": "bend",
    "name": "Bend",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 10,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "torsion",
      "twist"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "block",
    "name": "Block",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "brace",
    "name": "Brace",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "carve",
    "name": "Carve",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 9,
    "crit": 0.1,
    "wound": 0.28,
    "tags": [
      "edge",
      "cut",
      "tool_edge"
    ],
    "requires": [
      "tool_edge"
    ],
    "range": "melee"
  },
  {
    "id": "check",
    "name": "Check",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "choke",
    "name": "Choke",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "cleave",
    "name": "Cleave",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 9,
    "crit": 0.1,
    "wound": 0.28,
    "tags": [
      "edge",
      "cut",
      "tool_edge"
    ],
    "requires": [
      "tool_edge"
    ],
    "range": "melee"
  },
  {
    "id": "climb",
    "name": "Climb",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "close",
    "name": "Close",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "close"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "crawl",
    "name": "Crawl",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "crush",
    "name": "Crush",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 10,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "blunt",
      "impact"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "deactivate",
    "name": "Deactivate",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "deactivate"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "descend",
    "name": "Descend",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "disarm",
    "name": "Disarm",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "dismantle",
    "name": "Dismantle",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "dismantle"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "dismount",
    "name": "Dismount",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "drag",
    "name": "Drag",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "move_target"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "drop",
    "name": "Drop",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "move_target"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "examine",
    "name": "Examine",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "extinguish",
    "name": "Extinguish",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "extinguish"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "fasten",
    "name": "Fasten",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "fasten"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "feel",
    "name": "Feel",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "flip",
    "name": "Flip",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "move_target"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "gauge",
    "name": "Gauge",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "grapple",
    "name": "Grapple",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "guard",
    "name": "Guard",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "hook",
    "name": "Hook",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "move_target"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "impale",
    "name": "Impale",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 9,
    "crit": 0.07,
    "wound": 0.28,
    "tags": [
      "pierce",
      "penetrate",
      "tool_point"
    ],
    "requires": [
      "tool_point"
    ],
    "range": "melee"
  },
  {
    "id": "insert",
    "name": "Insert",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "insert"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "inspect",
    "name": "Inspect",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "interrupt",
    "name": "Interrupt",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "jam",
    "name": "Jam",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 10,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "torsion",
      "twist"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "leap",
    "name": "Leap",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "lift",
    "name": "Lift",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "move_target"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "light",
    "name": "Light",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "light"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "listen",
    "name": "Listen",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "lock",
    "name": "Lock",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "lock"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "mount",
    "name": "Mount",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "move",
    "name": "Move",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "observe",
    "name": "Observe",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "open",
    "name": "Open",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "open"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "parry",
    "name": "Parry",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "pierce",
    "name": "Pierce",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 9,
    "crit": 0.07,
    "wound": 0.28,
    "tags": [
      "pierce",
      "penetrate",
      "tool_point"
    ],
    "requires": [
      "tool_point"
    ],
    "range": "melee"
  },
  {
    "id": "pin",
    "name": "Pin",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "place",
    "name": "Place",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "place"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "pound",
    "name": "Pound",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 10,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "blunt",
      "impact"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "pour",
    "name": "Pour",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "pour"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "probe",
    "name": "Probe",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 9,
    "crit": 0.07,
    "wound": 0.28,
    "tags": [
      "pierce",
      "penetrate",
      "tool_point"
    ],
    "requires": [
      "tool_point"
    ],
    "range": "melee"
  },
  {
    "id": "pry",
    "name": "Pry",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 10,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "torsion",
      "twist",
      "tool_leverage"
    ],
    "requires": [
      "tool_leverage"
    ],
    "range": "melee"
  },
  {
    "id": "pull",
    "name": "Pull",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "move_target"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "ram",
    "name": "Ram",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 10,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "blunt",
      "impact"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "reinforce",
    "name": "Reinforce",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "reinforce"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "release",
    "name": "Release",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "remove",
    "name": "Remove",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "remove"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "restrain",
    "name": "Restrain",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "retreat",
    "name": "Retreat",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "run",
    "name": "Run",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "seal",
    "name": "Seal",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "seal"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "search",
    "name": "Search",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "sever",
    "name": "Sever",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 9,
    "crit": 0.1,
    "wound": 0.28,
    "tags": [
      "edge",
      "cut",
      "tool_edge"
    ],
    "requires": [
      "tool_edge"
    ],
    "range": "melee"
  },
  {
    "id": "sharpen",
    "name": "Sharpen",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "sharpen"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "shove",
    "name": "Shove",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "move_target"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "shred",
    "name": "Shred",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 9,
    "crit": 0.1,
    "wound": 0.28,
    "tags": [
      "edge",
      "cut",
      "tool_edge"
    ],
    "requires": [
      "tool_edge"
    ],
    "range": "melee"
  },
  {
    "id": "slam",
    "name": "Slam",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 10,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "blunt",
      "impact"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "slice",
    "name": "Slice",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 9,
    "crit": 0.1,
    "wound": 0.28,
    "tags": [
      "edge",
      "cut",
      "tool_edge"
    ],
    "requires": [
      "tool_edge"
    ],
    "range": "melee"
  },
  {
    "id": "smell",
    "name": "Smell",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "snap",
    "name": "Snap",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 10,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "torsion",
      "twist"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "sprint",
    "name": "Sprint",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "study",
    "name": "Study",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "swim",
    "name": "Swim",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "take",
    "name": "Take",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "take"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "throw",
    "name": "Throw",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "move_target"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "thrust",
    "name": "Thrust",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 9,
    "crit": 0.07,
    "wound": 0.28,
    "tags": [
      "pierce",
      "penetrate",
      "tool_point"
    ],
    "requires": [
      "tool_point"
    ],
    "range": "melee"
  },
  {
    "id": "tie",
    "name": "Tie",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "tie"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "torque",
    "name": "Torque",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 10,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "torsion",
      "twist",
      "tool_leverage"
    ],
    "requires": [
      "tool_leverage"
    ],
    "range": "melee"
  },
  {
    "id": "track",
    "name": "Track",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 3,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "perception",
      "sense"
    ],
    "requires": [],
    "range": "near"
  },
  {
    "id": "trip",
    "name": "Trip",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "unbalance",
    "name": "Unbalance",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 7,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "control",
      "control"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "unlock",
    "name": "Unlock",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "unlock"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "use",
    "name": "Use",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 5,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "manipulation",
      "use"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "walk",
    "name": "Walk",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 6,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "displacement",
      "movement"
    ],
    "requires": [],
    "range": "melee"
  },
  {
    "id": "wrench",
    "name": "Wrench",
    "category": "Global Verbs",
    "family": "Data",
    "accuracy": 0.82,
    "power": 10,
    "crit": 0.07,
    "wound": 0.06,
    "tags": [
      "torsion",
      "twist",
      "tool_leverage"
    ],
    "requires": [
      "tool_leverage"
    ],
    "range": "melee"
  }
]);
