"""
Quick script to trigger an outbound call from the terminal.

Usage:
    python make_call.py C001
    python make_call.py C001 +919876543210   # override phone number
"""
import sys
import httpx

BASE = "http://localhost:8000"

customer_id = sys.argv[1] if len(sys.argv) > 1 else "C001"
phone_override = sys.argv[2] if len(sys.argv) > 2 else None

payload = {"customer_id": customer_id}
if phone_override:
    payload["phone_override"] = phone_override

print(f"Dialing {customer_id} ...")
try:
    r = httpx.post(f"{BASE}/api/voice/call", json=payload, timeout=15)
    r.raise_for_status()
    data = r.json()
    print(f"✓ Call initiated!")
    print(f"  Customer : {data['customer_name']}")
    print(f"  To       : {data['to']}")
    print(f"  Call SID : {data['call_sid']}")
    print(f"  Conv ID  : {data['conversation_id']}")
    print(f"\n  Watch dashboard → http://localhost:5174/dashboard")
except httpx.HTTPStatusError as e:
    print(f"✗ HTTP {e.response.status_code}: {e.response.text}")
except Exception as e:
    print(f"✗ Error: {e}")
