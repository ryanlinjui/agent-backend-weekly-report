#!/usr/bin/env python3
"""LINE webhook receiver — saves incoming messages to a local JSON file.

Zero dependencies (Python stdlib only). Started by the skill during init.
Listens on the port specified by LINE_WEBHOOK_PORT env var (default 8765).
Saves incoming messages to LINE_INBOX_FILE (default /tmp/line-inbox.json).
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path


PORT = int(os.environ.get("LINE_WEBHOOK_PORT", "8765"))
INBOX_FILE = Path(os.environ.get("LINE_INBOX_FILE", "/tmp/line-inbox.json"))


class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self.send_response(400)
            self.end_headers()
            return

        # Extract message events
        events = data.get("events", [])
        new_messages = []
        for event in events:
            if event.get("type") == "message" and event["message"].get("type") == "text":
                new_messages.append({
                    "timestamp": datetime.now().isoformat(timespec="seconds"),
                    "user_id": event["source"].get("userId", "unknown"),
                    "reply_token": event.get("replyToken", ""),
                    "text": event["message"]["text"],
                    "handled": False,
                })

        if new_messages:
            # Append to inbox file
            existing = []
            if INBOX_FILE.exists():
                try:
                    existing = json.loads(INBOX_FILE.read_text())
                except (json.JSONDecodeError, FileNotFoundError):
                    existing = []
            existing.extend(new_messages)
            INBOX_FILE.write_text(json.dumps(existing, ensure_ascii=False, indent=2))

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{}')

    def do_GET(self):
        # Health check
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, format, *args):
        # Suppress request logs to keep background process quiet
        pass


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), WebhookHandler)
    print(f"LINE webhook listening on port {PORT}, inbox: {INBOX_FILE}")
    sys.stdout.flush()
    server.serve_forever()
