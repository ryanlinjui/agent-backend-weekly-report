#!/bin/bash
# Expose local port via tunnel. Tries multiple methods in order.
# Usage: ./tunnel.sh <PORT>
# Outputs the public URL to stdout.

PORT="${1:-8765}"

# Method 1: npx localtunnel (if npx available)
if command -v npx &>/dev/null; then
    URL=$(npx -y localtunnel --port "$PORT" 2>/dev/null | grep -o 'https://[^ ]*' | head -1)
    if [ -n "$URL" ]; then
        echo "$URL"
        exit 0
    fi
fi

# Method 2: ssh tunnel via localhost.run (no signup needed)
if command -v ssh &>/dev/null; then
    URL=$(ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -R 80:localhost:"$PORT" nokey@localhost.run 2>/dev/null | grep -o 'https://[^ ]*' | head -1)
    if [ -n "$URL" ]; then
        echo "$URL"
        exit 0
    fi
fi

# Method 3: Python-based simple reverse proxy (last resort — no external dependency)
# This won't work without a relay, so just fail gracefully
echo "ERROR: No tunnel method available. Install Node.js (npx) or ensure ssh is available."
exit 1
