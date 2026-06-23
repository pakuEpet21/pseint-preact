# Design: Step-by-step debug execution

## Technical Approach

Add an opt-in debug pause hook to the interpreter and a small controller in the IDE.
The interpreter emits the current source line and a variable snapshot before each statement and before each loop iteration, then awaits a resolver.
The IDE renders the debug line and variables, and exposes Step, Continue, and Stop controls.
No persistence or breakpoints are introduced.

## Architecture Decisions

### Decision: Variable snapshot shape

| Option            | Tradeoff                                                                             | Decision |
| ----------------- | ------------------------------------------------------------------------------------ | -------- |
| Raw `VariableMap` | Matches proposal wording; requires IDE to format types                               | Rejected |
| `VarSnapshot[]`   | Reuses existing `emitVariables` formatter; `VariableInspector` consumes it unchanged | Chosen   |

Rationale: `onVariables` already emits `VarSnapshot[]`. Reusing the same shape avoids duplication and keeps the inspector component untouched.

### Decision: Pause location

| Option                                                   | Tradeoff                                              | Decision |
| -------------------------------------------------------- | ----------------------------------------------------- | -------- |
| Pause only inside `execBlock`                            | Misses re-evaluation of loop headers                  | Rejected |
| Pause at top of `execStmt` plus after each loop `tick()` | Covers every statement and each loop iteration header | Chosen   |

Rationale: Learners expect each iteration of `Mientras`, `Para`, and `Repetir` to be a visible step, including the header line.

### Decision: Continue semantics

| Option                              | Tradeoff                                             | Decision |
| ----------------------------------- | ---------------------------------------------------- | -------- |
| Continue until next breakpoint      | Breakpoints are out of scope                         | Rejected |
| Continue until program ends or Stop | Simple and matches learner expectation of "run free" | Chosen   |

Rationale: The proposal explicitly excludes breakpoints, so Continue runs without further pauses until termination or user stop.

### Decision: Current-line highlight

| Option                                          | Tradeoff                                          | Decision        |
| ----------------------------------------------- | ------------------------------------------------- | --------------- |
| Add full-line background in editor body         | Requires editor rendering changes                 | Rejected for v1 |
| Reuse existing `highlightLine` gutter highlight | Minimal change; clearly indicates the active line | Chosen          |

Rationale: `CodeEditor` already accepts `highlightLine`. A future enhancement can extend the highlight to the editor body.

## Data Flow

```
[User clicks Debug]
        |
        v
IDE starts runPseint(debug=true, onStep)
        |
        v
Interpreter: execStmt -> tick() -> onStep(line, vars)
        |
        v
IDE updates debugLine/debugVars; awaits resolver
        |
        v
[User clicks Step / Continue / Stop]
        |
        v
Resolver releases interpreter
```

## Sequence / State Diagrams

### Debug state machine

```
          +-----------+
          |   idle    |
          +-----+-----+
                | Debug button
                v
          +-----------+
          |  running  |<--+
          |  (debug)  |   | onStep pauses
          +-----+-----+   |
                |         |
       onStep   v         | Step / Continue
         +------+------+  |
         |   paused    |--+
         +------+------+
                |
        Stop / error / edit
                v
          +-----------+
          |   idle    |
          +-----------+
```

### Step sequence

```
IDE                         Interpreter
 |                               |
 |---- runPseint(debug=true) --->|
 |                               |
 |<----------- onStep ----------|
 | (update UI, show controls)    |
 |                               |
 |---- resolver.resolve() ------>|
 |     (user clicked Step)       |
 |                               |
 |<----------- onStep ----------|
 |                               |
 |---- resolver.resolve() ------>|
 |     (user clicked Continue)   |
 |                               |
 |         ... runs to end       |
```

## File Changes

| File                                    | Action  | Description                                                                                              |
| --------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `src/lib/pseint/interpreter.ts`         | Modify  | Add `debug`/`onStep` to `RunOptions`; pause in `execStmt` and loop bodies; add `captureVariables` helper |
| `src/components/pseint-ide.tsx`         | Modify  | Add debug state, debug button, toolbar, edit detection, and current-line highlight                       |
| `src/components/variable-inspector.tsx` | Consume | Reused as-is; IDE passes the active debug-time snapshot                                                  |

