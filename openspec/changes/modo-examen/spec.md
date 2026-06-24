# Delta for modo-examen

## ADDED Requirements

### Requirement: Exam Storage Schema

The system SHALL persist exams to localStorage key `pseint:exams:v1` as a JSON array. Each exam MUST contain: `id` (8-char alphanumeric), `keyword` (6-digit numeric), `consigna` (markdown string), `createdAt` (unix timestamp), and optional `expiresAt` (unix timestamp).

#### Scenario: Create new exam

- GIVEN localStorage is empty
- WHEN `createExam(consigna, expiresAt?)` is called
- THEN a new exam is generated with unique 8-char id and random 6-digit keyword
- AND exam is persisted to localStorage
- AND exam object is returned

#### Scenario: Retrieve exam by id

- GIVEN an exam exists in localStorage
- WHEN `getExam(id)` is called
- THEN the full exam object is returned if found
- AND `null` is returned if not found

#### Scenario: Delete exam

- GIVEN an exam exists in localStorage
- WHEN `deleteExam(id)` is called
- THEN the exam is removed from localStorage
- AND returns `true`

#### Scenario: List all exams

- GIVEN multiple exams exist in localStorage
- WHEN `listExams()` is called
- THEN all exams are returned sorted by `createdAt` descending

---

### Requirement: Admin Page Routing

The app MUST check for `?admin` query param on mount. If present, the app SHALL render the Admin panel instead of the IDE.

#### Scenario: Admin param detected

- GIVEN user navigates to `/?admin`
- WHEN app mounts
- THEN `<AdminPage />` is rendered full-screen
- AND IDE is not rendered

#### Scenario: No admin param

- GIVEN user navigates to `/`
- WHEN app mounts
- THEN `<PseintIDE />` is rendered normally

---

### Requirement: Admin Exam List

The Admin page MUST display all stored exams with truncated id (first 7 chars), created date, full keyword, delete button, and "Copy Link" button.

#### Scenario: Copy exam link

- GIVEN an exam with id `abc123xy` and keyword `987654`
- WHEN user clicks "Copy Link"
- THEN `https://host/?exam=abc123xy&token=987654` is copied to clipboard
- AND a success indicator is shown

#### Scenario: Delete exam

- GIVEN an exam exists in localStorage
- WHEN user clicks delete button
- THEN exam is removed from localStorage
- AND UI updates to remove the exam row

---

### Requirement: Create Exam Form

The Admin page MUST have a form with: textarea for `consigna`, optional expiry date input, and "Crear examen" button.

#### Scenario: Create exam successfully

- GIVEN user fills consigna textarea with markdown content
- WHEN user clicks "Crear examen"
- THEN a new exam is created with generated id and keyword
- AND both id and keyword are displayed to the user

#### Scenario: Create exam with expiry

- GIVEN user fills consigna and sets expiry date
- WHEN user clicks "Crear examen"
- THEN `expiresAt` is set on the exam object
- AND exam is persisted with expiry

---

### Requirement: Exam URL Encoding

Exam URLs MUST be formatted as `https://host/?exam=<id>&token=<keyword>`. The consigna is NOT encoded in the URL.

#### Scenario: Build exam URL

- GIVEN an exam with id `abc123xy` and keyword `123456`
- WHEN `buildExamUrl(id, keyword)` is called
- THEN `https://host/?exam=abc123xy&token=123456` is returned

---

### Requirement: Exam Access Flow

The app SHALL validate exam access by: (1) checking `?exam=` and `?token=` params, (2) looking up exam by id, (3) verifying keyword matches.

#### Scenario: Valid exam access

- GIVEN exam `abc123xy` exists with keyword `123456`
- WHEN user navigates to `/?exam=abc123xy&token=123456`
- THEN exam mode is activated
- AND consigna is displayed above IDE

#### Scenario: Invalid token

- GIVEN exam `abc123xy` exists with keyword `123456`
- WHEN user navigates to `/?exam=abc123xy&token=000000`
- THEN token error screen is shown

#### Scenario: Exam not found

- GIVEN no exam with id `xyz99999` exists
- WHEN user navigates to `/?exam=xyz99999&token=123456`
- THEN token error screen is shown

#### Scenario: No exam params

- GIVEN user navigates to `/`
- WHEN app mounts
- THEN normal IDE is rendered

---

### Requirement: Token Error Screen

When token validation fails, a full-page overlay MUST be shown with message "Token inválido o examen no encontrado" and a "Volver al inicio" button.

#### Scenario: Return to home

- GIVEN token error screen is displayed
- WHEN user clicks "Volver al inicio"
- THEN URL params are cleared
- AND normal IDE is rendered

---

### Requirement: Exam Mode Banner

When exam mode is active, a banner MUST be displayed above the IDE showing the exam instructions (markdown rendered) and a "Finalizar" button.

#### Scenario: Finish exam

- GIVEN exam mode is active with consigna displayed
- WHEN user clicks "Finalizar"
- THEN `.psc` file is downloaded
- AND exam session is cleared from URL

---

### Requirement: Exam Mode UI Restrictions

In exam mode, the PseintIDE MUST hide: share button, open file button, and settings button. These MUST be hidden via `display: none` CSS.

#### Scenario: Buttons hidden in exam mode

- GIVEN `examMode=true` prop is passed to PseintIDE
- WHEN IDE renders
- THEN share, open, and settings buttons have `display: none`

---

### Requirement: Keyboard Shortcut Blocking

In exam mode, the system MUST block: `Ctrl+C`, `Ctrl+V`, `Ctrl+X`, `Ctrl+A`, `Ctrl+U`, `F12`, `Ctrl+Shift+I` by calling `preventDefault()`.

#### Scenario: Ctrl+C blocked

- GIVEN exam mode is active
- WHEN user presses Ctrl+C
- THEN `preventDefault()` is called
- AND copy action does not execute

---

### Requirement: Context Menu Blocking

In exam mode, right-click context menu MUST be blocked on the entire app via `preventDefault()` on `contextmenu` event.

#### Scenario: Right-click blocked

- GIVEN exam mode is active
- WHEN user right-clicks
- THEN context menu does not appear

---

### Requirement: Text Selection Blocking

In exam mode, text selection by drag MUST be blocked via CSS `user-select: none` on the code editor element.

#### Scenario: Text selection blocked

- GIVEN exam mode is active
- WHEN user attempts to select text by dragging
- THEN no text is selected
- AND drag selection is prevented

---

### Requirement: Drag Start Blocking

In exam mode, `dragstart` events on text MUST be blocked via `preventDefault()`.

#### Scenario: Drag start blocked

- GIVEN exam mode is active
- WHEN user attempts to drag text
- THEN drag does not initiate
