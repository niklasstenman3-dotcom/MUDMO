from dataclasses import dataclass, field
from typing import Any, Dict, List

from .components import Component, StatusInstance


@dataclass
class Entity:
    id: str
    name: str
    material_primary: str
    components: Dict[str, Component] = field(default_factory=dict)
    statuses: List[StatusInstance] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    affordances: List[str] = field(default_factory=list)
    ai: Dict[str, Any] = field(default_factory=dict)

    def has_component(self, comp: str) -> bool:
        return comp in self.components

    def comp(self, comp: str) -> Dict[str, Any]:
        return self.components[comp].data

    def status(self, sid: str) -> StatusInstance | None:
        for s in self.statuses:
            if s.id == sid:
                return s
        return None
