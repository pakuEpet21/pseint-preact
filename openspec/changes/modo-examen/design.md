# Design: Modo Examen

## Technical Approach

Implement a secure exam mode for PSeInt where teachers create exams with markdown consignas and students access them via URL tokens. The app uses query-param-based SPA routing (no router library), localStorage for persistence, and basic client-side enforcement of exam restrictions.

## Architecture Decisions

### Decision: Simple query-param routing without a router library

**Choice**: `if/else` on `URLSearchParams` in `app.tsx`
**Alternatives considered**: react-router, wouter, preact-router
**Rationale**: The app already uses query params for share URLs (`?code=`). Adding a router adds unnecessary bundle weight for two simple routes. The exam and admin params are exclusive modes, so a straightforward mount-time check suffices.

### Decision: Markdown rendering library

**Choice**: `marked` (lightweight, ~35KB minified)
**Alternatives considered**: remark, rehype, showdown
**Rationale**: No markdown library exists in the project. `marked` is the simplest implementation that handles the consigna markdown (headings, lists, code blocks, bold/italic). The admin context (teachers writing exams) justifies adding a dependency.

### Decision: Exam storage format

**Choice**: `localStorage` key `pseint:exams:v1` → JSON array of `Exam` objects
**Alternatives considered**: IndexedDB, separate keys per exam
**Rationale**: Single key keeps enumeration simple. JSON array with `createdAt` sort handles the list requirement. No backend means all exam data lives in the browser.

### Decision: Keyword (token) format

