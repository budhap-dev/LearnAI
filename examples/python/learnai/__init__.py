"""
Tiny helpers shared by every Python example.

The examples are ordinary scripts you can run on their own. When run by the harness
(`python3 -m harness capture`) their stdout is split into named sections, and each
section becomes an <Output> block on the site - so the site can never show output the
code did not really produce.
"""

from __future__ import annotations

import sys

MARKER = "@@section:"


def section(name: str) -> None:
    """Start a named output section. Everything printed until the next call belongs to it."""
    sys.stdout.flush()
    print(f"{MARKER}{name}")


def title(text: str) -> None:
    """A heading inside a section - purely cosmetic."""
    print(text)
    print("-" * len(text))
