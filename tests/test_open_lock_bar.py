from pathlib import Path

from src.core.context import SimContext
from src.core.registry import Registry
from src.rules.resolver import resolve_action


def test_pry_on_locked_door_changes_lock_or_integrity_or_jammed():
    reg = Registry(Path('.')).load_all()
    ctx = SimContext()
    player = reg.load_entity('data/entities/samples/player.yaml')
    door = reg.load_entity('data/entities/samples/door_oak.yaml')
    ctx.add(player)
    ctx.add(door)

    i0 = door.comp('integrity')['current']
    res = resolve_action(ctx, 'player', 'pry', 'door_oak', verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)

    changed_integrity = door.comp('integrity')['current'] < i0
    changed_lock = door.comp('lockable')['is_locked'] is False
    jammed = any(s.id == 'jammed' for s in door.statuses) or any(x.get('status') == 'jammed' for x in res['outcome']['statuses_applied'])
    assert changed_integrity or changed_lock or jammed
