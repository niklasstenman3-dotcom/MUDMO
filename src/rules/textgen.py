from .outcome import TextPacket


def build_text(ono: str, actor_name: str, verb_id: str, target_name: str, tier: str) -> TextPacket:
    if tier == "fail":
        line = f"{actor_name} tries to {verb_id} {target_name}, but fails."
    elif tier == "partial":
        line = f"{actor_name} {verb_id}s {target_name} with partial effect."
    elif tier == "critical":
        line = f"{actor_name} {verb_id}s {target_name} with a crushing result."
    else:
        line = f"{actor_name} {verb_id}s {target_name}."
    return TextPacket(onomatopoeia=ono, line=line)
