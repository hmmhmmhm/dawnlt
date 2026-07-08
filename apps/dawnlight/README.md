# dawnlight

React 19 component library built with Vite, TypeScript, and Tailwind CSS.

## 3D Asset Pipeline

- Raw/source assets: `apps/dawnlight/asset-origin` (gitignored)
- Optimized output: `apps/dawnlight/asset-optimized` (commit-safe by default)

### Optimize GLB files

```bash
pnpm --dir apps/dawnlight run assets:optimize
```

Optional flags:

```bash
node apps/dawnlight/scripts/optimize-gltf-assets.mjs --dry-run
node apps/dawnlight/scripts/optimize-gltf-assets.mjs --texture-size 1024 --animation-texture-size 16 --texture-compress webp
node apps/dawnlight/scripts/optimize-gltf-assets.mjs --extract-textures true
```

Pipeline behavior:

- Recursively scans `asset-origin/**/*.glb`
- Writes optimized files to mirrored folders in `asset-optimized` using lowercase kebab-case names:
  `<character>.glb` and `<character>-anim.glb`
- For non-animation files, also writes a texture bundle (`.gltf + textures`) under:
  `asset-optimized/<character>/textures/`
- Uses `meshopt` compression
- Treats files containing `animation` in their filename as animation packs and aggressively downsizes textures
- Writes `asset-optimized/optimization-report.json` for manual review before R2 upload

### Generate Meshy experiment assets

Meshy API keys must stay outside the repo. Put local development secrets in an ignored env file:

`apps/dawnlight/.env.local`

Generate the apple basket source GLB:

```bash
pnpm --dir apps/dawnlight run assets:meshy -- \
  --name apple-basket \
  --prompt "low poly hand basket with four red apples inside, small curved handle, cozy voxel survival game prop, warm woven wood, game ready glb"
```

Optimize only Meshy source assets, then publish the optimized GLB to Vite public assets:

```bash
pnpm --dir apps/dawnlight run assets:optimize -- \
  --source asset-origin/meshy \
  --output asset-optimized/meshy
pnpm --dir apps/dawnlight run assets:meshy:publish
```

Open the game with `?meshyPreview=apple-basket`, `?meshyPreview=apple`, or `?meshyPreview=apple-round` to render a generated model as an in-world development preview.

### Smile texture (CDN)

Avatar smile expression uses this CDN texture directly:

`https://static.dawn.lt/glb/leafy-explorer/smile.webp`
