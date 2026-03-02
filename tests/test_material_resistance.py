from pathlib import Path

from src.core.context import SimContext
from src.core.registry import Registry
from src.rules.resolver import resolve_action


def test_slice_vs_iron_less_effective_than_bash():
    reg = Registry(Path('.')).load_all()
    ctx = SimContext()
    player = reg.load_entity('data/entities/player.yaml')
    chest = reg.load_entity('data/entities/objects/chest_iron.yaml')
    ctx.add(player)
    ctx.add(chest)

    before = chest.comp('integrity')['current']
    resolve_action(ctx, 'player', 'slice', 'chest_iron', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    after_slice = chest.comp('integrity')['current']

    chest.comp('integrity')['current'] = before
    resolve_action(ctx, 'player', 'bash', 'chest_iron', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    after_bash = chest.comp('integrity')['current']

    assert (before - after_bash) >= (before - after_slice)
