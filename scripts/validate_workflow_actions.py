#!/usr/bin/env python3
"""Reject GitHub Pages workflow action majors that do not target Node 24."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


REQUIRED = {
    "actions/checkout": "v7",
    "actions/setup-python": "v6",
    "actions/upload-pages-artifact": "v5",
    "actions/deploy-pages": "v5",
}

USES_PATTERN = re.compile(
    r"^\s*(?:-\s+)?uses:\s*(?P<reference>[^\s#]+)",
    flags=re.MULTILINE,
)


class WorkflowActionError(ValueError):
    """Raised when the Pages workflow uses an unsupported action reference."""


def validate(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    references = [match.group("reference") for match in USES_PATTERN.finditer(source)]
    for action, major in REQUIRED.items():
        matches = [reference for reference in references if reference.startswith(action + "@")]
        expected = f"{action}@{major}"
        if not matches:
            raise WorkflowActionError(f"zorunlu action eksik: {expected}")
        if len(matches) != 1:
            raise WorkflowActionError(f"tekrarlı action: {action}")
        if matches[0] != expected:
            raise WorkflowActionError(f"desteklenmeyen action: {matches[0]}; beklenen {expected}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "workflow",
        nargs="?",
        type=Path,
        default=Path(".github/workflows/deploy.yml"),
    )
    args = parser.parse_args(argv)
    try:
        validate(args.workflow)
    except (OSError, WorkflowActionError) as exc:
        print(f"workflow actions invalid: {exc}", file=sys.stderr)
        return 1
    print("workflow actions valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
