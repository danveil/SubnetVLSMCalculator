# Contributing

Thank you for improving SubnetVLSMCalculator and SubnetForge. Open an issue before
a large change, keep calculations defensive and offline, and include regression
tests and documentation for observable behavior.

Set up and check the Python CLI from the repository root:

```bash
python -m venv .venv
python -m pip install -e ".[dev]"
ruff format .
ruff check .
mypy src/subnet_calculator
pytest --cov=subnet_calculator
```

Set up and check the web application independently:

```bash
cd web
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm build
```

Use Python 3.12–3.14, Node.js 24, and pnpm 11.19.0 so local behavior matches CI.
Pure networking rules belong in `src/subnet_calculator` or
`web/src/lib/networking`; presentation code must not duplicate address arithmetic.

Use descriptive commits, Python type hints, public docstrings, `pathlib`, strict
TypeScript, and the standard `ipaddress` module for Python address mathematics.
Never add scanning, exploitation, credential attacks, telemetry, secrets, or
unrequested network access. By contributing, you agree that your work is licensed
under the MIT License.
