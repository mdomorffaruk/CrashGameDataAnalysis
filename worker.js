const MOVING_AVERAGE_WINDOW = 10;
const PROBABILITY_THRESHOLDS = [2, 5, 10, 20, 50, 100];

const analyzeData = (data, threshold, highMultiplierThreshold) => {
    const startTime = performance.now();
    console.log(`Worker: Analyzing with highMultiplierThreshold: ${highMultiplierThreshold}`); // DEBUG LOG
    let processedData = data.map(item => ({...item})).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const total_rounds = processedData.length;

    // Single pass for multiple calculations
    let streakCounter = 0;
    let rounds_since_high = 0;
    let rounds_since_data = [];
    let belowThresholdCount = 0;
    let highest_multiplier = 0;
    let sum_multiplier = 0;
    const bin_size = 0.5;
    const hist = [];
    const prob_counts = new Array(PROBABILITY_THRESHOLDS.length).fill(0);

    for (let i = 0; i < total_rounds; i++) {
        const item = processedData[i];
        const multiplier = item.multiplier;

        // Streak analysis
        const isBelow = multiplier < threshold;
        item.is_below_threshold = isBelow;
        if (isBelow) {
            streakCounter++;
            belowThresholdCount++;
        } else {
            streakCounter = 0;
        }
        item.streak_below_threshold = streakCounter;

        // Moving average
        if (i >= MOVING_AVERAGE_WINDOW - 1) {
            let window_sum = 0;
            for (let j = 0; j < MOVING_AVERAGE_WINDOW; j++) {
                window_sum += processedData[i - j].multiplier;
            }
            item.moving_average = window_sum / MOVING_AVERAGE_WINDOW;
        } else {
            item.moving_average = null;
        }

        // Rounds since high multiplier
        if (multiplier > highMultiplierThreshold) {
            rounds_since_high = 0;
        } else {
            rounds_since_high++;
        }
        rounds_since_data.push(rounds_since_high);

        // Summary stats helpers
        sum_multiplier += multiplier;
        if (multiplier > highest_multiplier) {
            highest_multiplier = multiplier;
        }

        // Histogram helper
        const bin_index = Math.floor(multiplier / bin_size);
        hist[bin_index] = (hist[bin_index] || 0) + 1;

        // Probabilities helper
        for (let p = 0; p < PROBABILITY_THRESHOLDS.length; p++) {
            if (multiplier > PROBABILITY_THRESHOLDS[p]) {
                prob_counts[p]++;
            }
        }
    }

    // Streaks
    const streaks = [];
    if (total_rounds > 0) {
        let current_streak_type = processedData[0].is_below_threshold ? "below" : "above";
        let current_streak_length = 0;
        for (const item of processedData) {
            const item_type = item.is_below_threshold ? "below" : "above";
            if (item_type === current_streak_type) {
                current_streak_length++;
            } else {
                streaks.push({ type: current_streak_type, length: current_streak_length });
                current_streak_type = item_type;
                current_streak_length = 1;
            }
        }
        streaks.push({ type: current_streak_type, length: current_streak_length });
    }

    const summary_stats = {
        total_rounds: total_rounds,
        highest_multiplier: highest_multiplier,
        average_multiplier: total_rounds > 0 ? sum_multiplier / total_rounds : 0,
        max_streak_below: Math.max(0, ...streaks.filter(s => s.type === "below").map(s => s.length)),
        max_streak_above: Math.max(0, ...streaks.filter(s => s.type === "above").map(s => s.length)),
    };

    // Predictive Analysis
    // Histogram
    const max_bin = Math.ceil(highest_multiplier / bin_size);
    const hist_labels = [];
    const hist_data = [];
    for (let i = 0; i < max_bin; i++) {
        hist_labels.push(`${(i * bin_size).toFixed(1)}-${((i + 1) * bin_size).toFixed(1)}`);
        hist_data.push(hist[i] || 0);
    }
    const histogram_data = { labels: hist_labels, data: hist_data };

    // Streak Frequencies
    const streak_frequencies = { below: {}, above: {} };
    for (const s of streaks) {
        streak_frequencies[s.type][s.length] = (streak_frequencies[s.type][s.length] || 0) + 1;
    }

    // Probabilities
    const probabilities = [];
    if (total_rounds > 0) {
        for (let p = 0; p < PROBABILITY_THRESHOLDS.length; p++) {
            probabilities.push({ threshold: PROBABILITY_THRESHOLDS[p], probability: (prob_counts[p] / total_rounds) * 100 });
        }
    }

    const endTime = performance.now();
    console.log(`Analysis took ${endTime - startTime} milliseconds.`);

    return {
        processedData,
        analysisData: {
            below_threshold: belowThresholdCount,
            above_threshold: total_rounds - belowThresholdCount,
            streaks: streaks,
            summary_stats: summary_stats,
            histogram: histogram_data,
            streak_frequencies: streak_frequencies,
            rounds_since_high_multiplier: rounds_since_data,
            probabilities: probabilities
        }
    };
};

self.onmessage = (e) => {
    const { rawData, threshold, highMultiplierThreshold } = e.data;
    const analysis = analyzeData(rawData, threshold, highMultiplierThreshold);
    self.postMessage(analysis);
};