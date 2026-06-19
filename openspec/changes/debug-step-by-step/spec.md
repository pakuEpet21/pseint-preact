# Debug Step-by-Step Specification

## Purpose

Define the manual step-through debug execution mode for PSeInt programs, including run control, variable inspection, and UI behavior.

## Requirements

### Requirement: Debug Mode Toggle

The system MUST provide a debug toggle adjacent to the existing "Ejecutar" button that starts execution in step mode.

#### Scenario: Starting debug mode

- GIVEN the editor contains a valid PSeInt program
- WHEN the user activates the debug toggle
- THEN execution begins, the first statement pauses before running, the current line is highlighted, and the debug toolbar appears

#### Scenario: Running while not debugging

- GIVEN debug mode is not active
- WHEN the user presses "Ejecutar"
- THEN the program runs to completion as it did before this change

### Requirement: Step Control

The system MUST allow the user to advance one statement at a time or continue to the next natural pause point.

#### Scenario: Stepping through assignments

- GIVEN debug mode is active and paused on an assignment
- WHEN the user presses "Step"
- THEN the assignment executes, the variable inspector updates, and execution pauses on the next statement

#### Scenario: Stepping through a loop

- GIVEN debug mode is paused at the start of a loop body
- WHEN the user presses "Step"
- THEN the current iteration runs one statement, and each new iteration pauses at the loop body entry

#### Scenario: Continue execution

- GIVEN debug mode is active and paused
- WHEN the user presses "Continue"
- THEN execution runs until the next breakpoint-equivalent pause, program end, or runtime error

### Requirement: Variable Inspection

The system MUST display a current variable snapshot after each completed step.

#### Scenario: Inspector updates after each step

- GIVEN debug mode is active and a variable has just been assigned
- WHEN the step completes
- THEN the variable inspector shows the variable name, inferred type, and formatted value

#### Scenario: Empty inspector before first step

- GIVEN debug mode was just started
- WHEN no statement has executed yet
- THEN the variable inspector reflects only variables initialized before the first pause

### Requirement: Input Statements in Debug Mode

The system MUST treat `Leer` as a single step that pauses for user input while remaining in debug mode.

#### Scenario: Stepping through Leer input

- GIVEN debug mode is paused on a `Leer` statement
- WHEN the user presses "Step"
- THEN the console prompts for input, the user enters a value, the value is assigned, and execution pauses on the next statement

### Requirement: Debug Stop

The system MUST allow the user to terminate a debug session at any time.

#### Scenario: Stopping debug

- GIVEN debug mode is active and paused
- WHEN the user presses "Stop"
- THEN execution aborts, the debug toolbar and line highlight disappear, and the console shows an end-of-execution marker

### Requirement: Edit Detection

The system MUST end the debug session when the source code is edited.

#### Scenario: Editing code during debug

- GIVEN debug mode is active and paused
- WHEN the user modifies the source code
- THEN the debug session terminates, the debug toolbar and line highlight disappear, and no further stepping is possible

#### Scenario: Edits before debug start do not affect session

- GIVEN debug mode is not active
- WHEN the user edits the source code
- THEN the editor behaves normally and no debug state changes

## UI/UX Requirements

- The debug toggle MUST be located next to the "Ejecutar" button.
- While debugging, the console panel MUST render a debug toolbar with Step, Continue, and Stop controls.
- The current source line MUST be highlighted in the editor whenever execution is paused.
- The debug toolbar MUST indicate whether execution is waiting for a step or for input.

## Error Handling and Edge Cases

- If a runtime error occurs during a step, the system MUST stop the debug session, report the error line, and highlight it.
- If the program reaches the `maxSteps` limit while debugging, the system MUST abort and report a possible infinite loop.
- If the user closes the active tab while debugging, the system MUST terminate the debug session for that tab.
- If `Leer` is stepped and the user submits invalid input, the system MUST report the error and remain paused at the same line until valid input is provided.

## Verification Criteria

- `npm run build` MUST pass with no TypeScript errors.
- Manual scenario: start debug mode and advance line by line through a sample program.
- Manual scenario: verify the variable inspector updates after each assignment step.
- Manual scenario: step through a `Leer` statement and confirm input is accepted as a single step.
- Manual scenario: edit the source during debug and confirm the session ends cleanly.
