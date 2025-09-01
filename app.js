document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");
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
            <div class="stat-card"><h3>Total Rounds</h3><p>${stats.total_rounds}</p></div>
            <div class="stat-card"><h3>Highest Multiplier</h3><p>${stats.highest_multiplier.toFixed(2)}x</p></div>
            <div class="stat-card"><h3>Average Multiplier</h3><p>${stats.average_multiplier.toFixed(2)}x</p></div>
            <div class="stat-card"><h3>Max Streak Below ${threshold}x</h3><p>${stats.max_streak_below}</p></div>
            <div class="stat-card"><h3>Max Streak Above ${threshold}x</h3><p>${stats.max_streak_above}</p></div>
            <div class="stat-card"><h3>Streaks Below ${threshold}x (== 4)</h3><p>${stats.streaks_below_eq_4}</p></div>
        `;

        // Render raw data table
        const tableContainer = document.getElementById("raw-data-table");
        let table = `<table><thead><tr><th>Round ID</th><th>Multiplier</th><th>Timestamp</th><th>Below ${threshold}?</th><th>Streak (< ${threshold})</th></tr></thead><tbody>`;
        for (const row of processedData) {
            table += `<tr><td>${row.round_id}</td><td>${row.multiplier}</td><td>${row.timestamp}</td><td>${row.is_below_threshold}</td><td>${row.streak_below_threshold}</td></tr>`;
        }
        table += "</tbody></table>";
        tableContainer.innerHTML = table;

        // Update chart titles
        document.getElementById("streak-chart-title").innerHTML = `Streak Analysis (Above/Below ${threshold}x)`;
        document.getElementById("pie-chart-title").innerHTML = `Multiplier Below vs. Above ${threshold}x`;

        // Destroy old charts
        Object.values(charts).forEach(chart => chart.destroy());

        // Render charts
        charts.line = new Chart(document.getElementById("line-chart"), {
            type: 'line',
            data: {
                labels: processedData.map(d => d.timestamp),
                datasets: [
                    {
                        label: 'Crash Multiplier',
                        data: processedData.map(d => d.multiplier),
                        borderColor: '#4BC0C0',
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Moving Average (10 rounds)',
                        data: processedData.map(d => d.moving_average),
                        borderColor: '#FF9F40',
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Timestamp' } },
                    y: { title: { display: true, text: 'Multiplier' } }
                },
                plugins: { zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } } }
            }
        });

        charts.streak = new Chart(document.getElementById("streak-chart"), {
            type: 'bar',
            data: {
                labels: analysisData.streaks.map((_, i) => i + 1),
                datasets: [{
                    label: 'Streak Length',
                    data: analysisData.streaks.map(s => s.length),
                    backgroundColor: analysisData.streaks.map(s => s.type === 'above' ? '#36A2EB' : '#FF6384'),
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Streak Sequence' } },
                    y: { title: { display: true, text: 'Streak Length' } }
                },
                plugins: { zoom: { pan: { enabled: true, mode: 'x' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' } } }
            }
        });

        charts.pie = new Chart(document.getElementById("pie-chart"), {
            type: 'pie',
            data: {
                labels: [`Below ${threshold}x`, `Above ${threshold}x`],
                datasets: [{
                    data: [analysisData.below_threshold, analysisData.above_threshold],
                    backgroundColor: ['#FF6384', '#36A2EB'],
                }]
            }
        });

        charts.bar = new Chart(document.getElementById("bar-chart"), {
            type: 'bar',
            data: {
                labels: analysisData.multiplier_distribution.labels,
                datasets: [{
                    label: 'Number of Crashes',
                    data: analysisData.multiplier_distribution.data,
                    backgroundColor: '#FFCE56',
                }]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: 'Multiplier' } },
                    y: { title: { display: true, text: 'Count' } }
                }
            }
        });
    };

    const update = () => {
        const threshold = parseFloat(multiplierInput.value);
        if (isNaN(threshold)) {
            alert("Please enter a valid number for the multiplier threshold.");
            return;
        }

        if (threshold === 2.1) {
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
                });
        }
    };

    const init = () => {
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                tabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");

                tabContents.forEach(c => c.classList.remove("active"));
                document.getElementById(tab.dataset.tab).classList.add("active");
            });
        });

        updateButton.addEventListener("click", update);

        worker.onmessage = (e) => {
            const { processedData, analysisData } = e.data;
            render(processedData, analysisData, parseFloat(multiplierInput.value));
            loadingIndicator.classList.add("hidden");
        };

        // Initial load with default data
        render(defaultAnalysis.processedData, defaultAnalysis.analysisData, 2.1);
    };

    init();
});