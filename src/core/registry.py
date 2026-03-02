from dataclasses import dataclass, field
from pathlib import Path
from types import MappingProxyType
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


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        elif isinstance(v, list) and isinstance(out.get(k), list) and k == "tags":
            out[k] = out[k] + v
        else:
            out[k] = v
    return out


@dataclass
class Registry:
    root: Path
    materials: Dict[str, Any] = field(default_factory=dict)
    statuses: Dict[str, Any] = field(default_factory=dict)
    verbs: Dict[str, Any] = field(default_factory=dict)
    archetypes: Dict[str, Any] = field(default_factory=dict)
    components: Dict[str, Any] = field(default_factory=dict)
    entities: Dict[str, Entity] = field(default_factory=dict)

    def load_all(self) -> "Registry":
        data = self.root / "data"
        self.materials = MappingProxyType(_load_yaml(data / "materials.yaml"))
        self.statuses = MappingProxyType(_load_yaml(data / "statuses.yaml"))
        self.verbs = MappingProxyType(_load_yaml(data / "verbs.yaml"))
        self.archetypes = MappingProxyType(_load_yaml(data / "archetypes.yaml"))
        self.components = MappingProxyType(_load_yaml(data / "components.yaml"))
        self.entities = MappingProxyType(self._load_entities(data / "entities"))
        return self

    def _apply_archetypes(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        merged: Dict[str, Any] = {"components": {}, "tags": [], "affordances": []}
        for aid in raw.get("archetypes", []) or []:
            ad = self.archetypes.get(aid)
            if not ad:
                raise ValueError(f"Unknown archetype: {aid}")
            if "materials" in ad and "materials" not in merged:
                merged["materials"] = {}
            merged = _deep_merge(merged, ad)
        merged = _deep_merge(merged, raw)

        if "materials" in merged and "material_primary" not in merged:
            merged["material_primary"] = merged.get("materials", {}).get("primary", "wood")
        merged.setdefault("material_primary", "wood")
        return merged

    def _validate_components(self, merged: Dict[str, Any], src: Path) -> None:
        comps = merged.get("components", {}) or {}
        for cname, cdata in comps.items():
            spec = self.components.get(cname)
            if not spec:
                continue
            required = spec.get("fields", [])
            missing = [f for f in required if f not in cdata]
            if missing:
                raise ValueError(f"{src}: component {cname} missing fields {missing}")

    def _load_entities(self, entities_root: Path) -> Dict[str, Entity]:
        out: Dict[str, Entity] = {}
        for path in sorted(entities_root.rglob("*.yaml")):
            raw = _load_yaml(path)
            merged = self._apply_archetypes(raw)
            self._validate_components(merged, path)

            comps = {
                key: Component(name=key, data=(val or {}))
                for key, val in (merged.get("components") or {}).items()
            }

            ent = Entity(
                id=merged["id"],
                name=merged.get("name", merged["id"]),
                material_primary=merged.get("material_primary", "wood"),
                components=comps,
                tags=merged.get("tags", []) or [],
                affordances=merged.get("affordances", []) or [],
                ai=merged.get("ai", {}) or {},
            )
            out[ent.id] = ent
        return out

    def load_entity(self, rel_path: str) -> Entity:
        # compatibility helper for explicit path loads
        raw = _load_yaml(self.root / rel_path)
        merged = self._apply_archetypes(raw)
        self._validate_components(merged, self.root / rel_path)
        comps = {k: Component(name=k, data=(v or {})) for k, v in (merged.get("components") or {}).items()}
        return Entity(
            id=merged["id"],
            name=merged.get("name", merged["id"]),
            material_primary=merged.get("material_primary", "wood"),
            components=comps,
            tags=merged.get("tags", []) or [],
            affordances=merged.get("affordances", []) or [],
            ai=merged.get("ai", {}) or {},
        )
