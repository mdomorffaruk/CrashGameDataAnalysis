#!/bin/bash

HAR_DIR="har"
OUTPUT_CSV_FILE="crash_results_from_har.csv"
OUTPUT_JS_FILE="web/data.js"

# Remove old CSV file
rm -f "$OUTPUT_CSV_FILE"

# Process all HAR files
for har_file in "$HAR_DIR"/*.har; do
  if [ -f "$har_file" ]; then
    python3 process_har.py "$har_file" "$OUTPUT_CSV_FILE"
  fi
done

# Prepare web data
python3 prepare_web_data.py "$OUTPUT_CSV_FILE" "web"

# Count total events
TOTAL_EVENTS=$(wc -l < "$OUTPUT_CSV_FILE")
TOTAL_EVENTS=$((TOTAL_EVENTS - 1)) # Subtract header

echo "
✅ Total crash events processed: $TOTAL_EVENTS"
echo "Data generation complete. Output files in web/"
