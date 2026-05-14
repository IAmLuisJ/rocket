# Rocket — Project Summary

Rocket is a Node.js CLI tool that bootstraps opinionated starter project templates and runs an AI-powered development loop (Rocket Loop) directly in the terminal.

## Main Features

- **`rocket new`** — Scaffold a new project interactively. Choose between a Web App (React + Express + TypeScript + Tailwind + shadcn) or a Website (PHP + MySQL). Installs dependencies, initializes git, and creates the `.agent/` structure.
- **`rocket loop`** — Run the Rocket Loop: an AI-driven development loop that iterates on your tasks autonomously. Supports GitHub Copilot CLI (default), Claude direct, and Claude in Docker sandbox.
- **`rocket init`** — Add `.agent/` structure to an existing project.
- **`rocket tasks`** — View and manage tasks from `.agent/tasks.json` in a TUI.

## Key User Flows

1. `rocket new my-app` → pick template → scaffold → `cd my-app && rocket loop`
2. `rocket loop` → next incomplete task starts automatically → view completion report
3. `rocket loop --docker` → run with Claude in Docker sandbox instead
4. `rocket init` in existing project → edit PRD + tasks → `rocket loop`

## Key Requirements

- Node.js 22+, TypeScript, published to npm
- TUI built with Ink (React for terminals)
- Copilot CLI as default AI backend; Claude direct and Docker sandbox as alternatives
- macOS caffeinate enabled by default during loop
- Task-focused loop: starts the next incomplete task by default, with `--select` for manual focus selection
- Templates are bundled (no network at scaffold time)
- No API keys stored by Rocket — auth delegated to AI backends
