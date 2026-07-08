/**
 * 3D Mushroom rendering (Red and Brown mushrooms)
 * Renders mushrooms as stem + dome cap with spots, gradients and vertex colors
 */

import { BlockType } from '../../shared/block-types'
import type { FoliageMeshBuffers } from './types'
import { createSeededRandom3D, getTextureUV } from './utils'

/** Add a quad with gradient (2 colors: v0,v1 use color0, v2,v3 use color1) */
function addQuad(
  buf: FoliageMeshBuffers,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
  x3: number,
  y3: number,
  z3: number,
  nx: number,
  ny: number,
  nz: number,
  r0: number,
  g0: number,
  b0: number,
  r1: number,
  g1: number,
  b1: number,
  uvPx: number,
  uvPy: number,
  w0: number,
  w1: number,
  w2: number,
  w3: number,
): void {
  const base = buf.vertices.length / 3
  buf.vertices.push(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3)
  buf.normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz)
  buf.colors.push(r0, g0, b0, r0, g0, b0, r1, g1, b1, r1, g1, b1)
  buf.uvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
  buf.windWeights.push(w0, w1, w2, w3)
  buf.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
}

/** Add a triangle with gradient (v0,v1 use color0, v2 uses color1) */
function addTri(buf: FoliageMeshBuffers, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, nx: number, ny: number, nz: number, r0: number, g0: number, b0: number, r1: number, g1: number, b1: number, uvPx: number, uvPy: number, w: number): void {
  const base = buf.vertices.length / 3
  buf.vertices.push(x0, y0, z0, x1, y1, z1, x2, y2, z2)
  buf.normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz)
  buf.colors.push(r0, g0, b0, r0, g0, b0, r1, g1, b1)
  buf.uvs.push(uvPx, uvPy, uvPx, uvPy, uvPx, uvPy)
  buf.windWeights.push(w, w, w)
  buf.indices.push(base, base + 1, base + 2)
}

/** Stem with vertical gradient (dark bottom -> bright top) */
function addStem(buf: FoliageMeshBuffers, cx: number, by: number, cz: number, sw: number, sh: number, r: number, g: number, b: number, uvPx: number, uvPy: number): void {
  const dr = r * 0.7,
    dg = g * 0.7,
    db = b * 0.7 // dark bottom
  const sr = r * 0.65,
    sg = g * 0.65,
    sb = b * 0.65 // dark bottom (sides)

  addQuad(buf, cx - sw, by, cz - sw, cx + sw, by, cz - sw, cx + sw, by + sh, cz - sw, cx - sw, by + sh, cz - sw, 0, 0, -1, dr, dg, db, r, g, b, uvPx, uvPy, 0, 0, 0.1, 0.1)
  addQuad(buf, cx + sw, by, cz + sw, cx - sw, by, cz + sw, cx - sw, by + sh, cz + sw, cx + sw, by + sh, cz + sw, 0, 0, 1, dr, dg, db, r, g, b, uvPx, uvPy, 0, 0, 0.1, 0.1)
  addQuad(buf, cx - sw, by, cz + sw, cx - sw, by, cz - sw, cx - sw, by + sh, cz - sw, cx - sw, by + sh, cz + sw, -1, 0, 0, sr, sg, sb, r * 0.9, g * 0.9, b * 0.9, uvPx, uvPy, 0, 0, 0.1, 0.1)
  addQuad(buf, cx + sw, by, cz - sw, cx + sw, by, cz + sw, cx + sw, by + sh, cz + sw, cx + sw, by + sh, cz - sw, 1, 0, 0, sr, sg, sb, r * 0.9, g * 0.9, b * 0.9, uvPx, uvPy, 0, 0, 0.1, 0.1)
}

