import { MathUtils, type Vector3 } from 'three'
import { PLAYER_HEIGHT } from '../../constants'
import { getBlock3D } from '../../engine/world'
import { isFoliageBlock } from '../../shared'
import { BlockType } from '../../types'

const BOB_FREQUENCY = 2.75
const BOB_SPRINT_FREQUENCY = 3.75
const BOB_VERTICAL_AMP = 0.018
const BOB_HORIZONTAL_AMP = 0.008
const BOB_INTENSITY_UP = 6
const BOB_INTENSITY_DOWN = 4
const FIRST_PERSON_EYE_HEIGHT_STAND = 0.9
const FIRST_PERSON_EYE_HEIGHT_CROUCH = 0.62

export function updateLoopCamera(loop: any, deltaTime: number): void {
  const { camera, player, keys } = loop.engine
  updateAutoCameraMode(loop, deltaTime)

  if (loop.engine.cameraMode === 'third-person') {
    updateThirdPersonCamera(loop, deltaTime)
    return
  }

  loop.thirdPersonTargetY = null
  camera.position.x = player.position.x
  camera.position.z = player.position.z

  const firstPersonEyeHeight = player.isCrouching ? FIRST_PERSON_EYE_HEIGHT_CROUCH : FIRST_PERSON_EYE_HEIGHT_STAND
  const targetCameraY = player.position.y + PLAYER_HEIGHT * firstPersonEyeHeight
  const smoothFactor = 15 * deltaTime
  camera.position.y = MathUtils.lerp(camera.position.y, targetCameraY, Math.min(smoothFactor, 1))

  const isMoving = keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD
  const isSprinting = keys.ShiftLeft && isMoving
  const shouldBob = player.isGrounded && isMoving && !player.isFlying

  const targetIntensity = shouldBob ? 1 : 0
  const lerpSpeed = shouldBob ? BOB_INTENSITY_UP : BOB_INTENSITY_DOWN
  loop.bobIntensity = MathUtils.lerp(loop.bobIntensity, targetIntensity, Math.min(lerpSpeed * deltaTime, 1))

  if (loop.bobIntensity > 0.001) {
    const freq = isSprinting ? BOB_SPRINT_FREQUENCY : BOB_FREQUENCY
    loop.bobTimer += deltaTime * freq * Math.PI * 2

    const verticalBob = Math.sin(loop.bobTimer) * BOB_VERTICAL_AMP * loop.bobIntensity
    const horizontalBob = Math.cos(loop.bobTimer * 0.5) * BOB_HORIZONTAL_AMP * loop.bobIntensity

    camera.position.y += verticalBob

    const swaySin = Math.sin(player.rotation.y)
    const swayCos = Math.cos(player.rotation.y)
    camera.position.x += swayCos * horizontalBob
    camera.position.z -= swaySin * horizontalBob
  } else {
    loop.bobTimer = 0
  }

  camera.rotation.order = 'YXZ'
  camera.rotation.y = player.rotation.y
  camera.rotation.x = player.rotation.x
}

export function updateLoopPlayerAvatar(loop: any, deltaTime: number, sunIntensity: number): void {
  const moving = loop.engine.keys.KeyW || loop.engine.keys.KeyS || loop.engine.keys.KeyA || loop.engine.keys.KeyD
  const sprinting = loop.engine.keys.ShiftLeft && moving
  const intendedMoveYaw = getIntendedMoveYaw(loop)
  const isSwimming = getSwimmingStateForAnimation(loop, deltaTime, moving)
  const isSwimForwardBlocked = isSwimming ? isSwimForwardBlockedAhead(loop, intendedMoveYaw) : false

  loop.engine.playerAvatar.update(deltaTime, loop.engine.player, moving, sprinting, loop.engine.cameraMode, sunIntensity, intendedMoveYaw, isSwimming, isSwimForwardBlocked)
}

export function getLoopInteractionOrigin(loop: any): Vector3 | undefined {
  if (loop.engine.cameraMode !== 'third-person') return undefined
  loop.interactionOrigin.set(loop.engine.player.position.x, loop.engine.player.position.y + PLAYER_HEIGHT * 0.9, loop.engine.player.position.z)
  return loop.interactionOrigin
}

export function isLoopUnderwater(loop: any): boolean {
  const { camera, chunks3D } = loop.engine
  const camBlockX = Math.floor(camera.position.x)
  const camBlockY = Math.floor(camera.position.y)
  const camBlockZ = Math.floor(camera.position.z)
  const camBlock = getBlock3D(camBlockX, camBlockY, camBlockZ, chunks3D)
  return camBlock === BlockType.WATER
}

