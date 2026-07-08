import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { Vector3 } from 'three'
import { basketWorldBlockFromItem } from '../game/basket-utils'
import { type CraftingGrid, craftFromGrid, getCraftingResult, returnCraftingItems } from '../game/crafting-utils'
import type { GameEngine } from '../game/engine'
import { addItemToInventory, clickInventorySlot, clickItemSlot, cloneInventoryItem, type InventorySlotRef, removeInventoryItem, secondaryClickInventorySlot, secondaryClickItemSlot } from '../game/inventory-utils'
import type { InventoryItem } from '../types'
import { BlockType } from '../types'
import { triggerHaptic } from '../utils/haptics'

function cloneItem(item: InventoryItem | null): InventoryItem | null {
  return cloneInventoryItem(item)
}

function clearGameInput(engine: GameEngine): void {
  Object.keys(engine.keys).forEach((key) => {
    engine.keys[key] = false
  })
  engine.mouseHeld = false
  engine.isBreaking = false
  engine.breakProgress = 0
}

function getDropPosition(engine: GameEngine): Vector3 {
  const direction = new Vector3(0, 0, -1).applyEuler(engine.camera.rotation).normalize()
  return engine.player.position
    .clone()
    .add(new Vector3(0, 0.9, 0))
    .add(direction.multiplyScalar(1.15))
}

