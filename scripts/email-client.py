#!/usr/bin/env python3
"""Universal email client — send and read via SMTP/IMAP.

Works with Gmail, Outlook, Yahoo, iCloud, and any standard email provider.
Python stdlib only (smtplib, imaplib, email). Zero pip dependencies.

Usage:
  # Send
  python3 email-client.py send --to user@example.com --subject "Test" --body-file /tmp/body.txt

  # Read unread replies
  python3 email-client.py read --search "UNSEEN SUBJECT \"Re: Weekly Report\""

  # Reply to a message
  python3 email-client.py reply --message-id "<msg-id>" --body "Your answer here"

Requires env vars: EMAIL_USER, EMAIL_PASSWORD, EMAIL_IMAP_HOST, EMAIL_SMTP_HOST
(or just EMAIL_USER + EMAIL_PASSWORD — hosts auto-detected from domain)
"""
from __future__ import annotations

import argparse
import email
import email.utils
import imaplib
import json
import os
import re
import smtplib
import ssl
import sys
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

# Auto-detect provider settings from email domain
PROVIDER_MAP = {
    "gmail.com": {"imap": "imap.gmail.com", "smtp": "smtp.gmail.com", "smtp_port": 587},
    "googlemail.com": {"imap": "imap.gmail.com", "smtp": "smtp.gmail.com", "smtp_port": 587},
    "outlook.com": {"imap": "outlook.office365.com", "smtp": "smtp.office365.com", "smtp_port": 587},
    "hotmail.com": {"imap": "outlook.office365.com", "smtp": "smtp.office365.com", "smtp_port": 587},
    "live.com": {"imap": "outlook.office365.com", "smtp": "smtp.office365.com", "smtp_port": 587},
    "yahoo.com": {"imap": "imap.mail.yahoo.com", "smtp": "smtp.mail.yahoo.com", "smtp_port": 465},
    "icloud.com": {"imap": "imap.mail.me.com", "smtp": "smtp.mail.me.com", "smtp_port": 587},
    "me.com": {"imap": "imap.mail.me.com", "smtp": "smtp.mail.me.com", "smtp_port": 587},
}


def detect_provider(email_addr: str) -> dict:
    domain = email_addr.split("@")[1].lower()
    if domain in PROVIDER_MAP:
        return PROVIDER_MAP[domain]
    # Default: try standard mail.domain / smtp.domain
    return {"imap": f"imap.{domain}", "smtp": f"smtp.{domain}", "smtp_port": 587}


def get_config() -> dict:
    user = os.environ.get("EMAIL_USER", "")
    password = os.environ.get("EMAIL_PASSWORD", "")
    if not user or not password:
        print("error: EMAIL_USER and EMAIL_PASSWORD must be set", file=sys.stderr)
        sys.exit(1)

    provider = detect_provider(user)
    return {
        "user": user,
        "password": password,
        "imap_host": os.environ.get("EMAIL_IMAP_HOST", provider["imap"]),
        "smtp_host": os.environ.get("EMAIL_SMTP_HOST", provider["smtp"]),
        "smtp_port": int(os.environ.get("EMAIL_SMTP_PORT", provider["smtp_port"])),
    }


def cmd_send(args):
    cfg = get_config()
    body_path = Path(args.body_file)
    if not body_path.is_file():
        print(f"error: body-file not found: {args.body_file}", file=sys.stderr)
        return 1

    body = body_path.read_text(encoding="utf-8")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = args.subject
    msg["From"] = cfg["user"]
    msg["To"] = args.to
    msg["Date"] = email.utils.formatdate(localtime=True)
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        if cfg["smtp_port"] == 465:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(cfg["smtp_host"], 465, context=ctx) as server:
                server.login(cfg["user"], cfg["password"])
                server.send_message(msg)
        else:
            with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"]) as server:
                server.starttls()
                server.login(cfg["user"], cfg["password"])
                server.send_message(msg)
    except smtplib.SMTPAuthenticationError as e:
        print(f"error: SMTP auth failed. Use an App Password: {e}", file=sys.stderr)
        return 1
    except smtplib.SMTPException as e:
        print(f"error: SMTP failed: {e}", file=sys.stderr)
        return 1

    print(f"OK {datetime.now().isoformat(timespec='seconds')}")
    return 0


