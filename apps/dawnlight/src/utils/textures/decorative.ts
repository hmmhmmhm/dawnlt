export function drawFallenLeaves(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const leafColors = ['#8b4513', '#a0522d', '#cd853f', '#d2691e', '#b8860b', '#daa520']
  const darkLeafColors = ['#654321', '#5d3a1a', '#8b6914', '#6b4423']

  for (let i = 0; i < 20; i++) {
    const lx = Math.floor(Math.random() * 14) + 1
    const ly = Math.floor(Math.random() * 14) + 1
    const color = leafColors[Math.floor(Math.random() * leafColors.length)]
    const size = Math.random() > 0.7 ? 2 : 1

    ctx.fillStyle = color
    ctx.fillRect(x + lx, y + ly, size, size)

    if (size === 2 && Math.random() > 0.5) {
      ctx.fillStyle = darkLeafColors[Math.floor(Math.random() * darkLeafColors.length)]
      ctx.fillRect(x + lx + 1, y + ly + 1, 1, 1)
    }
  }

  for (let i = 0; i < 5; i++) {
    const cx = Math.floor(Math.random() * 12) + 2
    const cy = Math.floor(Math.random() * 12) + 2
    ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)]
    ctx.fillRect(x + cx, y + cy, 2, 1)
    ctx.fillRect(x + cx + 1, y + cy + 1, 1, 1)
  }
}

export function drawMoss(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const mossColors = ['#2d5a27', '#3d6a37', '#4d7a47', '#1d4a17', '#5d8a57']
  const highlightColors = ['#6d9a67', '#7daa77', '#8dba87']

  for (let i = 0; i < 35; i++) {
    const mx = Math.floor(Math.random() * 16)
    const my = Math.floor(Math.random() * 16)
    ctx.fillStyle = mossColors[Math.floor(Math.random() * mossColors.length)]
    ctx.fillRect(x + mx, y + my, 1, 1)
  }

  for (let i = 0; i < 8; i++) {
    const cx = Math.floor(Math.random() * 13) + 1
    const cy = Math.floor(Math.random() * 13) + 1
    ctx.fillStyle = mossColors[Math.floor(Math.random() * mossColors.length)]
    ctx.fillRect(x + cx, y + cy, 2, 2)
    ctx.fillStyle = highlightColors[Math.floor(Math.random() * highlightColors.length)]
    ctx.fillRect(x + cx, y + cy, 1, 1)
  }

  ctx.fillStyle = '#9dca97'
  for (let i = 0; i < 6; i++) {
    const hx = Math.floor(Math.random() * 16)
    const hy = Math.floor(Math.random() * 16)
    ctx.fillRect(x + hx, y + hy, 1, 1)
  }
}

export function drawPebble(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const pebbleColors = ['#8a8a8a', '#7a7a7a', '#6a6a6a', '#9a9a9a', '#8a7a6a', '#7a6a5a', '#9a8a7a', '#6a7a8a', '#5a6a7a']
  const highlightColors = ['#b0b0b0', '#c0c0c0', '#a0a0a0']
  const shadowColors = ['#4a4a4a', '#5a5a5a', '#3a3a3a']

  const pebbleCount = 4 + Math.floor(Math.random() * 3)

  for (let p = 0; p < pebbleCount; p++) {
    const px = 1 + Math.floor(Math.random() * 12)
    const py = 1 + Math.floor(Math.random() * 12)
    const size = 1 + Math.floor(Math.random() * 3)

    ctx.fillStyle = pebbleColors[Math.floor(Math.random() * pebbleColors.length)]
    if (size === 1) {
      ctx.fillRect(x + px, y + py, 1, 1)
    } else if (size === 2) {
      ctx.fillRect(x + px, y + py, 2, 2)
      ctx.fillStyle = highlightColors[Math.floor(Math.random() * highlightColors.length)]
      ctx.fillRect(x + px, y + py, 1, 1)
      ctx.fillStyle = shadowColors[Math.floor(Math.random() * shadowColors.length)]
      ctx.fillRect(x + px + 1, y + py + 1, 1, 1)
    } else {
      ctx.fillRect(x + px, y + py, 3, 2)
      ctx.fillRect(x + px + 1, y + py + 1, 2, 1)
      ctx.fillStyle = highlightColors[Math.floor(Math.random() * highlightColors.length)]
      ctx.fillRect(x + px, y + py, 1, 1)
      ctx.fillRect(x + px + 1, y + py, 1, 1)
      ctx.fillStyle = shadowColors[Math.floor(Math.random() * shadowColors.length)]
      ctx.fillRect(x + px + 2, y + py + 1, 1, 1)
    }
  }

  ctx.fillStyle = '#c9b99a'
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(x + Math.floor(Math.random() * 16), y + Math.floor(Math.random() * 16), 1, 1)
  }
}

