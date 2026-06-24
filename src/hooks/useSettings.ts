import { useCallback, useEffect, useState } from "preact/hooks";

export type Theme = "light" | "dark" | "dracula";
export type SaveState = "idle" | "saving" | "saved";

const DEFAULT_CONSOLE_FONT =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace";

export interface UseSettingsReturn {
  theme: Theme;
  setTheme: (t: Theme) => void;
  fontSize: number;
  setFontSize: (n: number) => void;
  strictMode: boolean;
  setStrictMode: (b: boolean) => void;
  strongTyping: boolean;
  setStrongTyping: (b: boolean) => void;
  consoleSimple: boolean;
  setConsoleSimple: (b: boolean) => void;
  consoleFont: string;
  setConsoleFont: (s: string) => void;
  editorFont: string;
  setEditorFont: (s: string) => void;
  consoleFontSize: number;
  setConsoleFontSize: (n: number) => void;
  saveState: SaveState;
  setSaveState: (s: SaveState) => void;
}

export const useSettings = (): UseSettingsReturn => {
  const [theme, setTheme] = useState<Theme>("dracula");
  const [fontSize, setFontSize] = useState(14);
  const [strictMode, setStrictMode] = useState(true);
  const [strongTyping, setStrongTyping] = useState(true);
  const [consoleSimple, setConsoleSimple] = useState(false);
  const [consoleFont, setConsoleFont] = useState(DEFAULT_CONSOLE_FONT);
  const [editorFont, setEditorFont] = useState(DEFAULT_CONSOLE_FONT);
  const [consoleFontSize, setConsoleFontSize] = useState(14);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  // Load saved settings on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("pseint:theme");
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "dracula") {
      setTheme(savedTheme);
    }
    const savedFont = localStorage.getItem("pseint:fontSize");
    if (savedFont) {
      const n = Number.parseInt(savedFont, 10);
      if (!Number.isNaN(n) && n >= 10 && n <= 24) setFontSize(n);
    }
    const savedStrict = localStorage.getItem("pseint:strictMode");
    if (savedStrict) setStrictMode(savedStrict === "true");
    const savedStrongTyping = localStorage.getItem("pseint:strongTyping");
    if (savedStrongTyping) setStrongTyping(savedStrongTyping === "true");
    const savedConsoleSimple = localStorage.getItem("pseint:consoleSimple");
    if (savedConsoleSimple) setConsoleSimple(savedConsoleSimple === "true");
    const savedConsoleFont = localStorage.getItem("pseint:consoleFont");
    if (savedConsoleFont) setConsoleFont(savedConsoleFont);
    const savedEditorFont = localStorage.getItem("pseint:editorFont");
    if (savedEditorFont) setEditorFont(savedEditorFont);
    const savedConsoleFontSize = localStorage.getItem("pseint:consoleFontSize");
    if (savedConsoleFontSize) {
      const n = Number.parseInt(savedConsoleFontSize, 10);
      if (!Number.isNaN(n) && n >= 10 && n <= 24) setConsoleFontSize(n);
    }
  }, []);

  // Apply theme to <html> and persist
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "dracula");
    if (theme !== "light") root.classList.add(theme);
    localStorage.setItem("pseint:theme", theme);
  }, [theme]);

  const persist = useCallback((key: string, value: string) => {
    localStorage.setItem(key, value);
  }, []);

  useEffect(() => { persist("pseint:fontSize", String(fontSize)); }, [fontSize, persist]);
  useEffect(() => { persist("pseint:strictMode", String(strictMode)); }, [strictMode, persist]);
  useEffect(() => { persist("pseint:strongTyping", String(strongTyping)); }, [strongTyping, persist]);
  useEffect(() => { persist("pseint:consoleSimple", String(consoleSimple)); }, [consoleSimple, persist]);
  useEffect(() => { persist("pseint:consoleFont", consoleFont); }, [consoleFont, persist]);
  useEffect(() => { persist("pseint:editorFont", editorFont); }, [editorFont, persist]);
  useEffect(() => { persist("pseint:consoleFontSize", String(consoleFontSize)); }, [consoleFontSize, persist]);

  return {
    theme,
    setTheme,
    fontSize,
    setFontSize,
    strictMode,
    setStrictMode,
    strongTyping,
    setStrongTyping,
    consoleSimple,
    setConsoleSimple,
    consoleFont,
    setConsoleFont,
    editorFont,
    setEditorFont,
    consoleFontSize,
    setConsoleFontSize,
    saveState,
    setSaveState,
  };
};