/** Cap: dome top with highlight, gradient sides, gills */
function addCap(buf: FoliageMeshBuffers, cx: number, cz: number, capBot: number, capTop: number, cw: number, domeH: number, topR: number, topG: number, topB: number, sideR: number, sideG: number, sideB: number, gillR: number, gillG: number, gillB: number, uvPx: number, uvPy: number): void {
  const w = 0.2
  const tw = cw * 0.82

  // Dome highlight at peak (brighter center)
  const hR = Math.min(topR * 1.3, 1),
    hG = Math.min(topG * 1.5, 1),
    hB = Math.min(topB * 1.5, 1)

  // Dome top: 4 triangles (edge -> bright peak)
  const peakY = capTop + domeH
  addTri(buf, cx - tw, capTop, cz - tw, cx - tw, capTop, cz + tw, cx, peakY, cz, 0, 1, 0, topR, topG, topB, hR, hG, hB, uvPx, uvPy, w)
  addTri(buf, cx - tw, capTop, cz + tw, cx + tw, capTop, cz + tw, cx, peakY, cz, 0, 1, 0, topR, topG, topB, hR, hG, hB, uvPx, uvPy, w)
  addTri(buf, cx + tw, capTop, cz + tw, cx + tw, capTop, cz - tw, cx, peakY, cz, 0, 1, 0, topR * 0.92, topG * 0.92, topB * 0.92, hR * 0.95, hG * 0.95, hB * 0.95, uvPx, uvPy, w)
  addTri(buf, cx + tw, capTop, cz - tw, cx - tw, capTop, cz - tw, cx, peakY, cz, 0, 1, 0, topR * 0.92, topG * 0.92, topB * 0.92, hR * 0.95, hG * 0.95, hB * 0.95, uvPx, uvPy, w)

  // Gills - slight gradient (edges darker)
  const ge = 0.85 // edge darkening
  addQuad(buf, cx - cw, capBot, cz + cw, cx - cw, capBot, cz - cw, cx + cw, capBot, cz - cw, cx + cw, capBot, cz + cw, 0, -1, 0, gillR * ge, gillG * ge, gillB * ge, gillR, gillG, gillB, uvPx, uvPy, w, w, w, w)

  // Side faces with gradient (dark bottom shadow -> brighter top)
  const sdR = sideR * 0.65,
    sdG = sideG * 0.65,
    sdB = sideB * 0.65 // shadow at bottom
  const ssR = sideR * 0.6,
    ssG = sideG * 0.6,
    ssB = sideB * 0.6

  addQuad(buf, cx - cw, capBot, cz - cw, cx + cw, capBot, cz - cw, cx + tw, capTop, cz - tw, cx - tw, capTop, cz - tw, 0, 0, -1, sdR, sdG, sdB, sideR, sideG, sideB, uvPx, uvPy, w, w, w, w)
  addQuad(buf, cx + cw, capBot, cz + cw, cx - cw, capBot, cz + cw, cx - tw, capTop, cz + tw, cx + tw, capTop, cz + tw, 0, 0, 1, sdR, sdG, sdB, sideR, sideG, sideB, uvPx, uvPy, w, w, w, w)
  addQuad(buf, cx - cw, capBot, cz + cw, cx - cw, capBot, cz - cw, cx - tw, capTop, cz - tw, cx - tw, capTop, cz + tw, -1, 0, 0, ssR, ssG, ssB, sideR * 0.9, sideG * 0.9, sideB * 0.9, uvPx, uvPy, w, w, w, w)
  addQuad(buf, cx + cw, capBot, cz - cw, cx + cw, capBot, cz + cw, cx + tw, capTop, cz + tw, cx + tw, capTop, cz - tw, 1, 0, 0, ssR, ssG, ssB, sideR * 0.9, sideG * 0.9, sideB * 0.9, uvPx, uvPy, w, w, w, w)
}

