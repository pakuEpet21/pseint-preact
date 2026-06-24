import { useState } from "preact/hooks";
import type { CSSProperties } from "preact/compat";
import {
  Terminal,
  Workflow,
  Eraser,
  StepForward,
} from "lucide-react";
import { ConsolePanel } from "@/components/console-panel";
import { VariableInspector } from "@/components/variable-inspector";
import { FlowchartPanel } from "@/components/flowchart-panel";
import { useResizableSplit } from "@/shared/hooks/useResizableSplit";
import type { ConsoleLine, VarSnapshot } from "@/lib/pseint/interpreter";

interface RightPanelProps {
  lines: ConsoleLine[];
  vars: VarSnapshot[];
  debugActive: boolean;
  debugPaused: boolean;
  waitingForInput: boolean;
  consoleSimple: boolean;
  consoleFont: string;
  consoleFontSize: number;
  debugVars: VarSnapshot[];
  code: string;
  onSubmitInput: (value: string) => void;
  onHoverVariable: (v: { name: string; line?: number } | null) => void;
  onClearConsole: () => void;
  onStep: () => void;
}

export const RightPanel = ({
  lines,
  vars,
  debugActive,
  debugPaused,
  waitingForInput,
  consoleSimple,
  consoleFont,
  consoleFontSize,
  debugVars,
  code,
  onSubmitInput,
  onHoverVariable,
  onClearConsole,
  onStep,
}: RightPanelProps) => {
  const [rightTab, setRightTab] = useState<"console" | "flowchart">("console");
  const { consolePct, setConsolePct, startDrag } = useResizableSplit();

  return (
    <>
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
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                rightTab === "console"
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
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                rightTab === "flowchart"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <Workflow className="size-3.5" />
              Diagrama
            </button>
          </div>
          <div className="flex items-center gap-2">
            {rightTab === "console" && (
              <button
                onClick={onClearConsole}
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
          <div className="flex h-full min-h-0 flex-col">
            {debugActive && (
              <div className="flex items-center justify-between border-b border-border bg-sidebar px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onStep}
                    disabled={!debugPaused || waitingForInput}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Paso
                    <StepForward className="size-3.5" />
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {waitingForInput
                    ? "Esperando entrada…"
                    : debugPaused
                      ? "Pausado"
                      : "Ejecutando…"}
                </span>
              </div>
            )}
            <ConsolePanel
              lines={lines}
              waitingForInput={waitingForInput}
              onSubmitInput={onSubmitInput}
              onHoverVariable={onHoverVariable}
              simple={consoleSimple}
              consoleFont={consoleFont}
              consoleFontSize={consoleFontSize}
            />
            <VariableInspector
              vars={debugActive ? debugVars : vars}
              fontSize={consoleFontSize}
            />
          </div>
        ) : (
          <FlowchartPanel code={code} />
        )}
      </section>
    </>
  );
};
