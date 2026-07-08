import { useState } from 'react'
import { MdArrowForward, MdClose, MdDeleteOutline, MdMenuBook } from 'react-icons/md'
import { BlockNames } from '../constants'
import { basketWorldBlockFromItem } from '../game/basket-utils'
import { CRAFTING_RECIPE_HINTS } from '../game/crafting-recipes'
import { BlockType, type InventoryItem } from '../types'
import { blockTextureImages } from '../utils/textures'
import type { InventoryPanelProps } from './inventory-panel'

const insetTexture = 'url("/ui/inventory/clean-honey-oak-fill.png")'

const mobilePanelStyle = {
  backgroundColor: 'rgba(239, 198, 126, 0.96)',
  backgroundImage: `linear-gradient(180deg, rgba(255,242,197,0.28), rgba(137,78,28,0.18)), ${insetTexture}`,
  backgroundRepeat: 'no-repeat, repeat',
  backgroundSize: 'cover, 220px 220px',
  borderColor: 'rgba(111, 62, 21, 0.64)',
  boxShadow: 'inset 0 0 0 2px rgba(255,236,174,0.36), inset 0 -18px 42px rgba(91,45,16,0.16)',
}

const mobileInsetStyle = {
  backgroundColor: 'rgba(255, 232, 177, 0.45)',
  borderColor: 'rgba(128, 72, 24, 0.34)',
  boxShadow: 'inset 0 1px 0 rgba(255,250,220,0.22), 0 1px 0 rgba(78,38,13,0.1)',
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

const recipeCardStyle = {
  backgroundColor: 'rgba(255,238,190,0.28)',
  borderColor: 'rgba(154,88,27,0.24)',
  boxShadow: 'inset 0 1px 0 rgba(255,250,215,0.18), 0 1px 0 rgba(80,38,12,0.08)',
}

function MobileLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[9px] font-bold uppercase tracking-wide text-[#5a3213]/72">{children}</div>
}

function ItemIcon({ item, size = 'normal' }: { item: InventoryItem; size?: 'small' | 'normal' }) {
  const basketAppleCount = item.type === BlockType.BASKET && item.storedType === BlockType.APPLE ? (item.storedCount ?? 0) : 0
  const textureType = item.type === BlockType.BASKET ? basketWorldBlockFromItem(item) : item.type
  const iconClass = size === 'small' ? 'h-4.5 w-4.5' : 'h-6 w-6'

  return (
    <>
      <img src={blockTextureImages[textureType]} alt={BlockNames[item.type]} className={iconClass} style={{ imageRendering: 'pixelated' }} />
      {item.count > 1 && <span className="absolute right-1 bottom-0.5 text-[9px] font-bold leading-none text-white drop-shadow-md">{item.count}</span>}
      {basketAppleCount > 0 && <span className="absolute top-0.5 right-0.5 rounded-sm bg-red-500/90 px-1 text-[8px] font-bold leading-3 text-white shadow-sm">A{basketAppleCount}</span>}
    </>
  )
}

function itemDescription(item: InventoryItem): string {
  if (item.type === BlockType.BASKET && item.storedType === BlockType.APPLE && (item.storedCount ?? 0) > 0) {
    return `${BlockNames[item.type]} x${item.count}, Apple x${item.storedCount}`
  }

  return `${BlockNames[item.type]} x${item.count}`
}

function MobileSlot({ item, label, selected = false, compact = false, onClick, onContextMenu }: { item: InventoryItem | null; label: string; selected?: boolean; compact?: boolean; onClick: () => void; onContextMenu?: () => void }) {
  return (
    <button
      type="button"
      aria-label={item ? itemDescription(item) : label}
      title={item ? itemDescription(item) : label}
      onClick={onClick}
      onContextMenu={(event) => {
        event.preventDefault()
        onContextMenu?.()
      }}
      className={`relative flex shrink-0 items-center justify-center rounded-md border transition-colors ${compact ? 'h-8 w-8' : 'h-10 w-10'} ${selected ? 'border-amber-200 bg-amber-300/18 ring-2 ring-amber-500/68' : 'hover:bg-amber-100/12'}`}
      style={slotFrameStyle}
    >
      <span className="absolute left-1 top-0.5 text-[7px] text-white/42">{label}</span>
      {item && <ItemIcon item={item} size={compact ? 'small' : 'normal'} />}
    </button>
  )
}

function SummaryPanel({ label, item }: { label: string; item: InventoryItem | null }) {
  return (
    <div className="grid min-w-0 grid-cols-[2.15rem_minmax(0,1fr)] items-center gap-1.5 rounded-md border p-1.5" style={recipeCardStyle}>
      <div className="relative flex h-8.5 w-8.5 items-center justify-center rounded-md border text-xs font-bold text-[#5a3213]/36" style={slotFrameStyle}>
        {item ? <ItemIcon item={item} size="small" /> : '-'}
      </div>
      <div className="min-w-0">
        <MobileLabel>{label}</MobileLabel>
        <div className="truncate text-[11px] font-bold text-[#5a3213]/92">{item ? `${BlockNames[item.type]} x${item.count}` : 'Empty'}</div>
      </div>
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

function MobileRecipe({ recipe }: { recipe: (typeof CRAFTING_RECIPE_HINTS)[number] }) {
  return (
    <div className="grid min-w-0 grid-cols-[2.25rem_1rem_minmax(0,1fr)] items-center gap-2 rounded-md border px-2 py-1.5" style={recipeCardStyle}>
      <div className="grid grid-cols-2 gap-0.5">
        {recipe.slots.map((type, index) => (
          <RecipeMiniSlot key={`${recipe.key}-${index}`} type={type} />
        ))}
      </div>
      <MdArrowForward className="text-[#9a641d]/62" size={15} aria-hidden="true" />
      <div className="flex min-w-0 items-center gap-2">
        <img src={blockTextureImages[recipe.result.type]} alt={BlockNames[recipe.result.type]} className="h-5 w-5 shrink-0" style={{ imageRendering: 'pixelated' }} />
        <span className="min-w-0 truncate text-[11px] font-semibold text-[#5a3213]/90">{BlockNames[recipe.result.type]}</span>
        {recipe.result.count > 1 && <span className="shrink-0 text-[10px] font-semibold text-[#5a3213]/56">x{recipe.result.count}</span>}
      </div>
    </div>
  )
}

type MobileInventoryTab = 'gear' | 'bag' | 'craft'

const mobileTabs: Array<{ id: MobileInventoryTab; label: string }> = [
  { id: 'gear', label: 'Gear' },
  { id: 'bag', label: 'Bag' },
  { id: 'craft', label: 'Craft' },
]

export function MobileInventoryPanel({ inventory, selectedSlot, cursorItem, craftingGrid, craftingResult, onClose, onDropCursor, onSlotClick, onSlotSecondaryClick, onCraftingSlotClick, onCraftingSlotSecondaryClick, onCraftResultClick }: InventoryPanelProps) {
  const selectedItem = inventory.hotbar[selectedSlot] ?? null
  const [activeTab, setActiveTab] = useState<MobileInventoryTab>('bag')

  return (
    <section className="dawnlight-mobile-inventory-panel max-h-[calc(100vh-1rem)] w-[min(23rem,calc(100vw-0.75rem))] overflow-hidden rounded-[1.1rem] border p-2 text-[#5a3213] md:hidden" style={mobilePanelStyle}>
      <style>
        {`
          .dawnlight-mobile-inventory-panel {
            scrollbar-width: thin;
            scrollbar-color: rgba(129, 71, 25, 0.82) rgba(255, 238, 196, 0.34);
          }
          .dawnlight-mobile-inventory-panel::-webkit-scrollbar {
            width: 0.45rem;
          }
          .dawnlight-mobile-inventory-panel::-webkit-scrollbar-track {
            background: rgba(255, 238, 196, 0.34);
          }
          .dawnlight-mobile-inventory-panel::-webkit-scrollbar-thumb {
            border-radius: 999px;
            background: linear-gradient(180deg, rgba(184, 120, 44, 0.9), rgba(99, 52, 20, 0.85));
          }
        `}
      </style>
      <header className="mb-2 flex items-center justify-between rounded-xl border px-2.5 py-1.5" style={mobileInsetStyle}>
        <div>
          <div className="text-[13px] font-black uppercase tracking-wide text-[#5a3213]">Inventory</div>
          <div className="text-[9px] font-semibold uppercase tracking-wide text-[#5a3213]/58">Mobile layout</div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="drop cursor item" title="drop cursor item" disabled={!cursorItem} onClick={onDropCursor} className="flex h-7 w-7 items-center justify-center rounded-md border disabled:opacity-35" style={slotFrameStyle}>
            <MdDeleteOutline size={16} />
          </button>
          <button type="button" aria-label="close inventory" title="close inventory" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md border" style={slotFrameStyle}>
            <MdClose size={16} />
          </button>
        </div>
      </header>

      <div className="mb-2 grid grid-cols-2 gap-1.5">
        <SummaryPanel label="Selected" item={selectedItem} />
        <SummaryPanel label="Cursor" item={cursorItem} />
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1 rounded-xl border p-1" style={mobileInsetStyle}>
        {mobileTabs.map((tab) => (
          <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`h-8 rounded-lg border text-[10px] font-black uppercase tracking-wide transition-colors ${activeTab === tab.id ? 'text-[#4c260d] ring-1 ring-amber-500/64' : 'text-[#5a3213]/58'}`} style={activeTab === tab.id ? slotFrameStyle : recipeCardStyle}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-h-[22rem] min-h-[14rem] overflow-y-auto pr-1">
        {activeTab === 'gear' && (
          <section className="rounded-xl border p-2.5" style={mobileInsetStyle}>
            <div className="mb-1.5 flex items-center justify-between">
              <MobileLabel>Hotbar</MobileLabel>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#5a3213]/56">Quick access</span>
            </div>
            <div className="grid grid-cols-3 justify-items-center gap-1.5">
              {inventory.hotbar.map((item, index) => (
                <MobileSlot key={`mobile-hotbar-${index}`} item={item} label={`${index + 1}`} selected={index === selectedSlot} onClick={() => onSlotClick({ area: 'hotbar', index })} onContextMenu={() => onSlotSecondaryClick({ area: 'hotbar', index })} />
              ))}
            </div>
            <div className="mt-2 rounded-lg border p-1.5" style={recipeCardStyle}>
              <MobileLabel>Selected Slot</MobileLabel>
              <div className="mt-2">
                <SummaryPanel label={`Slot ${selectedSlot + 1}`} item={selectedItem} />
              </div>
            </div>
          </section>
        )}

        {activeTab === 'bag' && (
          <section className="rounded-xl border p-2.5" style={mobileInsetStyle}>
            <div className="mb-1.5 flex items-center justify-between">
              <MobileLabel>Inventory</MobileLabel>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#5a3213]/56">36 slots</span>
            </div>
            <div className="grid grid-cols-4 justify-items-center gap-1.5">
              {inventory.slots.map((item, index) => (
                <MobileSlot key={`mobile-slot-${index}`} item={item} label={`${index + 1}`} compact onClick={() => onSlotClick({ area: 'slots', index })} onContextMenu={() => onSlotSecondaryClick({ area: 'slots', index })} />
              ))}
            </div>
          </section>
        )}

        {activeTab === 'craft' && (
          <section className="rounded-xl border p-2.5" style={mobileInsetStyle}>
            <div className="mb-1.5 flex items-center justify-between">
              <MobileLabel>Crafting</MobileLabel>
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#5a3213]/56">Tools | Food | Blocks</span>
            </div>
            <div className="grid grid-cols-[4.75rem_1rem_2.25rem_minmax(0,1fr)] items-center gap-1.5">
              <div className="grid w-[4.75rem] grid-cols-2 justify-items-center gap-1.5">
                {craftingGrid.map((item, index) => (
                  <MobileSlot key={`mobile-craft-${index}`} item={item} label={`C${index + 1}`} compact onClick={() => onCraftingSlotClick(index)} onContextMenu={() => onCraftingSlotSecondaryClick(index)} />
                ))}
              </div>
              <MdArrowForward className="justify-self-center text-[#9a641d]/76" size={20} aria-hidden="true" />
              <MobileSlot item={craftingResult} label="R" compact onClick={onCraftResultClick} />
              <div className="min-w-0 text-[11px] font-bold uppercase leading-tight text-[#5a3213]/74">Recipe result</div>
            </div>

            <div className="mt-2 rounded-xl border p-2.5" style={recipeCardStyle}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <MdMenuBook size={16} aria-hidden="true" />
                  <MobileLabel>All Recipes</MobileLabel>
                </div>
                <div className="rounded border px-2 py-1 text-[10px] font-semibold uppercase text-[#5a3213]/78" style={slotFrameStyle}>
                  All
                </div>
              </div>
              <div className="grid gap-1.5">
                {CRAFTING_RECIPE_HINTS.map((recipe) => (
                  <MobileRecipe key={recipe.key} recipe={recipe} />
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </section>
  )
}
