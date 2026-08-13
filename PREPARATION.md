# Preparation

This document records the environment requirements and setup commands before any
application files are created. The project does not install system-wide software
and does not make external network requests at runtime.

## Required software

- Python 3.12 or newer (CPython is recommended)
- `pip`, normally bundled with Python
- Git for cloning and version-control workflows

The inspected Windows development machine had Git 2.54.0 available. Neither a
system `python` command nor a Python Launcher installation was detected, so a
Python 3.12+ installation or an isolated bundled runtime is required for local
validation.

## Supported Python version

SubnetVLSMCalculator supports Python 3.12 and Python 3.13. The CI test matrix
checks both versions.

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

## Optional software

- Visual Studio Code or another Python-aware editor
- Windows Terminal for improved Unicode and color rendering
- `pipx` for installing the CLI in an isolated user environment

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

## Verify Python, Git, and pip

Open a new PowerShell window after installing Python, then run:

```powershell
python --version
python -m pip --version
git --version
```

`python --version` must report Python 3.12 or newer.

## Environment setup

From the repository root:

```powershell
Set-Location SubnetVLSMCalculator
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
```

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
