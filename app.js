document.addEventListener("DOMContentLoaded", () => {
    const multiplierInput = document.getElementById("multiplier-input");
    const updateButton = document.getElementById("update-button");
    const loadingIndicator = document.getElementById("loading-indicator");

    let charts = {};
    let rawData = null;
    let worker = new Worker("worker.js");

    const render = (processedData, analysisData, threshold) => {
        // Render summary stats
        const statsContainer = document.getElementById("summary-stats");
        const stats = analysisData.summary_stats;
        statsContainer.innerHTML = `
            <div class="col-md-4 col-lg-2">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <h5 class="card-title">Total Rounds</h5>
                        <p class="card-text fs-4 fw-bold">${stats.total_rounds}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4 col-lg-2">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <h5 class="card-title">Highest Multiplier</h5>
                        <p class="card-text fs-4 fw-bold">${stats.highest_multiplier.toFixed(2)}x</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4 col-lg-2">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <h5 class="card-title">Average Multiplier</h5>
                        <p class="card-text fs-4 fw-bold">${stats.average_multiplier.toFixed(2)}x</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4 col-lg-3">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <h5 class="card-title">Max Streak &lt; ${threshold}x</h5>
                        <p class="card-text fs-4 fw-bold">${stats.max_streak_below}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-4 col-lg-3">
                <div class="card text-center h-100">
                    <div class="card-body">
                        <h5 class="card-title">Max Streak &gt;= ${threshold}x</h5>
                        <p class="card-text fs-4 fw-bold">${stats.max_streak_above}</p>
                    </div>
                </div>
            </div>
        `;

        // Render raw data table
        const tableContainer = document.getElementById("raw-data-table");
        let table = `<table class="table table-striped table-hover"><thead><tr><th>Round ID</th><th>Multiplier</th><th>Timestamp</th><th>&lt; ${threshold}?</th><th>Streak</th></tr></thead><tbody>`;
        for (const row of processedData) {
            table += `<tr><td>${row.round_id}</td><td>${row.multiplier.toFixed(2)}</td><td>${row.timestamp}</td><td>${row.is_below_threshold ? 'Yes' : 'No'}</td><td>${row.streak_below_threshold}</td></tr>`;
        }
        table += "</tbody></table>";
        tableContainer.innerHTML = table;

        // Update chart titles
        document.getElementById("streak-chart-title").innerHTML = `Streak Analysis (Above/Below ${threshold}x)`;
        document.getElementById("pie-chart-title").innerHTML = `Multiplier Below vs. Above ${threshold}x`;

        // Destroy old charts
        Object.values(charts).forEach(chart => chart.destroy());

        // Render main charts
        charts.line = new Chart(document.getElementById("line-chart"), {
            type: 'line',
            data: { labels: processedData.map(d => d.timestamp), datasets: [{ label: 'Crash Multiplier', data: processedData.map(d => d.multiplier), borderColor: '#0d6efd', fill: false, tension: 0.1 }, { label: 'Moving Average (10 rounds)', data: processedData.map(d => d.moving_average), borderColor: '#fd7e14', fill: false, tension: 0.1 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Timestamp' } }, y: { title: { display: true, text: 'Multiplier' } } }, plugins: { zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } } } }
        });
        charts.streak = new Chart(document.getElementById("streak-chart"), {
            type: 'bar',
            data: { labels: analysisData.streaks.map((_, i) => i + 1), datasets: [{ label: 'Streak Length', data: analysisData.streaks.map(s => s.length), backgroundColor: analysisData.streaks.map(s => s.type === 'above' ? '#0d6efd' : '#dc3545') }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Streak Sequence' } }, y: { title: { display: true, text: 'Streak Length' } } } }
        });
        charts.pie = new Chart(document.getElementById("pie-chart"), {
            type: 'pie',
            data: { labels: [`Below ${threshold}x`, `Above ${threshold}x`], datasets: [{ data: [analysisData.below_threshold, analysisData.above_threshold], backgroundColor: ['#dc3545', '#0d6efd'] }] },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // Render predictive charts
        charts.histogram = new Chart(document.getElementById("histogram-chart"), {
            type: 'bar',
            data: { labels: analysisData.histogram.labels, datasets: [{ label: 'Frequency', data: analysisData.histogram.data, backgroundColor: '#ffc107' }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Multiplier Bins' } }, y: { title: { display: true, text: 'Frequency' } } } }
        });
        charts.roundsSince = new Chart(document.getElementById("rounds-since-chart"), {
            type: 'line',
            data: { labels: processedData.map(d => d.timestamp), datasets: [{ label: 'Rounds Since >10x', data: analysisData.rounds_since_high_multiplier, borderColor: '#6f42c1', fill: false, tension: 0.1 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Timestamp' } }, y: { title: { display: true, text: 'Rounds' } } } }
        });

        // Render predictive tables
        const streakFreqTable = document.getElementById("streak-frequency-table");
        let sfTable = "<table class=\"table table-striped table-hover\"><thead><tr><th>Streak Length</th><th>Below Threshold</th><th>Above Threshold</th></tr></thead><tbody>";
        const allStreakLengths = new Set([...Object.keys(analysisData.streak_frequencies.below), ...Object.keys(analysisData.streak_frequencies.above)]);
        for (const length of Array.from(allStreakLengths).sort((a, b) => a - b)) {
            sfTable += `<tr><td>${length}</td><td>${analysisData.streak_frequencies.below[length] || 0}</td><td>${analysisData.streak_frequencies.above[length] || 0}</td></tr>`;
        }
        sfTable += "</tbody></table>";
        streakFreqTable.innerHTML = sfTable;

        const probTable = document.getElementById("probability-table");
        let pTable = "<table class=\"table table-striped table-hover\"><thead><tr><th>Condition</th><th>Probability</th></tr></thead><tbody>";
        for (const p of analysisData.probabilities) {
            pTable += `<tr><td>> ${p.threshold}x</td><td>${p.probability.toFixed(2)}%</td></tr>`;
        }
        pTable += "</tbody></table>";
        probTable.innerHTML = pTable;
    };

    const update = () => {
        const threshold = parseFloat(multiplierInput.value);
        if (isNaN(threshold)) {
            alert("Please enter a valid number for the multiplier threshold.");
            return;
        }

        if (threshold === 2.1 && window.defaultAnalysis) {
            render(defaultAnalysis.processedData, defaultAnalysis.analysisData, threshold);
            return;
        }

        loadingIndicator.classList.remove("hidden");

        if (rawData) {
            worker.postMessage({ rawData, threshold });
        } else {
            fetch("raw_data.json")
                .then(response => response.json())
                .then(data => {
                    rawData = data;
                    worker.postMessage({ rawData, threshold });
                })
                .catch(err => {
                    console.error("Error fetching raw data:", err);
                    loadingIndicator.classList.add("hidden");
                });
        }
    };

    const init = () => {
        updateButton.addEventListener("click", update);

        worker.onmessage = (e) => {
            const { processedData, analysisData } = e.data;
            render(processedData, analysisData, parseFloat(multiplierInput.value));
            loadingIndicator.classList.add("hidden");
        };

        // Initial load with default data
        if (window.defaultAnalysis) {
            render(defaultAnalysis.processedData, defaultAnalysis.analysisData, 2.1);
        } else {
            console.error("Default analysis data not found. Trying to load from raw data...");
            update();
        }
    };

    init();
});