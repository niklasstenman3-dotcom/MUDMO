from dataclasses import dataclass, field
from typing import Dict

from .entity import Entity


@dataclass
class SimContext:
    entities: Dict[str, Entity] = field(default_factory=dict)
    time_t: float = 0.0

    def add(self, ent: Entity) -> None:
        self.entities[ent.id] = ent

    def get(self, eid: str) -> Entity:
        return self.entities[eid]
