import { useState } from "preact/hooks";
import {
  Variable as VariableIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { VarSnapshot } from "@/lib/pseint/interpreter";

interface VariableInspectorProps {
  vars: VarSnapshot[];
  fontSize?: number;
}

export function VariableInspector({ vars, fontSize }: VariableInspectorProps) {
  const [open, setOpen] = useState(true);

  if (!vars.length) return null;

  return (
    <div className="border-t border-border bg-sidebar">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        <VariableIcon className="size-3.5 text-primary" />
        Variables ({vars.length})
      </button>
      {open && (
        <div className="max-h-48 overflow-auto px-2 pb-2">
          <table
            className={`w-full text-left font-mono ${fontSize ? "" : "text-xs"}`}
            style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
          >
            <thead className="sticky top-0 bg-sidebar text-muted-foreground">
              <tr>
                <th className="px-2 py-1 font-medium">Nombre</th>
                <th className="px-2 py-1 font-medium">Tipo</th>
                <th className="px-2 py-1 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {vars.map((v) => (
                <tr
                  key={v.name}
                  className="border-t border-border/60 align-top"
                >
                  <td className="px-2 py-1 text-primary">{v.name}</td>
                  <td className="px-2 py-1 text-muted-foreground">{v.type}</td>
                  <td className="px-2 py-1 text-foreground break-all">
                    {v.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
