# Branch Policy

## Active Branches

- `develop`: active development branch. New gameplay, rendering, tooling, and documentation work lands here first.
- `main`: stable deployment baseline and repository default branch. Keep this branch conservative.

## Merge Direction

1. Feature and maintenance branches should branch from `develop`.
2. Finished work should merge back into `develop`.
3. `develop` may periodically absorb `main`-only operational commits when needed.
4. Promote `develop` to `main` only after an explicit release decision.

## Remote Branch Hygiene

- Keep remote branches limited to `main`, `develop`, and active short-lived work branches.
- Delete feature branches after they are merged to `develop`.
- Avoid leaving stale experiment branches on the remote.

## Required Gates

- Follow `.cursor/rules/*.mdc`.
- Keep code files under 450 lines.
- Run relevant automated tests and `pnpm --filter dawnlight exec tsc --noEmit`.
- For runnable-app changes, perform `agent-browser` validation and report the evidence.
