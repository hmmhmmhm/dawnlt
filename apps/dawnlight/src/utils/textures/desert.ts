export function drawCactusSide(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#558822'
  ctx.fillRect(x, y, 16, 16)

  ctx.fillStyle = '#447711'
  for (let bx = 2; bx < 16; bx += 4) {
    ctx.fillRect(x + bx, y, 2, 16)
  }

  ctx.fillStyle = '#ddddaa'
  for (let by = 2; by < 16; by += 4) {
    for (let bx = 1; bx < 16; bx += 4) {
      if (Math.random() > 0.5) {
        ctx.fillRect(x + bx, y + by, 1, 1)
      }
    }
  }
}

export function drawCactusTop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#558822'
  ctx.fillRect(x, y, 16, 16)

  ctx.fillStyle = '#447711'
  for (let bx = 2; bx < 16; bx += 4) {
    ctx.fillRect(x + bx, y, 2, 16)
  }
  for (let by = 2; by < 16; by += 4) {
    ctx.fillRect(x, y + by, 16, 2)
  }
}

export function drawPalmWoodSide(ctx: CanvasRenderingContext2D, x: number, y: number) {
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

export function drawPalmWoodTop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#d9c59e'
  ctx.fillRect(x, y, 16, 16)

  ctx.lineWidth = 2
  ctx.strokeStyle = '#8c734b'
  ctx.strokeRect(x + 1, y + 1, 14, 14)

  ctx.fillStyle = '#c4a875'
  ctx.fillRect(x + 6, y + 6, 4, 4)
}

export function drawPalmLeaves(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#7a9a45'
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 40; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    const colors = ['#6a8a35', '#8aaa55', '#5a7a25', '#9aba65']
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
    ctx.fillRect(x + bx, y + by, 1, 1)
  }

  ctx.fillStyle = '#4a6a20'
  for (let i = 0; i < 16; i++) {
    if (i % 4 === 0) ctx.fillRect(x + i, y + i, 2, 2)
    if (i % 4 === 2) ctx.fillRect(x + 15 - i, y + i, 2, 2)
  }
}

export function drawDeadBush(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const color1 = '#c9b080'
  const color2 = '#b8a070'
  const color3 = '#a89060'
  const color4 = '#987850'

  ctx.fillStyle = color1
  ctx.fillRect(x + 0, y + 6, 1, 2)
  ctx.fillStyle = color2
  ctx.fillRect(x + 0, y + 8, 1, 2)
  ctx.fillStyle = color3
  ctx.fillRect(x + 0, y + 10, 1, 2)

  ctx.fillStyle = color1
  ctx.fillRect(x + 2, y + 5, 1, 2)
  ctx.fillStyle = color2
  ctx.fillRect(x + 2, y + 7, 1, 2)
  ctx.fillStyle = color3
  ctx.fillRect(x + 2, y + 9, 1, 2)
  ctx.fillStyle = color4
  ctx.fillRect(x + 2, y + 11, 1, 1)

  ctx.fillStyle = color1
  ctx.fillRect(x + 4, y + 4, 1, 2)
  ctx.fillStyle = color2
  ctx.fillRect(x + 4, y + 6, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 4, y + 9, 1, 2)
  ctx.fillStyle = color4
  ctx.fillRect(x + 4, y + 11, 1, 2)

  ctx.fillStyle = color1
  ctx.fillRect(x + 6, y + 3, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 6, y + 6, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 6, y + 9, 1, 2)
  ctx.fillStyle = color4
  ctx.fillRect(x + 6, y + 11, 1, 2)

  ctx.fillStyle = color1
  ctx.fillRect(x + 8, y + 2, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 8, y + 5, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 8, y + 8, 1, 3)
  ctx.fillStyle = color4
  ctx.fillRect(x + 8, y + 11, 1, 2)

  ctx.fillStyle = color1
  ctx.fillRect(x + 10, y + 3, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 10, y + 6, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 10, y + 9, 1, 2)
  ctx.fillStyle = color4
  ctx.fillRect(x + 10, y + 11, 1, 2)

  ctx.fillStyle = color1
  ctx.fillRect(x + 12, y + 4, 1, 2)
  ctx.fillStyle = color2
  ctx.fillRect(x + 12, y + 6, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 12, y + 9, 1, 2)
  ctx.fillStyle = color4
  ctx.fillRect(x + 12, y + 11, 1, 2)

  ctx.fillStyle = color1
  ctx.fillRect(x + 14, y + 5, 1, 2)
  ctx.fillStyle = color2
  ctx.fillRect(x + 14, y + 7, 1, 2)
  ctx.fillStyle = color3
  ctx.fillRect(x + 14, y + 9, 1, 2)
  ctx.fillStyle = color4
  ctx.fillRect(x + 14, y + 11, 1, 1)

  ctx.fillStyle = color1
  ctx.fillRect(x + 15, y + 6, 1, 2)
  ctx.fillStyle = color2
  ctx.fillRect(x + 15, y + 8, 1, 2)
  ctx.fillStyle = color3
  ctx.fillRect(x + 15, y + 10, 1, 2)
}
