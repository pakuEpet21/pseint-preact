import {
  useEffect,
  useRef,
  useCallback,
  useState,
} from "preact/hooks"
import type { ChangeEvent, KeyboardEvent } from "preact/compat"
import { forwardRef, useImperativeHandle } from "preact/compat"
import {
  matchAutocompleteForWord,
  type AutocompleteItem,
} from "@/lib/pseint/autocomplete"

const KEYWORDS = [
  "Algoritmo","FinAlgoritmo","Proceso","FinProceso","Escribir","Mostrar","Imprimir","Leer",
  "Definir","Dimension","Dimensionar","Como","Entero","Real","Logico","Caracter",
  "Si","Entonces","Sino","FinSi","Segun","FinSegun","De","Otro","Modo","Mientras",
  "Hacer","FinMientras","Repetir","Hasta","Que","Para","Con","Paso","FinPara",
  "Funcion","SubProceso","SubAlgoritmo","FinFuncion","FinSubProceso","Verdadero",
  "Falso","Y","O","No","MOD","DIV","Limpiar","Pantalla","Esperar","Tecla",
]
const KW_SET = new Set(KEYWORDS.map((k) => k.toLowerCase()))

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function baseVarName(name: string): string {
  const idx = name.indexOf("[")
  return idx >= 0 ? name.slice(0, idx) : name
}

function highlight(code: string, highlightVar?: string | null): string {
  const target = highlightVar ? baseVarName(highlightVar).toLowerCase() : null
  let out = ""
  let i = 0
  while (i < code.length) {
    const ch = code[i]
    // comments
    if ((ch === "/" && code[i + 1] === "/") || ch === "#") {
      let j = i
      while (j < code.length && code[j] !== "\n") j++
      out += `<span class="tok-comment">${escapeHtml(code.slice(i, j))}</span>`
      i = j
      continue
    }
    // strings
    if (ch === '"' || ch === "'") {
      const q = ch
      let j = i + 1
      while (j < code.length && code[j] !== q && code[j] !== "\n") j++
      if (j < code.length && code[j] === q) j++
      out += `<span class="tok-string">${escapeHtml(code.slice(i, j))}</span>`
      i = j
      continue
    }
    // numbers
    if (/[0-9]/.test(ch)) {
      let j = i
      while (j < code.length && /[0-9.]/.test(code[j])) j++
      out += `<span class="tok-number">${escapeHtml(code.slice(i, j))}</span>`
      i = j
      continue
    }
    // identifiers / keywords
    if (/[a-zA-ZñÑáéíóúÁÉÍÓÚ_]/.test(ch)) {
      let j = i
      while (j < code.length && /[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚ_]/.test(code[j])) j++
      const word = code.slice(i, j)
      if (KW_SET.has(word.toLowerCase())) {
        out += `<span class="tok-keyword">${escapeHtml(word)}</span>`
      } else if (target && word.toLowerCase() === target) {
        out += `<span class="tok-var-highlight">${escapeHtml(word)}</span>`
      } else {
        out += escapeHtml(word)
      }
      i = j
      continue
    }
    // operators
    if ("+-*/^%=<>(),[]&:".includes(ch)) {
      out += `<span class="tok-op">${escapeHtml(ch)}</span>`
      i++
      continue
    }
    out += escapeHtml(ch)
    i++
  }
  return out
}

export interface CodeEditorHandle {
  insertAtCursor: (text: string) => void
  getCursorPosition: () => number
  setCursorPosition: (pos: number) => void
}

interface Props {
  value: string
  onChange: (v: string) => void
  highlightLine?: number | null
  errorLines?: number[]
  onUndo?: () => void
  onRedo?: () => void
  highlightVariable?: { name: string; line?: number } | null
  fontSize?: number
}

function getWordAtCursor(value: string, cursorPos: number): string {
  let start = cursorPos - 1
  while (start >= 0 && /[a-zA-ZñÑáéíóúÁÉÍÓÚ_]/.test(value[start])) {
    start--
  }
  return value.slice(start + 1, cursorPos)
}

