export function drawSnow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#e0e0e0'
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 30; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    ctx.fillStyle = Math.random() > 0.5 ? '#f0f0f0' : '#d0d0d0'
    ctx.fillRect(x + bx, y + by, 1, 1)
  }

  for (let i = 0; i < 10; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    ctx.fillStyle = 'rgba(200, 220, 255, 0.3)'
    ctx.fillRect(x + bx, y + by, 1, 1)
  }
}

export function drawIce(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(150, 200, 255, 0.8)'
  ctx.fillRect(x, y, 16, 16)

  ctx.strokeStyle = 'rgba(100, 160, 220, 0.5)'
  ctx.lineWidth = 1
  for (let i = 0; i < 5; i++) {
    const x1 = Math.floor(Math.random() * 16)
    const y1 = Math.floor(Math.random() * 16)
    const x2 = x1 + Math.floor(Math.random() * 8) - 4
    const y2 = y1 + Math.floor(Math.random() * 8) - 4
    ctx.beginPath()
    ctx.moveTo(x + x1, y + y1)
    ctx.lineTo(x + x2, y + y2)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.fillRect(x + 1, y + 1, 3, 3)
  ctx.fillRect(x + 10, y + 8, 2, 2)
}

export function drawSnowLeaves(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const baseColor = 'rgba(240, 248, 255, 0.9)'
  const leafColors = ['#f0f8ff', '#e8f4fc', '#dceef8', '#c8e0f0']
  const shadowColor = 'rgba(180, 200, 220, 0.3)'

  ctx.fillStyle = baseColor
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 50; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    ctx.fillStyle = leafColors[Math.floor(Math.random() * leafColors.length)]
    ctx.fillRect(x + bx, y + by, 1, 1)
  }

  for (let i = 0; i < 15; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    ctx.fillStyle = shadowColor
    ctx.fillRect(x + bx, y + by, 2, 2)
  }
}
