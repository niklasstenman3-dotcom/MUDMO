from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict

import yaml

from .components import Component
from .entity import Entity


def _load_yaml(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    if not isinstance(data, dict):
        raise ValueError(f"Expected mapping in {path}")
    return data


@dataclass
class Registry:
    root: Path
    materials: Dict[str, Any] = field(default_factory=dict)
    verbs: Dict[str, Any] = field(default_factory=dict)
    statuses: Dict[str, Any] = field(default_factory=dict)
    components: Dict[str, Any] = field(default_factory=dict)

    def load_all(self) -> "Registry":
        data = self.root / "data"
        self.materials = _load_yaml(data / "materials.yaml")
        self.verbs = _load_yaml(data / "verbs.yaml")
        self.statuses = _load_yaml(data / "statuses.yaml")
        self.components = _load_yaml(data / "components.yaml")
        return self

    def load_entity(self, rel_path: str) -> Entity:
        raw = _load_yaml(self.root / rel_path)
        comps = {
            key: Component(name=key, data=(val or {}))
            for key, val in (raw.get("components") or {}).items()
        }
        return Entity(
            id=raw["id"],
            name=raw.get("name", raw["id"]),
            material_primary=raw.get("material_primary", "wood"),
            components=comps,
            tags=raw.get("tags", []) or [],
            affordances=raw.get("affordances", []) or [],
            ai=raw.get("ai", {}) or {},
        )
