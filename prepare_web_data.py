
import csv
import json
from datetime import datetime
import sys
import os

DEFAULT_THRESHOLD = 2.1
HIGH_MULTIPLIER_THRESHOLD = 10
MOVING_AVERAGE_WINDOW = 10
PROBABILITY_THRESHOLDS = [2, 5, 10, 20, 50, 100]

def analyze_data(data, threshold, high_multiplier_threshold=HIGH_MULTIPLIER_THRESHOLD):
    processed_data = sorted(data, key=lambda x: x["timestamp"])

    # Basic analysis
    streak_counter = 0
    rounds_since_high = 0
    rounds_since_data = []
    for i in range(len(processed_data)):
        # Streak analysis
        is_below = 1 if processed_data[i]["multiplier"] < threshold else 0
        processed_data[i]["is_below_threshold"] = is_below
        if is_below:
            streak_counter += 1
        else:
            streak_counter = 0
        processed_data[i]["streak_below_threshold"] = streak_counter

        # Moving average
        if i >= MOVING_AVERAGE_WINDOW - 1:
            window = [d["multiplier"] for d in processed_data[i - MOVING_AVERAGE_WINDOW + 1:i + 1]]
            processed_data[i]["moving_average"] = sum(window) / MOVING_AVERAGE_WINDOW
        else:
            processed_data[i]["moving_average"] = None

        # Rounds since high multiplier
        if processed_data[i]["multiplier"] > high_multiplier_threshold:
            rounds_since_high = 0
        else:
            rounds_since_high += 1
        rounds_since_data.append(rounds_since_high)

    # Summary stats
    below_threshold = sum(1 for item in processed_data if item["is_below_threshold"] == 1)
    above_threshold = len(processed_data) - below_threshold

    # Streaks
    streaks = []
    if processed_data:
        current_streak_type = "below" if processed_data[0]["is_below_threshold"] == 1 else "above"
        current_streak_length = 0
        for item in processed_data:
            item_type = "below" if item["is_below_threshold"] == 1 else "above"
            if item_type == current_streak_type:
                current_streak_length += 1
            else:
                streaks.append({"type": current_streak_type, "length": current_streak_length})
                current_streak_type = item_type
                current_streak_length = 1
        streaks.append({"type": current_streak_type, "length": current_streak_length})

    summary_stats = {
        "total_rounds": len(processed_data),
        "highest_multiplier": max(item["multiplier"] for item in processed_data) if processed_data else 0,
        "average_multiplier": sum(item["multiplier"] for item in processed_data) / len(processed_data) if processed_data else 0,
        "max_streak_below": max((s["length"] for s in streaks if s["type"] == "below"), default=0),
        "max_streak_above": max((s["length"] for s in streaks if s["type"] == "above"), default=0),
    }

    # Predictive Analysis
    # Histogram
    max_mult = summary_stats["highest_multiplier"]
    bin_size = 0.5
    bins = [i * bin_size for i in range(int(max_mult / bin_size) + 2)]
    hist = {b: 0 for b in bins}
    for item in processed_data:
        bin_index = int(item["multiplier"] / bin_size)
        hist[bins[bin_index]] += 1
    histogram_data = {"labels": [f"{b:.1f}-{b+bin_size:.1f}" for b in bins], "data": list(hist.values())}

    # Streak Frequencies
    streak_frequencies = {"below": {}, "above": {}}
    for s in streaks:
        streak_frequencies[s["type"]][s["length"]] = streak_frequencies[s["type"]].get(s["length"], 0) + 1

    # Probabilities
    total_rounds = len(processed_data)
    probabilities = []
    if total_rounds > 0:
        for t in PROBABILITY_THRESHOLDS:
            count = sum(1 for item in processed_data if item["multiplier"] > t)
            probabilities.append({"threshold": t, "probability": (count / total_rounds) * 100})

    return {
        "processedData": processed_data,
        "analysisData": {
            "below_threshold": below_threshold,
            "above_threshold": above_threshold,
            "streaks": streaks,
            "summary_stats": summary_stats,
            "histogram": histogram_data,
            "streak_frequencies": streak_frequencies,
            "rounds_since_high_multiplier": rounds_since_data,
            "probabilities": probabilities
        }
    }

def main():
    if len(sys.argv) != 3:
        print("Usage: python prepare_web_data.py <input_csv_file> <output_dir>")
        sys.exit(1)

    csv_file = sys.argv[1]
    output_dir = sys.argv[2]

    data = []
    with open(csv_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            ts = datetime.fromtimestamp(int(row["timestamp"]) / 1000)
            data.append({
                "round_id": row["round_id"],
                "multiplier": float(row["final_multiplier"]),
                "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S")
            })

    # Generate pre-analyzed data for the default threshold
    default_analysis = analyze_data(data, DEFAULT_THRESHOLD, HIGH_MULTIPLIER_THRESHOLD)
    js_content = f"const defaultAnalysis = {json.dumps(default_analysis, indent=2)};"
    with open(os.path.join(output_dir, "data.js"), "w") as f:
        f.write(js_content)

    # Save raw data
    with open(os.path.join(output_dir, "raw_data.json"), "w") as f:
        json.dump(data, f, indent=2)

    print(f"✅ Processed data and saved to {output_dir}")

if __name__ == "__main__":
    main()
