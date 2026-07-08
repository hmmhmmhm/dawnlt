export const FARMLAND_PALETTE = {
  dryBase: '#76502d',
  wetBase: '#8a6242',
  dryFurrow: '#5e3e24',
  wetFurrow: '#745139',
  dryClod: '#8f6337',
  wetClod: '#9b7654',
  wetShine: '#9fbdb8',
  dryWaterLine: '#9a7040',
  wetWaterLine: '#4f9daf',
} as const

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, py: number, color: string, w = 1, h = 1) {
  ctx.fillStyle = color
  ctx.fillRect(x + px, y + py, w, h)
}

export function drawFarmland(ctx: CanvasRenderingContext2D, x: number, y: number, wet: boolean, face = 'top') {
  ctx.clearRect(x, y, 16, 16)
  ctx.fillStyle = wet ? FARMLAND_PALETTE.wetBase : FARMLAND_PALETTE.dryBase
  ctx.fillRect(x, y, 16, 16)

  ctx.fillStyle = wet ? FARMLAND_PALETTE.wetFurrow : FARMLAND_PALETTE.dryFurrow
  const rows = face === 'top' ? [3, 8, 13] : [9, 13]
  for (const row of rows) {
    if (face === 'top') {
      ctx.fillRect(x + 1, y + row, 5, 1)
      ctx.fillRect(x + 8, y + row, 7, 1)
    } else {
      ctx.fillRect(x, y + row, 16, 2)
    }
  }

  ctx.fillStyle = wet ? FARMLAND_PALETTE.wetClod : FARMLAND_PALETTE.dryClod
  for (const [px, py, w] of [
    [2, 1, 2],
    [11, 2, 3],
    [5, 6, 2],
    [13, 7, 2],
    [1, 11, 3],
    [8, 14, 2],
  ] as const) {
    ctx.fillRect(x + px, y + py, w, 1)
  }

  if (face !== 'top') return
  if (wet) {
    ctx.fillStyle = FARMLAND_PALETTE.wetWaterLine
    for (const [px, py, w] of [
      [3, 4, 2],
      [10, 5, 2],
      [1, 9, 1],
      [6, 10, 3],
      [13, 12, 1],
      [4, 14, 2],
    ] as const) {
      ctx.fillRect(x + px, y + py, w, 1)
    }
    ctx.fillStyle = FARMLAND_PALETTE.wetShine
    ctx.fillRect(x + 4, y + 4, 1, 1)
    ctx.fillRect(x + 7, y + 9, 1, 1)
    ctx.fillRect(x + 13, y + 10, 1, 1)
  } else {
    ctx.fillStyle = FARMLAND_PALETTE.dryWaterLine
    ctx.fillRect(x + 2, y + 5, 4, 1)
    ctx.fillRect(x + 9, y + 12, 5, 1)
  }
}

export function drawWildWheat(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawCrop(ctx, x, y, '#6f8c31', '#c99732', '#f0cc63', 4)
}

export function drawWildRice(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawCrop(ctx, x, y, '#4d9f4f', '#c9df91', '#f2f0c8', 4)
}

export function drawWheatCrop(ctx: CanvasRenderingContext2D, x: number, y: number, stage: 1 | 2 | 3 | 4) {
  drawCrop(ctx, x, y, stage === 1 ? '#6fb34b' : '#7f993d', stage >= 3 ? '#d5a43a' : '#b7c752', '#f0cf68', stage)
}

export function drawRiceCrop(ctx: CanvasRenderingContext2D, x: number, y: number, stage: 1 | 2 | 3 | 4) {
  drawCrop(ctx, x, y, '#4fb65d', stage >= 3 ? '#dce99c' : '#91d86f', '#f4f0cf', stage)
}

function drawCrop(ctx: CanvasRenderingContext2D, x: number, y: number, stem: string, head: string, light: string, stage: 1 | 2 | 3 | 4) {
  ctx.clearRect(x, y, 16, 16)
  const height = stage === 1 ? 8 : stage === 2 ? 11 : stage === 3 ? 13 : 15
  const stems = stage === 1 ? [6, 9] : stage === 2 ? [4, 7, 10] : stage === 3 ? [3, 6, 9, 12] : [2, 5, 8, 11, 14]
  for (const sx of stems) {
    dot(ctx, x, y, sx, 16 - height, stem, 1, height)
    if (stage >= 2) {
      dot(ctx, x, y, sx - 1, 16 - height + 2, stem)
      dot(ctx, x, y, sx + 1, 16 - height + 4, stem)
    }
    if (stage >= 3) {
      dot(ctx, x, y, sx - 1, 1, head, 3, 5)
      dot(ctx, x, y, sx, 1, light, 1, 3)
    }
  }
}

export function drawWheatSeeds(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawSeedPile(ctx, x, y, '#8f6427', '#c18d3f')
}

export function drawRiceSeeds(ctx: CanvasRenderingContext2D, x: number, y: number) {
  drawSeedPile(ctx, x, y, '#cfc68d', '#f1ecc6')
}

