import json
import urllib.request
import sys
import os
from pathlib import Path

SUPABASE_EDGE_URL = "https://uskyccnonglqfvjsqkad.supabase.co/functions/v1/push-usage"
CREDS_FILE = Path.home() / ".claude" / ".credentials.json"

def main():
    member_name = os.environ.get("CLAUDE_MEMBER_NAME", "unknown")

    if not CREDS_FILE.exists():
        print("credentials file not found", file=sys.stderr)
        return

    creds = json.loads(CREDS_FILE.read_text())
    token = creds["claudeAiOauth"]["accessToken"]

    req = urllib.request.Request(
        "https://api.anthropic.com/api/oauth/usage",
        headers={
            "Authorization": f"Bearer {token}",
            "anthropic-client-name": "claude-code",
            "anthropic-version": "2023-06-01",
        }
    )
    try:
        with urllib.request.urlopen(req) as res:
            usage = json.loads(res.read())
    except Exception as e:
        print(f"failed to fetch usage: {e}", file=sys.stderr)
        return

    fh = usage.get("five_hour") or {}
    sd = usage.get("seven_day") or {}

    payload = json.dumps({
        "member_name":            member_name,
        "five_hour_utilization":  fh.get("utilization"),
        "five_hour_resets_at":    fh.get("resets_at"),
        "seven_day_utilization":  sd.get("utilization"),
        "seven_day_resets_at":    sd.get("resets_at"),
    }).encode()

    req = urllib.request.Request(
        SUPABASE_EDGE_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        urllib.request.urlopen(req)
        print(f"usage pushed for {member_name}")
    except Exception as e:
        print(f"failed to push: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
