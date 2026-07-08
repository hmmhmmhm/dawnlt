# LOD Baseline Capture

Use this routine after changes to LOD selection, worker extraction, far renderers, tree rendering, water rendering, or terrain visibility.

## Local Routine

```bash
pnpm --filter dawnlight dev -- --host 127.0.0.1
agent-browser open http://localhost:5173
agent-browser wait --load networkidle
```

Open chat in the game, run each command, wait for chunks to settle, then capture the screenshot:

| Target | Chat command | Screenshot |
| --- | --- | --- |
| Default spawn | `/lodbaseline` | `/tmp/dawnlight-lod-default.png` |
| Forest tree | `/lodbaseline forest` | `/tmp/dawnlight-lod-forest.png` |
| Beach palm | `/lodbaseline beach` | `/tmp/dawnlight-lod-beach-palm.png` |
| Snow tree | `/lodbaseline snow` | `/tmp/dawnlight-lod-snow-tree.png` |

For each target, save the `/lodbaseline` chat output with the screenshot path. The output is the comparable performance baseline: target, position, chunk, render distance, camera mode, FPS, draw calls, triangles, LOD settings, and `/lodlog` data.

## Error Check

```bash
agent-browser errors
```

The expected output is empty.
