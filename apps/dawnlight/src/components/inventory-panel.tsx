import { MdArrowForward, MdClose, MdDeleteOutline, MdMenuBook } from 'react-icons/md'
import { BlockNames } from '../constants'
import { basketWorldBlockFromItem } from '../game/basket-utils'
import { CRAFTING_RECIPE_HINTS } from '../game/crafting-recipes'
import type { CraftingGrid } from '../game/crafting-utils'
import type { InventorySlotRef } from '../game/inventory-utils'
import { BlockType, type Inventory, type InventoryItem } from '../types'
import { blockTextureImages } from '../utils/textures'
import { MobileInventoryPanel } from './mobile-inventory-panel'

export interface InventoryPanelProps {
  inventory: Inventory
  selectedSlot: number
  isOpen: boolean
  cursorItem: InventoryItem | null
  craftingGrid: CraftingGrid
  craftingResult: InventoryItem | null
  onClose: () => void
  onDropCursor: () => void
  onSlotClick: (slot: InventorySlotRef) => void
  onSlotSecondaryClick: (slot: InventorySlotRef) => void
  onCraftingSlotClick: (index: number) => void
  onCraftingSlotSecondaryClick: (index: number) => void
  onCraftResultClick: () => void
}

interface SlotButtonProps {
  item: InventoryItem | null
  label: string
  size?: 'compact' | 'normal' | 'large' | 'crafting'
  selected?: boolean
  onClick: () => void
  onContextMenu?: () => void
}

const panelTexture = 'url("/ui/inventory/inventory-panel-empty-bg.png")'
const insetTexture = 'url("/ui/inventory/clean-honey-oak-fill.png")'

const panelStyle = {
  backgroundColor: 'transparent',
  backgroundImage: panelTexture,
  backgroundRepeat: 'no-repeat',
  backgroundSize: '100% 100%',
  borderColor: 'transparent',
}

const darkInsetStyle = {
  backgroundColor: 'transparent',
  borderColor: 'transparent',
  boxShadow: 'none',
}

const slotFrameStyle = {
  backgroundColor: 'rgba(130, 72, 24, 0.74)',
  backgroundImage: `linear-gradient(180deg, rgba(255,221,151,0.18) 0%, rgba(79,39,13,0.26) 100%), ${insetTexture}`,
  backgroundRepeat: 'no-repeat, repeat',
  backgroundSize: 'cover, 220px 220px',
  backgroundBlendMode: 'soft-light, normal',
  borderColor: 'rgba(154,88,27,0.74)',
  boxShadow: 'inset 0 1px 0 rgba(255,236,172,0.34), inset 0 -4px 10px rgba(73,33,13,0.18), inset 0 0 7px rgba(0,0,0,0.08), 0 1px 0 rgba(239,174,91,0.22)',
}

const inventorySlotStyle = {
  ...slotFrameStyle,
}

const recipeCardStyle = {
  backgroundColor: 'rgba(255,238,190,0.2)',
  borderColor: 'rgba(154,88,27,0.24)',
  boxShadow: 'inset 0 1px 0 rgba(255,250,215,0.18), 0 1px 0 rgba(80,38,12,0.08)',
}

const emptySummaryIconStyle = {
  backgroundColor: 'rgba(255, 246, 214, 0.22)',
  borderColor: 'rgba(154,88,27,0.24)',
  boxShadow: 'inset 0 1px 0 rgba(255,250,215,0.18)',
}

const brassPlateStyle = {
  background: 'transparent',
  borderColor: 'transparent',
  boxShadow: 'none',
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="dawnlight-inventory-label inline-flex items-center gap-2 rounded border px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#5a3213] md:text-xs" style={brassPlateStyle}>
      {children}
    </div>
  )
}

function ItemIcon({ item, size = 'normal' }: { item: InventoryItem; size?: 'compact' | 'normal' | 'large' | 'crafting' }) {
  const basketAppleCount = item.type === BlockType.BASKET && item.storedType === BlockType.APPLE ? (item.storedCount ?? 0) : 0
  const textureType = item.type === BlockType.BASKET ? basketWorldBlockFromItem(item) : item.type
  const iconClass = size === 'crafting' ? 'dawnlight-inventory-item-icon h-6 w-6' : size === 'large' ? 'dawnlight-inventory-item-icon h-8 w-8 md:h-9 md:w-9' : size === 'compact' ? 'dawnlight-inventory-item-icon h-5 w-5 md:h-6 md:w-6' : 'dawnlight-inventory-item-icon h-7 w-7 md:h-8 md:w-8'
  const countClass = size === 'compact' ? 'absolute bottom-0.5 right-0.5 text-[8px] font-bold leading-none text-white drop-shadow-md' : 'absolute bottom-1 right-1.5 text-[10px] font-bold text-white drop-shadow-md md:text-xs'

  return (
    <>
      <img src={blockTextureImages[textureType]} alt={BlockNames[item.type]} className={iconClass} style={{ imageRendering: 'pixelated' }} />
      {item.count > 1 && <span className={countClass}>{item.count}</span>}
      {basketAppleCount > 0 && <span className="absolute top-1 right-1 rounded-sm bg-red-500/90 px-1 text-[9px] font-bold leading-3 text-white shadow-sm">A{basketAppleCount}</span>}
    </>
  )
}

