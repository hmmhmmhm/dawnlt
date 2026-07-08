import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { FaGithub } from 'react-icons/fa'
import { MdChangeHistory, MdClose, MdCropSquare, MdOutlineChatBubble, MdRadioButtonUnchecked } from 'react-icons/md'
import type { InventoryItem } from '../types'
import { triggerHaptic } from '../utils/haptics'
import { HotbarSlot } from './hotbar-slot'

type InputGuideType = 'keyboard' | 'gamepad'

const PUBLIC_REPO_URL = 'https://github.com/hmmhmmhm/dawnlt'

interface HudProps {
  hotbar: (InventoryItem | null)[]
  selectedSlot: number
  onToggleChat: () => void
  onSlotSelect?: (slot: number) => void
}

interface KeyBadgeProps {
  children: ReactNode
  className?: string
}

const GUIDE_PANEL_STYLE: CSSProperties = {
  borderColor: 'rgba(255,255,255,0.24)',
  background: 'linear-gradient(180deg, rgba(41,59,82,0.28) 0%, rgba(17,29,46,0.26) 55%, rgba(10,16,28,0.2) 100%)',
  boxShadow: '0 8px 18px rgba(2,7,18,0.26), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -6px 14px rgba(0,0,0,0.18)',
}

const KEY_BADGE_STYLE: CSSProperties = {
  borderColor: 'rgba(255,255,255,0.34)',
  background: 'linear-gradient(180deg, rgba(58,86,120,0.34) 0%, rgba(23,40,62,0.28) 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -3px 8px rgba(0,0,0,0.16)',
}

const GUIDE_TEXT_STYLE: CSSProperties = {
  fontFamily: '"Silkscreen", "Press Start 2P", monospace',
  fontWeight: 700,
  letterSpacing: '0.02em',
}

function KeyBadge({ children, className = '' }: KeyBadgeProps) {
  return (
    <span className={`inline-flex items-center justify-center h-5 min-w-[22px] px-1.5 rounded-md border border-white/35 bg-white/12 text-[10px] font-bold leading-none text-[#ecf8ff] ${className}`} style={KEY_BADGE_STYLE}>
      {children}
    </span>
  )
}

interface GuideItemProps {
  label: string
  keys: ReactNode[]
}

function GuideItem({ label, keys }: GuideItemProps) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="flex items-center gap-1">{keys}</div>
      <span className="text-[11px] text-white/92 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">{label}</span>
    </div>
  )
}

function isTabletDevice(): boolean {
  const ua = navigator.userAgent || navigator.vendor || ''
  if (/Windows/i.test(ua)) return false
  const tabletRegex = /iPad|Tablet|Kindle|Silk|PlayBook|Android(?!.*Mobile)/i
  if (tabletRegex.test(ua)) return true
  const touchPoints = navigator.maxTouchPoints || 0
  const minSide = Math.min(window.innerWidth, window.innerHeight)
  return touchPoints > 0 && minSide >= 720 && minSide <= 1366
}

