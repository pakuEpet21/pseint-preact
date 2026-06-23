# Tasks: Step-by-step debug execution

## Summary

| Field         | Value                                    |
| ------------- | ---------------------------------------- |
| Change        | debug-step-by-step                       |
| Strategy      | Single PR (forecast under review budget) |
| Review budget | 400 changed lines                        |
| Forecast      | ~160 changed lines                       |
| Budget risk   | Low                                      |

## Progress

- [x] T1 — Extend interpreter contract for debug mode
- [x] T2 — Pause execution before each statement and loop iteration
- [x] T3 — Add debug session state and controller to the IDE
- [x] T4 — Add debug button and toolbar UI
- [x] T5 — Wire current-line highlight and variable inspector
- [x] T6 — Verify build and manual scenarios

## Tasks

### T1 — Extend interpreter contract for debug mode

**File:** `src/lib/pseint/interpreter.ts`  
**Estimated changed lines:** ~50  
**Dependencies:** None  
**Description:**

- Add `debug?: boolean` and `onStep?: (line: number, vars: VarSnapshot[]) => Promise<void>` to `RunOptions`.
- Extract a reusable `captureVariables(scope): VarSnapshot[]` helper from the existing `emitVariables` logic.
- Ensure `VarSnapshot` type is accessible to the IDE import path.

### T2 — Pause execution before each statement and loop iteration

**File:** `src/lib/pseint/interpreter.ts`  
**Estimated changed lines:** ~30  
**Dependencies:** T1  
**Description:**

- At the top of `execStmt`, after `this.tick(...)`, call `await opts.onStep?.(node.line, captureVariables(scope))` when `opts.debug` is true.
- Inside `Mientras`, `Para`, and `Repetir`, after the existing iteration `tick()`, call `await opts.onStep?.(node.line, captureVariables(scope))`.
- Preserve existing `maxSteps` and abort-signal behavior so Stop and infinite-loop protection keep working.

### T3 — Add debug session state and controller to the IDE

**File:** `src/components/pseint-ide.tsx`  
**Estimated changed lines:** ~40  
**Dependencies:** T2  
**Description:**

- Add state: `debugActive`, `debugPaused`, `debugLine`, `debugVars`.
- Add `debugControllerRef` with `active`, `continueMode`, and `resume` callback.
- Implement `onStep` handler: update UI, return a Promise resolved by `resume()`.
- Implement Step/Continue/Stop control functions.

### T4 — Add debug button and toolbar UI

**File:** `src/components/pseint-ide.tsx`  
**Estimated changed lines:** ~40  
**Dependencies:** T3  
**Description:**

- Add a Debug toggle button next to the existing "Ejecutar" button.
- Render a debug toolbar (Step, Continue, Stop) inside the console panel when `debugActive`.
- Indicate when execution is waiting for a step or for user input.

### T5 — Wire current-line highlight and variable inspector

**File:** `src/components/pseint-ide.tsx`  
**Estimated changed lines:** ~20  
**Dependencies:** T3  
**Description:**

- Pass `highlightLine={debugLine}` to `CodeEditor` while paused.
- Feed `debugVars` into the existing `VariableInspector` during debug mode.
- Detect source-code edits while debugging and call the stop routine to end the session cleanly.

### T6 — Verify build and manual scenarios

**Files:** All changed files  
**Estimated changed lines:** ~0 (verification only)  
**Dependencies:** T4, T5  
**Description:**

- Run `npm run build` and fix any TypeScript errors (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`).
- Manually verify:
  - Start debug and step through a simple assignment.
  - Variable inspector updates after each step.
  - Step through `Leer` and submit input.
  - Step through a `Mientras` loop; each iteration pauses on the header.
  - Continue runs to completion.
  - Editing code during debug ends the session cleanly.

## Delivery Plan

- **PR type:** Single PR.
- **Commits:** Grouped by work unit:
  1. `feat(interpreter): add debug onStep hook and variable snapshots` (T1 + T2)
  2. `feat(ide): add debug session controller and controls` (T3)
  3. `feat(ide): add debug toolbar, line highlight, and variable inspector wiring` (T4 + T5)
  4. `chore: verify build` (T6)
- **Rationale:** Forecast (~160 lines) is well under the 400-line review budget. A single focused PR keeps review simple and avoids chain overhead.
