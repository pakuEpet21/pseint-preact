import { useEffect, useRef, useState } from "preact/hooks"
import { ChevronRight, Terminal, Keyboard } from "lucide-react"
import type { ConsoleLine } from "@/lib/pseint/interpreter"

interface Props {
  lines: ConsoleLine[]
  waitingForInput: boolean
  onSubmitInput: (value: string) => void
  onHoverVariable?: (variable: { name: string; line?: number } | null) => void
  simple?: boolean
  consoleFont?: string
  consoleFontSize?: number
}

export function ConsolePanel({
  lines,
  waitingForInput,
  onSubmitInput,
  onHoverVariable,
  simple = false,
  consoleFont,
  consoleFontSize,
}: Props) {
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lines, waitingForInput])

  useEffect(() => {
    if (waitingForInput) inputRef.current?.focus()
  }, [waitingForInput])

  const submit = () => {
    onSubmitInput(input)
    setInput("")
  }

  const consoleStyle: Record<string, string | undefined> = {}
  if (consoleFont) consoleStyle.fontFamily = consoleFont
  if (consoleFontSize) {
    consoleStyle.fontSize = `${consoleFontSize}px`
    consoleStyle.lineHeight = simple ? `${consoleFontSize * 1.25}px` : `${consoleFontSize * 1.5}px`
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div
        className={simple
          ? `min-h-0 flex-1 overflow-auto px-2 py-1 ${consoleFont ? "" : "font-mono"} ${consoleFontSize ? "" : simple ? "text-xs leading-4" : "text-sm leading-6"}`
          : `min-h-0 flex-1 overflow-auto px-3 py-2 ${consoleFont ? "" : "font-mono"} ${consoleFontSize ? "" : "text-sm leading-6"}`
        }
        style={Object.keys(consoleStyle).length > 0 ? consoleStyle : undefined}
      >
        {lines.length === 0 && !waitingForInput && (
          <p className="text-muted-foreground">
            La salida de tu programa aparecerá aquí. Pulsa{" "}
            <span className="text-primary">Ejecutar</span> para comenzar.
          </p>
        )}
        {lines.map((line, idx) => {
          if (line.type === "error" || line.type === "warning") {
            return (
              <div key={idx} className={simple ? "py-0.5 text-destructive" : "my-1 rounded-md border border-destructive/30 bg-destructive/5 p-2"}>
                <div className="flex items-start gap-1.5">
                  <span className={simple ? "text-destructive" : "mt-0.5 text-destructive"}>●</span>
                  <span className="whitespace-pre-wrap text-destructive">{line.text}</span>
                </div>
                {!simple && line.hint && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    💡 {line.hint}
                  </div>
                )}
              </div>
            )
          }

          if (line.type === "in") {
            return (
              <div
                key={idx}
                className={simple
                  ? "flex items-center justify-between gap-1.5 py-0.5 text-chart-2"
                  : "my-1 flex items-center justify-between gap-2 border-l-4 border-l-chart-2 bg-chart-2/5 px-2 py-1 transition-colors hover:bg-chart-2/10"
                }
                onMouseEnter={() => line.variable && onHoverVariable?.({ name: line.variable, line: line.sourceLine })}
                onMouseLeave={() => onHoverVariable?.(null)}
              >
                <div className="flex items-start gap-1.5">
                  {simple ? null : <Keyboard className="mt-0.5 size-4 shrink-0 text-chart-2" />}
                  <span className="whitespace-pre-wrap font-medium">{line.text}</span>
                </div>
                {line.variable && (
                  <span className={simple ? "shrink-0 text-xs text-muted-foreground" : "shrink-0 rounded bg-chart-2/15 px-1.5 py-0.5 text-xs font-semibold text-chart-2"}>
                    {line.variable}
                  </span>
                )}
              </div>
            )
          }

          if (line.type === "out") {
            return (
              <div
                key={idx}
                className={simple
                  ? "flex items-center justify-between gap-1.5 py-0.5"
                  : "my-1 flex items-center justify-between gap-2 border-l-4 border-l-primary bg-primary/5 px-2 py-1.5 transition-colors hover:bg-primary/10"
                }
                onMouseEnter={() => line.variable && onHoverVariable?.({ name: line.variable, line: line.sourceLine })}
                onMouseLeave={() => onHoverVariable?.(null)}
              >
                <div className="flex items-start gap-1.5">
                  {simple ? null : <Terminal className="mt-0.5 size-4 shrink-0 text-primary" />}
                  <span className="whitespace-pre-wrap">{line.text}</span>
                </div>
                {line.variable && (
                  <span className={simple ? "shrink-0 text-xs text-muted-foreground" : "shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary"}>
                    {line.variable}
                  </span>
                )}
              </div>
            )
          }

          return (
            <div key={idx} className={simple ? "whitespace-pre-wrap text-muted-foreground py-0.5" : "my-1 whitespace-pre-wrap text-muted-foreground italic"}>
              {line.text}
            </div>
          )
        })}

        {waitingForInput && (
          <div className={simple ? "flex items-center gap-1.5 py-0.5" : "mt-1 flex items-center gap-2"}>
            <ChevronRight className={simple ? "size-3 shrink-0 text-primary" : "size-4 shrink-0 text-primary"} />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              className={simple ? "flex-1 border-b border-primary/50 bg-transparent text-xs outline-none" : "flex-1 border-b border-primary/50 bg-transparent pb-0.5 text-foreground outline-none"}
              placeholder="Escribe un valor y presiona Enter…"
              aria-label="Entrada del programa"
            />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
