from pathlib import Path

from src.core.registry import Registry
from src.core.components import StatusInstance
from src.sim.ai import choose_verb


def test_ai_prefers_prone_rule_actions():
    reg = Registry(Path('.')).load_all()
    bandit = reg.load_entity('data/entities/enemies/bandit.yaml')
    player = reg.load_entity('data/entities/player.yaml')
    player.statuses.append(StatusInstance(id='prone', intensity=1, remaining=1.0))

    pick = choose_verb(bandit.ai, bandit, player, reg.verbs)
    assert pick in {'crush', 'cleave', 'bash'}
