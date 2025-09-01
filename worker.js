const analyzeData = (data, threshold) => {
    const MOVING_AVERAGE_WINDOW = 10;
    let processedData = JSON.parse(JSON.stringify(data));

    let streakCounter = 0;
    for (let i = 0; i < processedData.length; i++) {
        const isBelow = processedData[i].multiplier < threshold;
        processedData[i].is_below_threshold = isBelow;

        if (isBelow) {
            streakCounter++;
        } else {
            streakCounter = 0;
        }
        processedData[i].streak_below_threshold = streakCounter;

        if (i >= MOVING_AVERAGE_WINDOW - 1) {
            const window = processedData.slice(i - MOVING_AVERAGE_WINDOW + 1, i + 1);
            processedData[i].moving_average = window.reduce((acc, val) => acc + val.multiplier, 0) / MOVING_AVERAGE_WINDOW;
        } else {
            processedData[i].moving_average = null;
        }
    }

    const belowThreshold = processedData.filter(item => item.is_below_threshold).length;
    const aboveThreshold = processedData.length - belowThreshold;

    const multiplierDistribution = {};
    for (const item of processedData) {
        const bucket = Math.floor(item.multiplier);
        multiplierDistribution[bucket] = (multiplierDistribution[bucket] || 0) + 1;
    }
    const dist_labels = Object.keys(multiplierDistribution).map(Number).sort((a, b) => a - b);
    const dist_data = dist_labels.map(key => multiplierDistribution[key]);

    const streaks = [];
    if (processedData.length > 0) {
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

    const streaks_below_eq_4 = streaks.filter(s => s.type === "below" && s.length === 4).length;

    const summary_stats = {
        total_rounds: processedData.length,
        highest_multiplier: processedData.length > 0 ? Math.max(...processedData.map(item => item.multiplier)) : 0,
        average_multiplier: processedData.length > 0 ? processedData.reduce((acc, val) => acc + val.multiplier, 0) / processedData.length : 0,
        max_streak_below: Math.max(0, ...streaks.filter(s => s.type === "below").map(s => s.length)),
        max_streak_above: Math.max(0, ...streaks.filter(s => s.type === "above").map(s => s.length)),
        streaks_below_eq_4: streaks_below_eq_4
    };

    return {
        processedData,
        analysisData: {
            below_threshold: belowThreshold,
            above_threshold: aboveThreshold,
            multiplier_distribution: {
                labels: dist_labels,
                data: dist_data
            },
            streaks: streaks,
            summary_stats: summary_stats
        }
    };
};

self.onmessage = (e) => {
    const { rawData, threshold } = e.data;
    const analysis = analyzeData(rawData, threshold);
    self.postMessage(analysis);
};