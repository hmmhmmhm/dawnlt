import type { CSSProperties } from 'react'
import { BlockNames } from '../constants'
import { basketWorldBlockFromItem } from '../game/basket-utils'
import type { InventoryItem } from '../types'
import { BlockType } from '../types'
import { triggerHaptic } from '../utils/haptics'
import { blockTextureImages } from '../utils/textures'

interface HotbarSlotProps {
  item: InventoryItem | null
  slot: number
  selectedSlot: number
  slotSelectedStyle: CSSProperties
  slotIdleStyle: CSSProperties
  guideTextStyle: CSSProperties
  onSlotSelect?: (slot: number) => void
}

export function HotbarSlot({ item, slot, selectedSlot, slotSelectedStyle, slotIdleStyle, guideTextStyle, onSlotSelect }: HotbarSlotProps) {
  const isSelected = slot === selectedSlot
  const selectSlot = () => {
    triggerHaptic()
    onSlotSelect?.(slot)
  }
  const textureType = item?.type === BlockType.BASKET ? basketWorldBlockFromItem(item) : item?.type

  return (
    <button
      type="button"
      key={`hotbar-slot-${slot}`}
      onClick={selectSlot}
      onTouchEnd={(e) => {
        e.preventDefault()
        selectSlot()
      }}
      className={`
        relative flex items-center justify-center
        transition-all duration-200 ease-out shrink-0 cursor-pointer
        ${isSelected ? 'w-11 h-11 md:w-14 md:h-14 -translate-y-1' : 'w-9 h-9 md:w-12 md:h-12 active:bg-white/10'}
        border rounded-xl overflow-hidden
      `}
      style={isSelected ? slotSelectedStyle : slotIdleStyle}
    >
      <span className="absolute top-0.5 left-1 md:top-1 md:left-1.5 text-white/50 text-[8px] md:text-[10px] font-bold" style={guideTextStyle}>
        {slot + 1}
      </span>
      {item && item.count > 0 && (
        <>
          <div className={`relative ${isSelected ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>
            <img src={blockTextureImages[textureType ?? item.type]} alt={BlockNames[item.type]} className="w-6 h-6 md:w-8 md:h-8" style={{ imageRendering: 'pixelated' }} />
          </div>
          {item.count > 1 && (
            <span className="absolute bottom-0.5 right-1 md:bottom-0.5 md:right-1.5 text-white text-[8px] md:text-[10px] font-bold drop-shadow-md" style={guideTextStyle}>
              {item.count}
            </span>
          )}
        </>
      )}
    </button>
  )
}
