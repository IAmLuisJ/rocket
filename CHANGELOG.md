# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `rocket new` command — interactive project scaffolding wizard with webapp and website templates
- `rocket loop` command — autonomous AI development loop with Copilot, Claude, and Docker backends
- `rocket init` command — initialize `.agent/` structure in existing projects
- `rocket tasks` command — browse and manage tasks from `.agent/tasks.json`
- `rocket status` command — project progress dashboard with category breakdown
- `rocket feature` command — AI-powered feature spec and task generation
- Webapp template: React 19, Express 5, TypeScript, Vite, Tailwind CSS v4
- Website template: PHP, MySQL, Tailwind CSS
- Loop signal detection: `<complete>`, `<blocked>`, `<decide>`
- macOS sleep prevention via caffeinate during loop runs
- ANSI-stripped iteration history saved to `.agent/history/`
