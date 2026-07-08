export function drawCobblestone(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#6a6a6a'
  ctx.fillRect(x, y, 16, 16)

  const stones = [
    { x: 0, y: 0, w: 6, h: 5 },
    { x: 6, y: 0, w: 5, h: 6 },
    { x: 11, y: 0, w: 5, h: 5 },
    { x: 0, y: 5, w: 5, h: 6 },
    { x: 5, y: 5, w: 6, h: 5 },
    { x: 11, y: 5, w: 5, h: 6 },
    { x: 0, y: 11, w: 6, h: 5 },
    { x: 6, y: 10, w: 5, h: 6 },
    { x: 11, y: 11, w: 5, h: 5 },
  ]

  stones.forEach((stone) => {
    const shade = Math.floor(Math.random() * 40) + 80
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`
    ctx.fillRect(x + stone.x, y + stone.y, stone.w - 1, stone.h - 1)
  })

  ctx.fillStyle = '#4a4a4a'
  stones.forEach((stone) => {
    ctx.fillRect(x + stone.x + stone.w - 1, y + stone.y, 1, stone.h)
    ctx.fillRect(x + stone.x, y + stone.y + stone.h - 1, stone.w, 1)
  })
}

export function drawPlanks(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#b08840'
  ctx.fillRect(x, y, 16, 16)

  for (let by = 0; by < 16; by += 4) {
    const offset = (by / 4) % 2 === 0 ? 0 : 8
    for (let bx = 0; bx < 16; bx++) {
      const plankX = (bx + offset) % 16
      const shade = Math.sin(plankX * 0.5) * 15
      ctx.fillStyle = `rgb(${176 + shade}, ${136 + shade}, ${64 + shade})`
      ctx.fillRect(x + bx, y + by, 1, 3)
    }
    ctx.fillStyle = '#8a6830'
    ctx.fillRect(x, y + by + 3, 16, 1)
  }

  for (let i = 0; i < 20; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    ctx.fillStyle = Math.random() > 0.5 ? '#c09850' : '#9a7838'
    ctx.fillRect(x + bx, y + by, 1, 1)
  }
}

export function drawCraftingTableTop(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawPlanks(ctx, x, y)

  ctx.fillStyle = '#5a4830'
  ctx.fillRect(x + 1, y + 1, 14, 14)

  ctx.fillStyle = '#8a7050'
  ctx.fillRect(x + 2, y + 2, 12, 12)

  ctx.fillStyle = '#6a5840'
  for (let bx = 2; bx < 14; bx += 4) {
    for (let by = 2; by < 14; by += 4) {
      ctx.fillRect(x + bx, y + by, 3, 3)
    }
  }

  ctx.fillStyle = '#4a3828'
  ctx.fillRect(x + 5, y + 2, 1, 12)
  ctx.fillRect(x + 10, y + 2, 1, 12)
  ctx.fillRect(x + 2, y + 5, 12, 1)
  ctx.fillRect(x + 2, y + 10, 12, 1)
}

export function drawCraftingTableSide(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawPlanks(ctx, x, y)

  ctx.fillStyle = '#5a4830'
  ctx.fillRect(x, y, 16, 3)

  ctx.fillStyle = '#7a6848'
  for (let bx = 1; bx < 15; bx += 2) {
    ctx.fillRect(x + bx, y + 1, 1, 1)
  }

  ctx.fillStyle = '#6a5838'
  ctx.fillRect(x + 3, y + 5, 4, 7)
  ctx.fillRect(x + 9, y + 5, 4, 7)

  ctx.fillStyle = '#5a4828'
  ctx.fillRect(x + 5, y + 6, 1, 5)
  ctx.fillRect(x + 11, y + 6, 1, 5)
}

export function drawBasket(ctx: CanvasRenderingContext2D, x: number, y: number, appleCount = 0) {
  ctx.clearRect(x, y, 16, 16)

  ctx.fillStyle = '#5a351c'
  ctx.fillRect(x + 5, y + 2, 6, 1)
  ctx.fillRect(x + 4, y + 3, 1, 3)
  ctx.fillRect(x + 11, y + 3, 1, 3)

  ctx.fillStyle = '#8f5a2a'
  ctx.fillRect(x + 3, y + 6, 10, 7)
  ctx.fillRect(x + 4, y + 13, 8, 1)

  ctx.fillStyle = '#b87936'
  ctx.fillRect(x + 4, y + 6, 8, 1)
  ctx.fillRect(x + 4, y + 9, 8, 1)
  ctx.fillRect(x + 4, y + 12, 8, 1)

  ctx.fillStyle = '#6f421f'
  ctx.fillRect(x + 3, y + 7, 1, 6)
  ctx.fillRect(x + 12, y + 7, 1, 6)
  ctx.fillRect(x + 6, y + 6, 1, 7)
  ctx.fillRect(x + 9, y + 6, 1, 7)

  const applePositions = [
    [5, 6],
    [8, 5],
    [10, 7],
    [6, 8],
  ]
  for (let i = 0; i < Math.min(4, Math.max(0, Math.floor(appleCount))); i++) {
    const [ax, ay] = applePositions[i]
    ctx.fillStyle = '#c91f2d'
    ctx.fillRect(x + ax, y + ay, 3, 3)
    ctx.fillStyle = '#ff5963'
    ctx.fillRect(x + ax + 1, y + ay, 1, 1)
  }
}

export function drawBedrock(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 100; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    const shade = Math.floor(Math.random() * 30) + 20
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`
    ctx.fillRect(x + bx, y + by, 1, 1)
  }

  for (let i = 0; i < 10; i++) {
    const bx = Math.floor(Math.random() * 14)
    const by = Math.floor(Math.random() * 14)
    ctx.fillStyle = '#3a3a3a'
    ctx.fillRect(x + bx, y + by, 2, 2)
  }
}

export function drawGlass(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(200, 220, 255, 0.3)'
  ctx.fillRect(x, y, 16, 16)

  ctx.strokeStyle = 'rgba(150, 180, 210, 0.8)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, 15, 15)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.fillRect(x + 1, y + 1, 4, 4)

  ctx.fillStyle = 'rgba(100, 150, 200, 0.1)'
  ctx.fillRect(x + 4, y + 4, 8, 8)
}

export function drawBrick(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#8B4513'
  ctx.fillRect(x, y, 16, 16)

  const brickPattern = [
    { x: 0, y: 0, w: 7, h: 3 },
    { x: 8, y: 0, w: 8, h: 3 },
    { x: -4, y: 4, w: 8, h: 3 },
    { x: 4, y: 4, w: 8, h: 3 },
    { x: 12, y: 4, w: 4, h: 3 },
    { x: 0, y: 8, w: 7, h: 3 },
    { x: 8, y: 8, w: 8, h: 3 },
    { x: -4, y: 12, w: 8, h: 3 },
    { x: 4, y: 12, w: 8, h: 3 },
    { x: 12, y: 12, w: 4, h: 4 },
  ]

  brickPattern.forEach((brick) => {
    const shade = Math.floor(Math.random() * 30) - 15
    ctx.fillStyle = `rgb(${159 + shade}, ${82 + shade}, ${45 + shade})`
    ctx.fillRect(x + brick.x, y + brick.y, brick.w - 1, brick.h - 1)
  })

  ctx.fillStyle = '#a0a0a0'
  for (let by = 3; by < 16; by += 4) {
    ctx.fillRect(x, y + by, 16, 1)
  }
  ctx.fillRect(x + 7, y, 1, 4)
  ctx.fillRect(x + 3, y + 4, 1, 4)
  ctx.fillRect(x + 11, y + 4, 1, 4)
  ctx.fillRect(x + 7, y + 8, 1, 4)
  ctx.fillRect(x + 3, y + 12, 1, 4)
  ctx.fillRect(x + 11, y + 12, 1, 4)
}
