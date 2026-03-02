from typing import Dict, Any


def material_resist(materials: Dict[str, Any], material_name: str, kind: str) -> float:
    mat = materials.get(material_name, {})
    return float(mat.get("resist", {}).get(kind, 0.0))


def material_ono(materials: Dict[str, Any], material_name: str, kind: str, tier: str) -> str:
    mat = materials.get(material_name, {})
    ono = mat.get("ono", {})
    if tier == "critical":
        return ono.get("break", "KRAK!")
    if kind == "edge":
        return ono.get("edge_hit", "SKT!")
    if kind == "blunt":
        return ono.get("blunt_hit", "THUD!")
    if kind == "pierce":
        return ono.get("pierce_hit", "THK!")
    return ono.get("blunt_hit", "THUD!")
