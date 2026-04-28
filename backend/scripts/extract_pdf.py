#!/usr/bin/env python3
"""
extract_pdf.py <path_to_pdf>
Outputs the extracted text to stdout.
Used by resumeController.js via child_process.spawn.
"""
import sys
import pdfplumber


def extract_text(path: str) -> str:
    pages = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                pages.append(text.strip())
    return "\n\n".join(pages)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: extract_pdf.py <path>", file=sys.stderr)
        sys.exit(1)
    try:
        print(extract_text(sys.argv[1]))
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
