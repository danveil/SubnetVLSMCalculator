# Contributing

Thank you for improving SubnetVLSMCalculator. Open an issue before a large change,
keep functionality defensive and offline, and include tests and documentation for
observable behavior.

```bash
python -m venv .venv
python -m pip install -e ".[dev]"
ruff format .
ruff check .
mypy src/subnet_calculator
pytest --cov=subnet_calculator
```

Use descriptive commits, type hints, public docstrings, `pathlib`, and the standard
`ipaddress` module for address mathematics. Never add scanning, exploitation,
credential attacks, telemetry, secrets, or unrequested network access. By
contributing, you agree that your work is licensed under the MIT License.

