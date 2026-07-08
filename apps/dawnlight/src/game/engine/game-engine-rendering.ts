import { ACESFilmicToneMapping, BoxGeometry, Color, EdgesGeometry, Fog, LineBasicMaterial, LineSegments, PCFShadowMap, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { CHUNK_SIZE } from '../../constants'

const MAX_RENDER_PIXEL_RATIO = 1.75

export function initializeThreeJS(container: HTMLElement, renderDistance: number) {
  const scene = new Scene()
  scene.background = new Color(0x87ceeb)
  scene.fog = new Fog(0x87ceeb, 30, renderDistance * CHUNK_SIZE - 20)

  const getFov = () => (window.innerWidth < window.innerHeight ? 100 : 75)
  const camera = new PerspectiveCamera(getFov(), window.innerWidth / window.innerHeight, 0.1, 1000)

  const renderer = new WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_RENDER_PIXEL_RATIO))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  container.appendChild(renderer.domElement)

  return { scene, camera, renderer }
}

export function createHighlightMesh(scene: Scene): LineSegments {
  const highlightGeometry = new BoxGeometry(1.002, 1.002, 1.002)
  const highlightEdges = new EdgesGeometry(highlightGeometry)
  const highlightMaterial = new LineBasicMaterial({ color: 0x000000, linewidth: 2 })
  const highlightMesh = new LineSegments(highlightEdges, highlightMaterial)
  scene.add(highlightMesh)
  highlightMesh.visible = false
  return highlightMesh
}
