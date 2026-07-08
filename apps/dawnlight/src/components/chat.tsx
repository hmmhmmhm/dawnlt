import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import { triggerHaptic } from '../utils/haptics'

interface ChatProps {
  isOpen: boolean
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  onClose: () => void
  initialValue?: string
}

export function Chat({ isOpen, messages, onSendMessage, onClose, initialValue }: ChatProps) {
  const [inputValue, setInputValue] = useState('')
  const [currentTime, setCurrentTime] = useState(Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus input when opened
      if (initialValue) {
        setInputValue(initialValue)
      }
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen, initialValue])

  useEffect(() => {
    // Scroll to bottom when messages change or chat opens
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Update current time every second to handle message fading
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onSendMessage(inputValue)
      setInputValue('')
      onClose()
    } else {
      // Close if empty
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Stop propagation to prevent game controls (WASD) from activating
    e.stopPropagation()

    if (e.key === 'Escape') {
      onClose()
    }
  }

  // Filter visible messages
  // If chat is open, show all
  // If chat is closed, show only messages from last 10 seconds
  const visibleMessages = isOpen ? messages : messages.filter((msg) => currentTime - msg.timestamp < 10000)

  // If closed and no visible messages, show nothing
  if (!isOpen && visibleMessages.length === 0) return null

  const containerClasses = isOpen
    ? 'fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex flex-col justify-end p-4 md:bg-transparent md:backdrop-blur-none md:inset-auto md:left-4 md:bottom-36 md:w-96 md:max-w-[70vw] md:p-0 md:z-50 md:block'
    : 'fixed left-4 top-[10.25rem] md:top-auto md:bottom-36 z-70 w-96 max-w-[70vw] flex flex-col gap-2 pointer-events-none'

  return (
    <div className={containerClasses}>
      {/* Mobile Close Button */}
      {isOpen && (
        <button
          type="button"
          onClick={() => {
            triggerHaptic()
            onClose()
          }}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white md:hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <title>Close chat</title>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Messages Container */}
      <div
        className={`
        rounded-lg p-2 overflow-y-auto flex flex-col no-scrollbar transition-colors duration-200
        ${isOpen ? 'flex-1 mb-2 md:flex-none md:max-h-60 md:bg-black/60 md:backdrop-blur-sm md:mb-2' : 'max-h-60 bg-black/20'}
      `}
      >
        {visibleMessages.map((msg) => (
          <div key={msg.id} className={`text-white text-sm mb-0.5 wrap-break-word ${isOpen ? 'opacity-100' : 'opacity-90'}`}>
            {msg.type === 'system' ? (
              <span className="text-yellow-300 italic">{msg.content}</span>
            ) : (
              <>
                <span className="font-bold text-gray-300 mr-1">&lt;{msg.sender}&gt;</span>
                <span>{msg.content}</span>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="relative pointer-events-auto">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            maxLength={500}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full bg-black/70 text-white px-3 py-2 rounded border border-white/20 focus:border-white/50 focus:outline-none text-sm backdrop-blur-sm shadow-lg font-mono"
            placeholder="Press Enter to send... (/help)"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{inputValue.length}/500</div>
        </form>
      )}
    </div>
  )
}
