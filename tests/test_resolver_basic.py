from pathlib import Path

from src.core.context import SimContext
from src.core.registry import Registry
from src.rules.resolver import resolve_action


def setup_world():
    reg = Registry(Path('.')).load_all()
    ctx = SimContext()
    player = reg.load_entity('data/entities/samples/player.yaml')
    door = reg.load_entity('data/entities/samples/door_oak.yaml')
    bandit = reg.load_entity('data/entities/samples/bandit.yaml')
    ctx.add(player)
    ctx.add(door)
    ctx.add(bandit)
    return reg, ctx


def test_any_verb_any_target_returns_structured_not_crash():
    reg, ctx = setup_world()
    result = resolve_action(ctx, 'player', 'slice', 'door_oak', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    assert 'outcome' in result
    assert 'text' in result
    assert 'sound_hook' in result


def test_open_locked_door_fails_then_unlock_succeeds():
    reg, ctx = setup_world()
    fail = resolve_action(ctx, 'player', 'open', 'door_oak', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    assert fail['outcome']['tier'] == 'fail'
    ok = resolve_action(ctx, 'player', 'unlock', 'door_oak', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
    assert ok['outcome']['success'] is True
