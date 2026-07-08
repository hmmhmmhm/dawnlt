# Dawnlight

A voxel-based 3D world game built with React 19, Three.js, Vite, and TypeScript.

## Features

- Procedural terrain with mountains, beaches, lakes, caves, and biomes
- Dynamic day, evening, and night lighting
- Clear, rain, and snow weather
- Seasonal texture variations
- Keyboard, mouse, gamepad, and mobile touch controls
- Web Worker based chunk and mesh generation

## Requirements

- Node.js 22 or newer
- pnpm 10.33.4

## Getting Started

```bash
pnpm install
pnpm dev
```

## Useful Commands

```bash
pnpm lint
pnpm --dir apps/dawnlight exec tsc --noEmit
pnpm --dir apps/dawnlight test --runInBand
pnpm build
```

## Project Layout

```text
apps/dawnlight/
  src/
    components/  React UI
    engine/      Rendering, physics, world systems
    game/        Game loop and interaction logic
    hooks/       React integration hooks
    shared/      Worker-safe shared logic
    workers/     Mesh and LOD workers
docs/
  design/        Design notes
  lod/           LOD notes and samples
```

## Notes

This public repository does not include deployment credentials or deployment automation.
Local environment files such as `.env.local` are intentionally ignored.
