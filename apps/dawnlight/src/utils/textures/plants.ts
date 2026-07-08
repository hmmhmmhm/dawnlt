import { getCurrentSeason } from './constants'

// Re-export flowers from separate module
export { drawFlower, drawWinterFlower } from './flowers'

export function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const currentSeason = getCurrentSeason()
  let color1 = '#3a5a20'
  let color2 = '#4a7a28'
  let color3 = '#5a9a30'
  let color4 = '#6aaa38'

  if (currentSeason === 'fall') {
    color1 = '#5a4a18'
    color2 = '#7a6a28'
    color3 = '#9a8a38'
    color4 = '#baaa48'
  } else if (currentSeason === 'winter') {
    color1 = '#7090a0'
    color2 = '#90b0c0'
    color3 = '#a8c8d8'
    color4 = '#c0e0f0'
  }

  // Stem 1 - far left
  ctx.fillStyle = color1
  ctx.fillRect(x + 0, y + 5, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 0, y + 8, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 0, y + 11, 1, 3)
  ctx.fillStyle = color4
  ctx.fillRect(x + 0, y + 14, 1, 2)

  // Stem 2
  ctx.fillStyle = color1
  ctx.fillRect(x + 2, y + 3, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 2, y + 6, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 2, y + 9, 1, 3)
  ctx.fillStyle = color4
  ctx.fillRect(x + 2, y + 12, 1, 2)

  // Stem 3
  ctx.fillStyle = color1
  ctx.fillRect(x + 4, y + 1, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 4, y + 4, 1, 4)
  ctx.fillStyle = color3
  ctx.fillRect(x + 4, y + 8, 1, 4)
  ctx.fillStyle = color4
  ctx.fillRect(x + 4, y + 12, 1, 3)

  // Stem 4
  ctx.fillStyle = color1
  ctx.fillRect(x + 6, y + 0, 1, 4)
  ctx.fillStyle = color2
  ctx.fillRect(x + 6, y + 4, 1, 4)
  ctx.fillStyle = color3
  ctx.fillRect(x + 6, y + 8, 1, 4)
  ctx.fillStyle = color4
  ctx.fillRect(x + 6, y + 12, 1, 4)

  // Stem 5 - center (tallest)
  ctx.fillStyle = color1
  ctx.fillRect(x + 8, y + 0, 1, 4)
  ctx.fillStyle = color2
  ctx.fillRect(x + 8, y + 4, 1, 4)
  ctx.fillStyle = color3
  ctx.fillRect(x + 8, y + 8, 1, 4)
  ctx.fillStyle = color4
  ctx.fillRect(x + 8, y + 12, 1, 4)

  // Stem 6
  ctx.fillStyle = color1
  ctx.fillRect(x + 10, y + 0, 1, 4)
  ctx.fillStyle = color2
  ctx.fillRect(x + 10, y + 4, 1, 4)
  ctx.fillStyle = color3
  ctx.fillRect(x + 10, y + 8, 1, 4)
  ctx.fillStyle = color4
  ctx.fillRect(x + 10, y + 12, 1, 4)

  // Stem 7
  ctx.fillStyle = color1
  ctx.fillRect(x + 12, y + 1, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 12, y + 4, 1, 4)
  ctx.fillStyle = color3
  ctx.fillRect(x + 12, y + 8, 1, 4)
  ctx.fillStyle = color4
  ctx.fillRect(x + 12, y + 12, 1, 3)

  // Stem 8
  ctx.fillStyle = color1
  ctx.fillRect(x + 14, y + 3, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 14, y + 6, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 14, y + 9, 1, 3)
  ctx.fillStyle = color4
  ctx.fillRect(x + 14, y + 12, 1, 2)

  // Stem 9 - far right
  ctx.fillStyle = color1
  ctx.fillRect(x + 15, y + 5, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 15, y + 8, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 15, y + 11, 1, 3)
  ctx.fillStyle = color4
  ctx.fillRect(x + 15, y + 14, 1, 2)
}

