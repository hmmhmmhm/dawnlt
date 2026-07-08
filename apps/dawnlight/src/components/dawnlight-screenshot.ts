import type { GameEngine } from '../game/engine'

export async function captureGameScreenshot(engine: GameEngine): Promise<void> {
  const waitFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const { renderer, camera, postProcessing } = engine
  const width = window.innerWidth
  const height = window.innerHeight
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const previousPixelRatio = renderer.getPixelRatio()
  const capturePixelRatio = isIOS ? 1.5 : 3
  const starMaterial = engine.stars.material as { size?: number; needsUpdate?: boolean }
  const constellationMaterial = engine.constellations.material as {
    size?: number
    needsUpdate?: boolean
  }
  const originalStarSize = typeof starMaterial.size === 'number' ? starMaterial.size : null
  const originalConstellationSize = typeof constellationMaterial.size === 'number' ? constellationMaterial.size : null
  const originalBokehEnabled = postProcessing.bokehPass.enabled
  const originalChromaticEnabled = postProcessing.chromaticPass.enabled
  const originalSmaaEnabled = postProcessing.smaaPass.enabled
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
  const restoreAvatarAnisotropy = engine.playerAvatar.applyTemporaryTextureAnisotropy(Math.min(8, maxAnisotropy))

  try {
    await waitFrame()
    await waitFrame()

    renderer.setPixelRatio(capturePixelRatio)
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    postProcessing.composer.setPixelRatio(capturePixelRatio)
    postProcessing.composer.setSize(width, height)
    postProcessing.bloomPass.setSize(width, height)
    postProcessing.bokehPass.setSize(width, height)
    postProcessing.smaaPass.setSize(width * capturePixelRatio, height * capturePixelRatio)

    if (originalStarSize !== null) {
      starMaterial.size = originalStarSize / capturePixelRatio
      starMaterial.needsUpdate = true
    }
    if (originalConstellationSize !== null) {
      constellationMaterial.size = originalConstellationSize / capturePixelRatio
      constellationMaterial.needsUpdate = true
    }

    // Disable blur/aberration only for capture so upscaled details stay crisp.
    postProcessing.bokehPass.enabled = false
    postProcessing.chromaticPass.enabled = false
    postProcessing.smaaPass.enabled = true

    renderer.shadowMap.needsUpdate = true
    postProcessing.composer.render()
    postProcessing.composer.render()

    const blob = await new Promise<Blob | null>((resolve) => {
      renderer.domElement.toBlob((imageBlob) => resolve(imageBlob), 'image/png')
    })
    if (!blob) throw new Error('Canvas blob conversion returned null')

    const now = new Date()
    const pad2 = (n: number) => n.toString().padStart(2, '0')
    const filename = `dawnlight-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}.png`
    const file = new File([blob], filename, { type: 'image/png' })
    const canShareFile = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })

    if (isIOS && canShareFile) {
      await navigator.share({
        files: [file],
        title: 'Dawnlight Screenshot',
      })
    } else {
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    }
  } catch (error) {
    const name = (error as { name?: string } | null)?.name
    if (name !== 'AbortError') {
      console.error('[Screenshot] Failed:', error)
    }
  } finally {
    if (originalStarSize !== null) {
      starMaterial.size = originalStarSize
      starMaterial.needsUpdate = true
    }
    if (originalConstellationSize !== null) {
      constellationMaterial.size = originalConstellationSize
      constellationMaterial.needsUpdate = true
    }
    postProcessing.bokehPass.enabled = originalBokehEnabled
    postProcessing.chromaticPass.enabled = originalChromaticEnabled
    postProcessing.smaaPass.enabled = originalSmaaEnabled
    restoreAvatarAnisotropy()
    renderer.setPixelRatio(previousPixelRatio)
    renderer.setSize(width, height, false)
    postProcessing.composer.setPixelRatio(previousPixelRatio)
    postProcessing.composer.setSize(width, height)
    postProcessing.bloomPass.setSize(width, height)
    postProcessing.bokehPass.setSize(width, height)
    postProcessing.smaaPass.setSize(width * previousPixelRatio, height * previousPixelRatio)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }
}
