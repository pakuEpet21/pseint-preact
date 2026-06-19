import { useEffect, useRef } from "preact/hooks"
import type { JSX } from "preact"
import { X, Moon, Sun, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  theme: "light" | "dark" | "dracula"
  setTheme: (theme: "light" | "dark" | "dracula") => void
  fontSize: number
  setFontSize: (size: number) => void
  strictMode: boolean
  setStrictMode: (strict: boolean) => void

}

function Section({
  title,
  children,
}: {
  title: string
  children: JSX.Element | JSX.Element[]
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  )
}

function ThemeCard({
  label,
  active,
  onClick,
  icon,
  className,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon: JSX.Element
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-xl border p-3 text-sm transition-all",
        "hover:bg-accent hover:border-ring",
        active
          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
          : "border-border bg-card text-foreground",
        className,
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
  
    </button>
  )
}

function Switch({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-background shadow ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
  theme,
  setTheme,
  fontSize,
  setFontSize,
  strictMode,
  setStrictMode,

}: SettingsDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="flex h-full items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2
              id="settings-title"
              className="text-lg font-semibold"
            >
              Configuración
            </h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Cerrar configuración"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6 p-6">
            <Section title="Apariencia">
              <div className="flex gap-3">
                <ThemeCard
                  label="Light"
                  active={theme === "light"}
                  onClick={() => setTheme("light")}
                  icon={
                    <span className="flex size-8 items-center justify-center rounded-full bg-[oklch(0.97_0_0)] ring-1 ring-border">
                      <Sun className="size-4 text-foreground" />
                    </span>
                  }
                />
                <ThemeCard
                  label="Dark"
                  active={theme === "dark"}
                  onClick={() => setTheme("dark")}
                  icon={
                    <span className="flex size-8 items-center justify-center rounded-full bg-[oklch(0.62_0.17_250)] ring-1 ring-border">
                      <Moon className="size-4 text-white" />
                    </span>
                  }
                />
                <ThemeCard
                  label="Dracula"
                  active={theme === "dracula"}
                  onClick={() => setTheme("dracula")}
                  icon={
                    <span className="flex size-8 items-center justify-center rounded-full bg-[oklch(0.75_0.16_305)] ring-1 ring-border">
                      <Sparkles className="size-4 text-white" />
                    </span>
                  }
                />
              </div>
            </Section>

            <Section title="Editor">
              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <div className="text-sm font-medium">Tamaño de fuente</div>
                  <div className="text-xs text-muted-foreground">
                    Ajusta el tamaño del editor de código
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                    className="flex size-8 items-center justify-center rounded-md border border-border text-sm hover:bg-accent"
                    aria-label="Disminuir fuente"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-sm tabular-nums">{fontSize}px</span>
                  <button
                    type="button"
                    onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                    className="flex size-8 items-center justify-center rounded-md border border-border text-sm hover:bg-accent"
                    aria-label="Aumentar fuente"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <div className="text-sm font-medium">Modo estricto</div>
                  <div className="text-xs text-muted-foreground">
                    Requiere Algoritmo/FinAlgoritmo y variables definidas
                  </div>
                </div>
                <Switch checked={strictMode} onCheckedChange={setStrictMode} />
              </div>
            </Section>

           
          </div>
        </div>
      </div>
    </div>
  )
}