function getItemDescription(item: InventoryItem): string {
  if (item.type === BlockType.BASKET && item.storedType === BlockType.APPLE && (item.storedCount ?? 0) > 0) {
    return `${BlockNames[item.type]} x${item.count}, Apple x${item.storedCount}`
  }

  return `${BlockNames[item.type]} x${item.count}`
}

function SlotButton({ item, label, size = 'normal', selected = false, onClick, onContextMenu }: SlotButtonProps) {
  const sizeClass = size === 'large' ? 'h-10 w-10 md:h-11 md:w-11' : size === 'crafting' ? 'h-8 w-8' : size === 'compact' ? 'h-7 w-7 md:h-8 md:w-8' : 'h-9 w-9 md:h-10 md:w-10'
  const labelClass = size === 'crafting' ? 'absolute top-0.5 left-1 text-[7px] text-white/42' : 'absolute top-0.5 left-1 text-[9px] text-white/42'

  return (
    <button
      type="button"
      aria-label={item ? getItemDescription(item) : label}
      title={item ? getItemDescription(item) : label}
      onClick={onClick}
      onContextMenu={(event) => {
        event.preventDefault()
        onContextMenu?.()
      }}
      className={`dawnlight-inventory-slot relative flex items-center justify-center rounded-md border transition-colors ${sizeClass} ${selected ? 'border-amber-200 bg-amber-300/18 ring-2 ring-amber-500/68' : 'hover:bg-amber-100/12'} shrink-0`}
      style={inventorySlotStyle}
    >
      <span className={labelClass}>{label}</span>
      {item && <ItemIcon item={item} size={size} />}
    </button>
  )
}

function SummaryIconPanel({ item }: { item: InventoryItem | null }) {
  return (
    <div className="relative box-border flex h-full w-full max-w-full shrink-0 items-center justify-center overflow-hidden rounded-md border text-sm font-bold text-[#5a3213]/36" style={item ? slotFrameStyle : emptySummaryIconStyle}>
      {item && <ItemIcon item={item} />}
      {!item && '—'}
    </div>
  )
}

function SummaryTextPanel({ label, item }: { label: string; item: InventoryItem | null }) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-center rounded-md border px-1.5 py-1 text-left" style={recipeCardStyle}>
      <div className="text-[8px] font-bold uppercase tracking-wide text-[#5a3213]/64">{label}</div>
      <div className="max-w-full truncate text-[11px] font-semibold leading-tight text-[#5a3213]/92">{item ? `${BlockNames[item.type]} x${item.count}` : 'Empty'}</div>
    </div>
  )
}

function RecipeMiniSlot({ type }: { type: BlockType | null }) {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded border" style={slotFrameStyle}>
      {type !== null && <img src={blockTextureImages[type]} alt={BlockNames[type]} className="h-3.5 w-3.5" style={{ imageRendering: 'pixelated' }} />}
    </span>
  )
}

