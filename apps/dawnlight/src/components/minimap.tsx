import { useCallback, useEffect, useRef } from 'react'
import { WATER_LEVEL } from '../constants'
import type { WorldGenerator } from '../engine/world'

interface MinimapProps {
  playerX: number
  playerZ: number
  playerRotation: number // rotation.y in radians
  worldGenerator: WorldGenerator | null
  size?: number // Size of the minimap in pixels
  range?: number // Range in blocks to display
}

// Pre-calculated color palette (no string allocation during render)
const COLORS = {
  water: [60, 100, 140] as [number, number, number],
  waterDeep: [50, 80, 120] as [number, number, number],
  beach: [227, 213, 158] as [number, number, number],
  desert: [212, 196, 133] as [number, number, number],
  snow: [232, 232, 240] as [number, number, number],
  mountain: [122, 122, 122] as [number, number, number],
  highGround: [74, 138, 50] as [number, number, number],
  grass: [93, 155, 71] as [number, number, number],
}

// Get terrain color as RGB tuple (no string allocation)
function getTerrainColorRGB(worldGen: WorldGenerator, worldX: number, worldZ: number): [number, number, number] {
  const height = worldGen.getTerrainHeight(worldX, worldZ)
  const continental = worldGen.getContinentalValue(worldX, worldZ)

  // Water (lake/ocean)
  if (height <= WATER_LEVEL) {
    const depth = WATER_LEVEL - height
    if (depth > 3) return COLORS.waterDeep
    return COLORS.water
  }

  // Beach
  if (continental < 0.15) {
    return COLORS.beach
  }

  // Calculate biome noise (simplified)
  const biomeValue = Math.sin(worldX * 0.005 + worldZ * 0.003) * 0.5 + Math.cos(worldX * 0.003 - worldZ * 0.005) * 0.5

  if (biomeValue > 0.4) return COLORS.desert
  if (biomeValue < -0.4) return COLORS.snow
  if (height > 60) return COLORS.mountain
  if (height > 45) return COLORS.highGround
  return COLORS.grass
}

export function Minimap({ playerX, playerZ, playerRotation, worldGenerator, size = 100, range = 192 }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastRenderPosRef = useRef({ x: -9999, z: -9999 })
  const imageDataRef = useRef<ImageData | null>(null)
  const smoothRotationRef = useRef(playerRotation)
  const animationIdRef = useRef<number>(0)

  const renderMinimap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !worldGenerator) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    const centerX = size / 2
    const centerY = size / 2
    const scale = size / (range * 2)
    const pixelSize = 4

    // Smooth rotation (interpolate 20% per frame)
    const rotationDiff = playerRotation - smoothRotationRef.current
    let normalizedDiff = rotationDiff
    if (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2
    if (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2
    smoothRotationRef.current += normalizedDiff * 0.2

    // Use larger grid for position (reduces jitter at block boundaries)
    const gridX = Math.floor(playerX / 2) * 2
    const gridZ = Math.floor(playerZ / 2) * 2

    // Check if we need to redraw terrain (moved more than 2 blocks)
    const lastPos = lastRenderPosRef.current
    const needsTerrainRedraw = Math.abs(gridX - lastPos.x) >= 2 || Math.abs(gridZ - lastPos.z) >= 2 || !imageDataRef.current

    // Create or reuse ImageData
    if (!imageDataRef.current) {
      imageDataRef.current = ctx.createImageData(size, size)
    }
    const imageData = imageDataRef.current
    const data = imageData.data

    // Only recalculate terrain pixels if position changed significantly
    if (needsTerrainRedraw) {
      for (let py = 0; py < size; py += pixelSize) {
        for (let px = 0; px < size; px += pixelSize) {
          const relX = (px - centerX) / scale
          const relZ = (py - centerY) / scale

          const worldX = Math.floor(gridX + relX)
          const worldZ = Math.floor(gridZ + relZ)

          const [r, g, b] = getTerrainColorRGB(worldGenerator, worldX, worldZ)

          // Fill pixelSize x pixelSize block
          for (let dy = 0; dy < pixelSize && py + dy < size; dy++) {
            for (let dx = 0; dx < pixelSize && px + dx < size; dx++) {
              const idx = ((py + dy) * size + (px + dx)) * 4
              data[idx] = r
              data[idx + 1] = g
              data[idx + 2] = b
              data[idx + 3] = 255
            }
          }
        }
      }
      lastRenderPosRef.current = { x: gridX, z: gridZ }
    }

    // Draw terrain
    ctx.putImageData(imageData, 0, 0)

    // Apply circular mask
    ctx.globalCompositeOperation = 'destination-in'
    ctx.beginPath()
    ctx.arc(centerX, centerY, size / 2 - 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'

    // Draw border ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, size / 2 - 2, 0, Math.PI * 2)
    ctx.stroke()

    // Draw cardinal directions
    ctx.font = '10px monospace'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const dirOffset = size / 2 - 10
    ctx.fillText('N', centerX, centerY - dirOffset)
    ctx.fillText('S', centerX, centerY + dirOffset)
    ctx.fillText('E', centerX + dirOffset, centerY)
    ctx.fillText('W', centerX - dirOffset, centerY)

    // Draw player indicator (triangle pointing in view direction)
    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(-smoothRotationRef.current)

    ctx.fillStyle = '#ff4444'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, -8)
    ctx.lineTo(-5, 6)
    ctx.lineTo(5, 6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.restore()
  }, [playerX, playerZ, playerRotation, worldGenerator, size, range])

  useEffect(() => {
    let lastTime = 0
    const frameInterval = 100 // 10 FPS

    const animate = (time: number) => {
      if (time - lastTime >= frameInterval) {
        renderMinimap()
        lastTime = time
      }
      animationIdRef.current = requestAnimationFrame(animate)
    }

    animationIdRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [renderMinimap])

  if (!worldGenerator) return null

  return (
    <div
      className="fixed z-90 pointer-events-none"
      style={{
        top: '60px',
        right: '10px',
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-full shadow-lg"
        style={{
          backgroundColor: '#1a1a2e',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.3)',
        }}
      />
    </div>
  )
}