export function drawStonePebble(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const pebbleColors = ['#5a5a5a', '#4a4a4a', '#3a3a3a', '#6a6a6a', '#5a5550', '#4a4540', '#6a6560', '#505558', '#454a50']
  const highlightColors = ['#808080', '#909090', '#707070']
  const shadowColors = ['#2a2a2a', '#353535', '#202020']

  const pebbleCount = 4 + Math.floor(Math.random() * 3)

  for (let p = 0; p < pebbleCount; p++) {
    const px = 1 + Math.floor(Math.random() * 12)
    const py = 1 + Math.floor(Math.random() * 12)
    const size = 1 + Math.floor(Math.random() * 3)

    ctx.fillStyle = pebbleColors[Math.floor(Math.random() * pebbleColors.length)]
    if (size === 1) {
      ctx.fillRect(x + px, y + py, 1, 1)
    } else if (size === 2) {
      ctx.fillRect(x + px, y + py, 2, 2)
      ctx.fillStyle = highlightColors[Math.floor(Math.random() * highlightColors.length)]
      ctx.fillRect(x + px, y + py, 1, 1)
      ctx.fillStyle = shadowColors[Math.floor(Math.random() * shadowColors.length)]
      ctx.fillRect(x + px + 1, y + py + 1, 1, 1)
    } else {
      ctx.fillRect(x + px, y + py, 3, 2)
      ctx.fillRect(x + px + 1, y + py + 1, 2, 1)
      ctx.fillStyle = highlightColors[Math.floor(Math.random() * highlightColors.length)]
      ctx.fillRect(x + px, y + py, 1, 1)
      ctx.fillRect(x + px + 1, y + py, 1, 1)
      ctx.fillStyle = shadowColors[Math.floor(Math.random() * shadowColors.length)]
      ctx.fillRect(x + px + 2, y + py + 1, 1, 1)
    }
  }

  ctx.fillStyle = '#5a7040'
  for (let i = 0; i < 2; i++) {
    ctx.fillRect(x + Math.floor(Math.random() * 16), y + Math.floor(Math.random() * 16), 1, 1)
  }
}

export function drawSnowPebble(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const pebbleColors = ['#f0f0f0', '#e8e8e8', '#ffffff', '#f5f5f5', '#e8f0f8', '#e0e8f0', '#f0f5ff', '#f8f8f8', '#ececec']
  const highlightColors = ['#ffffff', '#ffffff', '#fafafa']
  const shadowColors = ['#c8c8c8', '#d0d0d0', '#c0c8d0']

  const pebbleCount = 4 + Math.floor(Math.random() * 3)

  for (let p = 0; p < pebbleCount; p++) {
    const px = 1 + Math.floor(Math.random() * 12)
    const py = 1 + Math.floor(Math.random() * 12)
    const size = 1 + Math.floor(Math.random() * 3)

    ctx.fillStyle = pebbleColors[Math.floor(Math.random() * pebbleColors.length)]
    if (size === 1) {
      ctx.fillRect(x + px, y + py, 1, 1)
    } else if (size === 2) {
      ctx.fillRect(x + px, y + py, 2, 2)
      ctx.fillStyle = highlightColors[Math.floor(Math.random() * highlightColors.length)]
      ctx.fillRect(x + px, y + py, 1, 1)
      ctx.fillStyle = shadowColors[Math.floor(Math.random() * shadowColors.length)]
      ctx.fillRect(x + px + 1, y + py + 1, 1, 1)
    } else {
      ctx.fillRect(x + px, y + py, 3, 2)
      ctx.fillRect(x + px + 1, y + py + 1, 2, 1)
      ctx.fillStyle = highlightColors[Math.floor(Math.random() * highlightColors.length)]
      ctx.fillRect(x + px, y + py, 1, 1)
      ctx.fillRect(x + px + 1, y + py, 1, 1)
      ctx.fillStyle = shadowColors[Math.floor(Math.random() * shadowColors.length)]
      ctx.fillRect(x + px + 2, y + py + 1, 1, 1)
    }
  }

  ctx.fillStyle = '#e0e8f0'
  for (let i = 0; i < 2; i++) {
    ctx.fillRect(x + Math.floor(Math.random() * 16), y + Math.floor(Math.random() * 16), 1, 1)
  }
}

