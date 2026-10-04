# Combined V2 Public Shell

Status: **development branch only — not live**

This branch contains the public half of the reversible Combined V2 architecture.

## Key change

`combined-v2.html` is a static shell. A gameplay URL identifies an immutable public JSON stage by:

- `sha=<40-char public commit SHA>`
- `state=v2/states/<immutable-stage>.json`

The shell fetches that JSON directly from `raw.githubusercontent.com` at the exact commit SHA. A clue/follow-up stage therefore becomes usable as soon as its public Git commit exists; it does not depend on a new GitHub Pages deployment finishing.

## Latest pointer

After V2 activation, `v2/latest.json` will contain only:

```json
{
  "schema_version": 2,
  "public_commit": "<exact commit SHA>",
  "state_path": "v2/states/<file>.json"
}
```

The **Open latest stage** control reads the pointer from public `main` and then navigates to the immutable SHA/path URL.

## Flags

Before activation, seed a single permanent public canonical flag store. V2 states reference those stable assets instead of duplicating ten SVG files for every Combined batch.

## Safety

The V2 shell is not activated until:

1. Edition 1 Batch 10 is completed in V1.
2. Q100 V1 cutover backups are frozen.
3. commit-pinned JSON loading is verified in a browser;
4. canonical flag assets are verified;
5. private V1 -> V2 -> V1 round-trip and mid-stage rollback tests pass.

The existing `combined-quiz.html` remains untouched and is the rollback engine.
