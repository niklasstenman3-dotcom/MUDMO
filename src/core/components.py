from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class Component:
    name: str
    data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StatusInstance:
    id: str
    intensity: int = 1
    remaining: float | None = None
    elapsed: float = 0.0