export function drawSnowBush(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const color1 = '#7090a0'
  const color2 = '#90b0c0'
  const color3 = '#a8c8d8'
  const snowColor = '#ffffff'

  ctx.fillStyle = color1
  ctx.fillRect(x + 0, y + 5, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 0, y + 8, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 0, y + 11, 1, 2)
  ctx.fillStyle = snowColor
  ctx.fillRect(x + 0, y + 13, 1, 3)

  ctx.fillStyle = color1
  ctx.fillRect(x + 2, y + 3, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 2, y + 6, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 2, y + 9, 1, 2)
  ctx.fillStyle = snowColor
  ctx.fillRect(x + 2, y + 11, 1, 3)

  ctx.fillStyle = color1
  ctx.fillRect(x + 4, y + 1, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 4, y + 4, 1, 4)
  ctx.fillStyle = color3
  ctx.fillRect(x + 4, y + 8, 1, 3)
  ctx.fillStyle = snowColor
  ctx.fillRect(x + 4, y + 11, 1, 4)

  ctx.fillStyle = color1
  ctx.fillRect(x + 6, y + 0, 1, 4)
  ctx.fillStyle = color2
  ctx.fillRect(x + 6, y + 4, 1, 4)
  ctx.fillStyle = color3
  ctx.fillRect(x + 6, y + 8, 1, 3)
  ctx.fillStyle = snowColor
  ctx.fillRect(x + 6, y + 11, 1, 5)

  ctx.fillStyle = color1
  ctx.fillRect(x + 8, y + 0, 1, 4)
  ctx.fillStyle = color2
  ctx.fillRect(x + 8, y + 4, 1, 4)
  ctx.fillStyle = color3
  ctx.fillRect(x + 8, y + 8, 1, 3)
  ctx.fillStyle = snowColor
  ctx.fillRect(x + 8, y + 11, 1, 5)

  ctx.fillStyle = color1
  ctx.fillRect(x + 10, y + 0, 1, 4)
  ctx.fillStyle = color2
  ctx.fillRect(x + 10, y + 4, 1, 4)
  ctx.fillStyle = color3
  ctx.fillRect(x + 10, y + 8, 1, 3)
  ctx.fillStyle = snowColor
  ctx.fillRect(x + 10, y + 11, 1, 5)

  ctx.fillStyle = color1
  ctx.fillRect(x + 12, y + 1, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 12, y + 4, 1, 4)
  ctx.fillStyle = color3
  ctx.fillRect(x + 12, y + 8, 1, 3)
  ctx.fillStyle = snowColor
  ctx.fillRect(x + 12, y + 11, 1, 4)

  ctx.fillStyle = color1
  ctx.fillRect(x + 14, y + 3, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 14, y + 6, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 14, y + 9, 1, 2)
  ctx.fillStyle = snowColor
  ctx.fillRect(x + 14, y + 11, 1, 3)

  ctx.fillStyle = color1
  ctx.fillRect(x + 15, y + 5, 1, 3)
  ctx.fillStyle = color2
  ctx.fillRect(x + 15, y + 8, 1, 3)
  ctx.fillStyle = color3
  ctx.fillRect(x + 15, y + 11, 1, 2)
  ctx.fillStyle = snowColor
  ctx.fillRect(x + 15, y + 13, 1, 3)
}

export function drawBamboo(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  const stalkColor = '#7cb342'
  const darkColor = '#5a8a28'
  const lightColor = '#9acd5a'
  const nodeColor = '#4a7a18'

  ctx.fillStyle = stalkColor
  ctx.fillRect(x + 5, y, 6, 16)

  ctx.fillStyle = darkColor
  ctx.fillRect(x + 5, y, 1, 16)

  ctx.fillStyle = lightColor
  ctx.fillRect(x + 10, y, 1, 16)

  ctx.fillStyle = nodeColor
  ctx.fillRect(x + 4, y + 3, 8, 2)
  ctx.fillRect(x + 4, y + 10, 8, 2)

  ctx.fillStyle = '#8bc34a'
  ctx.fillRect(x + 5, y + 3, 6, 1)
  ctx.fillRect(x + 5, y + 10, 6, 1)

  ctx.fillStyle = '#4caf50'
  ctx.fillRect(x + 2, y + 2, 3, 1)
  ctx.fillRect(x + 1, y + 1, 2, 1)
  ctx.fillRect(x + 11, y + 9, 3, 1)
  ctx.fillRect(x + 13, y + 8, 2, 1)
}

