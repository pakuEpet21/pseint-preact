import { useEffect, useState } from "preact/hooks";
import "./animations.css";

import { PseintIDE } from "./components/pseint-ide";
import { parseExamUrl } from "./lib/pseint/share";

type AppRoute =
  | { type: "ide"; examMode: boolean; examConsigna?: string; fixedConsignaTab?: boolean; readOnlyConsigna?: boolean }
  | { type: "error"; message: string };

function resolveRoute(): AppRoute {
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // Teacher side: /exam route — editable consigna tab
  if (path === "/exam") {
    return { type: "ide", examMode: true, fixedConsignaTab: true, readOnlyConsigna: false };
  }

  // Student side: ?exam + ?keyword present — read-only consigna from URL
  if (params.has("exam") && params.has("keyword")) {
    // parseExamUrl is async, so we return a placeholder and load async
    return { type: "ide", examMode: true, examConsigna: undefined, fixedConsignaTab: true, readOnlyConsigna: true };
  }

  // Normal IDE
  return { type: "ide", examMode: false };
}

export function App() {
  const [route, setRoute] = useState<AppRoute | null>(null);

  useEffect(() => {
    const resolved = resolveRoute();

    if (resolved.type === "ide" && resolved.examMode && resolved.examConsigna === undefined && resolved.readOnlyConsigna === true) {
      // Try to parse the exam URL asynchronously (student side with URL params)
      parseExamUrl()
        .then((result) => {
          if (result) {
            setRoute({
              type: "ide",
              examMode: true,
              examConsigna: result.consigna,
              fixedConsignaTab: true,
              readOnlyConsigna: true,
            });
          } else {
            // Exam param present but couldn't decode — show error state
            setRoute({
              type: "error",
              message: "No se pudo decodificar el enlace del examen. Verificá que el enlace sea válido.",
            });
          }
        })
        .catch(() => {
          setRoute({
            type: "error",
            message: "Error al cargar el examen. Intentá de nuevo.",
          });
        });
    } else {
      setRoute(resolved);
    }
  }, []);

  if (!route) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (route.type === "error") {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md rounded-xl border border-destructive bg-card p-6 text-center">
          <p className="text-destructive">{route.message}</p>
          <a
            href="/"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
          >
            Volver al IDE
          </a>
        </div>
      </div>
    );
  }

  return (
    <PseintIDE
      examMode={route.examMode}
      examConsigna={route.examConsigna}
      fixedConsignaTab={route.fixedConsignaTab}
      readOnlyConsigna={route.readOnlyConsigna}
    />
  );
}