**Choice**: 6-digit numeric string (`"123456"`)
**Alternatives considered**: UUID, nanoid, alphanumeric
**Rationale**: Students are not technical — a simple 6-digit number is easy to read aloud, write down, and type. Numeric-only reduces character confusion (0/O, 1/l).

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│ app.tsx                                                 │
│  URLSearchParams check on mount                         │
│  ├─ ?admin        → <AdminPage />                      │
│  ├─ ?exam=<id>&   → Validate token →                    │
│  │  token=<k>     │   ├─ valid  → <PseintIDE examMode/>│
│  │                │   └─ invalid → <TokenError />     │
│  └─ (none)        → <PseintIDE />                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ src/lib/pseint/exam.ts (exam storage module)            │
│  createExam(consigna, expiresAt?) → Exam                │
│  getExam(id) → Exam | null                              │
│  listExams() → Exam[]                                    │
│  deleteExam(id) → void                                  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ PseintIDE (examMode=true)                               │
│  ├─ <ExamBanner consigna={...} /> above editor           │
│  ├─ Event blockers (keyboard, contextmenu, drag)         │
│  ├─ Hide: share button, open file, settings             │
│  └─ CSS: user-select: none on editor                    │
└─────────────────────────────────────────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/pseint/exam.ts` | Create | Exam CRUD + URL builder |
| `src/pages/admin.tsx` | Create | Full-page admin panel |
| `src/pages/token-error.tsx` | Create | Full-page token error overlay |
| `src/components/exam-banner.tsx` | Create | Banner with markdown consigna + Finalizar |
| `src/app.tsx` | Modify | Query-param routing logic |
| `src/lib/pseint/share.ts` | Modify | Add `buildExamUrl()` |
| `src/components/pseint-ide.tsx` | Modify | Add `examMode` prop, event blockers, hide restricted buttons |

## Interfaces / Contracts

### Exam type (src/lib/pseint/exam.ts)

```typescript
export interface Exam {
  id: string;          // 8-char alphanumeric, e.g. "abc123xy"
  keyword: string;      // 6-digit numeric, e.g. "987654"
  consigna: string;     // markdown string
  createdAt: number;   // unix timestamp
  expiresAt?: number;  // optional unix timestamp
}
```

### Exam module API

```typescript
export function createExam(consigna: string, expiresAt?: number): Exam
export function getExam(id: string): Exam | null
export function listExams(): Exam[]
export function deleteExam(id: string): void
export function buildExamUrl(id: string, keyword: string): string
```

### PseintIDE props

```typescript
interface PseintIDEProps {
  // ... existing props (none currently typed — uses implicit any via function signature)
  examMode?: boolean;
  examConsigna?: string;
}
```

## Component Specifications

### app.tsx routing

```typescript
export function App() {
  const params = new URLSearchParams(window.location.search);
  const hasAdmin = params.has("admin");
  const examId = params.get("exam");
  const examToken = params.get("token");

  if (hasAdmin) {
    return <AdminPage />;
  }

  if (examId && examToken) {
    const exam = getExam(examId);
    if (exam && exam.keyword === examToken) {
      return <PseintIDE examMode={true} examConsigna={exam.consigna} />;
    }
    return <TokenError />;
  }

  return <PseintIDE />;
}
```

### ExamBanner (src/components/exam-banner.tsx)

- Renders `consigna` via `marked.parse()` inside a styled container
- "Finalizar examen" button calls `downloadFile("psc")` then clears URL params
- Cannot be dismissed during exam (no X button)
- Uses existing button styles from pseint-ide.tsx

### Event blocking (integrated into PseintIDE when examMode=true)

```typescript
useEffect(() => {
  if (!examMode) return;

  const blocked = (e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (ctrl && ["c", "v", "x", "a", "u"].includes(key)) { e.preventDefault(); return false; }
    if (e.key === "F12") { e.preventDefault(); return false; }
    if (ctrl && e.shiftKey && key === "i") { e.preventDefault(); return false; }
  };

  document.addEventListener("keydown", blocked);
  document.addEventListener("contextmenu", e => e.preventDefault());

  return () => {
    document.removeEventListener("keydown", blocked);
    document.removeEventListener("contextmenu", blocked);
  };
}, [examMode]);
```

### CSS for text selection blocking

```css
.exam-mode .code-editor,
.exam-mode .CodeMirror {
  user-select: none;
}
```

## Admin Page Layout (src/pages/admin.tsx)

```
┌──────────────────────────────────────────────┐
│ [← Volver al IDE]          Panel de Exámenes │
├──────────────────────────────────────────────┤
│ Nuevo Examen                                 │
│ ┌──────────────────────────────────────────┐ │
│ │ Consigna (markdown)                      │ │
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│ Vence (opcional): [date input]              │
│ [Crear examen]                               │
├──────────────────────────────────────────────┤
│ Exámenes existentes                         │
│ ┌──────────────────────────────────────────┐ │
│ │ abc123x • 2026-06-23 • 987654 [Copiar]  │ │
│ │                              [Eliminar]  │ │
│ └──────────────────────────────────────────┘ │
│ (repeats for each exam)                      │
└──────────────────────────────────────────────┘
```

On create: show alert/modal with the generated keyword (teacher must copy/save it).

## Integration Points

1. **`src/lib/pseint/share.ts`**: Add `buildExamUrl(id, keyword)` matching existing `buildShareUrl` pattern
2. **`src/app.tsx`**: Add routing as described above
3. **`src/components/pseint-ide.tsx`**: Hide buttons via `display: none` using existing className patterns
4. **`src/index.css`**: Add `.exam-mode .code-editor, .exam-mode .CodeMirror { user-select: none; }`

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Build | TypeScript compiles, Vite bundles | `npm run build` |
| Manual | Exam creation, token validation, event blocking | Browser manual test |

No automated tests (project has no test runner per openspec/config.yaml).

## Open Questions

- [ ] Should exam expiry be enforced client-side (hide/disable after expiry) or only prevent access if teacher deletes it?
- [ ] Is there a need to persist the student's code during exam session (e.g., accidental page refresh)?
- [ ] Should `buildExamUrl` use the same URL format as `buildShareUrl` (`window.location.origin + window.location.pathname`) or just `/`?

## Risks

- **Client-side security**: Any determined student can bypass event blockers via browser dev tools. Per spec, "basic client-side enforcement is sufficient" — this is accepted risk.
- **No expiration enforcement**: If expiry is implemented, it requires a timer or periodic check; without it, expired exams remain accessible.
- **Markdown XSS**: consigna is teacher-generated (trusted), but `marked` should be configured to sanitize HTML if consigna ever allows raw HTML.
