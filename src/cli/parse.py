def parse_command(line: str):
    parts = line.strip().split()
    if len(parts) < 3:
        raise ValueError("Expected: <actor_id> <verb_id> <target_id>")
    return parts[0], parts[1], parts[2]
