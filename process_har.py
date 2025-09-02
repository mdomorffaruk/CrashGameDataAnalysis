
import json
import csv
import sys
import os

def parse_har(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        har = json.load(f)

    results = []

    for entry in har["log"]["entries"]:
        # Check for websocket messages
        if "_webSocketMessages" in entry:
            for message in entry["_webSocketMessages"]:
                # We are interested in messages from the server
                if message.get("type") == "receive":
                    data = message.get("data", "")
                    # Some frames are separated by  (record separator)
                    parts = data.split("")
                    for part in parts:
                        part = part.strip()
                        if not part:
                            continue
                        try:
                            obj = json.loads(part)

                            # Crash end
                            if obj.get("type") == 1 and obj.get("target") == "OnCrash":
                                args = (obj.get("arguments") or [{}])[0]
                                results.append({
                                    "round_id": args.get("l"),
                                    "final_multiplier": args.get("f"),
                                    "timestamp": args.get("ts")
                                })
                        except json.JSONDecodeError:
                            # Not a json message, skip
                            continue
    return results

def save_to_csv(data, file_path):
    if not data:
        print("No crash events found in the HAR file.")
        return

    file_exists = os.path.isfile(file_path)

    with open(file_path, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["round_id", "final_multiplier", "timestamp"])
        if not file_exists:
            writer.writeheader()
        writer.writerows(data)

def main():
    if len(sys.argv) != 3:
        print("Usage: python process_har.py <input_har_file> <output_csv_file>")
        sys.exit(1)

    har_file = sys.argv[1]
    csv_file = sys.argv[2]

    events = parse_har(har_file)
    save_to_csv(events, csv_file)
    if events:
        print(f"✅ Extracted {len(events)} crash events from {har_file} → saved to {csv_file}")

if __name__ == "__main__":
    main()