function getCursorPixelPosition(
  textarea: HTMLTextAreaElement,
): { top: number; left: number } {
  const { selectionStart, scrollTop, scrollLeft } = textarea
  const text = textarea.value.slice(0, selectionStart)
  const lines = text.split("\n")
  const lineIndex = lines.length - 1
  const colText = lines[lineIndex]

  const style = window.getComputedStyle(textarea)
  const lineHeight = parseFloat(style.lineHeight) || 24
  const paddingLeft = parseFloat(style.paddingLeft) || 12
  const paddingTop = parseFloat(style.paddingTop) || 12

  const tabSizeRaw =
    style.getPropertyValue("tab-size") ||
    style.getPropertyValue("-moz-tab-size") ||
    ""
  const tabSize = Math.max(2, Number.parseInt(tabSizeRaw || "2", 10) || 2)

  const expandTabs = (s: string): string => {
    let out = ""
    let col = 0
    for (const ch of s) {
      if (ch === "\t") {
        const spaces = tabSize - (col % tabSize)
        out += " ".repeat(spaces)
        col += spaces
        continue
      }
      out += ch
      col++
    }
    return out
  }

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  const fontStyle = style.fontStyle || "normal"
  const fontVariant = style.fontVariant || "normal"
  const fontWeight = style.fontWeight || "normal"
  const fontSize = style.fontSize || "14px"
  const fontFamily = style.fontFamily || "monospace"
  if (ctx) {
    ctx.font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize} ${fontFamily}`
  }
  const textWidth = ctx ? ctx.measureText(expandTabs(colText)).width : 0

  const top = lineIndex * lineHeight - scrollTop + paddingTop + lineHeight
  const left = textWidth - scrollLeft + paddingLeft

  return { top, left }
}

export const CodeEditor = forwardRef<CodeEditorHandle, Props>(function CodeEditor(
  { value, onChange, highlightLine, errorLines, onUndo, onRedo, highlightVariable, fontSize = 14 },
  ref,
) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [acVisible, setAcVisible] = useState(false)
  const [acItems, setAcItems] = useState<AutocompleteItem[]>([])
  const [acIndex, setAcIndex] = useState(0)
  const [acPos, setAcPos] = useState({ top: 0, left: 0 })
  const [acPrefix, setAcPrefix] = useState("")

  useImperativeHandle(ref, () => ({
    insertAtCursor(text: string) {
      const ta = taRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = value.slice(0, start) + text + value.slice(end)
      onChange(next)
      setAcVisible(false)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + text.length
        ta.focus()
      })
    },
    getCursorPosition() {
      return taRef.current?.selectionStart ?? 0
    },
    setCursorPosition(pos: number) {
      const ta = taRef.current
      if (!ta) return
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = pos
        ta.focus()
      })
    },
  }))

  const acceptCompletion = useCallback(
    (item: AutocompleteItem) => {
      const ta = taRef.current
      if (!ta) return
      const cursorPos = ta.selectionStart
      const prefixLen = acPrefix.length
      const start = cursorPos - prefixLen
      const end = cursorPos
      const next = value.slice(0, start) + item.snippet + value.slice(end)
      onChange(next)
      setAcVisible(false)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + item.snippet.length
        ta.focus()
      })
    },
    [value, onChange, acPrefix],
  )

  const syncScroll = useCallback(() => {
    if (!taRef.current) return
    const { scrollTop, scrollLeft } = taRef.current
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop
      preRef.current.scrollLeft = scrollLeft
    }
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop
  }, [])

  useEffect(() => {
    syncScroll()
  }, [value, syncScroll])

  useEffect(() => {
    if (!acVisible) return
    const el = dropdownRef.current?.querySelector(
      `[data-ac-idx="${acIndex}"]`,
    ) as HTMLElement | null
    el?.scrollIntoView({ block: "nearest" })
  }, [acVisible, acIndex])

  // Close dropdown on outside click
  useEffect(() => {
    if (!acVisible) return
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        taRef.current &&
        !taRef.current.contains(e.target as Node)
      ) {
        setAcVisible(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [acVisible])

  const updateAutocomplete = useCallback(
    (val: string, cursorPos: number) => {
      const word = getWordAtCursor(val, cursorPos)
      if (word.length < 2) {
        setAcVisible(false)
        return
      }
      const matches = matchAutocompleteForWord(word)
      if (matches.length === 0) {
        setAcVisible(false)
        return
      }
      setAcItems(matches)
      setAcIndex(0)
      setAcPrefix(word)
      if (taRef.current) {
        setAcPos(getCursorPixelPosition(taRef.current))
      }
      setAcVisible(true)
    },
    [],
  )

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.currentTarget.value
    onChange(next)
    requestAnimationFrame(() => {
      updateAutocomplete(next, e.currentTarget.selectionStart)
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget

    // Undo / Redo shortcuts (prevent native textarea undo)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault()
      if (e.shiftKey) {
        onRedo?.()
      } else {
        onUndo?.()
      }
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault()
      onRedo?.()
      return
    }

    // Autocomplete navigation
    if (acVisible) {
      const shownCount = Math.min(acItems.length, 30)
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setAcIndex((prev) => (prev + 1) % shownCount)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setAcIndex((prev) => (prev - 1 + shownCount) % shownCount)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        if (shownCount > 0) {
          e.preventDefault()
          acceptCompletion(acItems[acIndex])
          return
        }
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setAcVisible(false)
        return
      }
    }

    if (e.key === "Tab") {
      e.preventDefault()
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = value.slice(0, start) + "\t" + value.slice(end)
      onChange(next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 1
      })
    }
  }

  const handleKeyUp = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === "ArrowDown" ||
      e.key === "ArrowUp" ||
      e.key === "Enter" ||
      e.key === "Tab" ||
      e.key === "Escape"
    ) {
      return
    }
    const ta = e.currentTarget
    updateAutocomplete(value, ta.selectionStart)
  }

  const handleClick = () => {
    setAcVisible(false)
  }

  const handleScroll = () => {
    syncScroll()
    if (acVisible && taRef.current) {
      setAcPos(getCursorPixelPosition(taRef.current))
    }
  }

  const lines = value.split("\n")
  const lineCount = lines.length

  const lh = fontSize * 1.5

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-card font-mono" style={{ fontSize: `${fontSize}px`, lineHeight: `${lh}px` }}>
      {/* gutter */}
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="select-none overflow-hidden border-r border-border bg-card py-3 text-right text-muted-foreground"
        style={{ minWidth: "2rem" }}
      >
        {lines.map((_, idx) => {
          const lineNum = idx + 1
          const isError = errorLines?.includes(lineNum)
          const isHighlight = highlightLine === lineNum
          return (
            <div
              key={idx}
              className={`relative px-3 ${isHighlight ? "bg-primary/20 text-foreground" : ""} ${isError ? "text-destructive font-semibold" : ""}`}
              style={{ height: `${lh}px` }}
            >
              <div className="flex gap-2 flex-row items-center justify-end">
              {isError && (
                <span className="size-1.5 rounded-full bg-destructive" />
              )}
              {lineNum}
              </div>
            </div>
          )
        })}
      </div>

      {/* editor area */}
      <div className="relative flex-1 overflow-hidden">
        <pre
          ref={preRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre px-3 py-3 text-foreground"
          dangerouslySetInnerHTML={{
            __html: lines.map((line, idx) => {
              const lineNum = idx + 1
              const varForLine = highlightVariable?.line === lineNum ? highlightVariable.name : null
              return highlight(line, varForLine)
            }).join("\n") + "\n",
          }}
        />
        <textarea
          ref={taRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          onScroll={handleScroll}
          spellcheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="absolute inset-0 resize-none overflow-auto whitespace-pre bg-transparent px-3 py-3 text-transparent caret-foreground outline-none"
          aria-label="Editor de pseudocódigo"
        />
        <div className="pointer-events-none absolute bottom-2 right-3 rounded bg-secondary/80 px-2 py-0.5 text-xs text-muted-foreground">
          {lineCount} líneas
        </div>

        {/* Autocomplete dropdown */}
        {acVisible && acItems.length > 0 && (
          <div
            ref={dropdownRef}
            className="autocomplete-dropdown"
            style={{ top: acPos.top, left: acPos.left }}
          >
            {acItems.slice(0, 30).map((item, idx) => (
              <div
                key={item.label}
                data-ac-idx={idx}
                className={`autocomplete-item ${idx === acIndex ? "autocomplete-active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  acceptCompletion(item)
                }}
                onMouseEnter={() => setAcIndex(idx)}
              >
                <span className="autocomplete-label">{item.label}</span>
                <span className="autocomplete-category">{item.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
