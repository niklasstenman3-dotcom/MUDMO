“All actions are global verbs. Any verb can be attempted on any target. The target’s components + materials + current statuses determine outcome (success/partial/fail), costs, noise, and state changes. No entity-specific verb lists.”

## Guardrails
- No separate “combat verbs” vs “door verbs”. One global list only.
- No synonyms as separate commands. If two verbs produce the same mechanical signature, merge them.
- A verb attempted on an incompatible target returns a good fail (text + cost/noise), never a hard “not allowed” unless physically impossible.
- Depth comes from materials + components + statuses, not custom per-object rules.

## Implementation Order
1. data schemas + loaders
2. entity/component model
3. resolver pipeline
4. statuses
5. text/sound hooks
6. AI choosing verbs
7. tests + sample content