export function useInventoryUi(engineRef: RefObject<GameEngine | null>) {
  const [isOpen, setIsOpen] = useState(false)
  const [cursorItem, setCursorItem] = useState<InventoryItem | null>(null)
  const cursorItemRef = useRef<InventoryItem | null>(null)
  const [craftingGrid, setCraftingGrid] = useState<CraftingGrid>(() => [null, null, null, null])
  const [, setInventoryVersion] = useState(0)

  const updateCursorItem = useCallback((item: InventoryItem | null) => {
    const next = cloneItem(item)
    cursorItemRef.current = next
    setCursorItem(next)
  }, [])

  const refreshInventory = useCallback(() => {
    setInventoryVersion((version) => version + 1)
  }, [])

  const dropItemToWorld = useCallback(
    (item: InventoryItem | null) => {
      const engine = engineRef.current
      if (!engine || !item || item.count <= 0) return false

      const droppedType = item.type === BlockType.BASKET ? basketWorldBlockFromItem(item) : item.type
      engine.droppedItemSystem.spawn(droppedType, getDropPosition(engine), item.count)
      return true
    },
    [engineRef],
  )

  const returnCraftingGridToInventory = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    setCraftingGrid((grid) => {
      const next = [...grid] as CraftingGrid
      returnCraftingItems(next, (item) => {
        const result = addItemToInventory(engine.inventory, item.type, item.count)
        if (result.remaining > 0) {
          dropItemToWorld({ type: item.type, count: result.remaining })
        }
      })
      return next
    })
    refreshInventory()
  }, [dropItemToWorld, engineRef, refreshInventory])

  const close = useCallback(() => {
    returnCraftingGridToInventory()
    setIsOpen(false)
    const item = cursorItemRef.current
    if (item) {
      dropItemToWorld(item)
      triggerHaptic('confirm')
    }
    updateCursorItem(null)
    refreshInventory()
  }, [dropItemToWorld, refreshInventory, returnCraftingGridToInventory, updateCursorItem])

  const toggle = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return

    if (isOpen) {
      close()
      return
    }

    document.exitPointerLock()
    clearGameInput(engine)
    setIsOpen(true)
  }, [close, engineRef, isOpen])

  const clickSlot = useCallback(
    (slot: InventorySlotRef) => {
      const engine = engineRef.current
      if (!engine) return

      const result = clickInventorySlot(engine.inventory, slot, cursorItemRef.current)
      if (result.changed) {
        triggerHaptic()
        updateCursorItem(result.cursorItem)
        refreshInventory()
      }
    },
    [engineRef, refreshInventory, updateCursorItem],
  )

  const secondaryClickSlot = useCallback(
    (slot: InventorySlotRef) => {
      const engine = engineRef.current
      if (!engine) return

      const result = secondaryClickInventorySlot(engine.inventory, slot, cursorItemRef.current)
      if (result.changed) {
        triggerHaptic()
        updateCursorItem(result.cursorItem)
        refreshInventory()
      }
    },
    [engineRef, refreshInventory, updateCursorItem],
  )

  const clickCraftingSlot = useCallback(
    (index: number) => {
      setCraftingGrid((grid) => {
        const next = [...grid] as CraftingGrid
        const result = clickItemSlot(next, index, cursorItemRef.current)
        if (result.changed) {
          triggerHaptic()
          updateCursorItem(result.cursorItem)
          refreshInventory()
        }
        return next
      })
    },
    [refreshInventory, updateCursorItem],
  )

  const secondaryClickCraftingSlot = useCallback(
    (index: number) => {
      setCraftingGrid((grid) => {
        const next = [...grid] as CraftingGrid
        const result = secondaryClickItemSlot(next, index, cursorItemRef.current)
        if (result.changed) {
          triggerHaptic()
          updateCursorItem(result.cursorItem)
          refreshInventory()
        }
        return next
      })
    },
    [refreshInventory, updateCursorItem],
  )

  const craftResult = useCallback(() => {
    setCraftingGrid((grid) => {
      const next = [...grid] as CraftingGrid
      const result = craftFromGrid(next, cursorItemRef.current)
      if (result.crafted) {
        triggerHaptic('confirm')
        updateCursorItem(result.cursorItem)
        refreshInventory()
      }
      return next
    })
  }, [refreshInventory, updateCursorItem])

  const dropCursor = useCallback(() => {
    const item = cursorItemRef.current
    if (!item) return
    if (dropItemToWorld(item)) {
      updateCursorItem(null)
      triggerHaptic('confirm')
      refreshInventory()
    }
  }, [dropItemToWorld, refreshInventory, updateCursorItem])

  const dropSelectedHotbarItem = useCallback(
    (dropFullStack: boolean) => {
      const engine = engineRef.current
      if (!engine) return

      const selectedSlot = engine.player.selectedSlot
      const selectedItem = engine.inventory.hotbar[selectedSlot]
      if (!selectedItem) return

      const count = dropFullStack ? Infinity : 1
      const removed = removeInventoryItem(engine.inventory, { area: 'hotbar', index: selectedSlot }, count)
      if (!removed) return

      dropItemToWorld(removed)
      triggerHaptic('confirm')
      refreshInventory()
    },
    [dropItemToWorld, engineRef, refreshInventory],
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'KeyE' && !event.repeat) {
        event.preventDefault()
        event.stopPropagation()
        toggle()
        return
      }

      if (event.code === 'KeyQ' && !event.repeat) {
        event.preventDefault()
        event.stopPropagation()
        if (isOpen && cursorItemRef.current) dropCursor()
        else dropSelectedHotbarItem(event.shiftKey)
        return
      }

      if (!isOpen) return

      event.stopPropagation()
      if (event.code === 'Escape') {
        event.preventDefault()
        close()
      }
    }

    const stopGameInputWhenOpen = (event: KeyboardEvent) => {
      if (!isOpen) return
      event.stopPropagation()
    }

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keyup', stopGameInputWhenOpen, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keyup', stopGameInputWhenOpen, true)
    }
  }, [close, dropCursor, dropSelectedHotbarItem, isOpen, toggle])

  return {
    isOpen,
    cursorItem,
    craftingGrid,
    craftingResult: getCraftingResult(craftingGrid),
    clickSlot,
    secondaryClickSlot,
    clickCraftingSlot,
    secondaryClickCraftingSlot,
    craftResult,
    close,
    dropCursor,
  }
}
