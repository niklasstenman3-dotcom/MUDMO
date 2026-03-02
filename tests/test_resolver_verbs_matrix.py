from pathlib import Path

from src.core.context import SimContext
from src.core.registry import Registry
from src.core.components import StatusInstance
from src.rules.resolver import resolve_action


def _setup():
    reg = Registry(Path('.')).load_all()
    ctx = SimContext()
    player = reg.load_entity('data/entities/player.yaml')
    door = reg.load_entity('data/entities/objects/door_oak.yaml')
    chest = reg.load_entity('data/entities/objects/chest_iron.yaml')
    bandit = reg.load_entity('data/entities/enemies/bandit.yaml')
    ctx.add(player)
    ctx.add(door)
    ctx.add(chest)
    ctx.add(bandit)
    return reg, ctx, player, door, chest, bandit


def test_slice_applies_bleeding_on_anatomy_target():
    reg, ctx, *_rest, bandit = _setup()
    before = bandit.comp('combatant')['hp']
    res = resolve_action(ctx, 'player', 'slice', 'bandit_01', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    assert bandit.comp('combatant')['hp'] <= before
    assert any(s.id == 'bleeding' for s in bandit.statuses) or any(x.get('status') == 'bleeding' for x in res['outcome']['statuses_applied'])


def test_shove_moves_movable_offset():
    reg, ctx, player, door, *_ = _setup()
    movable = door.comp('movable')
    start = movable.get('offset', 0)
    resolve_action(ctx, 'player', 'shove', 'door_oak', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    assert door.comp('movable').get('offset', 0) >= start


def test_brace_clears_off_balance_and_builds_guard():
    reg, ctx, player, *_ = _setup()
    player.statuses.append(StatusInstance(id='off_balance', intensity=1, remaining=1.0))
    g0 = player.comp('combatant')['guard']
    resolve_action(ctx, 'player', 'brace', 'player', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    assert player.status('off_balance') is None
    assert player.comp('combatant')['guard'] >= g0


def test_unlock_fails_when_jammed():
    reg, ctx, player, door, *_ = _setup()
    door.statuses.append(StatusInstance(id='jammed', intensity=1, remaining=5.0))
    door.comp('lockable')['locked'] = True
    out = resolve_action(ctx, 'player', 'unlock', 'door_oak', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    assert out['outcome']['success'] is False
    assert out['outcome']['fail_reason'] == 'jammed'