export function InventoryPanel({ inventory, selectedSlot, isOpen, cursorItem, craftingGrid, craftingResult, onClose, onDropCursor, onSlotClick, onSlotSecondaryClick, onCraftingSlotClick, onCraftingSlotSecondaryClick, onCraftResultClick }: InventoryPanelProps) {
  if (!isOpen) return null
  const selectedItem = inventory.hotbar[selectedSlot] ?? null

  return (
    <div
      className="dawnlight-inventory-shell fixed inset-0 z-[140] flex items-center justify-center overflow-auto p-3"
      onMouseDown={(event) => {
        event.stopPropagation()
        if (event.target === event.currentTarget) onDropCursor()
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <section
        className="dawnlight-inventory-panel relative hidden overflow-hidden border text-[#5a3213] md:block"
        style={{
          ...panelStyle,
          aspectRatio: '1586 / 992',
          width: 'min(1120px, calc(100vw - 24px), calc((100vh - 24px) * 1.5988))',
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <style>
          {`
            @media (max-height: 700px) {
              .dawnlight-inventory-slot {
                height: 1.65rem !important;
                width: 1.65rem !important;
              }
              .dawnlight-inventory-item-icon {
                height: 1.15rem !important;
                width: 1.15rem !important;
              }
              .dawnlight-inventory-label {
                font-size: 0.625rem !important;
                padding: 0.1875rem 0.625rem !important;
              }
              .dawnlight-inventory-crafting-copy {
                font-size: 0.75rem !important;
                line-height: 1.15 !important;
                margin-top: 0.25rem !important;
              }
              .dawnlight-inventory-build-icon {
                height: 2.5rem !important;
                width: 2.5rem !important;
              }
              .dawnlight-inventory-recipe-list {
                max-height: 10rem !important;
              }
            }
            .dawnlight-inventory-recipe-list {
              scrollbar-width: thin;
              scrollbar-color: rgba(129, 71, 25, 0.82) rgba(255, 238, 196, 0.34);
            }
            .dawnlight-inventory-recipe-list::-webkit-scrollbar {
              width: 0.45rem;
            }
            .dawnlight-inventory-recipe-list::-webkit-scrollbar-track {
              border: 1px solid rgba(107, 61, 23, 0.24);
              border-radius: 999px;
              background: rgba(255, 238, 196, 0.34);
              box-shadow: inset 0 1px 3px rgba(71, 39, 14, 0.14);
            }
            .dawnlight-inventory-recipe-list::-webkit-scrollbar-thumb {
              border: 1px solid rgba(255, 238, 196, 0.44);
              border-radius: 999px;
              background: linear-gradient(180deg, rgba(184, 120, 44, 0.9), rgba(99, 52, 20, 0.85));
              box-shadow: inset 0 1px 0 rgba(255, 245, 205, 0.26), 0 1px 2px rgba(71, 39, 14, 0.2);
            }
            @media (max-width: 700px) {
              .dawnlight-inventory-shell {
                align-items: flex-start !important;
                justify-content: flex-start !important;
              }
              .dawnlight-inventory-panel {
                flex: 0 0 auto !important;
                width: 980px !important;
                margin: 4rem 0 1.5rem 0 !important;
              }
            }
          `}
        </style>
        <div className="absolute left-[39%] top-[calc(8.8%+12px)] flex h-[5%] w-[22%] items-center justify-center">
          <PanelLabel>Inventory</PanelLabel>
        </div>
        <div className="absolute right-[calc(9.5%+10px)] top-[calc(8.4%+4px)] flex items-center gap-2">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="drop cursor item" title="drop cursor item" disabled={!cursorItem} onClick={onDropCursor} className="flex h-[1.6rem] w-[1.6rem] items-center justify-center rounded-md border disabled:opacity-35" style={slotFrameStyle}>
              <MdDeleteOutline size={18} />
            </button>
            <button type="button" aria-label="close inventory" title="close inventory" onClick={onClose} className="flex h-[1.6rem] w-[1.6rem] items-center justify-center rounded-md border" style={slotFrameStyle}>
              <MdClose size={18} />
            </button>
          </div>
        </div>

        <div className="absolute left-[10.1%] top-[18%] h-[63%] w-[38.4%] rounded-lg border px-[1.6%] py-[1.4%]" style={darkInsetStyle}>
          <div className="mb-2 flex items-center justify-between">
            <PanelLabel>Inventory</PanelLabel>
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#5a3213]/56">36 slots</span>
          </div>
          <div className="grid grid-cols-6 justify-items-center gap-2">
            {inventory.slots.map((item, index) => (
              <SlotButton key={`slot-${index}`} item={item} label={`${index + 1}`} size="large" onClick={() => onSlotClick({ area: 'slots', index })} onContextMenu={() => onSlotSecondaryClick({ area: 'slots', index })} />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <PanelLabel>Hotbar</PanelLabel>
            <span className="text-[10px] font-bold uppercase tracking-wide text-[#5a3213]/56">Quick access</span>
          </div>
          <div className="mt-2 grid grid-cols-9 justify-items-center gap-1.5">
            {inventory.hotbar.map((item, index) => (
              <SlotButton key={`hotbar-${index}`} item={item} label={`${index + 1}`} size="compact" selected={index === selectedSlot} onClick={() => onSlotClick({ area: 'hotbar', index })} onContextMenu={() => onSlotSecondaryClick({ area: 'hotbar', index })} />
            ))}
          </div>
        </div>

        <div className="absolute left-[51.5%] top-[18%] h-[12%] w-[29%] rounded-md border px-[1.7%] py-[1.2%]" style={darkInsetStyle}>
          <div className="grid h-full min-w-0 grid-cols-[4.5rem_1.35rem_2rem_minmax(0,1fr)] items-center gap-3">
            <div className="grid w-[4.5rem] shrink-0 grid-cols-2 justify-items-center gap-2">
              {craftingGrid.map((item, index) => (
                <SlotButton key={`craft-${index}`} item={item} label={`C${index + 1}`} size="crafting" onClick={() => onCraftingSlotClick(index)} onContextMenu={() => onCraftingSlotSecondaryClick(index)} />
              ))}
            </div>
            <MdArrowForward className="justify-self-center text-[#9a641d]/76" size={24} aria-hidden="true" />
            <SlotButton item={craftingResult} label="Result" size="crafting" onClick={onCraftResultClick} />
            <div className="min-w-0 pl-2">
              <div className="text-[11px] font-bold uppercase tracking-wide text-[#5a3213]">Crafting</div>
              <p className="dawnlight-inventory-crafting-copy mt-0.5 whitespace-nowrap text-[9px] leading-snug text-[#6f471f]/78">Tools | Food | Blocks</p>
            </div>
          </div>
        </div>

        <div className="absolute left-[51.5%] top-[35.3%] h-[33.5%] w-[37.7%] overflow-hidden rounded-lg border px-[1.3%] py-[1.2%]" style={darkInsetStyle}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <PanelLabel>
              <MdMenuBook size={16} aria-hidden="true" />
              All Recipes
            </PanelLabel>
            <div className="rounded border px-3 py-1 text-[11px] font-semibold uppercase text-[#5a3213]/78" style={slotFrameStyle}>
              All
            </div>
          </div>
          <div className="dawnlight-inventory-recipe-list grid grid-cols-1 gap-1 overflow-y-scroll pr-2" style={{ maxHeight: 'calc(100% - 2.35rem)' }}>
            {CRAFTING_RECIPE_HINTS.map((recipe) => (
              <div key={recipe.key} className="grid min-w-0 grid-cols-[2.25rem_1rem_minmax(0,1fr)] items-center gap-2 rounded-md border px-2 py-1" style={recipeCardStyle}>
                <div className="grid grid-cols-2 gap-0.5 justify-self-start">
                  {recipe.slots.map((type, index) => (
                    <RecipeMiniSlot key={`${recipe.key}-${index}`} type={type} />
                  ))}
                </div>
                <MdArrowForward className="justify-self-center text-[#9a641d]/62" size={16} aria-hidden="true" />
                <div className="flex min-w-0 items-center gap-2">
                  <img src={blockTextureImages[recipe.result.type]} alt={BlockNames[recipe.result.type]} className="h-5 w-5 shrink-0" style={{ imageRendering: 'pixelated' }} />
                  <span className="min-w-0 truncate text-[11px] font-semibold text-[#5a3213]/90">{BlockNames[recipe.result.type]}</span>
                  {recipe.result.count > 1 && <span className="shrink-0 text-[10px] font-semibold text-[#5a3213]/56">x{recipe.result.count}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute left-[calc(50.8%-5px)] top-[70.8%] h-[10.3%] w-[calc(38.5%+8px)] rounded-lg border" style={darkInsetStyle}>
          <div className="absolute top-[10%] left-[10px] h-[80%] w-[74px] overflow-hidden">
            <SummaryIconPanel item={selectedItem} />
          </div>
          <div className="absolute top-[10%] left-[90px] h-[80%] w-20">
            <SummaryTextPanel label="Selected" item={selectedItem} />
          </div>
          <div className="absolute top-[10%] left-[175px] h-[80%] w-20 overflow-hidden">
            <SummaryIconPanel item={cursorItem} />
          </div>
          <div className="absolute top-[10%] left-[260px] h-[80%] w-20">
            <SummaryTextPanel label="Cursor" item={cursorItem} />
          </div>
        </div>

        {cursorItem && (
          <div className="pointer-events-none absolute -right-2 -bottom-2 w-14 h-14 rounded-md border border-white/35 bg-slate-950/90 flex items-center justify-center shadow-2xl">
            <ItemIcon item={cursorItem} />
          </div>
        )}
      </section>
      <MobileInventoryPanel
        inventory={inventory}
        selectedSlot={selectedSlot}
        isOpen={isOpen}
        cursorItem={cursorItem}
        craftingGrid={craftingGrid}
        craftingResult={craftingResult}
        onClose={onClose}
        onDropCursor={onDropCursor}
        onSlotClick={onSlotClick}
        onSlotSecondaryClick={onSlotSecondaryClick}
        onCraftingSlotClick={onCraftingSlotClick}
        onCraftingSlotSecondaryClick={onCraftingSlotSecondaryClick}
        onCraftResultClick={onCraftResultClick}
      />
    </div>
  )
}
