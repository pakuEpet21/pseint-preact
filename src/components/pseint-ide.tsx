import { useCallback, useEffect, useRef, useState } from "preact/hooks"
import type { MouseEvent, ChangeEvent, CSSProperties } from "preact/compat"

import {
  Play,
  Square,
  Download,
  FolderOpen,
  Plus,
  X,
  FileCode2,
  Check,
  Trash2,
  PanelLeftOpen,
  Settings,
  Cloud,
  CloudCheck,
  Sparkles,
  Undo2,
  Redo2,
  Eraser,
  Workflow,
  Terminal,
} from "lucide-react"
import { CodeEditor, type CodeEditorHandle } from "@/components/code-editor"
import { SnippetPanel } from "@/components/snippet-panel"
import { ConsolePanel } from "@/components/console-panel"
import { VariableInspector } from "@/components/variable-inspector"
import { FlowchartPanel } from "@/components/flowchart-panel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  runPseint,
  type ConsoleLine,
  type VarSnapshot,
} from "@/lib/pseint/interpreter"
import { formatPseint } from "@/lib/pseint/format"
import { STARTER_CODE } from "@/lib/pseint/snippets"
import {
  loadWorkspace,
  saveWorkspace,
  clearWorkspace,
} from "@/lib/pseint/storage"
const logoDark = "/logo_dark.webp"
const logoLight = "/logo_light.webp"

interface FileTab {
  id: string
  name: string
  content: string
}

let idCounter = 1
const newId = () => `f${idCounter++}`
const stripFileExtension = (name: string) =>
  name.replace(/\.(psc|pseint|txt)$/i, "")

type SaveState = "idle" | "saving" | "saved"

interface Snapshot {
  content: string
  cursor: number
}

interface HistoryEntry {
  past: Snapshot[]
  future: Snapshot[]
}

