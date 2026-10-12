#!/usr/bin/env python3
"""Reject workflow action majors that do not target Node 24.

UPDATE-07 (D-141): checks every workflow, not only the Pages deploy. Each `uses:` must be one of ALLOWED,
pinned to exactly that major; each workflow must contain its REQUIRED actions once. A major is added here only
after its action.yml at that tag says `runs.using: node24` (or `composite`, built on such actions).
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


ALLOWED = {
    "actions/checkout": "v7",
    "actions/setup-python": "v6",
    "actions/setup-node": "v7",
    "actions/upload-pages-artifact": "v5",
    "actions/deploy-pages": "v5",
    "actions/upload-artifact": "v7",
    "actions/download-artifact": "v8",
}

REQUIRED = {
    "deploy.yml": ["actions/checkout", "actions/setup-python", "actions/setup-node",
                   "actions/upload-pages-artifact", "actions/deploy-pages"],
    "ci.yml": ["actions/checkout", "actions/setup-python", "actions/setup-node"],
    "visual-baselines.yml": ["actions/checkout", "actions/upload-artifact"],
}

WORKFLOWS = Path(".github/workflows")

USES_PATTERN = re.compile(
    r"^\s*(?:-\s+)?uses:\s*(?P<reference>[^\s#]+)",
    flags=re.MULTILINE,
)


class WorkflowActionError(ValueError):
    """Raised when a workflow uses an unsupported action reference."""


def validate(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    references = [match.group("reference") for match in USES_PATTERN.finditer(source)]
    for reference in references:
        action, _, major = reference.partition("@")
        if action not in ALLOWED:
            raise WorkflowActionError(f"{path.name}: izin verilmeyen action: {reference}")
        if major != ALLOWED[action]:
            raise WorkflowActionError(
                f"{path.name}: desteklenmeyen action: {reference}; beklenen {action}@{ALLOWED[action]}")
    for action in REQUIRED.get(path.name, []):
        count = sum(1 for reference in references if reference.startswith(action + "@"))
        if count == 0:
            raise WorkflowActionError(f"{path.name}: zorunlu action eksik: {action}@{ALLOWED[action]}")
        if count != 1:
            raise WorkflowActionError(f"{path.name}: tekrarlı action: {action}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("workflow", nargs="*", type=Path,
                        help="workflow files (default: every file in .github/workflows that REQUIRED names)")
    args = parser.parse_args(argv)
    paths = args.workflow or [WORKFLOWS / name for name in REQUIRED]
    try:
        for path in paths:
            validate(path)
    except (OSError, WorkflowActionError) as exc:
        print(f"workflow actions invalid: {exc}", file=sys.stderr)
        return 1
    print("workflow actions valid: " + ", ".join(path.name for path in paths))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
