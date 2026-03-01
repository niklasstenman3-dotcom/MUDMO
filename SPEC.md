“All actions are global verbs. Any verb can be attempted on any target. The target’s components + materials + current statuses determine outcome (success/partial/fail), costs, noise, and state changes. No entity-specific verb lists.”

## Core Rule
A verb is an attempt.
The engine never asks “is this allowed?” except for truly impossible actions (e.g., missing target entity).
It always resolves to success / partial / fail with consequences (cost, noise, text, state changes).

## Guardrails
- No separate “combat verbs” vs “door verbs”. One global list only.
- No synonyms as separate commands. If two verbs produce the same mechanical signature, merge them.
- A verb attempted on an incompatible target returns a good fail (text + cost/noise), never a hard “not allowed” unless physically impossible.
- Depth comes from materials + components + statuses, not custom per-object rules.
