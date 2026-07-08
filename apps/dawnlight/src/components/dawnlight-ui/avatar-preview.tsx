import { type MutableRefObject, useEffect, useRef, useState } from 'react'
import { AmbientLight, type AnimationAction, type AnimationClip, AnimationMixer, Box3, DirectionalLight, type Group, LoopRepeat, MathUtils, type Mesh, type Object3D, PerspectiveCamera, Scene, SRGBColorSpace, Timer, Vector3, WebGLRenderer } from 'three'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PLAYER_HEIGHT } from '../../constants'
import type { GameEngine } from '../../game/engine'
import { isBackMirrorEnabled } from '../dawnlight-chat'
import { shouldRenderAvatarPreviewPanel } from './avatar-preview-visibility'

const MODEL_URL = 'https://static.dawn.lt/glb/leafy-explorer/leafy-explorer-v2.glb'
const ANIMATION_URL = 'https://static.dawn.lt/glb/leafy-explorer/leafy-explorer-anim.glb'

interface AvatarPreviewProps {
  engineRef: MutableRefObject<GameEngine | null>
  visible: boolean
}

export function AvatarPreview({ engineRef, visible }: AvatarPreviewProps) {
  const avatarContainerRef = useRef<HTMLDivElement>(null)
  const worldContainerRef = useRef<HTMLDivElement>(null)
  const [showAvatarCanvas, setShowAvatarCanvas] = useState(true)
  const showAvatarCanvasRef = useRef(showAvatarCanvas)
  const worldPreviewWarmedRef = useRef(false)
  const [isWideEnough, setIsWideEnough] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth > 270))
  const panelSizeClass = showAvatarCanvas ? 'w-[4.6rem] h-[5.7rem] sm:w-[5.3rem] sm:h-[6.9rem] md:w-[7.2rem] md:h-[9.8rem]' : 'w-[6.8rem] h-[3.4rem] sm:w-[7.8rem] sm:h-[3.9rem] md:w-[10.8rem] md:h-[5.4rem]'

  useEffect(() => {
    showAvatarCanvasRef.current = showAvatarCanvas
  }, [showAvatarCanvas])

  useEffect(() => {
    const handleResize = () => {
      setIsWideEnough(window.innerWidth > 270)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const container = avatarContainerRef.current
    if (!container) return

    const scene = new Scene()
    const camera = new PerspectiveCamera(32, 1, 0.1, 20)
    camera.position.set(0, PLAYER_HEIGHT * 0.62, 2.15)
    camera.lookAt(0, PLAYER_HEIGHT * 0.55, 0)

    const renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = SRGBColorSpace
    renderer.domElement.className = 'absolute inset-0 z-10 w-full h-full rounded-xl'
    container.appendChild(renderer.domElement)

    const ambient = new AmbientLight(0xffffff, 1.05)
    const key = new DirectionalLight(0xffffff, 1.0)
    key.position.set(1.5, 2.2, 2.6)
    const fill = new DirectionalLight(0xffffff, 0.5)
    fill.position.set(-1.8, 1.2, 1.8)
    scene.add(ambient, key, fill)

    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)

    let root: Group | null = null
    let mixer: AnimationMixer | null = null
    const actions = new Map<string, AnimationAction>()
    let activeAction: AnimationAction | null = null
    let hipBone: Object3D | null = null
    let motionAnchorHipWorld: Vector3 | null = null
    const hipWorldPos = new Vector3()
    const focusPoint = new Vector3(0, PLAYER_HEIGHT * 0.55, 0)
    let framingSize = new Vector3(0.9, PLAYER_HEIGHT, 0.7)
    let framingDistance = 2.15
    let framingYOffset = PLAYER_HEIGHT * 0.03
    let shouldCompensateHorizontalMotion = false
    const clipNameRef = { current: '' }
    let disposed = false

    const updateFramingDistance = () => {
      const vFov = MathUtils.degToRad(camera.fov)
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
      const distanceForHeight = framingSize.y / (2 * Math.tan(vFov / 2))
      const distanceForWidth = framingSize.x / (2 * Math.tan(hFov / 2))
      framingDistance = Math.max(distanceForHeight, distanceForWidth) * 1.18
      camera.near = 0.05
      camera.far = Math.max(20, framingDistance * 6)
      camera.updateProjectionMatrix()
    }

    const applyCameraPose = () => {
      camera.position.set(focusPoint.x, focusPoint.y + framingYOffset, focusPoint.z + framingDistance)
      camera.lookAt(focusPoint)
    }

    const resize = () => {
      const width = container.clientWidth || 1
      const height = container.clientHeight || 1
      camera.aspect = width / height
      updateFramingDistance()
      applyCameraPose()
      renderer.setSize(width, height, false)
    }
    resize()
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null
    resizeObserver?.observe(container)

    const normalizeName = (name: string) => name.trim().toLowerCase()

    const findClipAction = (name: string): AnimationAction | null => {
      const direct = actions.get(name)
      if (direct) return direct
      const target = normalizeName(name)
      for (const [clipName, action] of actions.entries()) {
        if (normalizeName(clipName) === target) return action
      }
      return null
    }

    const playClip = (name: string) => {
      const next = findClipAction(name)
      if (!next || activeAction === next) return
      next.reset().fadeIn(0.14).play()
      activeAction?.fadeOut(0.12)
      activeAction = next
      motionAnchorHipWorld = null
      const n = name.toLowerCase()
      const isLocomotion = /(walk|run|sneak|swim|jump)/i.test(n)
      shouldCompensateHorizontalMotion = !isLocomotion
    }

    const applyHorizontalMotionCompensation = () => {
      if (!root || !hipBone) return
      if (!shouldCompensateHorizontalMotion) {
        motionAnchorHipWorld = null
        return
      }
      if (!activeAction) {
        motionAnchorHipWorld = null
        return
      }

      hipBone.getWorldPosition(hipWorldPos)
      if (!motionAnchorHipWorld) {
        motionAnchorHipWorld = hipWorldPos.clone()
        return
      }

      const dx = hipWorldPos.x - motionAnchorHipWorld.x
      const dz = hipWorldPos.z - motionAnchorHipWorld.z
      if (Math.abs(dx) < 0.00001 && Math.abs(dz) < 0.00001) return
      root.position.x -= dx
      root.position.z -= dz
    }

    const frameModel = (target: Object3D) => {
      const bounds = new Box3().setFromObject(target)
      const size = bounds.getSize(new Vector3())
      const center = bounds.getCenter(new Vector3())

      framingSize = size.clone()
      framingYOffset = size.y * 0.03
      focusPoint.copy(center)
      updateFramingDistance()
      applyCameraPose()
    }

    const loadAvatar = async () => {
      try {
        const [modelGltf, animationGltf] = await Promise.all([loader.loadAsync(MODEL_URL), loader.loadAsync(ANIMATION_URL)])
        if (disposed) return

        root = modelGltf.scene
        root.rotation.y = 0
        root.position.set(0, 0, 0)
        root.traverse((node) => {
          if (hipBone) return
          const lower = node.name.toLowerCase()
          if (lower.includes('hips') || lower.includes('hip') || lower.includes('pelvis') || lower.includes('mixamorighips')) {
            hipBone = node
          }
        })

        // Match in-game avatar scale so preview framing is stable.
        const bounds = new Box3().setFromObject(root)
        const modelHeight = bounds.max.y - bounds.min.y
        if (modelHeight > 0) {
          const scale = (PLAYER_HEIGHT * 1.02) / modelHeight
          root.scale.setScalar(scale)
          const scaledBounds = new Box3().setFromObject(root)
          root.position.y -= scaledBounds.min.y
        }
        frameModel(root)

        root.traverse((node) => {
          const mesh = node as Mesh
          if (!mesh.isMesh) return
          mesh.castShadow = false
          mesh.receiveShadow = false
        })

        scene.add(root)
        const clips = animationGltf.animations.length > 0 ? animationGltf.animations : modelGltf.animations
        mixer = new AnimationMixer(root)
        for (const clip of clips) {
          const action = mixer.clipAction(clip as AnimationClip)
          action.setLoop(LoopRepeat, Infinity)
          actions.set(clip.name, action)
        }

        const initialName = engineRef.current?.playerAvatar.getCurrentClipName()
        if (initialName) {
          playClip(initialName)
          clipNameRef.current = initialName
        } else if (clips[0]) {
          playClip(clips[0].name)
          clipNameRef.current = clips[0].name
        }
      } catch (error) {
        console.error('[AvatarPreview] Failed to load preview avatar:', error)
      }
    }

    void loadAvatar()

    const clock = new Timer()
    clock.connect(document)
    let rafId = 0
    let lastShowAvatar = true
    const renderLoop = (timestamp?: number) => {
      rafId = requestAnimationFrame(renderLoop)
      const engine = engineRef.current
      const backMirrorEnabled = isBackMirrorEnabled()
      const shouldShowAvatar = engine && engine.cameraMode === 'third-person' ? !backMirrorEnabled || engine.playerAvatar.shouldShowBackPreview(engine.camera.position) : true
      if (shouldShowAvatar !== lastShowAvatar) {
        lastShowAvatar = shouldShowAvatar
        setShowAvatarCanvas(shouldShowAvatar)
      }
      if (!visible || !shouldShowAvatar) return

      clock.update(timestamp)
      const delta = Math.min(clock.getDelta(), 0.1)
      const runtimeClip = engine?.playerAvatar.getCurrentClipName() ?? ''
      if (runtimeClip && runtimeClip !== clipNameRef.current) {
        clipNameRef.current = runtimeClip
        playClip(runtimeClip)
      }
      mixer?.update(delta)
      applyHorizontalMotionCompensation()
      if (hipBone) {
        hipBone.getWorldPosition(hipWorldPos)
        focusPoint.x = hipWorldPos.x
        focusPoint.z = hipWorldPos.z
        applyCameraPose()
      }
      renderer.render(scene, camera)
    }
    renderLoop()

    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      resizeObserver?.disconnect()
      clock.dispose()
      renderer.dispose()
      if (root) {
        scene.remove(root)
        root.traverse((node) => {
          const mesh = node as Mesh
          if (!mesh.isMesh) return
          mesh.geometry.dispose()
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m) => {
            m.dispose()
          })
        })
      }
      container.removeChild(renderer.domElement)
      actions.clear()
      activeAction = null
      hipBone = null
      motionAnchorHipWorld = null
      shouldCompensateHorizontalMotion = false
      mixer = null
      root = null
    }
  }, [engineRef, visible])

  useEffect(() => {
    const container = worldContainerRef.current
    if (!container) return

    const camera = new PerspectiveCamera(64, 1, 0.05, 800)
    camera.rotation.order = 'YXZ'
    const renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = SRGBColorSpace
    renderer.domElement.className = 'absolute inset-0 z-10 w-full h-full rounded-xl'
    container.appendChild(renderer.domElement)

    const forward = new Vector3()
    const lookTarget = new Vector3()
    const resize = () => {
      const width = container.clientWidth || 1
      const height = container.clientHeight || 1
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    resize()
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resize()) : null
    resizeObserver?.observe(container)

    let rafId = 0
    const renderLoop = () => {
      rafId = requestAnimationFrame(renderLoop)
      if (!visible) return
      if (!isBackMirrorEnabled()) return

      const engine = engineRef.current
      if (!engine || engine.cameraMode !== 'third-person') return
      if (!engine.playerAvatar.getPreviewForwardDirection(forward)) return

      const player = engine.player
      const eyeY = player.position.y + PLAYER_HEIGHT * 0.94
      camera.position.set(player.position.x, eyeY, player.position.z)
      camera.position.addScaledVector(forward, 0.42)
      camera.position.y += PLAYER_HEIGHT * 0.03
      lookTarget.copy(camera.position).addScaledVector(forward, 4)
      lookTarget.y += Math.sin(player.rotation.x) * 4
      camera.lookAt(lookTarget)
      camera.updateMatrixWorld()

      // Warm once while hidden to avoid first-show shader/texture spike.
      if (showAvatarCanvasRef.current && worldPreviewWarmedRef.current) return
      renderer.render(engine.scene, camera)
      worldPreviewWarmedRef.current = true
    }
    renderLoop()

    const onResize = () => resize()
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      resizeObserver?.disconnect()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [engineRef, visible])

  if (!shouldRenderAvatarPreviewPanel(visible)) return null

  return (
    <div className={`pointer-events-none fixed left-4 top-16 md:top-4 z-60 transition-opacity duration-150 ${visible && isWideEnough ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
      <div
        className={`relative ${panelSizeClass} rounded-xl border backdrop-blur-md overflow-hidden transition-[width,height] duration-150`}
        style={{
          borderColor: 'rgba(255,255,255,0.34)',
          background: 'linear-gradient(180deg, rgba(41,59,82,0.34) 0%, rgba(17,29,46,0.3) 55%, rgba(10,16,28,0.24) 100%)',
          boxShadow: '0 10px 22px rgba(2,7,18,0.36), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -8px 14px rgba(0,0,0,0.22)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-[7%] rounded-lg border"
          style={{
            borderColor: 'rgba(255,255,255,0.2)',
            background: 'radial-gradient(circle at 30% 18%, rgba(255,255,255,0.08), rgba(255,255,255,0.02) 44%, rgba(0,0,0,0.08) 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[24%]"
          style={{
            background: 'linear-gradient(180deg, rgba(170,220,255,0.16) 0%, rgba(170,220,255,0) 100%)',
          }}
        />
        <div className="relative z-10 w-full h-full">
          <div ref={worldContainerRef} className={`absolute inset-0 transition-opacity duration-120 ${showAvatarCanvas ? 'opacity-0' : 'opacity-100'}`} />
          <div ref={avatarContainerRef} className={`absolute inset-0 transition-opacity duration-120 ${showAvatarCanvas ? 'opacity-100' : 'opacity-0'}`} />
        </div>
      </div>
    </div>
  )
}
