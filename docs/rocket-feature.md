# rocket feature

Turn a plain-English description into a spec, a PRD update, and a ready-to-run task list — without leaving the terminal.

---

## What it does

`rocket feature` bridges the gap between "I have an idea" and "I have tasks in my queue." You describe a feature, answer a few focused questions, and Rocket does the rest: it reads your existing PRD and task list for context, calls the AI backend to generate a proper spec and task breakdown, shows you a diff preview, and writes the changes on confirmation.

### Full example

```bash
$ rocket feature "Add dark mode toggle"

  ✦ Rocket Feature Wizard
  ─────────────────────────────────────
  Feature: "Add dark mode toggle"

  Clarifying questions:

  ✦ Who is this for? (e.g., end user, admin) › End user
  ✦ UI components needed? › Yes — toggle in nav bar
  ✦ Backend changes required? › No, CSS/theme only
  ✦ Dependencies on existing tasks? › Task #8 (shadcn setup)
  ✦ Known constraints? › Must respect system preference by default

  ⚡ Generating feature spec and tasks...

  ┌─ PRD Update Preview ──────────────────────────┐
  │ + ## Dark Mode Toggle                          │
  │ + **User story:** As a user, I want to...      │
  │ + **Acceptance criteria:** ...                 │
  └────────────────────────────────────────────────┘
  ┌─ New Tasks (4) ───────────────────────────────┐
  │ #111 Add next-themes provider to app root      │
  │ #112 Create ThemeToggle component              │
  │ #113 Add toggle to NavBar                      │
  │ #114 Test system preference detection          │
  └────────────────────────────────────────────────┘

  Apply changes? › Yes

  ✅ PRD updated · 4 tasks added · tasks.json updated
```

---

## How the AI generates the spec

### Prompt strategy

Once answers are collected, Rocket assembles a structured prompt containing:

1. The full text of `.agent/prd/PRD.md` — so the AI understands the existing project context.
2. A summary of existing tasks from `.agent/tasks.json` — so the AI knows what's already planned and can avoid duplication.
3. The feature description.
4. The user's answers to the clarification questions.
5. A strict instruction envelope telling the AI exactly what to output.

### JSON envelope format

The AI is instructed to respond in a structured format that Rocket can parse without ambiguity:

```
<spec>
## <Feature Name>

**User story:** As a <user>, I want to <action> so that <benefit>.

**Objectives:**
- ...

**Acceptance criteria:**
- [ ] ...

**Technical notes:**
- ...
</spec>
<tasks>
[
  {
    "title": "...",
    "description": "...",
    "category": "ui-ux",
    "passes": false,
    "passCondition": "..."
  }
]
</tasks>
<prd_sections_to_update>
["## Section Title"]
</prd_sections_to_update>
```

Rocket parses the `<spec>`, `<tasks>`, and `<prd_sections_to_update>` blocks separately. The tasks JSON is validated against the Zod schema before display. If parsing fails, Rocket shows an error and does not write any changes.

---

## The clarification questions

Clarification questions are AI-generated based on the feature description, seeded with five standard prompts:

1. **What problem does this feature solve?** — anchors the user story.
2. **Who is the primary user of this feature?** — scopes the spec correctly (end user vs admin vs developer).
3. **Are there UI components needed, or is this backend-only?** — determines which task categories to generate.
4. **Does this depend on any existing tasks or features?** — surfaces dependencies so tasks can reference them.
5. **Any known edge cases or constraints?** — prevents the AI from writing an over-simplified spec.

The AI may add additional questions specific to the feature description — for example, a "Add CSV export" feature might prompt "Should the export include filtered results or all records?"

Skip all questions with `--no-questions` if you want a fast, rough spec from the description alone.

---

## Reading the diff preview

The diff preview is split into two panes:

**Left pane — PRD Update:** shows lines that will be added to `PRD.md` using `+` prefix (green). Existing context lines may appear without prefix for orientation. Lines are not removed from your existing PRD unless explicitly noted.

