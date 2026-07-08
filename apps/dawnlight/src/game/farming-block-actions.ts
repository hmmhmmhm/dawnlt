import { getBlock3D, setBlock, setBlock3D, worldToChunk3D } from '../engine/world'
import type { BlockType, InventoryItem, RaycastHit } from '../types'
import { triggerHaptic } from '../utils/haptics'
import type { BlockActionDeps } from './block-actions-interaction'
import { hasWaterNear, resolveFarmingPlacement } from './farming-utils'
import { addItemToInventory } from './inventory-utils'

type RebuildChunk = (cx: number, cy: number, cz: number, deps: BlockActionDeps, worldX?: number, worldY?: number, worldZ?: number) => void

function replaceSelectedItem(deps: BlockActionDeps, selectedItem: InventoryItem, replacementType: BlockType): void {
  const { player, inventory } = deps

  if (selectedItem.count <= 1) {
    inventory.hotbar[player.selectedSlot] = { type: replacementType, count: 1 }
    return
  }

  selectedItem.count--
  addItemToInventory(inventory, replacementType, 1)
}

export function tryApplyFarmingAction(deps: BlockActionDeps, hit: RaycastHit, selectedItem: InventoryItem | null, isCreative: boolean, rebuildChunk: RebuildChunk): boolean {
  const { player, inventory, chunks, chunks3D, renderer } = deps
  const blockAbove = getBlock3D(hit.block.x, hit.block.y + 1, hit.block.z, chunks3D)
  const farmingAction = resolveFarmingPlacement(hit.block.type, selectedItem, blockAbove, {
    hasNearbyWater: hasWaterNear(chunks3D, hit.block.x, hit.block.y, hit.block.z),
    isRaining: deps.getIsRaining?.() ?? false,
  })

  if (farmingAction.kind === 'none') return false

  if (farmingAction.kind === 'transform-selected') {
    if (!isCreative && selectedItem) replaceSelectedItem(deps, selectedItem, farmingAction.selectedType)
    triggerHaptic()
    deps.onSfx?.('place', farmingAction.selectedType as BlockType)
    return true
  }

  const px = hit.block.x
  const py = farmingAction.kind === 'plant' ? hit.block.y + 1 : hit.block.y
  const pz = hit.block.z

  setBlock(px, py, pz, farmingAction.blockType, chunks)
  setBlock3D(px, py, pz, farmingAction.blockType, chunks3D)

  if (!isCreative && farmingAction.consumeSelected && selectedItem) {
    if (farmingAction.kind === 'water') {
      replaceSelectedItem(deps, selectedItem, farmingAction.selectedType)
    } else {
      selectedItem.count--
      if (selectedItem.count <= 0) inventory.hotbar[player.selectedSlot] = null
    }
  }

  const { cx, cy, cz } = worldToChunk3D(px, py, pz)
  rebuildChunk(cx, cy, cz, deps, px, py, pz)
  triggerHaptic()
  deps.onSfx?.('place', farmingAction.blockType as BlockType)
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  return true
}
