import { getCurrentSeason } from './constants'

export function drawGrassTop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const currentSeason = getCurrentSeason()
  let baseColor = '#5d9b37'
  let highlightColor = '#6ba83f'
  let shadeColor = '#4f8a2c'
  let dotColor = '#7fc247'

  if (currentSeason === 'fall') {
    baseColor = '#bf9b30'
    highlightColor = '#cfab40'
    shadeColor = '#af8b20'
    dotColor = '#dfbb50'
  } else if (currentSeason === 'winter') {
    baseColor = '#e0e0e0'
    highlightColor = '#d0d0d0'
    shadeColor = '#c0c0c0'
    dotColor = '#e8e8e8'
  }

  ctx.fillStyle = baseColor
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 40; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    const shade = Math.random() * 0.3 - 0.15
    ctx.fillStyle = shade > 0 ? highlightColor : shadeColor
    ctx.fillRect(x + bx, y + by, 1, 1)
  }

  for (let i = 0; i < 8; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    ctx.fillStyle = dotColor
    ctx.fillRect(x + bx, y + by, 1, 1)
  }
}

export function drawGrassSide(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const currentSeason = getCurrentSeason()
  ctx.fillStyle = '#8b6914'
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 30; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    ctx.fillStyle = Math.random() > 0.5 ? '#7a5c12' : '#9c7618'
    ctx.fillRect(x + bx, y + by, 1, 1)
  }

  let topStripColor = '#5d9b37'
  let topStripHighlight = '#5d9b37'
  let topStripShade = '#4f8a2c'

  if (currentSeason === 'fall') {
    topStripColor = '#bf9b30'
    topStripHighlight = '#bf9b30'
    topStripShade = '#af8b20'
  } else if (currentSeason === 'winter') {
    topStripColor = '#e0e0e0'
    topStripHighlight = '#e0e0e0'
    topStripShade = '#c0c0c0'
  }

  ctx.fillStyle = topStripColor
  ctx.fillRect(x, y, 16, 1)

  for (let bx = 0; bx < 16; bx++) {
    const depth = Math.floor(Math.random() * 3) + 1
    for (let by = 1; by < depth; by++) {
      if (Math.random() > 0.3) {
        ctx.fillStyle = Math.random() > 0.5 ? topStripHighlight : topStripShade
        ctx.fillRect(x + bx, y + by, 1, 1)
      }
    }
  }
}

export function drawDirt(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#8b6914'
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 50; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    const colors = ['#7a5c12', '#9c7618', '#6d5010', '#a37d1a']
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
    ctx.fillRect(x + bx, y + by, 1, 1)
  }

  for (let i = 0; i < 5; i++) {
    const bx = Math.floor(Math.random() * 14)
    const by = Math.floor(Math.random() * 14)
    ctx.fillStyle = '#5a4810'
    ctx.fillRect(x + bx, y + by, 2, 2)
  }
}

export function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#7f7f7f'
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 60; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    const shade = Math.floor(Math.random() * 40) - 20
    const gray = Math.max(60, Math.min(160, 127 + shade))
    ctx.fillStyle = `rgb(${gray},${gray},${gray})`
    ctx.fillRect(x + bx, y + by, 1, 1)
  }

  ctx.strokeStyle = '#666666'
  ctx.lineWidth = 1
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * 16)
    const y1 = Math.floor(Math.random() * 16)
    const x2 = x1 + Math.floor(Math.random() * 6) - 3
    const y2 = y1 + Math.floor(Math.random() * 6) - 3
    ctx.beginPath()
    ctx.moveTo(x + x1, y + y1)
    ctx.lineTo(x + x2, y + y2)
    ctx.stroke()
  }
}

export function drawSand(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#e3d59e'
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 80; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    const colors = ['#d4c68f', '#f2e6af', '#c9b880', '#e8daa0']
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
    ctx.fillRect(x + bx, y + by, 1, 1)
  }
}

export function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(200, 200, 200, 0.7)'
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 20; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.fillRect(x + bx, y + by, 2, 1)
  }

  ctx.fillStyle = 'rgba(240, 240, 240, 0.3)'
  for (let bx = 0; bx < 16; bx += 4) {
    ctx.fillRect(x + bx, y, 2, 16)
  }
}

export function drawWoodSide(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#a68b5b'
  ctx.fillRect(x, y, 16, 16)

  ctx.fillStyle = '#8c734b'
  for (let by = 0; by < 16; by += 4) {
    ctx.fillRect(x, y + by, 16, 2)
  }

  for (let i = 0; i < 20; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    ctx.fillStyle = Math.random() > 0.5 ? '#7a623d' : '#c4a875'
    ctx.fillRect(x + bx, y + by, 1, 1)
  }
}

export function drawWoodTop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#d9c59e'
  ctx.fillRect(x, y, 16, 16)

  ctx.lineWidth = 2
  ctx.strokeStyle = '#8c734b'
  ctx.strokeRect(x + 1, y + 1, 14, 14)

  ctx.fillStyle = '#c4a875'
  ctx.fillRect(x + 6, y + 6, 4, 4)
}

export function drawLeaves(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const currentSeason = getCurrentSeason()
  let baseColor = '#55aa33'
  let frondColors = ['#449922', '#66bb44', '#338811']
  let veinColor = '#338811'

  if (currentSeason === 'spring') {
    baseColor = '#ffb7c5'
    frondColors = ['#e6a0b0', '#ffccd5', '#d990a0']
    veinColor = '#d990a0'
  } else if (currentSeason === 'fall') {
    baseColor = '#d95400'
    frondColors = ['#bf4400', '#e66410', '#ff7420']
    veinColor = '#bf4400'
  } else if (currentSeason === 'winter') {
    baseColor = '#e0e0e0'
    frondColors = ['#c0c0c0', '#d0d0d0', '#b0b0b0']
    veinColor = '#a0a0a0'
  }

  ctx.fillStyle = baseColor
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 40; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    ctx.fillStyle = frondColors[Math.floor(Math.random() * frondColors.length)]
    ctx.fillRect(x + bx, y + by, 1, 1)
  }

  ctx.fillStyle = veinColor
  for (let i = 0; i < 16; i++) {
    if (i % 4 === 0) ctx.fillRect(x + i, y + i, 2, 2)
    if (i % 4 === 2) ctx.fillRect(x + 15 - i, y + i, 2, 2)
  }
}

export function drawPackedSand(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#c9b080'
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 50; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    const colors = ['#b8a070', '#d4c090', '#a89060', '#c4b080']
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
    ctx.fillRect(x + bx, y + by, 1, 1)
  }

  ctx.fillStyle = '#9a8050'
  for (let i = 0; i < 8; i++) {
    const cx = Math.floor(Math.random() * 14) + 1
    const cy = Math.floor(Math.random() * 14) + 1
    ctx.fillRect(x + cx, y + cy, 2, 1)
  }
}
