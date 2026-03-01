from pathlib import Path

from src.core.context import SimContext
from src.core.registry import Registry
from src.rules.resolver import resolve_action


def setup_world():
    reg = Registry(Path('.')).load_all()
    ctx = SimContext()
    player = reg.load_entity('data/entities/player.yaml')
    door = reg.load_entity('data/entities/objects/door_oak.yaml')
    bandit = reg.load_entity('data/entities/enemies/bandit.yaml')
    ctx.add(player)
    ctx.add(door)
    ctx.add(bandit)
    return reg, ctx


def test_any_verb_any_target_returns_structured_fail_not_crash():
    reg, ctx = setup_world()
    result = resolve_action(ctx, 'player', 'observe', 'door_oak', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    assert 'outcome' in result
    assert result['outcome']['tier'] in {'fail', 'partial', 'solid', 'critical'}


def test_open_locked_door_fails_then_unlock_succeeds():
    reg, ctx = setup_world()
    fail = resolve_action(ctx, 'player', 'open', 'door_oak', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    assert fail['outcome']['tier'] == 'fail'
    ok = resolve_action(ctx, 'player', 'unlock', 'door_oak', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    assert ok['outcome']['success'] is True
