# Proposal: Step-by-step debug execution

## Intent

Add a manual step/debug execution mode so learners can run a PSeInt program one statement at a time, inspect variable values after every step, and control continuation from the UI.

## Scope

### In Scope

- Debug toggle next to the existing "Ejecutar" button.
- Interpreter support for pause-before-statement execution via a debug controller.
- Emission of current line and variable snapshot after each step.
- Debug console overlay with Step, Continue, Stop, and current-line indicator.
- Input statements (`Leer`) participate in stepping; they pause for user input while remaining in debug mode.
- Editing code while debugging ends the debug session.

### Out of Scope

- Breakpoints, conditional steps, or watch expressions.
- Call-stack / step-into / step-out for functions.
- Persisting debug state across page reloads.

## Capabilities

### New Capabilities

- `debug-execution`: step-through run mode, pause control, per-step variable inspection, and debug UI.

### Modified Capabilities

- None.

## Approach

Add a `debug?: boolean` flag and an `onStep?(line, vars): Promise<void>` callback to `RunOptions`. The `Interpreter` calls the callback at the top of `execStmt` (and inside loop bodies so each iteration is a step) and awaits resolution before continuing. The IDE creates a `DebugSession` object with `step()` and `continue()` resolvers; `onStep` stores the resolver and updates `currentLine`/`vars`. The header shows an alternating "Debug"/"Step" button; while debugging, the console panel renders a debug toolbar and highlights the active source line. Code edits are detected through the existing `active.content` change and call `stopDebug()`.

## Affected Areas

| Area                                    | Impact        | Description                                                        |
| --------------------------------------- | ------------- | ------------------------------------------------------------------ |
| `src/lib/pseint/interpreter.ts`         | Modified      | Adds debug pause hook and per-step variable emission.              |
| `src/components/pseint-ide.tsx`         | Modified      | Adds debug state, debug button, debug toolbar, and edit detection. |
| `src/components/variable-inspector.tsx` | Consumes data | Reuses existing variable table in debug view.                      |

## Risks

| Risk                                                             | Likelihood | Mitigation                                                                                     |
| ---------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| Async pause logic complicates control flow (loops, input)        | Med        | Keep resolver in the IDE; interpreter only awaits callback; verify with small sample programs. |
| Highlight/scroll to current line couples IDE to editor internals | Low        | Use existing editor highlight props; add a `highlightLine` prop if needed.                     |
| Stepping into infinite loops remains possible                    | Low        | `tick()` still increments `maxSteps`; abort signal still works.                                |

## Rollback Plan

Debug mode is opt-in via `RunOptions`. To revert, remove the debug fields from `RunOptions` and delete the debug UI buttons. No persistence or schema changes are required.

## Dependencies

- None beyond the existing Preact/Vite/Tailwind stack.

## Success Criteria

- [ ] `npm run build` passes.
- [ ] A program can be started in debug mode and advanced line by line.
- [ ] The variable inspector updates after each step.
- [ ] `Leer` accepts input as a single step.
- [ ] Editing code while debugging terminates debug mode cleanly.
