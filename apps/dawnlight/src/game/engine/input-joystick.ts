import type { JoystickInput } from '../../components/virtual-joystick'
import { getConnectedGamepad } from '../../utils/gamepad'
import { triggerHaptic } from '../../utils/haptics'

const JOYSTICK_THRESHOLD = 0.3
const LOOK_SENSITIVITY = 0.05

export function processJoystickInputFrame(system: any): void {
  if (system.isChatOpen) return

  const joystickInput: JoystickInput = system.joystickInput
  const joystickW = joystickInput.moveY < -JOYSTICK_THRESHOLD
  const joystickS = joystickInput.moveY > JOYSTICK_THRESHOLD
  const joystickA = joystickInput.moveX < -JOYSTICK_THRESHOLD
  const joystickD = joystickInput.moveX > JOYSTICK_THRESHOLD
  const joystickSpace = joystickInput.jump
  const joystickSprint = joystickInput.sprint

  system.engine.keys.KeyW = system.keyboardKeys.KeyW || system.engine.keys.KeyW || joystickW
  system.engine.keys.KeyS = system.keyboardKeys.KeyS || system.engine.keys.KeyS || joystickS
  system.engine.keys.KeyA = system.keyboardKeys.KeyA || system.engine.keys.KeyA || joystickA
  system.engine.keys.KeyD = system.keyboardKeys.KeyD || system.engine.keys.KeyD || joystickD

  if (!getConnectedGamepad()) {
    system.engine.keys.KeyW = system.keyboardKeys.KeyW || joystickW
    system.engine.keys.KeyS = system.keyboardKeys.KeyS || joystickS
    system.engine.keys.KeyA = system.keyboardKeys.KeyA || joystickA
    system.engine.keys.KeyD = system.keyboardKeys.KeyD || joystickD
    system.engine.keys.Space = system.keyboardKeys.Space || joystickSpace
    system.engine.keys.ShiftLeft = system.keyboardKeys.ShiftLeft || joystickSprint
  }

  if (system.engine.player.isCrouching && (joystickW || joystickA || joystickS || joystickD)) {
    system.engine.player.isCrouching = false
  }

  if (joystickInput.lookX !== 0 || joystickInput.lookY !== 0) {
    system.engine.player.rotation.y -= joystickInput.lookX * LOOK_SENSITIVITY
    system.engine.player.rotation.x -= joystickInput.lookY * LOOK_SENSITIVITY
    system.engine.player.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, system.engine.player.rotation.x))
  }

  if (joystickInput.jump) {
    system.engine.keys.Space = true

    const jumpJustPressed = !system.joystickJumpHeld
    if (jumpJustPressed && system.engine.gameMode === 'creative') {
      const now = Date.now()
      if (now - system.engine.lastSpacePress < 300) {
        system.engine.player.isFlying = !system.engine.player.isFlying
        system.engine.isFlySprinting = false
      }
      system.engine.lastSpacePress = now
    }
  }
  system.joystickJumpHeld = joystickInput.jump

  if (joystickInput.attack) {
    if (!system.joystickAttackHeld) {
      system.engine.mouseHeld = true
      system.engine.isBreaking = true
      system.engine.breakProgress = 0
      triggerHaptic('error')
    }
    system.joystickAttackHeld = true
  } else {
    if (system.joystickAttackHeld) {
      system.engine.mouseHeld = false
      system.engine.isBreaking = false
      system.engine.breakProgress = 0
    }
    system.joystickAttackHeld = false
  }

  if (joystickInput.placeBlock && !system.joystickPlaceHeld) {
    system.callbacks.onPlaceBlock?.()
  }
  system.joystickPlaceHeld = joystickInput.placeBlock
}
