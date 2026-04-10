#!/usr/bin/env python3
"""Send an email via Gmail SMTP.

Used by the weekly-report skill. Takes the body as a markdown file path,
converts to both clean plain text and HTML, and sends as multipart/alternative
via Gmail SMTP. Cross-platform (no macOS dependency).
"""
from __future__ import annotations

import argparse
import os
import re
import smtplib
import sys
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path


def markdown_to_plaintext(md: str) -> str:
    """Convert markdown to clean plain text for email fallback."""
    lines = md.split("\n")
    out: list[str] = []

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("### "):
            heading = _inline_strip(stripped[4:])
            out.append(heading)
            out.append("─" * min(len(heading), 40))
        elif stripped.startswith("## "):
            heading = _inline_strip(stripped[3:])
            out.append(heading)
            out.append("─" * min(len(heading), 40))
        elif stripped.startswith("# "):
            heading = _inline_strip(stripped[2:]).upper()
            out.append(heading)
            out.append("═" * min(len(heading), 50))
        elif stripped.startswith("---"):
            out.append("─" * 40)
        elif stripped.startswith("- "):
            out.append(f"  • {_inline_strip(stripped[2:])}")
        else:
            out.append(_inline_strip(stripped))

    return "\n".join(out)


def _inline_strip(text: str) -> str:
    """Strip inline markdown: **bold** -> bold, *italic* -> italic."""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    return text


def markdown_to_html(md: str) -> str:
    """Convert markdown to inline-styled HTML for email clients."""
    lines = md.split("\n")
    html_parts: list[str] = []
    in_list = False

    def inline(text: str) -> str:
        text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
        text = re.sub(
            r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<em>\1</em>", text
        )
        text = re.sub(
            r"`([^`]+)`",
            r'<code style="background:#f0f0f0;padding:2px 5px;'
            r'border-radius:3px;font-size:90%">\1</code>',
            text,
        )
        return text

    for line in lines:
        stripped = line.strip()

        if in_list and not stripped.startswith("- "):
            html_parts.append("</ul>")
            in_list = False

        if not stripped:
            if html_parts and not html_parts[-1].startswith("<br"):
                html_parts.append("<br>")
            continue

        if stripped.startswith("### "):
            html_parts.append(
                f'<h3 style="font-size:16px;color:#333;margin:16px 0 8px">'
                f"{inline(stripped[4:])}</h3>"
            )
        elif stripped.startswith("## "):
            html_parts.append(
                f'<h2 style="font-size:18px;color:#333;margin:20px 0 8px;'
                f'border-bottom:1px solid #eee;padding-bottom:6px">'
                f"{inline(stripped[3:])}</h2>"
            )
        elif stripped.startswith("# "):
            html_parts.append(
                f'<h1 style="font-size:24px;color:#222;margin:0 0 12px;'
                f'border-bottom:2px solid #ddd;padding-bottom:8px">'
                f"{inline(stripped[2:])}</h1>"
            )
        elif stripped.startswith("---"):
            html_parts.append(
                '<hr style="border:none;border-top:1px solid #ddd;margin:16px 0">'
            )
        elif stripped.startswith("- "):
            if not in_list:
                html_parts.append(
                    '<ul style="padding-left:20px;margin:8px 0">'
                )
                in_list = True
            html_parts.append(
                f'<li style="margin:4px 0">{inline(stripped[2:])}</li>'
            )
        else:
            html_parts.append(
                f'<p style="margin:6px 0;line-height:1.6">{inline(stripped)}</p>'
            )

    if in_list:
        html_parts.append("</ul>")

    body = "\n".join(html_parts)
    return (
        "<!DOCTYPE html><html><body style=\"font-family:-apple-system,"
        "BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;"
        'max-width:640px;color:#222;font-size:14px;line-height:1.6">'
        f"\n{body}\n</body></html>"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Send email via Gmail SMTP")
    parser.add_argument("--to", required=True, help="Recipient email address")
    parser.add_argument("--subject", required=True, help="Email subject line")
    parser.add_argument(
        "--body-file",
        required=True,
        help="Path to a file containing the email body in markdown (utf-8)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be sent and exit without sending",
    )
    args = parser.parse_args()

    # Read credentials from environment
    gmail_user = os.environ.get("GMAIL_USER")
    gmail_password = os.environ.get("GMAIL_PASSWORD")
    if not gmail_user or not gmail_password:
        print(
            "error: GMAIL_USER and GMAIL_PASSWORD must be set in environment",
            file=sys.stderr,
        )
        return 1

    body_path = Path(args.body_file)
    if not body_path.is_file():
        print(f"error: body-file not found: {args.body_file}", file=sys.stderr)
        return 1

    md = body_path.read_text(encoding="utf-8")
    plain = markdown_to_plaintext(md)
    html = markdown_to_html(md)

    # Build multipart/alternative email (plain text + HTML)
    msg = MIMEMultipart("alternative")
    msg["Subject"] = args.subject
    msg["From"] = gmail_user
    msg["To"] = args.to
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    if args.dry_run:
        print("=== DRY RUN ===")
        print(f"From: {gmail_user}")
        print(f"To: {args.to}")
        print(f"Subject: {args.subject}")
        print("--- Plain text body ---")
        print(plain)
        print("--- HTML body ---")
        print(html)
        print("=== END DRY RUN ===")
        return 0

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(gmail_user, gmail_password)
            server.send_message(msg)
    except smtplib.SMTPAuthenticationError as e:
        print(
            f"error: Gmail authentication failed. You may need an App Password "
            f"(see https://myaccount.google.com/apppasswords): {e}",
            file=sys.stderr,
        )
        return 1
    except smtplib.SMTPException as e:
        print(f"error: SMTP failed: {e}", file=sys.stderr)
        return 1

    print(f"OK {datetime.now().isoformat(timespec='seconds')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
