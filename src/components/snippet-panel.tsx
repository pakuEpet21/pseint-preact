import { useState } from "preact/hooks"
import { ChevronRight, PanelBottomClose, PanelLeftClose, PanelTopClose } from "lucide-react"
import { SNIPPET_CATEGORIES } from "@/lib/pseint/snippets"

export function SnippetPanel({
  onInsert,
  onHide,
}: {
  onInsert: (code: string) => void
  onHide: () => void
}) {
  const [openCategory, setOpenCategory] = useState(() => {
    const hasOps = SNIPPET_CATEGORIES.some((c) => c.name === "Operaciones")
    return hasOps ? "Operaciones" : SNIPPET_CATEGORIES[0]?.name ?? ""
  })

  return (
    <div className="flex h-full w-full flex-col bg-sidebar">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
     
        <button
          type="button"
          onClick={onHide}
          className="ml-auto flex cursor-pointer items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Ocultar operaciones"
          aria-label="Ocultar operaciones"
        >
          <PanelTopClose className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul className="divide-y divide-border/60">
          {SNIPPET_CATEGORIES.map((cat) => {
            const open = cat.name === openCategory
            return (
              <li key={cat.name}>
                <button
                  type="button"
                  onClick={() => setOpenCategory(open ? "" : cat.name)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent"
                >
                  <ChevronRight
                    className={[
                      "size-4 shrink-0 transition-transform",
                      open ? "rotate-90 text-primary" : "",
                    ].join(" ")}
                  />
                  <span className="flex-1">{cat.name}</span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {cat.snippets.length}
                  </span>
                </button>
                {open && (
                  <ul className="border-t border-border/60">
                    {cat.snippets.map((s) => (
                      <li key={s.label}>
                        <button
                          onClick={() => onInsert(s.code)}
                          className="group flex w-full cursor-pointer items-start gap-2 px-6 py-2 text-left transition-colors hover:bg-accent"
                          title={`Insertar: ${s.label}`}
                        >
                          <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                          <span className="w-full">
                            <span className="block text-sm font-medium text-foreground">
                              {s.label}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {s.description}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
