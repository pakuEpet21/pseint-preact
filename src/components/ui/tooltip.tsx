import * as React from "preact/compat"
import { createPortal } from "preact/compat"
import { cn } from "@/lib/utils"

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("((pointer: coarse))")
    setIsMobile(mq.matches)
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", listener)
    return () => mq.removeEventListener("change", listener)
  }, [])
  return isMobile
}

interface TooltipState {
  open: boolean
  triggerRect: DOMRect | null
}

interface TooltipContextValue {
  state: TooltipState
  setState: React.Dispatch<React.SetStateAction<TooltipState>>
  delay: number
  hoverPopupRef: React.MutableRefObject<boolean>
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

function useTooltipContext() {
  const ctx = React.useContext(TooltipContext)
  if (!ctx) throw new Error("Tooltip components must be used within TooltipProvider")
  return ctx
}

function Tooltip({ children, delay = 500 }: { children: React.ReactNode; delay?: number }) {
  const [state, setState] = React.useState<TooltipState>({ open: false, triggerRect: null })
  const hoverPopupRef = React.useRef(false)
  return (
    <TooltipContext.Provider value={{ state, setState, delay, hoverPopupRef }}>
      {children}
    </TooltipContext.Provider>
  )
}

interface TooltipTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  className?: string
}

function TooltipTrigger({ children, asChild, className }: TooltipTriggerProps) {
  const { setState, delay, hoverPopupRef } = useTooltipContext()
  const triggerRef = React.useRef<HTMLElement>(null)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleClose = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (!hoverPopupRef.current) {
        setState(s => ({ ...s, open: false }))
      }
    }, 50)
  }, [delay, hoverPopupRef, setState])

  const handleMouseEnter = React.useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        setState({ open: true, triggerRect: triggerRef.current.getBoundingClientRect() })
      }
    }, delay)
  }, [delay, setState])

  const handleMouseLeave = React.useCallback(() => {
    scheduleClose()
  }, [scheduleClose])

  React.useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      ref?: React.Ref<HTMLElement>
      onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void
      onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void
    }>
    return React.cloneElement(child, {
      ref: (node: HTMLElement | null) => { triggerRef.current = node },
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { handleMouseEnter(); child.props.onMouseEnter?.(e) },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { handleMouseLeave(); child.props.onMouseLeave?.(e) },
    } as React.ComponentPropsWithoutRef<"div">)
  }

  return (
    <span
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </span>
  )
}

interface TooltipContentProps {
  children?: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
  align?: "center" | "start" | "end"
  alignOffset?: number
  className?: string
}

function TooltipContent({
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  className,
}: TooltipContentProps) {
  const { state } = useTooltipContext()
  const isMobile = useIsMobile()
  if (isMobile) return null
  const [mounted, setMounted] = React.useState(false)
  const [visible, setVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ top: 0, left: 0, transform: "" })
  const unmountTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current)
    }
  }, [])

  React.useEffect(() => {
    if (state.open && state.triggerRect) {
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current)
      const rect = state.triggerRect
      let top = 0, left = 0
      let transform = ""

      if (side === "top") {
        top = rect.top - sideOffset
        if (align === "center") {
          left = rect.left + rect.width / 2
          transform = "translateX(-50%) translateY(-100%)"
        } else if (align === "start") {
          left = rect.left
          transform = "translateY(-100%)"
        } else if (align === "end") {
          left = rect.right
          transform = "translateX(-100%) translateY(-100%)"
        }
      } else if (side === "bottom") {
        top = rect.bottom + sideOffset
        if (align === "center") {
          left = rect.left + rect.width / 2
          transform = "translateX(-50%)"
        } else if (align === "start") {
          left = rect.left
          transform = ""
        } else if (align === "end") {
          left = rect.right
          transform = "translateX(-100%)"
        }
      } else if (side === "left") {
        left = rect.left - sideOffset
        if (align === "center") {
          top = rect.top + rect.height / 2
          transform = "translateX(-100%) translateY(-50%)"
        } else if (align === "start") {
          top = rect.top
          transform = "translateX(-100%)"
        } else if (align === "end") {
          top = rect.bottom
          transform = "translateX(-100%) translateY(-100%)"
        }
      } else if (side === "right") {
        left = rect.right + sideOffset
        if (align === "center") {
          top = rect.top + rect.height / 2
          transform = "translateY(-50%)"
        } else if (align === "start") {
          top = rect.top
          transform = ""
        } else if (align === "end") {
          top = rect.bottom
          transform = "translateY(-100%)"
        }
      }

      if (align === "start") left -= alignOffset
      else if (align === "end") left += alignOffset

      setPosition({ top, left, transform })
      setMounted(true)
      requestAnimationFrame(() => setVisible(true))
    } else if (!state.open && mounted) {
      setVisible(false)
      unmountTimerRef.current = setTimeout(() => {
        setMounted(false)
      }, 150)
    }
  }, [state.open, state.triggerRect, side, sideOffset, align, alignOffset, mounted])

  if (!mounted) return null

  let transformOrigin = "center"
  if (side === "top") transformOrigin = align === "center" ? "center bottom" : align === "start" ? "left bottom" : "right bottom"
  else if (side === "bottom") transformOrigin = align === "center" ? "center top" : align === "start" ? "left top" : "right top"
  else if (side === "left") transformOrigin = align === "center" ? "right center" : align === "start" ? "right top" : "right bottom"
  else if (side === "right") transformOrigin = align === "center" ? "left center" : align === "start" ? "left top" : "left bottom"

  const slideClass = side === "top" ? "slide-in-from-bottom-2"
    : side === "bottom" ? "slide-in-from-top-2"
    : side === "left" ? "slide-in-from-right-2"
    : "slide-in-from-left-2"

  return createPortal(
    <div
      style={{ position: "fixed", top: position.top, left: position.left, transform: position.transform, zIndex: 50 }}
    >
      <div
        style={{ transformOrigin }}
        className={cn(
          "pointer-events-none z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background",
          visible ? `animate-in fade-in-0 zoom-in-95 ${slideClass}` : "animate-out fade-out-0 zoom-out-50",
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export { Tooltip, TooltipTrigger, TooltipContent }