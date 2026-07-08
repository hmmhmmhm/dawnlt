export function drawOreBase(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#7f7f7f'
  ctx.fillRect(x, y, 16, 16)

  for (let i = 0; i < 40; i++) {
    const bx = Math.floor(Math.random() * 16)
    const by = Math.floor(Math.random() * 16)
    const shade = Math.floor(Math.random() * 30) + 100
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`
    ctx.fillRect(x + bx, y + by, 1, 1)
  }
}

export function drawCoalOre(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawOreBase(ctx, x, y)
  const oreSpots: [number, number][] = [
    [2, 3],
    [5, 7],
    [9, 2],
    [12, 9],
    [6, 12],
    [3, 10],
    [10, 5],
    [13, 13],
  ]
  oreSpots.forEach(([ox, oy]) => {
    ctx.fillStyle = '#2a2a2a'
    ctx.fillRect(x + ox, y + oy, 2, 2)
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(x + ox, y + oy, 1, 1)
  })
}

export function drawIronOre(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawOreBase(ctx, x, y)
  const oreSpots: [number, number][] = [
    [2, 3],
    [6, 8],
    [10, 2],
    [13, 10],
    [4, 12],
    [8, 5],
  ]
  oreSpots.forEach(([ox, oy]) => {
    ctx.fillStyle = '#d4a574'
    ctx.fillRect(x + ox, y + oy, 2, 2)
    ctx.fillStyle = '#e8c4a4'
    ctx.fillRect(x + ox, y + oy, 1, 1)
  })
}

export function drawGoldOre(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawOreBase(ctx, x, y)
  const oreSpots: [number, number][] = [
    [3, 4],
    [7, 9],
    [11, 3],
    [5, 13],
    [12, 11],
  ]
  oreSpots.forEach(([ox, oy]) => {
    ctx.fillStyle = '#ffd700'
    ctx.fillRect(x + ox, y + oy, 2, 2)
    ctx.fillStyle = '#ffec80'
    ctx.fillRect(x + ox, y + oy, 1, 1)
  })
}

export function drawDiamondOre(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawOreBase(ctx, x, y)
  const oreSpots: [number, number][] = [
    [3, 5],
    [8, 10],
    [12, 4],
    [6, 13],
    [2, 9],
  ]
  oreSpots.forEach(([ox, oy]) => {
    ctx.fillStyle = '#4aedd9'
    ctx.fillRect(x + ox, y + oy, 2, 2)
    ctx.fillStyle = '#7df9ec'
    ctx.fillRect(x + ox, y + oy, 1, 1)
  })
}
