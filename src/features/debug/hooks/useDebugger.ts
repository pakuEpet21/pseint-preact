import { useCallback, useRef, useState } from "preact/hooks";
import { flushSync } from "react-dom";
import type { ConsoleLine, VarSnapshot } from "@/lib/pseint/interpreter";
import { validateChallenge } from "@/lib/pseint/challenges";
import type { ChallengeData } from "@/lib/pseint/challenges";

interface DebugController {
  active: boolean;
  continueMode: boolean;
  resume?: () => void;
}

export interface RunOptions {
  challenge?: ChallengeData;
  strictMode: boolean;
  strongTyping: boolean;
  debug: boolean;
}

export interface UseDebuggerReturn {
  running: boolean;
  waitingForInput: boolean;
  debugActive: boolean;
  debugPaused: boolean;
  debugLine: number | null;
  debugVars: VarSnapshot[];
  lines: ConsoleLine[];
  vars: VarSnapshot[];
  errorLines: number[];
  // Internal setters exposed for callbacks
  _setLines: React.Dispatch<React.SetStateAction<ConsoleLine[]>>;
  _setVars: React.Dispatch<React.SetStateAction<VarSnapshot[]>>;
  _setErrorLines: React.Dispatch<React.SetStateAction<number[]>>;
  _setWaitingForInput: React.Dispatch<React.SetStateAction<boolean>>;
  _setRunning: React.Dispatch<React.SetStateAction<boolean>>;
  _setDebugActive: React.Dispatch<React.SetStateAction<boolean>>;
  _setDebugPaused: React.Dispatch<React.SetStateAction<boolean>>;
  _setDebugLine: React.Dispatch<React.SetStateAction<number | null>>;
  _setDebugVars: React.Dispatch<React.SetStateAction<VarSnapshot[]>>;
  _clearDebugState: () => void;
  _inputResolverRef: React.MutableRefObject<((v: string) => void) | null>;
  _abortRef: React.MutableRefObject<{ aborted: boolean }>;
  _debugControllerRef: React.MutableRefObject<DebugController>;
  run: (
    content: string,
    opts: RunOptions,
    callbacks: {
      appendLine: (line: ConsoleLine) => void;
      requestInput: () => Promise<string>;
      signal: { aborted: boolean };
    },
  ) => Promise<void>;
  stop: () => void;
  step: () => void;
  clearConsole: () => void;
}

export const useDebugger = (): UseDebuggerReturn => {
  const [running, setRunning] = useState(false);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [debugActive, setDebugActive] = useState(false);
  const [debugPaused, setDebugPaused] = useState(false);
  const [debugLine, setDebugLine] = useState<number | null>(null);
  const [debugVars, setDebugVars] = useState<VarSnapshot[]>([]);
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [vars, setVars] = useState<VarSnapshot[]>([]);
  const [errorLines, setErrorLines] = useState<number[]>([]);

  const abortRef = useRef({ aborted: false });
  const inputResolverRef = useRef<((v: string) => void) | null>(null);
  const debugControllerRef = useRef<DebugController>({ active: false, continueMode: false });

  const clearDebugState = useCallback(() => {
    setDebugActive(false);
    setDebugPaused(false);
    setDebugLine(null);
    setDebugVars([]);
    debugControllerRef.current = { active: false, continueMode: false };
  }, []);

  const step = useCallback(() => {
    if (!debugControllerRef.current.active) return;
    debugControllerRef.current.continueMode = false;
    debugControllerRef.current.resume?.();
  }, []);

  const clearConsole = useCallback(() => {
    setLines([]);
    setVars([]);
    setErrorLines([]);
  }, []);

  const stop = useCallback(() => {
    abortRef.current.aborted = true;
    inputResolverRef.current?.("");
    setWaitingForInput(false);
    debugControllerRef.current.resume?.();
  }, []);

  const run = useCallback(async (
    content: string,
    opts: RunOptions,
    callbacks: {
      appendLine: (line: ConsoleLine) => void;
      requestInput: () => Promise<string>;
      signal: { aborted: boolean };
    },
  ) => {
    if (running) return;
    setLines([]);
    setVars([]);
    setErrorLines([]);
    setRunning(true);
    abortRef.current = { aborted: false };
    clearDebugState();

    const { challenge, strictMode, strongTyping, debug } = opts;
    const { appendLine, requestInput, signal } = callbacks;

    if (debug) {
      setDebugActive(true);
      debugControllerRef.current = { active: true, continueMode: false };
    }

    try {
      if (challenge) {
        const result = await validateChallenge(challenge, content);
        for (const r of result.results) {
          const expected = challenge.testCases.find((t) => t.input === r.input)?.expectedOutput ?? "";
          appendLine({
            type: r.passed ? "info" : "error",
            text: r.passed
              ? `✅ Prueba "${r.input}" | Obtuviste: "${r.output}" | Esperado: "${expected}"`
              : `❌ Prueba "${r.input}" | Obtuviste: "${r.output}" | Esperado: "${expected}"`,
          });
        }
        if (result.passed === result.total) {
          appendLine({ type: "info", text: `🎉 ¡Desafío completado! (${result.passed}/${result.total} pruebas)` });
        } else {
          appendLine({ type: "info", text: `❌ Incorrecto. ${result.passed}/${result.total} pruebas pasaron.` });
          appendLine({ type: "info", text: `💡 Pista: ${challenge.hint}` });
        }
      } else {
        const { runPseint } = await import("@/lib/pseint/interpreter");
        await runPseint(content, {
          onOutput: (line) => {
            appendLine(line);
            if (line.line && (line.type === "error" || line.type === "warning")) {
              setErrorLines((prev) => Array.from(new Set([...prev, line.line!])));
            }
          },
          requestInput,
          signal,
          onVariables: setVars,
          strictMode,
          strongTyping,
          debug,
          onStep: async (line, v) => {
            if (!debugControllerRef.current.active) return;
            if (debugControllerRef.current.continueMode) {
              flushSync(() => {
                setDebugLine(line);
                setDebugVars(v);
                setDebugPaused(false);
              });
              return;
            }
            setDebugLine(line);
            setDebugVars(v);
            setDebugPaused(true);
            return new Promise<void>((resolve) => {
              debugControllerRef.current.resume = () => {
                debugControllerRef.current.resume = undefined;
                resolve();
              };
            });
          },
        });
      }
    } finally {
      setRunning(false);
      setWaitingForInput(false);
      clearDebugState();
    }
  }, [running, clearDebugState]);

  return {
    running,
    waitingForInput,
    debugActive,
    debugPaused,
    debugLine,
    debugVars,
    lines,
    vars,
    errorLines,
    _setLines: setLines,
    _setVars: setVars,
    _setErrorLines: setErrorLines,
    _setWaitingForInput: setWaitingForInput,
    _setRunning: setRunning,
    _setDebugActive: setDebugActive,
    _setDebugPaused: setDebugPaused,
    _setDebugLine: setDebugLine,
    _setDebugVars: setDebugVars,
    _clearDebugState: clearDebugState,
    _inputResolverRef: inputResolverRef,
    _abortRef: abortRef,
    _debugControllerRef: debugControllerRef,
    run,
    stop,
    step,
    clearConsole,
  };
};