export function PseintIDE() {
  const [tabs, setTabs] = useState<FileTab[]>([
    { id: newId(), name: "ejemplo.psc", content: STARTER_CODE },
  ])
  const [activeId, setActiveId] = useState(tabs[0].id)
  const [lines, setLines] = useState<ConsoleLine[]>([])
  const [vars, setVars] = useState<VarSnapshot[]>([])
  const [running, setRunning] = useState(false)
  const [waitingForInput, setWaitingForInput] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  // Width of the right (console) panel as a percentage of the split, desktop only.
  const [consolePct, setConsolePct] = useState(38)
  // Toggle the operations (snippets) panel between editor and console.
  const [showOps, setShowOps] = useState(false)
  // Right panel tab: console or flowchart.
  const [rightTab, setRightTab] = useState<"console" | "flowchart">("console")
  // Visual theme: "light", "dark" (default) or "dracula".
  const [theme, setTheme] = useState<"light" | "dark" | "dracula">("dark")
  const [fontSize, setFontSize] = useState(14)
  const [tabPendingClose, setTabPendingClose] = useState<FileTab | null>(null)
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingTabName, setEditingTabName] = useState("")
  const [errorLines, setErrorLines] = useState<number[]>([])
  const [hoveredVariable, setHoveredVariable] = useState<{ name: string; line?: number } | null>(null)
  const draggingRef = useRef(false)
  const splitRef = useRef<HTMLDivElement>(null)
  const inputResolverRef = useRef<((v: string) => void) | null>(null)
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hydratedRef = useRef(false)
  const editorRef = useRef<CodeEditorHandle>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  // History (undo/redo) per tab
  const historiesRef = useRef<Record<string, HistoryEntry>>({})
  const [, setHistoryVersion] = useState(0)
  const prevStateRef = useRef<Record<string, Snapshot>>({})
  const prevActiveIdRef = useRef(activeId)
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUndoingRef = useRef(false)

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]
  void (theme === "light" ? logoDark : logoLight) //NO MODIFICAR ESTO

  // Load saved theme and font size on mount.
  useEffect(() => {
    const savedTheme = localStorage.getItem("pseint:theme")
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "dracula") setTheme(savedTheme)
    const savedFont = localStorage.getItem("pseint:fontSize")
    if (savedFont) {
      const n = Number.parseInt(savedFont, 10)
      if (!Number.isNaN(n) && n >= 10 && n <= 24) setFontSize(n)
    }
  }, [])

  // Apply the theme class to <html> and persist it.
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("dark", "dracula")
    if (theme !== "light") root.classList.add(theme)
    localStorage.setItem("pseint:theme", theme)
  }, [theme])

  // Persist font size.
  useEffect(() => {
    localStorage.setItem("pseint:fontSize", String(fontSize))
  }, [fontSize])

  useEffect(() => {
    if (!editingTabId || !renameInputRef.current) return
    renameInputRef.current.focus()
    renameInputRef.current.select()
  }, [editingTabId])

  // Restore workspace from localStorage on first mount
  useEffect(() => {
    const saved = loadWorkspace()
    if (saved && saved.tabs.length) {
      // ensure id counter does not collide with restored ids
      saved.tabs.forEach((t) => {
        const n = Number.parseInt(t.id.replace(/\D/g, ""), 10)
        if (!Number.isNaN(n) && n >= idCounter) idCounter = n + 1
      })
      setTabs(saved.tabs)
      setActiveId(
        saved.tabs.some((t) => t.id === saved.activeId)
          ? saved.activeId
          : saved.tabs[0].id,
      )
      setLines([
        {
          type: "info",
          text: "Se restauró tu trabajo guardado anteriormente.",
        },
      ])
    }
    hydratedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced auto-save to localStorage whenever tabs or active tab change
  useEffect(() => {
    if (!hydratedRef.current) return
    setSaveState("saving")
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveWorkspace({ tabs, activeId })
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 1500)
    }, 600)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [tabs, activeId])

  const updateActiveContent = useCallback(
    (content: string) => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, content } : t)),
      )
    },
    [activeId],
  )

  const bumpHistory = () => setHistoryVersion((v) => v + 1)

  const getHistory = (id: string): HistoryEntry => {
    return historiesRef.current[id] ?? { past: [], future: [] }
  }

  const pushToPast = (id: string, content: string, cursor: number) => {
    const entry = getHistory(id)
    const past = [...entry.past, { content, cursor }]
    if (past.length > 100) past.shift()
    historiesRef.current[id] = { past, future: [] }
    bumpHistory()
  }

  const undo = useCallback(() => {
    const entry = getHistory(activeId)
    if (entry.past.length === 0) return
    const currentCursor = editorRef.current?.getCursorPosition() ?? 0
    const currentSnapshot = { content: active.content, cursor: currentCursor }
    const previous = entry.past[entry.past.length - 1]
    const newPast = entry.past.slice(0, -1)
    historiesRef.current[activeId] = {
      past: newPast,
      future: [currentSnapshot, ...entry.future],
    }
    bumpHistory()
    isUndoingRef.current = true
    updateActiveContent(previous.content)
    editorRef.current?.setCursorPosition(previous.cursor)
    prevStateRef.current[activeId] = {
      content: previous.content,
      cursor: previous.cursor,
    }
  }, [activeId, active.content])

  const redo = useCallback(() => {
    const entry = getHistory(activeId)
    if (entry.future.length === 0) return
    const currentCursor = editorRef.current?.getCursorPosition() ?? 0
    const currentSnapshot = { content: active.content, cursor: currentCursor }
    const next = entry.future[0]
    const newFuture = entry.future.slice(1)
    historiesRef.current[activeId] = {
      past: [...entry.past, currentSnapshot],
      future: newFuture,
    }
    bumpHistory()
    isUndoingRef.current = true
    updateActiveContent(next.content)
    editorRef.current?.setCursorPosition(next.cursor)
    prevStateRef.current[activeId] = {
      content: next.content,
      cursor: next.cursor,
    }
  }, [activeId, active.content])

  const canUndo = getHistory(activeId).past.length > 0
  const canRedo = getHistory(activeId).future.length > 0

  // Snapshot history on content changes (grouped by 400ms debounce)
  useEffect(() => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false
      prevActiveIdRef.current = activeId
      return
    }

    if (prevActiveIdRef.current !== activeId) {
      // Tab switch: initialize prevState if needed
      if (!(activeId in prevStateRef.current)) {
        prevStateRef.current[activeId] = {
          content: active.content,
          cursor: 0,
        }
      }
      prevActiveIdRef.current = activeId
      return
    }

    const prev = prevStateRef.current[activeId]
    if (!prev) {
      prevStateRef.current[activeId] = {
        content: active.content,
        cursor: editorRef.current?.getCursorPosition() ?? 0,
      }
      return
    }
    if (prev.content === active.content) return

    if (!snapshotTimerRef.current) {
      pushToPast(activeId, prev.content, prev.cursor)
    }

    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current)
    snapshotTimerRef.current = setTimeout(() => {
      snapshotTimerRef.current = null
    }, 400)

    prevStateRef.current[activeId] = {
      content: active.content,
      cursor: editorRef.current?.getCursorPosition() ?? 0,
    }
  }, [active.content, activeId])

  const insertSnippet = useCallback(
    (code: string) => {
      if (editorRef.current) {
        const sep = active.content.length && !active.content.endsWith("\n") ? "\n" : ""
        editorRef.current.insertAtCursor(sep + code + "\n")
      } else {
        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== activeId) return t
            const sep = t.content.length && !t.content.endsWith("\n") ? "\n" : ""
            return { ...t, content: t.content + sep + code + "\n" }
          }),
        )
      }
    },
    [activeId, active.content],
  )

  const addTab = () => {
    const count = tabs.length + 1
    const tab: FileTab = {
      id: newId(),
      name: `archivo${count}.psc`,
      content: "Algoritmo SinTitulo\n\t\nFinAlgoritmo",
    }
    setTabs((prev) => [...prev, tab])
    setActiveId(tab.id)
  }

  const requestCloseTab = (id: string, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const tab = tabs.find((t) => t.id === id)
    if (!tab) return
    setTabPendingClose(tab)
  }

  const confirmCloseTab = () => {
    const id = tabPendingClose?.id
    if (!id) return
    setTabs((prev) => {
      if (prev.length === 1) return prev
      const next = prev.filter((t) => t.id !== id)
      if (id === activeId) setActiveId(next[next.length - 1].id)
      return next
    })
    delete historiesRef.current[id]
    delete prevStateRef.current[id]
    bumpHistory()
    setTabPendingClose(null)
  }

  const renameTab = (id: string) => {
    const tab = tabs.find((t) => t.id === id)
    if (!tab) return
    setEditingTabId(id)
    setEditingTabName(stripFileExtension(tab.name))
  }

  const saveRenamedTab = () => {
    if (!editingTabId) return
    const nextName = editingTabName.trim()
    if (nextName) {
      setTabs((prev) =>
        prev.map((t) => (t.id === editingTabId ? { ...t, name: nextName } : t)),
      )
    }
    setEditingTabId(null)
    setEditingTabName("")
  }

  const cancelRenameTab = () => {
    setEditingTabId(null)
    setEditingTabName("")
  }

  const openFile = () => fileInputRef.current?.click()

  const onFileChosen = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const tab: FileTab = {
        id: newId(),
        name: file.name,
        content: String(reader.result ?? ""),
      }
      setTabs((prev) => [...prev, tab])
      setActiveId(tab.id)
    }
    reader.readAsText(file)
    e.currentTarget.value = ""
  }

  const downloadFile = (format: "psc" | "txt" = "psc") => {
    const blob = new Blob([active.content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const baseName = stripFileExtension(active.name).trim() || "archivo"
    a.download = `${baseName}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetWorkspace = () => {
    const ok = window.confirm(
      "Esto borrará todos los archivos guardados y restaurará el ejemplo inicial. ¿Continuar?",
    )
    if (!ok) return
    clearWorkspace()
    historiesRef.current = {}
    prevStateRef.current = {}
    bumpHistory()
    const tab: FileTab = {
      id: newId(),
      name: "ejemplo.psc",
      content: STARTER_CODE,
    }
    setTabs([tab])
    setActiveId(tab.id)
    setLines([])
  }

  const appendLine = (line: ConsoleLine) => {
    if (line.type === "info" && line.text === "\u0001CLEAR\u0001") {
      setLines([])
      return
    }
    setLines((prev) => [...prev, line])
  }

  const requestInput = (): Promise<string> => {
    setWaitingForInput(true)
    return new Promise<string>((resolve) => {
      inputResolverRef.current = (v: string) => {
        setWaitingForInput(false)
        inputResolverRef.current = null
        resolve(v)
      }
    })
  }

  const submitInput = (value: string) => {
    inputResolverRef.current?.(value)
  }

  const run = async () => {
    if (running) return
    setLines([])
    setVars([])
    setErrorLines([])
    setRunning(true)
    abortRef.current = { aborted: false }
    await runPseint(active.content, {
      onOutput: (line) => {
        appendLine(line)
        if (line.line && (line.type === "error" || line.type === "warning")) {
          setErrorLines((prev) => Array.from(new Set([...prev, line.line!])))
        }
      },
      requestInput,
      signal: abortRef.current,
      onVariables: setVars,
    })
    appendLine({ type: "info", text: "--- Ejecución finalizada ---" })
    setRunning(false)
    setWaitingForInput(false)
  }

  const stop = () => {
    abortRef.current.aborted = true
    // unblock any pending input
    inputResolverRef.current?.("")
    setWaitingForInput(false)
  }

  const formatActiveTab = () => {
    const formatted = formatPseint(active.content)
    updateActiveContent(formatted)
  }

  // Keyboard shortcuts: Ctrl/Cmd+Enter = run, Ctrl/Cmd+S = download, Ctrl+Shift+F = format
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tabPendingClose && e.key === "Escape") {
        e.preventDefault()
        setTabPendingClose(null)
        return
      }
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault()
        formatActiveTab()
        return
      }
      if (e.key === "Enter") {
        e.preventDefault()
        if (!running) void run()
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault()
        downloadFile("psc")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, active, tabPendingClose])

  // Resizable split: drag the divider to change the console width (desktop).
  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!draggingRef.current || !splitRef.current) return
      const rect = splitRef.current.getBoundingClientRect()
      const fromRight = ((rect.right - e.clientX) / rect.width) * 100
      setConsolePct(Math.min(70, Math.max(20, fromRight)))
    }
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [])

  const startDrag = () => {
    draggingRef.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="leading-tight flex  items-center gap- text-lg font-bold">
            <span className="bg-gradient-to-r uppercase from-sky-400 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">Next</span>
            PSeint  </div>
          {/* Save indicator */}
          <div className="ml-2 hidden  items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            {saveState === "saving" && <Cloud className="size-3.5" />}
            {saveState === "saved" && (
              <span className="flex items-center gap-1 text-primary">
                <CloudCheck className="size-3.5" />
              </span>
            )}
            {saveState === "idle" && (
              <span className="flex items-center gap-1">
                <CloudCheck className="size-3.5" />
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">

          <Tooltip >
            <TooltipTrigger asChild>
              <button
                onClick={openFile}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                <FolderOpen className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Abrir archivo</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <Tooltip >
              <TooltipTrigger asChild>
                <DropdownMenuTrigger
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Download className="size-4" />
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Descargar</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="left" align="start" className="w-56">
              <div className="px-2 py-1.5 text-sm font-medium">Descargar como</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => downloadFile("psc")}>
                Archivo PSeInt (.psc)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadFile("txt")}>
                Documento de texto (.txt)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <Tooltip >
              <TooltipTrigger asChild>
                <DropdownMenuTrigger
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Settings className="size-4" />
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">Configuración</TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="left" align="start" className="w-56">
              <div className="px-2 py-1.5 text-sm font-medium">Tema visual</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <span className="size-3.5 rounded-full bg-[oklch(0.97_0_0)] ring-1 ring-border" />
                Light
                {theme === "light" && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <span className="size-3.5 rounded-full bg-[oklch(0.62_0.17_250)]" />
                Dark
                {theme === "dark" && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dracula")}>
                <span className="size-3.5 rounded-full bg-[oklch(0.75_0.16_305)]" />
                Dracula
                {theme === "dracula" && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-sm font-medium">Tamaño de fuente</div>
              <div className="flex items-center justify-between px-2 py-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFontSize((s) => Math.max(10, s - 1)) }}
                  className="flex size-7 items-center justify-center rounded-md border border-border text-sm hover:bg-accent"
                  aria-label="Disminuir fuente"
                >
                  -
                </button>
                <span className="text-sm tabular-nums">{fontSize}px</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFontSize((s) => Math.min(24, s + 1)) }}
                  className="flex size-7 items-center justify-center rounded-md border border-border text-sm hover:bg-accent"
                  aria-label="Aumentar fuente"
                >
                  +
                </button>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={resetWorkspace}
                className="text-destructive"
              >
                <Trash2 className="size-4" />
                Reiniciar espacio de trabajo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {running ? (
            <button
              onClick={stop}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
            >
              <Square className="size-4" />
              Detener
            </button>
          ) : (
            <button
              onClick={run}
              title="Ejecutar (Ctrl+Enter)"
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              <Play className="stroke-3 size-4" />
              <span className="hidden md:flex font-bold">Ejecutar</span>
            </button>
          )}
        </div>
      </header>

      {/* Main split */}
      <div
        ref={splitRef}
        className="flex min-h-0 flex-1 flex-col lg:flex-row"
      >
        {/* Operations panel (flat, scrollable list) on the far left */}
        {showOps ? (
          <div className="flex shrink-0 flex-col border-b border-border animate-in slide-in-from-left-2 fade-in duration-300 lg:w-64 lg:border-b-0 lg:border-r">
            <div className="min-h-0 flex-1">
              <SnippetPanel
                onInsert={insertSnippet}
                onHide={() => setShowOps(false)}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowOps(true)}
            className="hidden lg:flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border-b border-border bg-sidebar py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:w-9 lg:flex-col lg:border-b-0 lg:border-r lg:py-3"
            title="Mostrar operaciones"
          >
            <PanelLeftOpen className="size-4" />
            <span className="lg:[writing-mode:vertical-rl]">Operaciones</span>
          </button>
        )}

        {/* Left: editor */}
        <section className="flex min-h-0 flex-1 flex-col border-b border-border lg:border-b-0">
          {/* Tabs */}
          <div className="flex items-center border-b border-border bg-background">
            <div className="flex flex-1 items-center overflow-x-auto">
              {tabs.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  onDblClick={() => renameTab(t.id)}
                  className={`group flex shrink-0 cursor-pointer items-center gap-2 border-r border-border px-3 py-2 text-sm transition-colors ${t.id === activeId
                      ? "bg-card text-foreground"
                      : "text-muted-foreground hover:bg-accent/50"
                    }`}
                  title="Doble clic para renombrar"
                >
                  <FileCode2 className="size-3.5 text-primary" />
                  {editingTabId === t.id ? (
                    <input
                      ref={renameInputRef}
                      value={editingTabName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingTabName(e.currentTarget.value)}
                      onClick={(e) => e.stopPropagation()}
                      onDblClick={(e) => e.stopPropagation()}
                      onBlur={saveRenamedTab}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          saveRenamedTab()
                        }
                        if (e.key === "Escape") {
                          e.preventDefault()
                          cancelRenameTab()
                        }
                      }}
                      className="min-w-24 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : (
                    <span className="max-w-40 truncate">{stripFileExtension(t.name)}</span>
                  )}
                  <button
                    onClick={(e) => requestCloseTab(t.id, e)}
                    className="cursor-pointer rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
                    aria-label={`Cerrar ${t.name}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <Tooltip >
              <TooltipTrigger asChild>
                <button
                  onClick={addTab}
                  className="shrink-0 cursor-pointer rounded-md  px-2.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Nueva pestaña"
                >
                  <Plus className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Nueva pestaña</TooltipContent>
            </Tooltip>
            <Tooltip >
              <TooltipTrigger asChild>
                <button
                  onClick={formatActiveTab}
                  className="shrink-0 cursor-pointer rounded-md  px-2.5 py-2 text-primary transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Sparkles className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Formatear</TooltipContent>
            </Tooltip>
            <Tooltip >
              <TooltipTrigger asChild>
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="shrink-0 cursor-pointer rounded-md  px-2.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Deshacer"
                >
                  <Undo2 className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Deshacer</TooltipContent>
            </Tooltip>
            <Tooltip >
              <TooltipTrigger asChild>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="shrink-0 cursor-pointer rounded-md  px-2.5 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Rehacer"
                >
                  <Redo2 className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Rehacer</TooltipContent>
            </Tooltip>
            <button
              onClick={() => setShowOps(true)}
              className="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border-l border-border bg-sidebar px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
              title="Mostrar operaciones"
            >
              <PanelLeftOpen className="size-4" />
            </button>
          </div>

          {/* Editor */}
          <div className="min-h-0 flex-1">
            <CodeEditor ref={editorRef} value={active.content} onChange={updateActiveContent} errorLines={errorLines} onUndo={undo} onRedo={redo} highlightVariable={hoveredVariable} fontSize={fontSize} />
          </div>
        </section>

        {/* Drag handle (desktop only) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar consola"
          onMouseDown={startDrag}
          onDblClick={() => setConsolePct(38)}
          className="hidden w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary lg:block"
          title="Arrastra para redimensionar (doble clic para restablecer)"
        />

        {/* Right: console / flowchart */}
        <section
          className="flex min-h-0 flex-1 flex-col lg:flex-none lg:basis-(--console-basis)"
          style={{ "--console-basis": `${consolePct}%` } as CSSProperties}
        >
          <div className="flex items-center justify-between border-b border-border bg-sidebar px-3 py-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRightTab("console")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${rightTab === "console"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
              >
                <Terminal className="size-3.5" />
                Consola
              </button>
              <button
                type="button"
                onClick={() => setRightTab("flowchart")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${rightTab === "flowchart"
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
              >
                <Workflow className="size-3.5" />
                Diagrama
              </button>
            </div>
            <div className="flex items-center gap-2">
              {rightTab === "console" && running && (
                <span className="flex items-center gap-1.5 text-xs text-primary">
                  <span className="size-2 animate-pulse rounded-full bg-primary" />
                  ejecutando…
                </span>
              )}
              {rightTab === "console" && (
                <button
                  onClick={() => {
                    setLines([])
                    setVars([])
                  }}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Limpiar consola"
                >
                  <Eraser className="size-3.5" />
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {rightTab === "console" ? (
            <>
              <ConsolePanel
                lines={lines}
                waitingForInput={waitingForInput}
                onSubmitInput={submitInput}
                onHoverVariable={setHoveredVariable}
              />
              <VariableInspector vars={vars} />
            </>
          ) : (
            <FlowchartPanel code={active.content} />
          )}
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".psc,.txt,.pseint,text/plain"
        onChange={onFileChosen}
        className="hidden"
      />

      {tabPendingClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-file-title"
            aria-describedby="close-file-description"
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-start gap-3 border-b border-border px-5 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
                <X className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="close-file-title" className="text-base font-semibold">
                  Cerrar archivo
                </h2>
                <p
                  id="close-file-description"
                  className="mt-1 text-sm text-muted-foreground"
                >
                  Vas a cerrar <span className="font-medium text-foreground">{tabPendingClose.name}</span>.
                </p>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Si continuás, la pestaña se cierra del editor actual.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={() => setTabPendingClose(null)}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmCloseTab}
                className="rounded-md bg-destructive px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
              >
                Cerrar archivo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
