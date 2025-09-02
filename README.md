# 1xBet Crash Game Analyzer

This project provides a suite of tools to analyze crash game data from 1xBet, extracted from HAR (HTTP Archive) files. It allows users to perform detailed statistical and predictive analysis on game rounds to better understand patterns and probabilities.

## Features

- **Batch Processing:** Automatically processes all `.har` files placed in the `har` directory.
- **Interactive Web Interface:** A clean and intuitive web dashboard to visualize the data.
- **Dynamic Filtering:** Interactively analyze the data by changing the multiplier threshold.
- **Standard Analysis:**
    - Summary statistics (total rounds, highest multiplier, average multiplier, etc.).
    - Charts for crashes over time, streak analysis, and multiplier distribution.
    - A searchable and sortable table of all raw data.
- **Predictive Analysis Tab:**
    - **Detailed Multiplier Histogram:** A granular view of the multiplier distribution.
    - **Streak Frequency Analysis:** A table showing how often different streak lengths occur.
    - **'Rounds Since Last High Multiplier' Chart:** A chart to visualize the gaps between big wins (>10x).
    - **Empirical Probability Table:** The statistical probability of the multiplier exceeding various thresholds based on your data.
- **High-Performance Hybrid Model:** Uses a hybrid approach for a fast user experience on static hosting. The initial view loads instantly with pre-calculated data, while a Web Worker handles heavy analysis for custom queries in the background without freezing the UI.

## How to Use

### 1. Prerequisites

- Python 3

### 2. Setup

1.  **Add HAR Files:** Place your `.har` files containing the crash game data into the `har` directory.

### 3. Generate Data

Run the data generation script from your terminal:

```bash
./generate_data.sh
```

This script will process all the HAR files, perform the necessary analyses, and generate the data files required for the web interface.

### 4. View the Analysis

Open the `web/index.html` file in your web browser.

**Note:** If you have run the script before, you may need to do a hard refresh (Ctrl+Shift+R or Cmd+Shift+R) to ensure you are viewing the latest data.

## Technical Overview

- `generate_data.sh`: The main script that orchestrates the data processing pipeline.
- `process_har.py`: Extracts crash event data from HAR files and saves it to a CSV file.
- `prepare_web_data.py`: Performs the default and predictive analyses and generates two key files:
    - `web/data.js`: Contains the pre-calculated analysis for the default 2.1x multiplier for a fast initial page load.
    - `web/raw_data.json`: Contains the raw, unprocessed data for dynamic client-side analysis.
- `web/app.js`: The main JavaScript file for the web interface. It handles user interactions, renders the charts and tables, and communicates with the Web Worker.
- `web/worker.js`: The Web Worker script that performs heavy data analysis in the background to prevent the UI from freezing.

## Disclaimer

This tool is intended for statistical analysis of historical data. The "predictive" features are based on empirical probabilities and patterns from the data you provide. If the game is based on a provably fair or cryptographically random system, it is impossible to predict the outcome of any specific round. This tool does not guarantee any future results. Please use it responsibly.