function updateAutoCameraMode(loop: any, deltaTime: number): void {
  const crampedThreshold = 1.45
  const restoreThreshold = 2.45
  const steepLookUpEnterThreshold = 1.02
  const steepLookUpExitThreshold = 0.88
  const toFirstPersonDelay = 0.16
  const toThirdPersonDelay = 0.3
  const sampleTargetY = loop.engine.player.position.y + PLAYER_HEIGHT * 0.82
  const availableDistance = sampleThirdPersonDistance(loop, sampleTargetY)
  const lookPitch = loop.engine.player.rotation.x
  const steepLookUpForFallback = lookPitch >= steepLookUpEnterThreshold
  const steepLookUpForRestoreBlock = lookPitch >= steepLookUpExitThreshold

  if (loop.engine.cameraMode === 'third-person') {
    loop.thirdPersonRestoreTimer = 0
    if (availableDistance < crampedThreshold || steepLookUpForFallback) {
      loop.thirdPersonBlockedTimer += deltaTime
    } else {
      loop.thirdPersonBlockedTimer = 0
    }

    if (loop.thirdPersonBlockedTimer >= toFirstPersonDelay) {
      loop.engine.cameraMode = 'first-person'
      loop.autoThirdPersonFallback = true
      loop.thirdPersonBlockedTimer = 0
      loop.thirdPersonRestoreTimer = 0
      loop.thirdPersonTargetY = null
    }
    return
  }

  loop.thirdPersonBlockedTimer = 0
  if (!loop.autoThirdPersonFallback) return

  if (availableDistance >= restoreThreshold && !steepLookUpForRestoreBlock) {
    loop.thirdPersonRestoreTimer += deltaTime
  } else {
    loop.thirdPersonRestoreTimer = 0
  }

  if (loop.thirdPersonRestoreTimer >= toThirdPersonDelay) {
    loop.engine.cameraMode = 'third-person'
    loop.autoThirdPersonFallback = false
    loop.thirdPersonRestoreTimer = 0
    loop.thirdPersonDistance = Math.max(loop.thirdPersonDistance, 2.0)
  }
}

function sampleThirdPersonDistance(loop: any, targetY: number): number {
  const { player, chunks3D } = loop.engine
  const desiredDistance = loop.engine.getThirdPersonDesiredDistance()
  const cameraHeightOffset = 0.7
  const minDistance = 1.2
  const collisionMargin = 0.25

  loop.cameraTarget.set(player.position.x, targetY, player.position.z)
  loop.lookEuler.set(player.rotation.x, player.rotation.y, 0, 'YXZ')
  loop.lookDirection.set(0, 0, -1).applyEuler(loop.lookEuler)

  let unobstructedDistance = desiredDistance
  const steps = Math.max(1, Math.floor(desiredDistance / 0.12))
  loop.cameraStep.copy(loop.lookDirection).multiplyScalar(-(desiredDistance / steps))
  loop.cameraStep.y += cameraHeightOffset / steps
  loop.cameraProbePosition.copy(loop.cameraTarget)

  for (let i = 0; i < steps; i++) {
    loop.cameraProbePosition.add(loop.cameraStep)
    const block = getBlock3D(Math.floor(loop.cameraProbePosition.x), Math.floor(loop.cameraProbePosition.y), Math.floor(loop.cameraProbePosition.z), chunks3D)
    if (block !== BlockType.AIR && block !== BlockType.WATER) {
      unobstructedDistance = Math.max(minDistance, (i / steps) * desiredDistance - collisionMargin)
      break
    }
  }

  return unobstructedDistance
}

function updateThirdPersonCamera(loop: any, deltaTime: number): void {
  const { camera, player, chunks3D } = loop.engine

  const rawTargetY = player.position.y + PLAYER_HEIGHT * 0.82
  if (loop.thirdPersonTargetY === null) {
    loop.thirdPersonTargetY = rawTargetY
  } else {
    const deltaY = rawTargetY - loop.thirdPersonTargetY
    const ySmooth = deltaY > 0 ? 5.5 : 18
    loop.thirdPersonTargetY = MathUtils.lerp(loop.thirdPersonTargetY, rawTargetY, Math.min(ySmooth * deltaTime, 1))
  }

  const targetY = loop.thirdPersonTargetY
  loop.cameraTarget.set(player.position.x, targetY, player.position.z)

  loop.lookEuler.set(player.rotation.x, player.rotation.y, 0, 'YXZ')
  loop.lookDirection.set(0, 0, -1).applyEuler(loop.lookEuler)

  const cameraHeightOffset = 0.7
  const unobstructedDistance = sampleThirdPersonDistance(loop, targetY)

  const distanceSmooth = unobstructedDistance < loop.thirdPersonDistance ? 24 : 8
  loop.thirdPersonDistance = MathUtils.lerp(loop.thirdPersonDistance, unobstructedDistance, Math.min(distanceSmooth * deltaTime, 1))

  loop.desiredCameraPosition.copy(loop.cameraTarget)
  loop.desiredCameraPosition.addScaledVector(loop.lookDirection, -loop.thirdPersonDistance)
  loop.desiredCameraPosition.y += cameraHeightOffset

  const smooth = Math.min(deltaTime * 12, 1)
  camera.position.lerp(loop.desiredCameraPosition, smooth)
  pullCameraOutOfFoliage(loop.cameraTarget, camera.position, chunks3D)
  camera.lookAt(loop.cameraTarget)
}