export function Hud({ hotbar, selectedSlot, onToggleChat, onSlotSelect }: HudProps) {
  const [visibleCount, setVisibleCount] = useState(9)
  const [inputGuideType, setInputGuideType] = useState<InputGuideType>('keyboard')
  const [showDesktopGuide, setShowDesktopGuide] = useState(false)
  const [_viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  const [leftGuideMarquee, setLeftGuideMarquee] = useState(false)
  const [rightGuideMarquee, setRightGuideMarquee] = useState(false)
  const leftGuideViewportRef = useRef<HTMLDivElement | null>(null)
  const rightGuideViewportRef = useRef<HTMLDivElement | null>(null)
  const leftGuideContentRef = useRef<HTMLDivElement | null>(null)
  const rightGuideContentRef = useRef<HTMLDivElement | null>(null)
  const floatingIconButtonStyle: CSSProperties = {
    borderColor: 'rgba(255,255,255,0.32)',
    background: 'linear-gradient(180deg, rgba(41,59,82,0.32) 0%, rgba(17,29,46,0.3) 55%, rgba(10,16,28,0.26) 100%)',
    boxShadow: '0 8px 18px rgba(2,7,18,0.32), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -6px 14px rgba(0,0,0,0.2)',
  }
  const slotIdleStyle: CSSProperties = {
    borderColor: 'rgba(255,255,255,0.24)',
    background: 'linear-gradient(180deg, rgba(41,59,82,0.24) 0%, rgba(17,29,46,0.24) 55%, rgba(10,16,28,0.2) 100%)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -5px 10px rgba(0,0,0,0.2)',
  }
  const slotSelectedStyle: CSSProperties = {
    borderColor: 'rgba(255,255,255,0.75)',
    background: 'linear-gradient(180deg, rgba(48,94,130,0.5) 0%, rgba(27,56,84,0.48) 58%, rgba(18,39,62,0.44) 100%)',
    boxShadow: '0 8px 18px rgba(0,14,32,0.35), 0 0 0 1px rgba(255,255,255,0.26), inset 0 1px 0 rgba(255,255,255,0.36), inset 0 -8px 16px rgba(0,0,0,0.24)',
  }

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const margin = 24 // Safety margin
      setViewportWidth(width)
      setShowDesktopGuide(width >= 1024 && !isTabletDevice())

      if (width < 768) {
        // Mobile: w-9 (36px) + gap-1 (4px) = 40px per unit (approx)
        // Exact: 12px(padding) + 36px*N + 4px*(N-1) + 8px(selected expansion)
        // 12 + 40N - 4 + 8 = 16 + 40N
        const count = Math.floor((width - margin - 16) / 40)
        setVisibleCount(Math.min(Math.max(count, 1), 9))
      } else {
        // Desktop: w-12 (48px) + gap-2 (8px)
        // Exact: 16px(padding) + 48px*N + 8px*(N-1) + 8px(selected expansion)
        // 16 + 56N - 8 + 8 = 16 + 56N
        const count = Math.floor((width - margin - 16) / 56)
        setVisibleCount(Math.min(Math.max(count, 1), 9))
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!showDesktopGuide) {
      setLeftGuideMarquee(false)
      setRightGuideMarquee(false)
      return
    }

    const detectOverflow = () => {
      const leftViewport = leftGuideViewportRef.current
      const rightViewport = rightGuideViewportRef.current
      const leftContent = leftGuideContentRef.current
      const rightContent = rightGuideContentRef.current
      if (!leftViewport || !rightViewport || !leftContent || !rightContent) return

      setLeftGuideMarquee(leftContent.scrollWidth > leftViewport.clientWidth + 1)
      setRightGuideMarquee(rightContent.scrollWidth > rightViewport.clientWidth + 1)
    }

    detectOverflow()

    const observer = new ResizeObserver(detectOverflow)
    if (leftGuideViewportRef.current) observer.observe(leftGuideViewportRef.current)
    if (rightGuideViewportRef.current) observer.observe(rightGuideViewportRef.current)
    if (leftGuideContentRef.current) observer.observe(leftGuideContentRef.current)
    if (rightGuideContentRef.current) observer.observe(rightGuideContentRef.current)
    window.addEventListener('resize', detectOverflow)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', detectOverflow)
    }
  }, [showDesktopGuide])

  useEffect(() => {
    const setGamepadGuide = () => setInputGuideType('gamepad')
    const setKeyboardGuide = () => setInputGuideType('keyboard')

    const hasConnectedGamepad = () => {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return false
      return Array.from(navigator.getGamepads()).some((g) => g?.connected)
    }

    const hasGamepadActivity = () => {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return false
      const threshold = 0.25
      return Array.from(navigator.getGamepads()).some((gamepad) => {
        if (!gamepad?.connected) return false
        const axisActive = gamepad.axes.some((axis) => Math.abs(axis) > threshold)
        const buttonActive = gamepad.buttons.some((button) => button.pressed || button.value > threshold)
        return axisActive || buttonActive
      })
    }

    const handleKeyboardActivity = () => {
      if (hasConnectedGamepad()) setKeyboardGuide()
    }

    const pollActiveInput = () => {
      if (hasGamepadActivity()) setGamepadGuide()
    }
    const handleGamepadDisconnected = () => {
      if (!hasConnectedGamepad()) setKeyboardGuide()
    }

    if (hasConnectedGamepad()) setGamepadGuide()

    window.addEventListener('gamepadconnected', setGamepadGuide)
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected)
    window.addEventListener('keydown', handleKeyboardActivity)
    window.addEventListener('mousedown', handleKeyboardActivity)

    const pollId = window.setInterval(pollActiveInput, 250)
    return () => {
      window.removeEventListener('gamepadconnected', setGamepadGuide)
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected)
      window.removeEventListener('keydown', handleKeyboardActivity)
      window.removeEventListener('mousedown', handleKeyboardActivity)
      window.clearInterval(pollId)
    }
  }, [])

  const isKeyboardGuide = inputGuideType === 'keyboard'
  const leftGuideItems = isKeyboardGuide
    ? [
        <GuideItem
          key="move"
          label="Move"
          keys={[
            <KeyBadge key="w" className="text-green-300 border-green-300/60">
              W
            </KeyBadge>,
            <KeyBadge key="a" className="text-pink-300 border-pink-300/60">
              A
            </KeyBadge>,
            <KeyBadge key="s" className="text-red-300 border-red-300/60">
              S
            </KeyBadge>,
            <KeyBadge key="d" className="text-blue-300 border-blue-300/60">
              D
            </KeyBadge>,
          ]}
        />,
        <GuideItem
          key="jump"
          label="Jump"
          keys={[
            <KeyBadge key="space" className="min-w-[44px] text-green-300 border-green-300/60">
              SPACE
            </KeyBadge>,
          ]}
        />,
        <GuideItem
          key="run"
          label="Sprint"
          keys={[
            <KeyBadge key="shift" className="text-pink-300 border-pink-300/60">
              SHIFT
            </KeyBadge>,
          ]}
        />,
      ]
    : [
        <GuideItem
          key="move"
          label="Move"
          keys={[
            <KeyBadge key="ls" className="min-w-[28px]">
              LS
            </KeyBadge>,
          ]}
        />,
        <GuideItem
          key="jump"
          label="Jump"
          keys={[
            <KeyBadge key="a" className="text-green-300 border-green-300/60">
              A
            </KeyBadge>,
          ]}
        />,
        <GuideItem key="run" label="Sprint" keys={[<KeyBadge key="lt">LT</KeyBadge>]} />,
      ]
  const rightGuideItems = isKeyboardGuide
    ? [
        <GuideItem
          key="look"
          label="Look"
          keys={[
            <KeyBadge key="mouse" className="min-w-[34px]">
              MOUSE
            </KeyBadge>,
          ]}
        />,
        <GuideItem
          key="break"
          label="Break"
          keys={[
            <KeyBadge key="left-click" className="min-w-[54px] text-blue-300 border-blue-300/60">
              L-CLICK
            </KeyBadge>,
          ]}
        />,
        <GuideItem
          key="place"
          label="Place"
          keys={[
            <KeyBadge key="right-click" className="min-w-[54px] text-red-300 border-red-300/60">
              R-CLICK
            </KeyBadge>,
          ]}
        />,
        <GuideItem
          key="chat-capture"
          label="Chat/Capture"
          keys={[
            <KeyBadge key="enter" className="text-green-300 border-green-300/60">
              ENTER
            </KeyBadge>,
            <KeyBadge key="f2" className="text-blue-300 border-blue-300/60">
              F2
            </KeyBadge>,
          ]}
        />,
      ]
    : [
        <GuideItem
          key="look"
          label="Look"
          keys={[
            <KeyBadge key="rs" className="min-w-[28px]">
              RS
            </KeyBadge>,
          ]}
        />,
        <GuideItem
          key="break"
          label="Break"
          keys={[
            <KeyBadge key="x" className="text-blue-300 border-blue-300/60">
              X
            </KeyBadge>,
            <KeyBadge key="rt">RT</KeyBadge>,
          ]}
        />,
        <GuideItem
          key="place"
          label="Place"
          keys={[
            <KeyBadge key="b" className="text-red-300 border-red-300/60">
              B
            </KeyBadge>,
          ]}
        />,
        <GuideItem key="slot" label="Slot" keys={[<KeyBadge key="l1">L1</KeyBadge>, <KeyBadge key="r1">R1</KeyBadge>]} />,
        <GuideItem key="chat" label="Chat" keys={[<KeyBadge key="start">START</KeyBadge>]} />,
      ]
  const faceButtonLegend = isKeyboardGuide ? null : (
    <div className="hidden xl:flex items-center gap-1.5 shrink-0">
      <KeyBadge className="text-green-300 border-green-300/60">
        <MdChangeHistory size={12} />
      </KeyBadge>
      <KeyBadge className="text-pink-300 border-pink-300/60">
        <MdCropSquare size={12} />
      </KeyBadge>
      <KeyBadge className="text-red-300 border-red-300/60">
        <MdRadioButtonUnchecked size={12} />
      </KeyBadge>
      <KeyBadge className="text-blue-300 border-blue-300/60">
        <MdClose size={12} />
      </KeyBadge>
    </div>
  )
  const hotbarReserveWidth = Math.max(320, Math.min(560, 28 + visibleCount * 56))
  const leftGuideVisibleItems = leftGuideItems
  const rightGuideVisibleItems = rightGuideItems
  const hotbarBottom = 24

  return (
    <>
      <div className="fixed top-4 left-4 z-70 pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic()
            onToggleChat()
          }}
          aria-label="채팅 열기"
          title="채팅"
          className="w-10 h-10 border rounded-full flex items-center justify-center text-white backdrop-blur-md active:scale-95 transition-transform"
          style={floatingIconButtonStyle}
        >
          <MdOutlineChatBubble size={20} style={{ color: 'rgba(230,246,255,0.95)', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))' }} />
        </button>
        <a
          href={PUBLIC_REPO_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub 저장소 열기"
          title="GitHub"
          className="w-10 h-10 border rounded-full flex items-center justify-center text-white backdrop-blur-md active:scale-95 transition-transform"
          style={floatingIconButtonStyle}
          onClick={() => triggerHaptic()}
        >
          <FaGithub size={21} style={{ color: 'rgba(230,246,255,0.95)', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.35))' }} />
        </a>
      </div>

      <div className="fixed left-0 z-70 pointer-events-none w-full flex justify-center" style={{ bottom: `${hotbarBottom}px` }}>
        <div className="flex gap-1 md:gap-2 p-1.5 md:p-2 rounded-2xl items-end transition-all duration-300 ease-out pointer-events-auto">
          {hotbar.slice(0, visibleCount).map((item, i) => (
            <HotbarSlot key={`hotbar-slot-${i}`} item={item} slot={i} selectedSlot={selectedSlot} slotSelectedStyle={slotSelectedStyle} slotIdleStyle={slotIdleStyle} guideTextStyle={GUIDE_TEXT_STYLE} onSlotSelect={onSlotSelect} />
          ))}
        </div>
      </div>

      {showDesktopGuide && (
        <div className="fixed left-0 right-0 bottom-2 z-60 px-4 pointer-events-none hidden lg:grid items-end" style={{ gridTemplateColumns: `minmax(0,1fr) ${hotbarReserveWidth}px minmax(0,1fr)` }}>
          <div className="justify-self-start max-w-full px-3 py-2 rounded-xl border backdrop-blur-sm flex items-center gap-3 overflow-hidden text-white/95" style={{ ...GUIDE_PANEL_STYLE, ...GUIDE_TEXT_STYLE }}>
            <div ref={leftGuideViewportRef} className="min-w-0 flex-1 overflow-hidden">
              <div className={`flex w-max min-w-max items-center ${leftGuideMarquee ? 'dawnlight-guide-marquee-track' : ''}`}>
                <div ref={leftGuideContentRef} className={`flex w-max min-w-max items-center gap-3 shrink-0 ${leftGuideMarquee ? 'pr-6' : ''}`}>
                  {faceButtonLegend}
                  <div className="flex w-max min-w-max items-center gap-3">{leftGuideVisibleItems}</div>
                </div>
                {leftGuideMarquee && (
                  <div aria-hidden className="flex w-max min-w-max items-center gap-3 shrink-0 pr-6">
                    {faceButtonLegend}
                    <div className="flex w-max min-w-max items-center gap-3">{leftGuideVisibleItems}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div />
          <div className="justify-self-end max-w-full px-3 py-2 rounded-xl border backdrop-blur-sm flex items-center gap-3 overflow-hidden text-white/95" style={{ ...GUIDE_PANEL_STYLE, ...GUIDE_TEXT_STYLE }}>
            <div ref={rightGuideViewportRef} className="min-w-0 flex-1 overflow-hidden">
              <div className={`flex w-max min-w-max items-center ${rightGuideMarquee ? 'dawnlight-guide-marquee-track' : ''}`}>
                <div ref={rightGuideContentRef} className={`flex w-max min-w-max items-center gap-3 shrink-0 ${rightGuideMarquee ? 'pr-6' : ''}`}>
                  <div className="flex w-max min-w-max items-center gap-3">{rightGuideVisibleItems}</div>
                </div>
                {rightGuideMarquee && (
                  <div aria-hidden className="flex w-max min-w-max items-center gap-3 shrink-0 pr-6">
                    <div className="flex w-max min-w-max items-center gap-3">{rightGuideVisibleItems}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