def cmd_read(args):
    cfg = get_config()
    try:
        mail = imaplib.IMAP4_SSL(cfg["imap_host"])
        mail.login(cfg["user"], cfg["password"])
        mail.select("INBOX")

        search_criteria = args.search or 'UNSEEN SUBJECT "Re: Weekly Report"'
        _, msg_nums = mail.search(None, search_criteria)

        messages = []
        for num in msg_nums[0].split():
            if not num:
                continue
            _, data = mail.fetch(num, "(RFC822)")
            raw = data[0][1]
            msg = email.message_from_bytes(raw)

            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body = part.get_payload(decode=True).decode("utf-8", errors="replace")
                        break
            else:
                body = msg.get_payload(decode=True).decode("utf-8", errors="replace")

            messages.append({
                "message_id": msg.get("Message-ID", ""),
                "from": msg.get("From", ""),
                "subject": msg.get("Subject", ""),
                "date": msg.get("Date", ""),
                "body": body.strip(),
                "uid": num.decode(),
            })

        mail.logout()
        print(json.dumps(messages, ensure_ascii=False, indent=2))
        return 0

    except imaplib.IMAP4.error as e:
        print(f"error: IMAP failed: {e}", file=sys.stderr)
        return 1


def cmd_reply(args):
    cfg = get_config()
    try:
        # Read the original message to get headers
        mail = imaplib.IMAP4_SSL(cfg["imap_host"])
        mail.login(cfg["user"], cfg["password"])
        mail.select("INBOX")

        # Find the message by UID
        _, data = mail.fetch(args.uid.encode(), "(RFC822)")
        raw = data[0][1]
        original = email.message_from_bytes(raw)

        # Mark as read
        mail.store(args.uid.encode(), "+FLAGS", "\\Seen")
        mail.logout()

        # Build reply
        reply = MIMEMultipart("alternative")
        reply["Subject"] = "Re: " + original.get("Subject", "").replace("Re: ", "")
        reply["From"] = cfg["user"]
        reply["To"] = original.get("From", "")
        reply["In-Reply-To"] = original.get("Message-ID", "")
        reply["References"] = original.get("Message-ID", "")
        reply["Date"] = email.utils.formatdate(localtime=True)
        reply.attach(MIMEText(args.body, "plain", "utf-8"))

        # Send
        if cfg["smtp_port"] == 465:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(cfg["smtp_host"], 465, context=ctx) as server:
                server.login(cfg["user"], cfg["password"])
                server.send_message(reply)
        else:
            with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"]) as server:
                server.starttls()
                server.login(cfg["user"], cfg["password"])
                server.send_message(reply)

        print(f"OK replied to {original.get('From', '?')}")
        return 0

    except Exception as e:
        print(f"error: reply failed: {e}", file=sys.stderr)
        return 1


def main():
    parser = argparse.ArgumentParser(description="Universal email client (IMAP/SMTP)")
    sub = parser.add_subparsers(dest="command")

    p_send = sub.add_parser("send", help="Send an email")
    p_send.add_argument("--to", required=True)
    p_send.add_argument("--subject", required=True)
    p_send.add_argument("--body-file", required=True)

    p_read = sub.add_parser("read", help="Read unread emails")
    p_read.add_argument("--search", default='UNSEEN SUBJECT "Re: Weekly Report"')

    p_reply = sub.add_parser("reply", help="Reply to a message")
    p_reply.add_argument("--uid", required=True, help="Message UID from read output")
    p_reply.add_argument("--body", required=True, help="Reply body text")

    args = parser.parse_args()
    if args.command == "send":
        sys.exit(cmd_send(args))
    elif args.command == "read":
        sys.exit(cmd_read(args))
    elif args.command == "reply":
        sys.exit(cmd_reply(args))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
