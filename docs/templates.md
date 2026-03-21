# Rocket Templates

Reference for Rocket's two bundled project templates. Templates are embedded inside the npm package — no network access required at scaffold time.

---

## Web App (React + Express)

A full-stack TypeScript monorepo with a React frontend and an Express API backend, pre-wired and ready to run.

### Stack

**Frontend**
| Package | Version | Role |
|---------|---------|------|
| React | 19 | UI framework |
| TypeScript | 5.9 | Language |
| Vite | 7 | Dev server & bundler |
| Tailwind CSS | v4 | Styling |
| shadcn/ui | latest | Component library |
| TanStack Query | v5 | Server state & data fetching |
| React Hook Form | latest | Form management |
| Zod | latest | Schema validation (shared with backend) |
| React Router | v7 | Client-side routing |

**Backend**
| Package | Version | Role |
|---------|---------|------|
| Express | v5 | HTTP server |
| better-sqlite3 | latest | Embedded SQLite database |
| jsonwebtoken | latest | JWT auth (optional — toggle at scaffold) |
| nodemailer | latest | Email sending (optional — toggle at scaffold) |

**Testing**
| Package | Role |
|---------|------|
| Vitest | Unit and integration tests |
| @testing-library/react | Component tests |
| Playwright | End-to-end tests |

**Tooling**
- ESLint with TypeScript rules
- Composite `tsconfig.json` (separate configs for frontend, backend, and root)
- `@/*` path alias for `src/`
- `.env.example` with all required variables documented

### Folder structure

```
my-app/
  client/
    src/
      components/       # React components
      pages/            # Route-level page components
      hooks/            # Custom React hooks
      lib/              # Shared utilities, API client
      main.tsx          # App entry point
    index.html
    vite.config.ts
    tailwind.config.ts
    tsconfig.json
  server/
    src/
      routes/           # Express route handlers
      middleware/        # Auth, error handling, etc.
      db/               # SQLite setup, migrations, queries
      lib/              # Shared server utilities
    index.ts            # Express app entry point
    tsconfig.json
  shared/
    types/              # TypeScript types shared between client and server
    schemas/            # Zod schemas shared between client and server
  .agent/               # Rocket Loop workspace (see below)
  .env.example
  .gitignore
  package.json          # Root package with scripts for both client and server
  tsconfig.json         # Composite root tsconfig
  playwright.config.ts
```

### What's included out of the box

- Dev server with HMR (`npm run dev` starts both Vite and Express concurrently)
- SQLite database initialized at `server/data/app.db` with a migration runner
- JWT authentication routes and middleware (if enabled at scaffold)
- Email utility via nodemailer with a simple `sendEmail()` wrapper (if enabled)
- shadcn/ui configured with the default theme
- TanStack Query provider set up at the app root
- React Router with a basic layout route and a home page
- `@/*` alias working in both Vite and TypeScript
- Vitest config with jsdom environment and Testing Library setup
- Playwright config targeting the local dev server
- `.gitignore` covering `node_modules/`, `.env`, `dist/`, `data/`

### Environment variables

Documented in `.env.example`:

```bash
# Server
PORT=3000
NODE_ENV=development
DATABASE_PATH=./data/app.db

# Auth (if JWT enabled)
JWT_SECRET=change-me-before-production
JWT_EXPIRES_IN=7d

# Email (if nodemailer enabled)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@example.com
```

No credentials are hardcoded. The template will not run without a `.env` file copied from `.env.example`.

---

## Website (PHP + MySQL)

A simple PHP website scaffold for traditional server-rendered sites. No build step required by default — just PHP and a MySQL database.

### Stack

| Technology | Role |
|-----------|------|
| PHP (7.4+) | Server-side rendering |
| MySQL | Database (via PDO) |
| Tailwind CSS | Styling (CDN link by default; optional build step) |

### Folder structure

```
my-site/
  public/
    index.php           # Entry point / front controller
    assets/
      css/              # Compiled CSS (or Tailwind CDN link in head)
      js/               # Static JS files
      img/              # Images
  src/
    controllers/        # Page controller files (one per route)
    models/             # Data access classes (PDO-based)
    helpers/            # Shared utility functions
  templates/
    layout.php          # Base HTML layout (header, footer)
    partials/           # Reusable template fragments
    pages/              # Per-page template files
  config/
    database.php        # PDO connection factory
    app.php             # App-wide constants and settings
  .agent/               # Rocket Loop workspace (see below)
  .env.example
  .gitignore
```

### What's included out of the box

- PDO connection factory in `config/database.php` — reads from environment variables, throws on connection failure
- Simple front controller pattern in `public/index.php` — routes requests to controller files
- Base layout template with a Tailwind CDN link in `<head>`
- `.env.example` with database credentials
- `.gitignore` covering `.env`, `vendor/`, logs

### Environment variables

```bash
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=mysite
DB_USER=root
DB_PASS=
APP_ENV=development
APP_DEBUG=true
```

No credentials are hardcoded. The `config/database.php` file reads exclusively from `$_ENV` or `getenv()`.

---

## Customizing templates after scaffold

Templates are copied files — once scaffolded, they're yours. There is no link back to Rocket's bundled source.

**Common first customizations for Web App:**
- Replace the placeholder home page in `client/src/pages/Home.tsx`
- Add your first database table in `server/src/db/migrations/`
- Configure shadcn/ui theme colors in `client/src/index.css`
- Add your real SMTP credentials to `.env`

**Common first customizations for Website:**
- Set your MySQL database name in `.env` and create the database
- Replace `templates/layout.php` with your site's actual design
- Add your first model in `src/models/`

---

## How `.agent/` is initialized in each template

Both templates create the same `.agent/` structure during `rocket new`:

```
.agent/
  prd/
    PRD.md          # Placeholder — fill in your project requirements
    SUMMARY.md      # Auto-generated one-paragraph project summary
  logs/
    LOG.md          # Loop session log (empty until first loop run)
  history/          # Per-iteration AI output (empty until first loop run)
  PROMPT.md         # Default loop prompt — edit before your first loop run
  tasks.json        # Empty task array — populate before your first loop run
```

`PROMPT.md` is pre-filled with a default template that includes project context placeholders and signal tag instructions. Edit it before running `rocket loop` for the first time.

`tasks.json` starts as `[]`. Populate it manually or use `rocket feature` to generate tasks from feature descriptions.

For projects created outside of `rocket new`, use `rocket init` to create the same structure in any existing directory.
