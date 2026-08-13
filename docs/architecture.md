# Architecture

The package uses a `src` layout and separates pure domain calculations from user
interfaces and file output.

```text
CLI (cli.py)
  |-- validators/converters
  |-- IPv4 + IPv6 engines --> immutable models
  |-- VLSM engine ---------> immutable models
  |-- visualizer/explanations
  `-- exporters
```

- `models.py` defines validated inputs and immutable results.
- `subnet.py`, `ipv6.py`, and `vlsm.py` implement address mathematics through
  Python's standard `ipaddress` module.
- `validators.py` holds cross-field domain rules; `converters.py` owns mask conversion.
- `visualizer.py` and `explanations.py` return plain strings and do not perform calculations.
- `exporters.py` owns protected UTF-8 output and metadata.
- `cli.py` translates exceptions into actionable terminal messages and Rich tables.

No module performs network I/O, executes subprocesses, or collects telemetry.
Tests target domain functions directly and exercise the installed CLI through
Typer's test runner.

