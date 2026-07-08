export function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.clearRect(x, y, 16, 16)

  const isYellow = color === '#ffff00'

  if (isYellow) {
    drawTulip(ctx, x, y)
  } else {
    drawRose(ctx, x, y)
  }
}

function drawRose(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#1a4a1a'
  ctx.fillRect(x + 7, y + 0, 2, 2)
  ctx.fillStyle = '#2d5a2d'
  ctx.fillRect(x + 7, y + 2, 2, 2)
  ctx.fillStyle = '#3d7a3d'
  ctx.fillRect(x + 7, y + 1, 1, 3)

  ctx.fillStyle = '#1d5a1d'
  ctx.fillRect(x + 4, y + 1, 3, 1)
  ctx.fillRect(x + 3, y + 2, 3, 1)
  ctx.fillRect(x + 2, y + 3, 3, 1)
  ctx.fillStyle = '#2d7a2d'
  ctx.fillRect(x + 5, y + 1, 1, 1)
  ctx.fillRect(x + 4, y + 2, 1, 1)
  ctx.fillStyle = '#4d9a4d'
  ctx.fillRect(x + 3, y + 2, 1, 1)

  ctx.fillStyle = '#1d5a1d'
  ctx.fillRect(x + 9, y + 2, 3, 1)
  ctx.fillRect(x + 10, y + 3, 3, 1)
  ctx.fillRect(x + 11, y + 4, 3, 1)
  ctx.fillStyle = '#2d7a2d'
  ctx.fillRect(x + 10, y + 2, 1, 1)
  ctx.fillRect(x + 11, y + 3, 1, 1)
  ctx.fillStyle = '#4d9a4d'
  ctx.fillRect(x + 12, y + 3, 1, 1)

  ctx.fillStyle = '#cc3333'
  ctx.fillRect(x + 1, y + 7, 2, 4)
  ctx.fillRect(x + 13, y + 7, 2, 4)
  ctx.fillRect(x + 3, y + 13, 10, 2)
  ctx.fillRect(x + 4, y + 15, 8, 1)

  ctx.fillStyle = '#dd4444'
  ctx.fillRect(x + 2, y + 6, 12, 1)
  ctx.fillRect(x + 2, y + 7, 2, 4)
  ctx.fillRect(x + 12, y + 7, 2, 4)
  ctx.fillRect(x + 3, y + 11, 10, 2)
  ctx.fillRect(x + 4, y + 5, 8, 1)

  ctx.fillStyle = '#ee5555'
  ctx.fillRect(x + 3, y + 6, 10, 1)
  ctx.fillRect(x + 3, y + 7, 2, 3)
  ctx.fillRect(x + 11, y + 7, 2, 3)
  ctx.fillRect(x + 4, y + 10, 8, 2)

  ctx.fillStyle = '#ff6666'
  ctx.fillRect(x + 4, y + 6, 8, 1)
  ctx.fillRect(x + 4, y + 7, 8, 1)
  ctx.fillRect(x + 5, y + 8, 6, 2)
  ctx.fillRect(x + 5, y + 10, 6, 1)

  ctx.fillStyle = '#ff7777'
  ctx.fillRect(x + 5, y + 7, 6, 1)
  ctx.fillRect(x + 6, y + 8, 4, 2)
  ctx.fillRect(x + 6, y + 10, 4, 1)

  ctx.fillStyle = '#ff8888'
  ctx.fillRect(x + 6, y + 7, 4, 1)
  ctx.fillRect(x + 7, y + 8, 2, 2)

  ctx.fillStyle = '#ff9999'
  ctx.fillRect(x + 7, y + 7, 2, 1)
  ctx.fillRect(x + 7, y + 8, 2, 1)

  ctx.fillStyle = '#ffaaaa'
  ctx.fillRect(x + 7, y + 8, 1, 1)

  ctx.fillStyle = '#ffcccc'
  ctx.fillRect(x + 8, y + 7, 1, 1)
  ctx.fillRect(x + 5, y + 6, 1, 1)
  ctx.fillRect(x + 10, y + 6, 1, 1)
  ctx.fillRect(x + 7, y + 5, 2, 1)

  ctx.fillStyle = '#aa2222'
  ctx.fillRect(x + 2, y + 10, 1, 2)
  ctx.fillRect(x + 13, y + 10, 1, 2)

  ctx.fillStyle = '#bb3333'
  ctx.fillRect(x + 4, y + 11, 1, 1)
  ctx.fillRect(x + 11, y + 11, 1, 1)
}

