# Preparation

This document records the environment requirements and setup commands for the
Python CLI and the separate web application. Neither product makes external
network requests while performing subnet calculations.

## Required software

- Python 3.12, 3.13, or 3.14 (CPython is recommended)
- `pip`, normally bundled with Python
- Node.js 24
- pnpm 11.19.0, matching `web/package.json`
- Git for cloning and version-control workflows

The inspected Windows development machine had Git 2.54.0 available. Neither a
system `python` command nor a Python Launcher installation was detected, so a
supported Python installation or an isolated bundled runtime is required for
local validation.

## Supported Python version

SubnetVLSMCalculator supports Python 3.12, 3.13, and 3.14. The CI test matrix
checks all three versions. `pyproject.toml` deliberately excludes untested future
Python releases until they are added to CI.

## Required Python packages

Runtime dependencies, installed through `pyproject.toml`:

- Typer 0.12 or newer
- Rich 13.7 or newer
- Pydantic 2.7 or newer

Development dependencies:

- pytest 8 or newer
- pytest-cov 5 or newer
- Ruff 0.6 or newer
- mypy 1.11 or newer

Python's standard-library `ipaddress` module is the source of truth for address
and subnet calculations.

## Required web packages

The web workspace installs its exact Next.js, React, TypeScript, Vitest, ESLint,
Prettier, Tailwind, Supabase SSR/client, and Supabase CLI versions from
`web/pnpm-lock.yaml`. Do not install these packages globally or substitute npm/yarn
for the locked pnpm workflow.

## Optional software

- Visual Studio Code or another Python-aware editor
- Windows Terminal for improved Unicode and color rendering
- `pipx` for installing the CLI in an isolated user environment
- Docker Desktop (required only for the full local Supabase database workflow)
- a hosted Supabase account (required only for deployed authentication/persistence)

## Windows installation commands

Install Python with Windows Package Manager if it is not already present:

```powershell
winget install --id Python.Python.3.12 --exact
```

Alternatively, download Python from <https://www.python.org/downloads/windows/>.
Select the option to add Python to `PATH`. These are manual system setup steps;
the project never runs them automatically.

Install Git if needed:

```powershell
winget install --id Git.Git --exact
```

Install Node.js 24 if needed, then activate the repository's pnpm version:

```powershell
winget install --id OpenJS.NodeJS.LTS --exact
corepack enable
corepack prepare pnpm@11.19.0 --activate
```

## Verify Python, Node.js, pnpm, Git, and pip

Open a new PowerShell window after installing Python, then run:

```powershell
python --version
python -m pip --version
node --version
pnpm --version
git --version
```

`python --version` must report 3.12, 3.13, or 3.14. `node --version` must report
24.x and `pnpm --version` must report 11.19.0.

## Environment setup

From the repository root:

```powershell
Set-Location SubnetVLSMCalculator
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
```

Install the web workspace separately:

```powershell
Set-Location web
pnpm install --frozen-lockfile
Copy-Item ..\.env.example .env.local
pnpm dev
```

The copied environment file disables Next.js telemetry and supplies safe local
defaults. The anonymous calculator is available at `http://localhost:3000` without
Supabase. Account and saved-project routes require these exact public variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-local-publishable-key
```

The URL and publishable key are intended for browser use. Never replace the
publishable key with a service-role key; service-role access bypasses RLS and is not
required by the current application.

For the full local workspace, start Docker Desktop and run from `web`:

```powershell
pnpm db:start
pnpm db:reset
pnpm db:lint
pnpm db:types
pnpm db:test
pnpm dev
```

Use the API URL/key printed by `db:start`. Local confirmation and reset emails are
visible at `http://127.0.0.1:54324`. Run `pnpm db:stop` when finished. These local
database commands do not configure or migrate a hosted Supabase project.

If PowerShell blocks local activation scripts for the current process only:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Activation is optional; the virtual environment can be used explicitly:

```powershell
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\.venv\Scripts\subnetcalc.exe --help
```

## Virtual-environment workflow

Create one environment per checkout and never commit it:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
pytest
ruff check .
mypy src/subnet_calculator
```

Run the complete web quality gate from `web`:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

When a database migration or authorization policy changes, also run with Docker:

```powershell
pnpm db:reset
pnpm db:lint
pnpm db:types
pnpm db:test
```

Leave the environment with:

```powershell
deactivate
```

No global package installation is required or recommended.

## Troubleshooting missing modules or tools

If pytest reports `No module named subnet_calculator` or `pydantic`, or PowerShell
cannot find `ruff` or `mypy`, activate the environment and install the project with
its development extra from the repository root:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
python -m pytest --cov=subnet_calculator --cov-report=term-missing
python -m ruff check .
python -m ruff format --check .
python -m mypy src
```

Using `python -m` ensures every command comes from the currently active Python
environment. If `.venv\Scripts\python.exe --version` says it cannot create a
process, the environment references a removed Python installation. Preserve or
delete that broken `.venv`, recreate it with `python -m venv .venv`, then reinstall
`.[dev]`; virtual environments are not portable across Python installations.

If pnpm reports a lockfile or peer-dependency error, confirm Node 24 and pnpm
11.19.0 are active, remove no lockfile entries by hand, and rerun
`pnpm install --frozen-lockfile` from `web`.
