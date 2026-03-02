from pathlib import Path

from src.core.context import SimContext
from src.core.registry import Registry
from src.core.components import StatusInstance
from src.sim.tick import tick_statuses


def test_bleeding_ticks_damage_on_living():
    reg = Registry(Path('.')).load_all()
    ctx = SimContext()
    bandit = reg.load_entity('data/entities/enemies/bandit.yaml')
    bandit.statuses.append(StatusInstance(id='bleeding', intensity=2, remaining=5.0))
    hp_before = bandit.comp('combatant')['hp']
    ctx.add(bandit)

    tick_statuses(ctx, reg.statuses, 1.0)
    hp_after = bandit.comp('combatant')['hp']
    assert hp_after == hp_before - 2