## Interfaces / Contracts

```ts
// src/lib/pseint/interpreter.ts
export interface RunOptions {
  requestInput: (prompt: string) => Promise<string>;
  onOutput: (line: ConsoleLine) => void;
  signal?: { aborted: boolean };
  onVariables?: (vars: VarSnapshot[]) => void;
  strictMode?: boolean;
  debug?: boolean;
  onStep?: (line: number, vars: VarSnapshot[]) => Promise<void>;
}

// internal to src/components/pseint-ide.tsx
interface DebugController {
  active: boolean;
  continueMode: boolean;
  resume?: () => void;
}
```

## Implementation Notes

### Interpreter (`src/lib/pseint/interpreter.ts`)

1. Extend `RunOptions` with `debug?: boolean` and `onStep?: (line, vars) => Promise<void>`.
2. Add `captureVariables(scope: Scope): VarSnapshot[]` by extracting the snapshot logic from `emitVariables`.
3. At the top of `execStmt`, after `this.tick(...)`, if `opts.debug && opts.onStep`, call `await opts.onStep(node.line, captureVariables(scope))`.
4. Inside `While`, `Repeat`, and `For`, after the existing `this.tick(node.line)` that marks each iteration, call `await opts.onStep?.(node.line, captureVariables(scope))`.
5. `tick()` still enforces `maxSteps` and the abort signal before `onStep` is reached, so infinite loops and Stop remain bounded.
6. `Leer` participates naturally: `onStep` fires on the `Leer` line, then execution enters the statement and awaits `requestInput` while the debug toolbar remains active.

### IDE (`src/components/pseint-ide.tsx`)

1. Add `debugActive`, `debugPaused`, `debugLine`, and `debugVars` state.
2. Keep a `debugControllerRef` with `active`, `continueMode`, and `resume` callback.
3. The `onStep` callback updates `debugLine`/`debugVars` and returns a Promise that resolves when `resume()` is called.
4. **Step**: calls `resume()`; the next statement pauses again.
5. **Continue**: sets `continueMode = true` and calls `resume()`; subsequent `onStep` calls resolve immediately so the program runs to completion.
6. **Stop**: sets the abort signal, calls `resume()` if paused, and clears debug state.
7. Add a Debug button next to Ejecutar in the header.
8. Render a debug toolbar (Step, Continue, Stop) above the console when `debugActive`.
9. Pass `highlightLine={debugLine}` to `CodeEditor`.
10. Detect edits by checking `debugActive` in the content-change path; any edit calls the stop routine to end the debug session cleanly.

### Variable Inspector

`VariableInspector` is reused unchanged. During debug the IDE passes `debugVars`; after a normal run it passes the final `vars` from `onVariables`.

## Testing Strategy

| Layer       | What to Test                                   | Approach                                     |
| ----------- | ---------------------------------------------- | -------------------------------------------- |
| Unit        | `onStep` pauses and emits correct line/vars    | Manual sample program; no test runner exists |
| Integration | Debug toolbar controls execution               | Manual UI verification                       |
| Build       | TypeScript compiles and `npm run build` passes | Automated (`npm run build`)                  |

## Build / Verification Notes

- Run `npm run build` after changes. The project uses strict TypeScript settings (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`), so every new import must be used and every parameter consumed.
- No new dependencies are required.
- Manual verification checklist:
  1. Start debug mode and step through a simple assignment.
  2. Verify the variable inspector updates after each step.
  3. Step into a `Leer` statement and submit input.
  4. Step through a `Mientras` loop and confirm each iteration pauses on the header.
  5. Click Continue and verify the program runs to completion.
  6. Start debug, edit the code, and confirm the session ends cleanly.

## Migration / Rollout

No migration required. Debug mode is opt-in via `RunOptions`. Removing the flag and the toolbar reverts the feature.

## Open Questions

None.