export function drawMushroomRed(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  ctx.fillStyle = '#f5f5dc'
  ctx.fillRect(x + 6, y + 0, 4, 4)
  ctx.fillStyle = '#e8e8c8'
  ctx.fillRect(x + 6, y + 0, 1, 4)
  ctx.fillStyle = '#fffff0'
  ctx.fillRect(x + 9, y + 0, 1, 4)

  ctx.fillStyle = '#cc2222'
  ctx.fillRect(x + 3, y + 4, 10, 2)
  ctx.fillRect(x + 2, y + 6, 12, 3)
  ctx.fillRect(x + 3, y + 9, 10, 2)
  ctx.fillRect(x + 4, y + 11, 8, 2)
  ctx.fillRect(x + 5, y + 13, 6, 2)
  ctx.fillRect(x + 6, y + 15, 4, 1)

  ctx.fillStyle = '#dd4444'
  ctx.fillRect(x + 4, y + 5, 3, 2)
  ctx.fillRect(x + 3, y + 7, 2, 2)

  ctx.fillStyle = '#aa1111'
  ctx.fillRect(x + 10, y + 7, 3, 2)
  ctx.fillRect(x + 9, y + 9, 3, 2)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + 5, y + 6, 2, 2)
  ctx.fillRect(x + 9, y + 5, 2, 2)
  ctx.fillRect(x + 4, y + 10, 2, 1)
  ctx.fillRect(x + 10, y + 10, 2, 1)
  ctx.fillRect(x + 7, y + 8, 2, 2)
  ctx.fillRect(x + 6, y + 12, 1, 1)
  ctx.fillRect(x + 9, y + 13, 1, 1)
}

export function drawMushroomBrown(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  ctx.fillStyle = '#d4c4a8'
  ctx.fillRect(x + 6, y + 0, 4, 5)
  ctx.fillStyle = '#c4b498'
  ctx.fillRect(x + 6, y + 0, 1, 5)
  ctx.fillStyle = '#e4d4b8'
  ctx.fillRect(x + 9, y + 0, 1, 5)

  ctx.fillStyle = '#8b6914'
  ctx.fillRect(x + 2, y + 5, 12, 2)
  ctx.fillRect(x + 1, y + 7, 14, 2)
  ctx.fillRect(x + 2, y + 9, 12, 2)
  ctx.fillRect(x + 3, y + 11, 10, 2)
  ctx.fillRect(x + 5, y + 13, 6, 2)

  ctx.fillStyle = '#a07924'
  ctx.fillRect(x + 3, y + 6, 4, 2)
  ctx.fillRect(x + 2, y + 8, 3, 1)

  ctx.fillStyle = '#6b4904'
  ctx.fillRect(x + 11, y + 7, 3, 2)
  ctx.fillRect(x + 10, y + 9, 3, 2)

  ctx.fillStyle = '#5a3904'
  ctx.fillRect(x + 5, y + 8, 1, 1)
  ctx.fillRect(x + 8, y + 7, 1, 1)
  ctx.fillRect(x + 6, y + 10, 1, 1)
  ctx.fillRect(x + 10, y + 11, 1, 1)
  ctx.fillRect(x + 4, y + 12, 1, 1)

  ctx.fillStyle = '#b08934'
  ctx.fillRect(x + 7, y + 5, 2, 1)
}

export function drawApple(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  ctx.fillStyle = '#7a2f16'
  ctx.fillRect(x + 7, y + 1, 2, 3)
  ctx.fillStyle = '#3f7f24'
  ctx.fillRect(x + 9, y + 2, 3, 1)
  ctx.fillRect(x + 10, y + 3, 2, 1)

  ctx.fillStyle = '#b5121c'
  ctx.fillRect(x + 5, y + 4, 6, 1)
  ctx.fillRect(x + 3, y + 5, 10, 2)
  ctx.fillRect(x + 2, y + 7, 12, 4)
  ctx.fillRect(x + 3, y + 11, 10, 2)
  ctx.fillRect(x + 5, y + 13, 6, 1)

  ctx.fillStyle = '#ff2d35'
  ctx.fillRect(x + 4, y + 5, 4, 2)
  ctx.fillRect(x + 3, y + 7, 5, 3)
  ctx.fillRect(x + 4, y + 10, 3, 2)

  ctx.fillStyle = '#ff8a7a'
  ctx.fillRect(x + 5, y + 5, 2, 1)
  ctx.fillRect(x + 4, y + 7, 2, 2)

  ctx.fillStyle = '#6f0f15'
  ctx.fillRect(x + 11, y + 8, 2, 3)
  ctx.fillRect(x + 9, y + 12, 2, 1)
}

