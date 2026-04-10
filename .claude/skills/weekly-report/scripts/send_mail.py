#!/usr/bin/env python3
"""Send an email via macOS Mail.app using osascript.

Used by the weekly-report skill. Takes the body as a file path (not argv)
to avoid shell escaping issues with multi-line markdown. Converts markdown
to clean plain text (strips syntax markers) for readable email rendering.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path


def markdown_to_plaintext(md: str) -> str:
    """Convert markdown to clean plain text for email.

    Strips #/##/### markers, **bold**, *italic*, replaces - bullets with
    bullet chars, and adds underline separators under headings.
    """
    lines = md.split("\n")
    out: list[str] = []

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("### "):
            heading = _inline(stripped[4:])
            out.append(heading)
            out.append("─" * min(len(heading), 40))
        elif stripped.startswith("## "):
            heading = _inline(stripped[3:])
            out.append(heading)
            out.append("─" * min(len(heading), 40))
        elif stripped.startswith("# "):
            heading = _inline(stripped[2:]).upper()
            out.append(heading)
            out.append("═" * min(len(heading), 50))
        elif stripped.startswith("---"):
            out.append("─" * 40)
        elif stripped.startswith("- "):
            out.append(f"  • {_inline(stripped[2:])}")
        else:
            out.append(_inline(stripped))

    return "\n".join(out)


def _inline(text: str) -> str:
    """Strip inline markdown: **bold** → bold, *italic* → italic, `code` → code."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    return text


def build_applescript(sender: str, recipient: str, subject: str, body: str) -> str:
    """Build the osascript source that sends via Mail.app.

    Uses 'content' (plain text) because Mail.app's 'html content' property
    does not reliably produce HTML emails that Gmail can render.
    Escapes backslashes first, then double quotes, for AppleScript string literals.
    """
    def esc(s: str) -> str:
        return s.replace("\\", "\\\\").replace('"', '\\"')

    return (
        f'tell application "Mail"\n'
        f'    set newMessage to make new outgoing message with properties '
        f'{{subject:"{esc(subject)}", content:"{esc(body)}", '
        f'sender:"{esc(sender)}", visible:false}}\n'
        f'    tell newMessage\n'
        f'        make new to recipient at end of to recipients '
        f'with properties {{address:"{esc(recipient)}"}}\n'
        f'    end tell\n'
        f'    send newMessage\n'
        f'end tell'
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Send email via macOS Mail.app")
    parser.add_argument("--to", required=True, help="Recipient email address")
    parser.add_argument(
        "--from",
        dest="sender",
        required=True,
        help="Sender email (must be a configured Mail.app account)",
    )
    parser.add_argument("--subject", required=True, help="Email subject line")
    parser.add_argument(
        "--body-file",
        required=True,
        help="Path to a file containing the email body in markdown (utf-8)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the osascript that would be executed and exit without sending",
    )
    args = parser.parse_args()

    body_path = Path(args.body_file)
    if not body_path.is_file():
        print(f"error: body-file not found: {args.body_file}", file=sys.stderr)
        return 1

    md = body_path.read_text(encoding="utf-8")
    body = markdown_to_plaintext(md)
    script = build_applescript(args.sender, args.to, args.subject, body)

    if args.dry_run:
        print("=== DRY RUN: plain text body that would be sent ===")
        print(body)
        print("=== osascript ===")
        print(script)
        print("=== END DRY RUN ===")
        return 0

    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stderr or result.stdout or "osascript failed", file=sys.stderr)
        return 1

    print(f"OK {datetime.now().isoformat(timespec='seconds')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
