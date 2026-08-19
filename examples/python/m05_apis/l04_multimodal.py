"""
Lesson 5.4 - Multimodal input

Vision-capable models read images the same way they read text: the picture becomes tokens
and goes through the same next-token machinery. That makes "extract the total from this
invoice", "what does this screenshot show" and "describe this chart" ordinary prompts - with
two engineering caveats: images are expensive in tokens, and OCR-shaped tasks often want
an OCR step first. This example does both: asks the model to read a rendered invoice
directly into a schema, then compares with what plain text extraction would need.

The image is a fixture rendered from HTML (examples/shared/fixtures/invoice.png), so the
ground truth is known: total due EUR 1,088.85, invoice INV-2026-0419.

Run:  python3 m05_apis/l04_multimodal.py
"""

from __future__ import annotations

import base64
import json
from pathlib import Path

from learnai import section, title
from learnai.llm import VISION_MODEL, complete

FIXTURE = Path(__file__).resolve().parents[2] / "shared" / "fixtures" / "invoice.png"

# region: schema
INVOICE_SCHEMA = {
    "type": "object",
    "properties": {
        "invoice_number": {"type": "string"},
        "currency": {"type": "string"},
        "subtotal": {"type": "number"},
        "vat": {"type": "number"},
        "total_due": {"type": "number"},
        "line_item_count": {"type": "integer"},
    },
    "required": ["invoice_number", "currency", "subtotal", "vat", "total_due", "line_item_count"],
    "additionalProperties": False,
}
# endregion


# region: read-image
def read_invoice(png: bytes) -> dict:
    """One user message carrying the image (base64) and the instruction. Same structured
    output discipline as Lesson 4.3: the schema pins the shape, code checks the values."""
    result = complete(
        [{"role": "user", "content": "Read this invoice and fill the fields. Numbers as plain decimals.",
          "images": [base64.b64encode(png).decode("ascii")]}],
        model=VISION_MODEL,
        json_schema=INVOICE_SCHEMA,
        max_tokens=300,
    )
    return json.loads(result.text), result
# endregion


# region: check
TRUTH = {"invoice_number": "INV-2026-0419", "currency": "EUR", "subtotal": 915.0, "vat": 173.85, "total_due": 1088.85, "line_item_count": 3}


def check(extracted: dict) -> list[str]:
    """Ground truth is known here. In production you do not have it - so you check what
    you can: arithmetic (subtotal + vat == total), formats, ranges. A number the model
    'read' is an OCR result and deserves OCR-grade verification."""
    problems = []
    for k, v in TRUTH.items():
        got = extracted.get(k)
        if isinstance(v, float) and isinstance(got, (int, float)):
            if abs(got - v) > 0.01:
                problems.append(f"{k}: read {got}, truth {v}")
        elif got != v:
            problems.append(f"{k}: read {got!r}, truth {v!r}")
    if abs(extracted.get("subtotal", 0) + extracted.get("vat", 0) - extracted.get("total_due", -1)) > 0.01:
        problems.append("arithmetic: subtotal + vat != total_due")
    return problems
# endregion


def main() -> None:
    png = FIXTURE.read_bytes()

    section("extract")
    title("Ask a vision model to read the invoice straight into a schema")
    fields, result = read_invoice(png)
    for k in INVOICE_SCHEMA["required"]:
        print(f"  {k:16} {json.dumps(fields.get(k))}")
    print(f"  ({result.model}, image + prompt = {result.input_tokens} input tokens)")

    section("check")
    title("Verify like OCR output, because it is OCR output")
    problems = check(fields)
    if problems:
        for p in problems:
            print("  MISREAD:", p)
    else:
        print("  all fields match the ground truth; arithmetic consistent")
    print("  a small local vision model read this; production pipelines verify the same way regardless of model")

    section("cost")
    title("Images are tokens too - budget them")
    kb = len(png) / 1024
    print(f"this PNG is {kb:.0f} KB on disk and cost {result.input_tokens} input tokens as an image")
    print("a text rendering of the same invoice is ~150 tokens - when you have the text, send the text")
    print("rules of thumb: downscale to what a human needs to read it; crop to the region; OCR first for dense text")


if __name__ == "__main__":
    main()