export function drawOrange(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  ctx.fillStyle = '#74410d'
  ctx.fillRect(x + 7, y + 1, 2, 2)
  ctx.fillStyle = '#2f7f28'
  ctx.fillRect(x + 9, y + 2, 3, 1)
  ctx.fillRect(x + 10, y + 3, 2, 1)

  ctx.fillStyle = '#c95e0a'
  ctx.fillRect(x + 5, y + 4, 6, 1)
  ctx.fillRect(x + 3, y + 5, 10, 2)
  ctx.fillRect(x + 2, y + 7, 12, 4)
  ctx.fillRect(x + 3, y + 11, 10, 2)
  ctx.fillRect(x + 5, y + 13, 6, 1)

  ctx.fillStyle = '#ff8a12'
  ctx.fillRect(x + 4, y + 5, 5, 2)
  ctx.fillRect(x + 3, y + 7, 6, 3)
  ctx.fillRect(x + 4, y + 10, 4, 2)

  ctx.fillStyle = '#ffc36a'
  ctx.fillRect(x + 5, y + 5, 2, 1)
  ctx.fillRect(x + 4, y + 7, 2, 2)

  ctx.fillStyle = '#a94708'
  ctx.fillRect(x + 11, y + 8, 2, 3)
  ctx.fillRect(x + 9, y + 12, 2, 1)
}

export function drawPeach(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  ctx.fillStyle = '#74410d'
  ctx.fillRect(x + 7, y + 1, 2, 2)
  ctx.fillStyle = '#3f8a2e'
  ctx.fillRect(x + 9, y + 2, 3, 1)
  ctx.fillRect(x + 10, y + 3, 2, 1)

  ctx.fillStyle = '#c76d68'
  ctx.fillRect(x + 5, y + 4, 6, 1)
  ctx.fillRect(x + 3, y + 5, 10, 2)
  ctx.fillRect(x + 2, y + 7, 12, 4)
  ctx.fillRect(x + 3, y + 11, 10, 2)
  ctx.fillRect(x + 5, y + 13, 6, 1)

  ctx.fillStyle = '#ffb184'
  ctx.fillRect(x + 4, y + 5, 5, 2)
  ctx.fillRect(x + 3, y + 7, 6, 3)
  ctx.fillRect(x + 4, y + 10, 4, 2)

  ctx.fillStyle = '#ffd0a8'
  ctx.fillRect(x + 5, y + 5, 2, 1)
  ctx.fillRect(x + 4, y + 7, 2, 2)

  ctx.fillStyle = '#d15e6c'
  ctx.fillRect(x + 11, y + 7, 2, 4)
  ctx.fillRect(x + 9, y + 12, 2, 1)

  ctx.fillStyle = '#8f4350'
  ctx.fillRect(x + 8, y + 5, 1, 8)
}

export function drawBanana(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.clearRect(x, y, 16, 16)

  ctx.fillStyle = '#5b3213'
  ctx.fillRect(x + 3, y + 4, 2, 2)
  ctx.fillRect(x + 12, y + 10, 1, 2)

  ctx.fillStyle = '#b98a13'
  ctx.fillRect(x + 4, y + 5, 2, 5)
  ctx.fillRect(x + 5, y + 9, 2, 2)
  ctx.fillRect(x + 7, y + 11, 5, 1)

  ctx.fillStyle = '#ffd84a'
  ctx.fillRect(x + 5, y + 4, 2, 5)
  ctx.fillRect(x + 6, y + 8, 2, 3)
  ctx.fillRect(x + 8, y + 10, 4, 1)

  ctx.fillStyle = '#fff08a'
  ctx.fillRect(x + 6, y + 5, 1, 3)
  ctx.fillRect(x + 7, y + 9, 2, 1)

  ctx.fillStyle = '#8e6510'
  ctx.fillRect(x + 4, y + 9, 1, 2)
  ctx.fillRect(x + 6, y + 11, 2, 1)
}