function drawTulip(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#1a4a1a'
  ctx.fillRect(x + 7, y + 0, 2, 2)
  ctx.fillStyle = '#2d5a2d'
  ctx.fillRect(x + 7, y + 2, 2, 2)
  ctx.fillStyle = '#3d7a3d'
  ctx.fillRect(x + 7, y + 1, 1, 3)

  ctx.fillStyle = '#1d5a1d'
  ctx.fillRect(x + 4, y + 0, 3, 1)
  ctx.fillRect(x + 3, y + 1, 3, 1)
  ctx.fillRect(x + 2, y + 2, 3, 1)
  ctx.fillRect(x + 1, y + 3, 3, 1)
  ctx.fillStyle = '#2d7a2d'
  ctx.fillRect(x + 5, y + 0, 1, 1)
  ctx.fillRect(x + 4, y + 1, 1, 1)
  ctx.fillRect(x + 3, y + 2, 1, 1)
  ctx.fillStyle = '#4d9a4d'
  ctx.fillRect(x + 2, y + 2, 1, 1)

  ctx.fillStyle = '#1d5a1d'
  ctx.fillRect(x + 9, y + 1, 3, 1)
  ctx.fillRect(x + 10, y + 2, 3, 1)
  ctx.fillRect(x + 11, y + 3, 3, 1)
  ctx.fillRect(x + 12, y + 4, 3, 1)
  ctx.fillStyle = '#2d7a2d'
  ctx.fillRect(x + 10, y + 1, 1, 1)
  ctx.fillRect(x + 11, y + 2, 1, 1)
  ctx.fillRect(x + 12, y + 3, 1, 1)
  ctx.fillStyle = '#4d9a4d'
  ctx.fillRect(x + 13, y + 3, 1, 1)

  ctx.fillStyle = '#ddaa00'
  ctx.fillRect(x + 1, y + 6, 2, 5)
  ctx.fillRect(x + 13, y + 6, 2, 5)
  ctx.fillRect(x + 2, y + 11, 12, 1)

  ctx.fillStyle = '#eecc00'
  ctx.fillRect(x + 2, y + 5, 2, 6)
  ctx.fillRect(x + 3, y + 11, 2, 2)
  ctx.fillRect(x + 4, y + 13, 1, 2)
  ctx.fillRect(x + 12, y + 5, 2, 6)
  ctx.fillRect(x + 11, y + 11, 2, 2)
  ctx.fillRect(x + 11, y + 13, 1, 2)

  ctx.fillStyle = '#ffdd00'
  ctx.fillRect(x + 3, y + 5, 2, 5)
  ctx.fillRect(x + 4, y + 10, 2, 3)
  ctx.fillRect(x + 5, y + 13, 1, 2)
  ctx.fillRect(x + 11, y + 5, 2, 5)
  ctx.fillRect(x + 10, y + 10, 2, 3)
  ctx.fillRect(x + 10, y + 13, 1, 2)

  ctx.fillStyle = '#ffee33'
  ctx.fillRect(x + 5, y + 4, 6, 1)
  ctx.fillRect(x + 4, y + 5, 8, 2)
  ctx.fillRect(x + 5, y + 7, 6, 3)
  ctx.fillRect(x + 6, y + 10, 4, 3)
  ctx.fillRect(x + 7, y + 13, 2, 2)

  ctx.fillStyle = '#ffff55'
  ctx.fillRect(x + 5, y + 5, 6, 1)
  ctx.fillRect(x + 6, y + 6, 4, 2)
  ctx.fillRect(x + 6, y + 8, 4, 2)
  ctx.fillRect(x + 7, y + 10, 2, 2)

  ctx.fillStyle = '#ffff77'
  ctx.fillRect(x + 6, y + 5, 4, 1)
  ctx.fillRect(x + 7, y + 6, 2, 3)

  ctx.fillStyle = '#ffff99'
  ctx.fillRect(x + 7, y + 6, 2, 1)
  ctx.fillRect(x + 7, y + 7, 1, 2)

  ctx.fillStyle = '#ffffcc'
  ctx.fillRect(x + 7, y + 7, 1, 1)
  ctx.fillRect(x + 8, y + 6, 1, 1)

  ctx.fillStyle = '#ffffdd'
  ctx.fillRect(x + 6, y + 4, 1, 1)
  ctx.fillRect(x + 9, y + 4, 1, 1)
  ctx.fillRect(x + 3, y + 5, 1, 1)
  ctx.fillRect(x + 12, y + 5, 1, 1)
  ctx.fillRect(x + 7, y + 5, 2, 1)

  ctx.fillStyle = '#ffcc44'
  ctx.fillRect(x + 6, y + 12, 4, 1)
  ctx.fillRect(x + 7, y + 13, 2, 1)
  ctx.fillRect(x + 7, y + 14, 2, 1)

  ctx.fillStyle = '#ccaa00'
  ctx.fillRect(x + 2, y + 9, 1, 3)
  ctx.fillRect(x + 13, y + 9, 1, 3)
}

