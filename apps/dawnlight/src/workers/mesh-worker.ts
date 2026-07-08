/**
 * Web Worker for offloading mesh geometry calculations
 *
 * This file re-exports from the mesh-worker module for backward compatibility.
 * The actual implementation is in mesh-worker/index.ts
 */

// Re-export everything from the new module structure
export type { MeshWorkerInput, MeshWorkerOutput } from './mesh-worker/types'

// The worker entry point is now in mesh-worker/index.ts
// This file serves as a compatibility layer
import './mesh-worker/index'
