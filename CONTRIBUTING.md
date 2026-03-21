# Contributing to Rocket

## Getting Started

```bash
git clone https://github.com/your-org/rocket-cli.git
cd rocket-cli
npm install
```

## Building

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Watch mode with tsx
```

## Running Tests

```bash
npm test             # Run all tests with Vitest
npm run test:coverage # Run tests with coverage report
npm run typecheck    # Type-check without emitting
npm run lint         # ESLint
npm run format       # Prettier
```

## Adding a New Template

1. Create a new directory under `templates/<template-name>/`
2. Add template files — use `{{PROJECT_NAME}}` for variable substitution
3. Files ending in `.tmpl` have the extension stripped during scaffolding (e.g., `package.json.tmpl` becomes `package.json`)
4. Update the template selection in `src/tui/components/NewProjectWizard.tsx`
5. Add a test in `src/lib/scaffold.test.ts`

## Adding a New Backend

1. Create `src/lib/backends/<name>.ts` implementing the `AgentBackend` interface from `src/lib/backends/types.ts`
2. Register the backend in `src/lib/backends/index.ts`
3. Add the corresponding CLI flag in `src/cli.ts` under the `loop` command
4. Update `src/commands/loop.ts` to handle the new flag
5. Document the backend in `README.md`

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include tests for new functionality
- Ensure `npm run typecheck` and `npm test` pass before submitting
- Write descriptive commit messages

## Code Style

- TypeScript with strict mode enabled
- ESM modules (`"type": "module"` in package.json)
- Single quotes, no semicolons (Prettier handles formatting)
- Use Zod for runtime validation of external data (tasks.json, user input)
- Ink v4 (React) for terminal UI components