/** Spots on mushroom cap */
function addSpots(buf: FoliageMeshBuffers, cx: number, cz: number, capTop: number, cw: number, domeH: number, isRed: boolean, random: (n: number) => number, uvPx: number, uvPy: number): void {
  const tw = cw * 0.82
  const spotCount = isRed ? 5 : 4
  const spotR = isRed ? 1.0 : 0.35
  const spotG = isRed ? 1.0 : 0.25
  const spotB = isRed ? 0.95 : 0.04

  for (let i = 0; i < spotCount; i++) {
    const spotSize = (0.02 + random(20 + i * 3) * 0.02) * (cw / 0.2)
    const offX = (random(21 + i * 3) - 0.5) * tw * 1.4
    const offZ = (random(22 + i * 3) - 0.5) * tw * 1.4

    if (Math.abs(offX) + spotSize > tw * 0.9 || Math.abs(offZ) + spotSize > tw * 0.9) continue

    const dist = Math.max(Math.abs(offX), Math.abs(offZ)) / tw
    const localH = domeH * (1 - dist) * 0.85
    const sy = capTop + localH + 0.003

    addQuad(buf, cx + offX - spotSize, sy, cz + offZ - spotSize, cx + offX - spotSize, sy, cz + offZ + spotSize, cx + offX + spotSize, sy, cz + offZ + spotSize, cx + offX + spotSize, sy, cz + offZ - spotSize, 0, 1, 0, spotR, spotG, spotB, spotR, spotG, spotB, uvPx, uvPy, 0.2, 0.2, 0.2, 0.2)
  }
}

/**
 * Render a 3D mushroom with stem, dome cap, spots and gradients
 */
export function renderMushroom(block: BlockType, worldX: number, worldY: number, worldZ: number, foliage: FoliageMeshBuffers): void {
  const random = createSeededRandom3D(worldX, worldY, worldZ)

  const baseUv = getTextureUV(BlockType.SNOW, 'top')
  const uvPx = baseUv[0] + 0.01
  const uvPy = baseUv[1] + 0.01

  const sizeVar = 0.9 + random(1) * 0.2
  const cx = worldX + 0.5 + (random(2) - 0.5) * 0.2
  const cz = worldZ + 0.5 + (random(3) - 0.5) * 0.2
  const by = worldY
  const isRed = block === BlockType.MUSHROOM_RED

  const stemW = (isRed ? 0.08 : 0.07) * sizeVar
  const stemH = (isRed ? 0.35 : 0.3) * sizeVar
  const capW = (isRed ? 0.22 : 0.2) * sizeVar
  const capH = (isRed ? 0.2 : 0.12) * sizeVar
  const domeH = (isRed ? 0.06 : 0.03) * sizeVar
  const capBot = by + stemH - 0.04 * sizeVar
  const capTop = capBot + capH

  let stemR: number, stemG: number, stemB: number
  let capTopR: number, capTopG: number, capTopB: number
  let capSideR: number, capSideG: number, capSideB: number
  let gillR: number, gillG: number, gillB: number

  if (isRed) {
    stemR = 0.96
    stemG = 0.96
    stemB = 0.86
    capTopR = 0.8
    capTopG = 0.13
    capTopB = 0.13
    capSideR = 0.73
    capSideG = 0.12
    capSideB = 0.12
    gillR = 0.93
    gillG = 0.89
    gillB = 0.78
  } else {
    stemR = 0.83
    stemG = 0.77
    stemB = 0.66
    capTopR = 0.55
    capTopG = 0.41
    capTopB = 0.08
    capSideR = 0.48
    capSideG = 0.35
    capSideB = 0.06
    gillR = 0.77
    gillG = 0.71
    gillB = 0.6
  }

  const cv = 1.0 + (random(4) - 0.5) * 0.1
  capTopR *= cv
  capTopG *= cv
  capTopB *= cv
  capSideR *= cv
  capSideG *= cv
  capSideB *= cv

  addStem(foliage, cx, by, cz, stemW, stemH, stemR, stemG, stemB, uvPx, uvPy)
  addCap(foliage, cx, cz, capBot, capTop, capW, domeH, capTopR, capTopG, capTopB, capSideR, capSideG, capSideB, gillR, gillG, gillB, uvPx, uvPy)
  addSpots(foliage, cx, cz, capTop, capW, domeH, isRed, random, uvPx, uvPy)
}
