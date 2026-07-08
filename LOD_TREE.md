# LOD Tree Split Status

## Current State

Tree LOD is implemented on `develop`.

- Terrain LOD and tree LOD are separated at render time.
- `FarRenderer` owns terrain and water LOD meshes.
- `FarTreeRenderer` owns the far tree render pass.
- Worker-side extraction is represented by `lod-worker-tree.ts`.
- LOD stats include tree section, draw call, instance, and triangle counts through `FarRenderer.getStats()`.

## Implemented Files

- `apps/dawnlight/src/game/engine/lod/far-tree-renderer.ts`
- `apps/dawnlight/src/workers/lod-worker-tree.ts`
- `apps/dawnlight/src/game/engine/lod/lod-data-types.ts`
- `apps/dawnlight/src/game/engine/lod/far-renderer.ts`
- `apps/dawnlight/src/workers/lod-worker.ts`

## Validation Status

Automated coverage exists for the LOD worker, worker manager, LOD tree, and near-only interaction behavior:

```bash
pnpm --filter dawnlight test -- lod-worker.test.ts lod-worker-manager.test.ts lod-tree.test.ts near-only-interaction.test.ts --runInBand
pnpm --filter dawnlight exec tsc --noEmit
```

Manual visual validation should still be done with `agent-browser` whenever LOD rendering changes:

```bash
pnpm --filter dawnlight dev -- --host 127.0.0.1
agent-browser open http://localhost:5173
agent-browser errors
agent-browser screenshot /tmp/dawnlight-lod-check.png
```

Repeatable screenshot baselines are documented in `AGENT_BROWSER.md`. The required LOD set is default spawn plus `/lodbaseline forest`, `/lodbaseline beach`, and `/lodbaseline snow` views when biome-specific LOD visuals change.

An old debug capture is archived at `docs/lod/lod-log-sample.txt`. New local LOD logs should use `lod-log.txt` or `lod-log-*.txt`, which are ignored.

## Remaining Follow-Up Candidates

1. Collect and commit a release baseline summary after the next intentional LOD visual tuning pass.
2. Add image-diff thresholds once baseline screenshots are stable enough for CI.

## Risks

- Tree extraction can still increase worker cost in dense forests.
- Section boundaries need continued attention for duplicate or missing trees.
- Terrain and tree fade timing should stay synchronized to avoid visible popping.
