import { useEffect, useRef, useState } from "preact/hooks"
import { ChevronRight, Terminal, Keyboard } from "lucide-react"
import type { ConsoleLine } from "@/lib/pseint/interpreter"

interface Props {
  lines: ConsoleLine[]
  waitingForInput: boolean
  onSubmitInput: (value: string) => void
  onHoverVariable?: (variable: { name: string; line?: number } | null) => void
}

export function ConsolePanel({
  lines,
  waitingForInput,
  onSubmitInput,
  onHoverVariable,
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

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-1 overflow-auto px-3 py-2 font-mono text-sm leading-6">
        {lines.length === 0 && !waitingForInput && (
          <p className="text-muted-foreground">
            La salida de tu programa aparecerá aquí. Pulsa{" "}
            <span className="text-primary">Ejecutar</span> para comenzar.
          </p>
        )}
        {lines.map((line, idx) => {
          if (line.type === "error" || line.type === "warning") {
            return (
              <div key={idx} className="my-1 rounded-md border border-destructive/30 bg-destructive/5 p-2">
                <div className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-destructive">●</span>
                  <span className="whitespace-pre-wrap text-destructive">{line.text}</span>
                </div>
                {line.hint && (
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
                className="my-1 flex items-center justify-between gap-2 rounded-md border-l-4 border-l-chart-2 bg-chart-2/5 p-2 transition-colors hover:bg-chart-2/10"
                onMouseEnter={() => line.variable && onHoverVariable?.({ name: line.variable, line: line.sourceLine })}
                onMouseLeave={() => onHoverVariable?.(null)}
              >
                <div className="flex items-start gap-2">
                  <Keyboard className="mt-0.5 size-4 shrink-0 text-chart-2" />
                  <span className="whitespace-pre-wrap text-chart-2 font-medium">{line.text}</span>
                </div>
                {line.variable && (
                  <span className="shrink-0 rounded bg-chart-2/15 px-1.5 py-0.5 text-xs font-semibold text-chart-2">
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
                className="my-1 flex items-center justify-between gap-2 rounded-md border-l-4 border-l-primary bg-primary/5 p-2 transition-colors hover:bg-primary/10"
                onMouseEnter={() => line.variable && onHoverVariable?.({ name: line.variable, line: line.sourceLine })}
                onMouseLeave={() => onHoverVariable?.(null)}
              >
                <div className="flex items-start gap-2">
                  <Terminal className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="whitespace-pre-wrap text-foreground">{line.text}</span>
                </div>
                {line.variable && (
                  <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
                    {line.variable}
                  </span>
                )}
              </div>
            )
          }

          return (
            <div key={idx} className="my-1 whitespace-pre-wrap text-muted-foreground italic">
              {line.text}
            </div>
          )
        })}

        {waitingForInput && (
          <div className="mt-1 flex items-center gap-2">
            <ChevronRight className="size-4 shrink-0 text-primary" />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit()
              }}
              className="flex-1 border-b border-primary/50 bg-transparent pb-0.5 text-foreground outline-none"
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
