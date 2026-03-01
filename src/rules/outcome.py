from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass
class TextPacket:
    onomatopoeia: str
    line: str


@dataclass
class Outcome:
    actor_id: str
    target_id: str
    verb_id: str
    tier: str
    success: bool
    partial: bool
    time_cost: float
    stamina_cost: float
    noise: float
    changes: Dict[str, Any] = field(default_factory=dict)
    statuses_applied: List[Dict[str, Any]] = field(default_factory=list)
    info: Dict[str, Any] = field(default_factory=dict)
    fail_reason: str | None = None