export function drawWinterFlower(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  ctx.fillStyle = '#77aacc'
  ctx.fillRect(x + 7, y + 0, 2, 5)
  ctx.fillStyle = '#99ccdd'
  ctx.fillRect(x + 7, y + 1, 1, 4)

  ctx.fillStyle = '#88bbdd'
  ctx.fillRect(x + 6, y + 5, 2, 1)
  ctx.fillRect(x + 5, y + 6, 2, 1)

  ctx.fillStyle = '#88bbcc'
  ctx.fillRect(x + 5, y + 1, 2, 1)
  ctx.fillRect(x + 4, y + 2, 2, 1)
  ctx.fillStyle = '#aaddee'
  ctx.fillRect(x + 9, y + 2, 2, 1)
  ctx.fillRect(x + 10, y + 3, 2, 1)

  ctx.fillStyle = '#ddeeff'
  ctx.fillRect(x + 2, y + 8, 3, 4)
  ctx.fillRect(x + 11, y + 8, 3, 4)
  ctx.fillRect(x + 4, y + 12, 8, 2)
  ctx.fillRect(x + 5, y + 14, 6, 1)

  ctx.fillStyle = '#eef5ff'
  ctx.fillRect(x + 4, y + 7, 8, 1)
  ctx.fillRect(x + 3, y + 8, 10, 1)
  ctx.fillRect(x + 4, y + 9, 8, 2)
  ctx.fillRect(x + 5, y + 11, 6, 2)

  ctx.fillStyle = '#f5faff'
  ctx.fillRect(x + 5, y + 8, 6, 1)
  ctx.fillRect(x + 6, y + 9, 4, 2)
  ctx.fillRect(x + 6, y + 11, 4, 1)

  ctx.fillStyle = '#f0f8e8'
  ctx.fillRect(x + 7, y + 9, 2, 2)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + 6, y + 8, 1, 1)
  ctx.fillRect(x + 9, y + 8, 1, 1)
  ctx.fillRect(x + 7, y + 10, 1, 1)
  ctx.fillRect(x + 8, y + 9, 1, 1)
  ctx.fillRect(x + 7, y + 8, 1, 1)
  ctx.fillRect(x + 5, y + 7, 1, 1)
  ctx.fillRect(x + 10, y + 7, 1, 1)
  ctx.fillRect(x + 4, y + 9, 1, 1)
  ctx.fillRect(x + 11, y + 9, 1, 1)
  ctx.fillRect(x + 7, y + 13, 1, 1)
  ctx.fillRect(x + 3, y + 8, 1, 1)
  ctx.fillRect(x + 12, y + 8, 1, 1)
  ctx.fillRect(x + 6, y + 12, 1, 1)
  ctx.fillRect(x + 9, y + 12, 1, 1)

  ctx.fillStyle = '#c8d8e8'
  ctx.fillRect(x + 3, y + 11, 1, 2)
  ctx.fillRect(x + 12, y + 11, 1, 2)
}
