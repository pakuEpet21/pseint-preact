import * as React from "preact/compat"
import { createPortal } from "preact/compat"
import { cn } from "@/lib/utils"

interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null)

function useDropdownMenuContext() {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx) throw new Error("DropdownMenu components must be used within DropdownMenu")
  return ctx
}

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (open && triggerRef.current && !triggerRef.current.contains(target)) {
        const content = document.querySelector('[data-dropdown-content]')
        if (content && !content.contains(target)) {
          setOpen(false)
        }
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </DropdownMenuContext.Provider>
  )
}

function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(children, document.body)
}

interface DropdownMenuTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  className?: string
}

function DropdownMenuTrigger({ children, asChild, className }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef } = useDropdownMenuContext()
  const triggerElementRef = React.useRef<HTMLElement>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(!open)
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      ref?: React.Ref<HTMLElement>
      onClick?: (e: React.MouseEvent) => void
    }>
    return React.cloneElement(child, {
      ref: (node: HTMLElement | null) => {
        triggerElementRef.current = node
        triggerRef.current = node
      },
      onClick: (e: React.MouseEvent) => {
        handleClick(e)
        child.props.onClick?.(e)
      },
    } as React.ComponentPropsWithoutRef<"div">)
  }

  return (
    <button
      ref={triggerElementRef as React.RefObject<HTMLButtonElement>}
      type="button"
      onClick={handleClick}
      className={className}
    >
      {children}
    </button>
  )
}

interface DropdownMenuContentProps {
  children?: React.ReactNode
  align?: "start" | "center" | "end"
  alignOffset?: number
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
  className?: string
}

function DropdownMenuContent({
  children,
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
}: DropdownMenuContentProps) {
  const { open, setOpen, triggerRef } = useDropdownMenuContext()
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      let top = 0, left = 0

      if (side === "bottom") {
        top = rect.bottom + sideOffset
        left = rect.left
      } else if (side === "top") {
        top = rect.top - sideOffset
        left = rect.left
      } else if (side === "left") {
        top = rect.top
        left = rect.left - sideOffset
      } else if (side === "right") {
        top = rect.top
        left = rect.right + sideOffset
      }

      if (align === "center") {
        left = left + (triggerRef.current.offsetWidth / 2)
      } else if (align === "end") {
        left = left + triggerRef.current.offsetWidth
      }

      setPosition({ top, left })
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open, triggerRef, side, sideOffset, align])

  if (!open) return null

  const slideClass = side === "bottom" ? "slide-in-from-top-2"
    : side === "top" ? "slide-in-from-bottom-2"
    : side === "left" ? "slide-in-from-right-2"
    : "slide-in-from-left-2"

  return (
    <DropdownMenuPortal>
      <div
        data-dropdown-content=""
        style={{ position: "fixed", top: position.top, left: position.left, zIndex: 50 }}
        className={cn(
          "z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
          visible ? `animate-in fade-in-0 zoom-in-95 ${slideClass}` : "animate-out fade-out-0 zoom-out-95",
          className
        )}
        onClick={() => setOpen(false)}
      >
        {children}
      </div>
    </DropdownMenuPortal>
  )
}

function DropdownMenuGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuLabel({
  className,
  inset,
  children,
}: {
  className?: string
  inset?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "px-1.5 py-1 text-xs font-medium text-muted-foreground",
        inset && "pl-7",
        className
      )}
    >
      {children}
    </div>
  )
}

interface DropdownMenuItemProps {
  children?: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: "default" | "destructive"
  inset?: boolean
}

function DropdownMenuItem({
  children,
  onClick,
  className,
  variant = "default",
  inset,
}: DropdownMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/dropdown-menu-item relative flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none",
        "focus:bg-accent focus:text-accent-foreground",
        variant === "destructive" && "text-destructive focus:bg-destructive/10 focus:text-destructive",
        inset && "pl-7",
        className
      )}
    >
      {children}
    </button>
  )
}

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} />
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  onCheckedChange,
}: {
  className?: string
  children?: React.ReactNode
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground",
        className
      )}
    >
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        {checked && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
      {children}
    </button>
  )
}

function DropdownMenuRadioGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuRadioItem({
  className,
  children,
  checked,
  onSelect,
}: {
  className?: string
  children?: React.ReactNode
  checked?: boolean
  onSelect?: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground",
        className
      )}
    >
      <span className="pointer-events-none absolute right-2 flex items-center justify-center">
        {checked && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="4" fill="currentColor"/>
          </svg>
        )}
      </span>
      {children}
    </button>
  )
}

function DropdownMenuSub({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
}: {
  className?: string
  inset?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground",
        inset && "pl-7",
        className
      )}
    >
      {children}
      <svg className="ml-auto" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  children,
}: {
  align?: "start" | "center" | "end"
  alignOffset?: number
  side?: "top" | "bottom" | "left" | "right"
  sideOffset?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <DropdownMenuContent
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      className={cn("w-auto min-w-[96px] rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10", className)}
    >
      {children}
    </DropdownMenuContent>
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}