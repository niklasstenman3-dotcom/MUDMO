from pathlib import Path

from src.core.context import SimContext
from src.core.registry import Registry
from src.rules.resolver import resolve_action


def run_repl(root: str = "."):
    reg = Registry(Path(root)).load_all()
    ctx = SimContext()
    ctx.add(reg.load_entity("data/entities/samples/player.yaml"))
    ctx.add(reg.load_entity("data/entities/samples/bandit.yaml"))

    print("Global verb REPL. format: actor verb target")
    while True:
        try:
            line = input("> ").strip()
        except EOFError:
            break
        if not line or line in {"quit", "exit"}:
            break
        try:
            actor, verb, target = line.split()[:3]
            res = resolve_action(ctx, actor, verb, target, verbs=reg.verbs, materials=reg.materials, statuses=reg.statuses)
            print(res)
        except Exception as e:
            print("error:", e)


if __name__ == "__main__":
    run_repl()