**Right pane — New Tasks:** lists each new task with its ID (assigned by Rocket, not the AI), title, and category. Pass conditions are truncated for readability — press `Enter` on a task to expand the full details.

Scroll through the preview with arrow keys. Press `Tab` to switch between panes.

---

## Editing before applying

When the **Apply changes?** prompt appears, choose **Edit** to open the generated content in your `$EDITOR` before it is written to disk.

Rocket writes two temporary files:
- `FEATURE_SPEC_PREVIEW.md` — the spec block that will be appended to `PRD.md`
- `FEATURE_TASKS_PREVIEW.json` — the tasks array

You can freely edit both. When you save and close the editor, Rocket re-validates the tasks JSON (Zod schema) and shows the updated preview before asking for final confirmation.

If `$EDITOR` is not set, Rocket falls back to `vi`.

---

## How tasks are merged into tasks.json

Task IDs are assigned by Rocket, not the AI. The AI outputs tasks without IDs; Rocket assigns them during merge.

**ID continuation:** Rocket reads the current maximum ID in `tasks.json` and assigns `max + 1`, `max + 2`, etc. to the new tasks in order.

```
Existing max ID: 110
New tasks assigned: 111, 112, 113, 114
```

**Schema validation:** Before writing, every new task is validated against the Zod schema:

```typescript
interface Task {
  id: number;
  title: string;
  description: string;
  category: 'functional' | 'ui-ux' | 'api-endpoint' | 'security' | 'testing' | 'config';
  passes: boolean;        // always false for new tasks
  passCondition: string;
  blockedReason?: string; // omitted for new tasks
}
```

If any task fails validation, Rocket shows the validation error and does not write anything. You can use **Edit** to fix the tasks JSON before applying.

**Order:** New tasks are appended to the end of the array, preserving all existing tasks and their IDs unchanged.

---

## How the PRD is updated

Rocket appends the feature spec to `PRD.md` in one of two ways:

1. **`## Features Added` section exists:** the spec is inserted inside this section, before the closing content.
2. **Section does not exist:** Rocket appends `## Features Added` to the end of `PRD.md` and places the spec inside it.

If the AI's `<prd_sections_to_update>` block lists existing section titles that need modification (e.g., `## 5. Core Features`), Rocket flags these in the diff preview as "Sections to review" — it does not automatically modify them, since merging into existing sections is error-prone. You can apply those edits manually after confirming.

---

## Flags reference

| Flag | Description |
|------|-------------|
| `--no-questions` | Skip clarification questions. Generate spec from feature description alone. Faster but less precise. |
| `--dry-run` | Show the full diff preview but do not write `PRD.md` or `tasks.json`. Exit with code `0`. |
| `--backend <name>` | Override the AI backend for this command: `copilot`, `claude`, or `docker`. Useful if your default backend is slow or unavailable. |

---

## Tips: writing good feature descriptions

The quality of the generated spec is directly proportional to the specificity of your description.

**Too vague — produces a generic spec:**
```
Add authentication
```

**Better — produces a focused spec:**
```
Add email/password authentication with JWT sessions, a registration page, login page, and protected route middleware for the API
```

**Even better — includes constraints:**
```
Add email/password authentication with JWT sessions. Users should be able to register, log in, and reset their password via email. The JWT should be stored in an httpOnly cookie (not localStorage). The API should reject unauthenticated requests with a 401. No OAuth for now.
```

Additional tips:

- Name specific UI components or pages when you know them.
- Call out what you're explicitly **not** including — it saves a clarification question.
- Reference existing tasks by ID if there are dependencies: "depends on task #8 (shadcn setup)."
- Mention the tech if it's not obvious from the stack: "use next-themes, not a custom CSS variable approach."

The more context you give upfront, the fewer clarification rounds are needed and the more accurate the generated tasks will be.