function pullCameraOutOfFoliage(cameraTarget: Vector3, cameraPosition: Vector3, chunks3D: Map<string, Uint8Array>): void {
  const toTarget = cameraTarget.clone().sub(cameraPosition)
  let remainingDistance = toTarget.length()
  if (remainingDistance < 0.0001) return
  toTarget.normalize()

  const step = 0.18
  const maxIterations = 12

  for (let i = 0; i < maxIterations; i++) {
    const block = getBlock3D(Math.floor(cameraPosition.x), Math.floor(cameraPosition.y), Math.floor(cameraPosition.z), chunks3D)
    if (!isFoliageBlock(block)) break

    const pullAmount = Math.min(step, remainingDistance)
    cameraPosition.addScaledVector(toTarget, pullAmount)
    remainingDistance -= pullAmount
    if (remainingDistance <= 0) break
  }
}

function isSwimForwardBlockedAhead(loop: any, intendedMoveYaw: number | null): boolean {
  if (intendedMoveYaw === null) return false
  const { player, chunks3D } = loop.engine

  const dirX = Math.sin(intendedMoveYaw)
  const dirZ = Math.cos(intendedMoveYaw)
  const probeDistance = 0.92
  const probeX = player.position.x + dirX * probeDistance
  const probeZ = player.position.z + dirZ * probeDistance
  const sideX = -dirZ * 0.22
  const sideZ = dirX * 0.22

  const bodyY = Math.floor(player.position.y + PLAYER_HEIGHT * 0.52)
  const headY = Math.floor(player.position.y + PLAYER_HEIGHT * 0.84)
  const probes = [
    { x: probeX, z: probeZ },
    { x: probeX + sideX, z: probeZ + sideZ },
    { x: probeX - sideX, z: probeZ - sideZ },
  ]
  const isSolid = (b: BlockType) => b !== BlockType.AIR && b !== BlockType.WATER

  return probes.some((p) => {
    const bx = Math.floor(p.x)
    const bz = Math.floor(p.z)
    const bodyFront = getBlock3D(bx, bodyY, bz, chunks3D)
    const headFront = getBlock3D(bx, headY, bz, chunks3D)
    return isSolid(bodyFront) || isSolid(headFront)
  })
}

function getSwimmingStateForAnimation(loop: any, deltaTime: number, isMoving: boolean): boolean {
  const physicalSwimming = isPlayerSwimming(loop)
  if (physicalSwimming) {
    loop.swimAnimGraceTimer = 0.35
    return true
  }

  if (loop.swimAnimGraceTimer > 0) {
    loop.swimAnimGraceTimer = Math.max(0, loop.swimAnimGraceTimer - deltaTime)
    const upwardOrAirborne = loop.engine.player.velocity.y > -0.5 && !loop.engine.player.isGrounded
    if (upwardOrAirborne && isMoving) {
      return true
    }
  }

  return false
}

function isPlayerSwimming(loop: any): boolean {
  const { player, chunks3D } = loop.engine
  const bodyX = Math.floor(player.position.x)
  const bodyY = Math.floor(player.position.y + PLAYER_HEIGHT * 0.5)
  const bodyZ = Math.floor(player.position.z)
  const headX = Math.floor(player.position.x)
  const headY = Math.floor(player.position.y + PLAYER_HEIGHT * 0.8)
  const headZ = Math.floor(player.position.z)
  const bodyBlock = getBlock3D(bodyX, bodyY, bodyZ, chunks3D)
  const headBlock = getBlock3D(headX, headY, headZ, chunks3D)
  return bodyBlock === BlockType.WATER || headBlock === BlockType.WATER
}

function getIntendedMoveYaw(loop: any): number | null {
  const { keys, player } = loop.engine
  loop.intendedMoveDirection.set(0, 0, 0)

  const forwardX = -Math.sin(player.rotation.y)
  const forwardZ = -Math.cos(player.rotation.y)
  const rightX = Math.cos(player.rotation.y)
  const rightZ = -Math.sin(player.rotation.y)

  if (keys.KeyW) {
    loop.intendedMoveDirection.x += forwardX
    loop.intendedMoveDirection.z += forwardZ
  }
  if (keys.KeyS) {
    loop.intendedMoveDirection.x -= forwardX
    loop.intendedMoveDirection.z -= forwardZ
  }
  if (keys.KeyA) {
    loop.intendedMoveDirection.x -= rightX
    loop.intendedMoveDirection.z -= rightZ
  }
  if (keys.KeyD) {
    loop.intendedMoveDirection.x += rightX
    loop.intendedMoveDirection.z += rightZ
  }

  if (loop.intendedMoveDirection.lengthSq() < 0.0001) return null
  loop.intendedMoveDirection.normalize()
  return Math.atan2(loop.intendedMoveDirection.x, loop.intendedMoveDirection.z)
}
