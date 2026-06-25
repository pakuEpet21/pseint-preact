# Agent Notes — pseint-preact

Compact context for OpenCode sessions on this repo.

## Stack & entrypoints

- **Frontend SPA**: Preact 10 + Vite 8 + Tailwind CSS 4 + TypeScript ~6.
- **Entry**: `index.html` → `src/main.tsx` → `src/app.tsx` → `src/components/pseint-ide.tsx`.
- **Core interpreter**: `src/lib/pseint/` (`lexer.ts`, `interpreter.ts`, `format.ts`, `snippets.ts`, `storage.ts`, etc.).
- **No backend / no API**. Everything runs in the browser.

## Aliases

- `@/` resolves to `src/` in both Vite and TypeScript.
- `react` and `react-dom` are aliased to `preact/compat` in both `vite.config.ts` and `tsconfig.app.json`. Import React types from `preact/compat` when needed.

## Verification

- **No test runner is configured.** The only automated check is the build.
- `pnpm run build` runs `tsc -b && vite build`. It must pass before considering a change complete.
- `pnpm run dev` starts the Vite dev server.

## TypeScript constraints

The compiler is stricter than default `tsc`:

- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `verbatimModuleSyntax: true`
- `erasableSyntaxOnly: true`

Remove or use every import; unused variables and parameters will fail the build.

## Code layout

- `src/components/` — UI components (Preact hooks). DOM event types come from `preact/compat`.
- `src/lib/pseint/` — PSeInt parser, interpreter, formatter, snippets, autocomplete, flowchart generator, and localStorage persistence.
- `src/lib/utils.ts` — small helpers (`cn` for Tailwind classes).

## Persistence

- Workspace tabs/content: `localStorage` key `pseint-next:workspace:v1`.
- User preferences: `pseint:theme`, `pseint:fontSize`, `pseint:strictMode`.

## Useful gotchas

- `parser/interpreter` are hand-written recursive-descent and error-recovery based. When changing language rules, update both the parser (`src/lib/pseint/interpreter.ts`) and any runtime checks in the `Interpreter` class.
- The interpreter already errors on reading an undefined variable, but it implicitly creates variables on assignment. The recent "strict mode" feature keeps that behavior so `nombre <- "pablo"` stays valid while requiring `Algoritmo/FinAlgoritmo` and declared targets for `Leer`.
- `Escribir`/`Mostrar`/`Imprimir` and Spanish keywords are normalized to lowercase for matching.

## What this repo does NOT have

- README, tests, linting, formatting, CI, or pre-commit config.
- `opencode.json` or other instruction files.