export function drawStarfish(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const bodyColor = '#ff6b4a'
  const highlightColor = '#ff8866'
  const shadowColor = '#cc4433'
  const dotColor = '#ffaa88'

  const centerX = x + 8
  const centerY = y + 8

  const armOffsets = [
    { dx: 0, dy: -6 },
    { dx: 5, dy: -2 },
    { dx: 4, dy: 5 },
    { dx: -4, dy: 5 },
    { dx: -5, dy: -2 },
  ]

  ctx.fillStyle = bodyColor
  for (const offset of armOffsets) {
    const steps = 4
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const px = Math.round(centerX + offset.dx * t)
      const py = Math.round(centerY + offset.dy * t)
      const width = Math.max(1, Math.round(3 - t * 2))

      ctx.fillRect(px - Math.floor(width / 2), py, width, 1)
    }
  }

  ctx.fillRect(centerX - 2, centerY - 2, 4, 4)
  ctx.fillRect(centerX - 1, centerY - 3, 2, 1)
  ctx.fillRect(centerX - 1, centerY + 2, 2, 1)
  ctx.fillRect(centerX - 3, centerY - 1, 1, 2)
  ctx.fillRect(centerX + 2, centerY - 1, 1, 2)

  ctx.fillStyle = highlightColor
  ctx.fillRect(centerX - 1, centerY - 1, 2, 1)
  ctx.fillRect(centerX - 1, centerY - 2, 1, 1)

  ctx.fillStyle = shadowColor
  ctx.fillRect(centerX, centerY + 1, 2, 1)
  ctx.fillRect(centerX + 1, centerY, 1, 1)

  ctx.fillStyle = dotColor
  ctx.fillRect(centerX - 1, centerY, 1, 1)
  ctx.fillRect(centerX + 1, centerY - 1, 1, 1)
}

export function drawVine(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const vineColors = ['#1d5a17', '#2d6a27', '#3d7a37', '#1d4a17']
  const leafColors = ['#2d7a2d', '#3d8a3d', '#4d9a4d', '#1d6a1d']

  const numStrands = 2 + Math.floor(Math.random() * 2)
  for (let s = 0; s < numStrands; s++) {
    const strandX = 3 + Math.floor(Math.random() * 10)
    ctx.fillStyle = vineColors[Math.floor(Math.random() * vineColors.length)]

    let currentX = strandX
    for (let yy = 0; yy < 16; yy++) {
      ctx.fillRect(x + currentX, y + yy, 1, 1)
      if (Math.random() < 0.3) {
        currentX += Math.random() < 0.5 ? -1 : 1
        currentX = Math.max(1, Math.min(14, currentX))
      }
    }
  }

  for (let i = 0; i < 8; i++) {
    const lx = 2 + Math.floor(Math.random() * 12)
    const ly = Math.floor(Math.random() * 14)
    ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)]

    const leafSize = 2 + Math.floor(Math.random() * 2)
    ctx.fillRect(x + lx, y + ly, leafSize, 1)
    ctx.fillRect(x + lx + 1, y + ly + 1, 1, 1)
  }

  ctx.fillStyle = '#0d3a07'
  for (let i = 0; i < 4; i++) {
    const dx = Math.floor(Math.random() * 16)
    const dy = Math.floor(Math.random() * 16)
    ctx.fillRect(x + dx, y + dy, 1, 1)
  }

  ctx.fillStyle = '#5daa5d'
  for (let i = 0; i < 3; i++) {
    const hx = Math.floor(Math.random() * 16)
    const hy = Math.floor(Math.random() * 16)
    ctx.fillRect(x + hx, y + hy, 1, 1)
  }
}

export function drawSnowVine(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const vineColors = ['#d0e8f0', '#c0d8e8', '#e0f0f8', '#b8d0e0']
  const leafColors = ['#e8f4fc', '#dceef8', '#f0f8ff', '#d4e8f4']

  const numStrands = 2 + Math.floor(Math.random() * 2)
  for (let s = 0; s < numStrands; s++) {
    const strandX = 3 + Math.floor(Math.random() * 10)
    ctx.fillStyle = vineColors[Math.floor(Math.random() * vineColors.length)]

    let currentX = strandX
    for (let yy = 0; yy < 16; yy++) {
      ctx.fillRect(x + currentX, y + yy, 1, 1)
      if (Math.random() < 0.3) {
        currentX += Math.random() < 0.5 ? -1 : 1
        currentX = Math.max(1, Math.min(14, currentX))
      }
    }
  }

  for (let i = 0; i < 8; i++) {
    const lx = 2 + Math.floor(Math.random() * 12)
    const ly = Math.floor(Math.random() * 14)
    ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)]

    const leafSize = 2 + Math.floor(Math.random() * 2)
    ctx.fillRect(x + lx, y + ly, leafSize, 1)
    ctx.fillRect(x + lx + 1, y + ly + 1, 1, 1)
  }

  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 5; i++) {
    const sx = Math.floor(Math.random() * 16)
    const sy = Math.floor(Math.random() * 16)
    ctx.fillRect(x + sx, y + sy, 1, 1)
  }

  ctx.fillStyle = '#a0c0d8'
  for (let i = 0; i < 3; i++) {
    const dx = Math.floor(Math.random() * 16)
    const dy = Math.floor(Math.random() * 16)
    ctx.fillRect(x + dx, y + dy, 1, 1)
  }
}
