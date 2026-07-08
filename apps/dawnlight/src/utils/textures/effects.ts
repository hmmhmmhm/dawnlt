import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three'

export function createLensflareTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')!

  const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 220, 0.6)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.1)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')

  context.fillStyle = gradient
  context.fillRect(0, 0, 512, 512)

  const texture = new CanvasTexture(canvas)
  return texture
}

export function createSunTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')!

  context.fillStyle = '#FFFFA0'
  context.fillRect(0, 0, 512, 512)

  context.fillStyle = 'rgba(255, 255, 0, 0.1)'
  context.fillRect(40, 40, 432, 432)

  context.strokeStyle = 'rgba(255, 180, 0, 1.0)'
  context.lineWidth = 20
  context.strokeRect(0, 0, 512, 512)

  const texture = new CanvasTexture(canvas)
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function createMoonTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')!

  context.fillStyle = '#DDDDDD'
  context.fillRect(0, 0, 512, 512)

  context.strokeStyle = '#BBBBBB'
  context.lineWidth = 20
  context.strokeRect(0, 0, 512, 512)

  context.fillStyle = 'rgba(140, 140, 150, 0.5)'

  const cx = 256
  const cy = 310
  const scale = 1.5

  context.save()
  context.translate(cx, cy)
  context.scale(scale, scale)

  context.beginPath()
  context.ellipse(0, 0, 70, 55, 0, 0, Math.PI * 2)

  context.moveTo(-45, -30)
  context.bezierCurveTo(-75, -110, -75, -160, -35, -160)
  context.bezierCurveTo(-20, -160, -15, -130, -15, -50)

  context.moveTo(45, -30)
  context.bezierCurveTo(75, -110, 75, -160, 35, -160)
  context.bezierCurveTo(20, -160, 15, -130, 15, -50)

  context.fill()

  context.restore()

  context.fillStyle = 'rgba(100, 100, 110, 0.2)'
  for (let i = 0; i < 20; i++) {
    const size = Math.random() * 40 + 10
    const x = Math.random() * (512 - size)
    const y = Math.random() * (512 - size)
    context.fillRect(x, y, size, size)
  }

  const texture = new CanvasTexture(canvas)
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.colorSpace = SRGBColorSpace
  return texture
}

export function createRainTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const context = canvas.getContext('2d')!

  context.fillStyle = 'rgba(200, 220, 255, 0.8)'
  context.fillRect(14, 0, 4, 32)

  const texture = new CanvasTexture(canvas)
  return texture
}

export function createSnowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const context = canvas.getContext('2d')!

  context.fillStyle = 'rgba(220, 220, 220, 0.9)'
  context.fillRect(10, 10, 12, 12)

  const texture = new CanvasTexture(canvas)
  return texture
}

export function createFireflyTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')!

  const centerX = 32
  const centerY = 32
  const radius = 28

  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
  gradient.addColorStop(0.2, 'rgba(255, 255, 240, 0.9)')
  gradient.addColorStop(0.5, 'rgba(255, 255, 220, 0.5)')
  gradient.addColorStop(0.8, 'rgba(255, 255, 200, 0.2)')
  gradient.addColorStop(1, 'rgba(255, 255, 200, 0)')

  context.fillStyle = gradient
  context.beginPath()
  context.arc(centerX, centerY, radius, 0, Math.PI * 2)
  context.fill()

  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}
