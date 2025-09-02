import json
import csv

HAR_FILE = "1xbet.com333.har"       # your HAR file
CSV_FILE = "crash_from_har.csv"  # output

def parse_har(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        har = json.load(f)

    results = []

    for entry in har["log"]["entries"]:
        req = entry.get("request", {})
        res = entry.get("response", {})
        content = res.get("content", {}).get("text", "")

        # Only look at WebSocket responses (they contain OnCrash/OnStart JSON)
        if not content:
            continue

        try:
            # Some frames are separated by \x1e (record separator)
            parts = content.split("\x1e")
            for part in parts:
                part = part.strip()
                if not part:
                    continue
                obj = json.loads(part)

                # Crash end
                if obj.get("type") == 1 and obj.get("target") == "OnCrash":
                    args = (obj.get("arguments") or [{}])[0]
                    results.append({
                        "round_id": args.get("l"),
                        "multiplier": args.get("f"),
                        "event": "crash"
                    })

                # Round start
                if obj.get("type") == 1 and obj.get("target") == "OnStart":
                    args = (obj.get("arguments") or [{}])[0]
                    results.append({
                        "round_id": args.get("l"),
                        "multiplier": None,
                        "event": "start"
                    })

        except Exception:
            continue

    return results

def save_to_csv(data, file_path):
    with open(file_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["round_id", "event", "multiplier"])
        writer.writeheader()
        writer.writerows(data)

def main():
    events = parse_har(HAR_FILE)
    save_to_csv(events, CSV_FILE)
    print(f"✅ Extracted {len(events)} events → saved to {CSV_FILE}")

if __name__ == "__main__":
    main()
