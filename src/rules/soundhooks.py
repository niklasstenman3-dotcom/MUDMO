
def noise_to_hook(noise: float) -> str:
    if noise >= 1.2:
        return "sound.loud"
    if noise >= 0.5:
        return "sound.medium"
    return "sound.soft"