function drawSeedPile(ctx: CanvasRenderingContext2D, x: number, y: number, dark: string, light: string) {
  ctx.clearRect(x, y, 16, 16)
  const seeds = [
    [5, 6],
    [8, 5],
    [10, 8],
    [4, 10],
    [7, 11],
    [11, 12],
  ]
  for (const [sx, sy] of seeds) {
    dot(ctx, x, y, sx, sy, dark, 2, 2)
    dot(ctx, x, y, sx, sy, light)
  }
}

export function drawWheatItem(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)
  for (const sx of [4, 7, 10]) {
    dot(ctx, x, y, sx, 5, '#7f6a2b', 1, 9)
    dot(ctx, x, y, sx - 1, 2, '#d6a33d', 3, 5)
    dot(ctx, x, y, sx, 2, '#f4cd63', 1, 4)
  }
}

export function drawRiceItem(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)
  ctx.fillStyle = '#efeccf'
  ctx.fillRect(x + 4, y + 6, 8, 5)
  ctx.fillStyle = '#fffbe7'
  ctx.fillRect(x + 5, y + 5, 6, 1)
  ctx.fillRect(x + 5, y + 7, 2, 1)
  ctx.fillStyle = '#c9c38f'
  ctx.fillRect(x + 4, y + 10, 8, 1)
}

export function drawWoodenHoe(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)
  ctx.fillStyle = '#7a4b25'
  for (let i = 0; i < 10; i++) ctx.fillRect(x + 4 + i, y + 12 - i, 2, 2)
  ctx.fillStyle = '#b3834a'
  ctx.fillRect(x + 4, y + 3, 9, 2)
  ctx.fillRect(x + 11, y + 4, 2, 3)
  ctx.fillStyle = '#d0a06a'
  ctx.fillRect(x + 5, y + 3, 6, 1)
}

export function drawBread(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)
  ctx.fillStyle = '#9d5f26'
  ctx.fillRect(x + 3, y + 7, 10, 5)
  ctx.fillRect(x + 4, y + 5, 8, 2)
  ctx.fillStyle = '#c9823b'
  ctx.fillRect(x + 4, y + 6, 8, 4)
  ctx.fillStyle = '#e8b36b'
  ctx.fillRect(x + 5, y + 6, 2, 1)
  ctx.fillRect(x + 8, y + 5, 2, 1)
}

export function drawRiceBowl(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)
  ctx.fillStyle = '#f3f0d8'
  ctx.fillRect(x + 4, y + 4, 8, 4)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + 5, y + 3, 6, 2)
  ctx.fillStyle = '#5a8fb8'
  ctx.fillRect(x + 3, y + 8, 10, 3)
  ctx.fillStyle = '#315d82'
  ctx.fillRect(x + 4, y + 11, 8, 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + 5, y + 9, 6, 1)
}

export function drawWoodenBucket(ctx: CanvasRenderingContext2D, x: number, y: number, filled = false) {
  ctx.clearRect(x, y, 16, 16)
  ctx.fillStyle = '#5f371b'
  ctx.fillRect(x + 3, y + 6, 10, 7)
  ctx.fillStyle = '#9a6732'
  ctx.fillRect(x + 4, y + 5, 8, 8)
  ctx.fillStyle = '#c08a4d'
  ctx.fillRect(x + 5, y + 6, 2, 6)
  ctx.fillRect(x + 9, y + 6, 2, 6)
  ctx.fillStyle = '#2e3340'
  ctx.fillRect(x + 3, y + 6, 10, 1)
  ctx.fillRect(x + 3, y + 11, 10, 1)
  ctx.fillStyle = '#aab4bf'
  ctx.fillRect(x + 5, y + 3, 6, 1)
  ctx.fillRect(x + 4, y + 4, 1, 2)
  ctx.fillRect(x + 11, y + 4, 1, 2)
  if (!filled) return
  ctx.fillStyle = '#2f8fc4'
  ctx.fillRect(x + 5, y + 6, 6, 2)
  ctx.fillStyle = '#8fe5ff'
  ctx.fillRect(x + 6, y + 6, 4, 1)
}

export function drawFlourSack(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)
  ctx.fillStyle = '#c8d8de'
  ctx.fillRect(x + 5, y + 3, 6, 2)
  ctx.fillStyle = '#dfe8ea'
  ctx.fillRect(x + 4, y + 5, 8, 8)
  ctx.fillStyle = '#b8c8ce'
  ctx.fillRect(x + 3, y + 7, 10, 5)
  ctx.fillStyle = '#f6f0da'
  ctx.fillRect(x + 5, y + 6, 6, 4)
  ctx.fillStyle = '#8a6f4b'
  ctx.fillRect(x + 4, y + 5, 8, 1)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + 6, y + 6, 3, 1)
}

export function drawDough(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)
  ctx.fillStyle = '#c8945c'
  ctx.fillRect(x + 4, y + 6, 8, 5)
  ctx.fillRect(x + 5, y + 5, 6, 7)
  ctx.fillStyle = '#e2bb82'
  ctx.fillRect(x + 5, y + 5, 6, 5)
  ctx.fillStyle = '#f0d4a3'
  ctx.fillRect(x + 6, y + 6, 3, 1)
  ctx.fillStyle = '#b9834d'
  ctx.fillRect(x + 6, y + 10, 5, 1)
}
