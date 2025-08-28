document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            tabContents.forEach(c => c.classList.remove("active"));
            document.getElementById(tab.dataset.tab).classList.add("active");
        });
    });

    // Render summary stats
    const statsContainer = document.getElementById("summary-stats");
    const stats = analysisData.summary_stats;
    statsContainer.innerHTML = `
        <div class="stat-card"><h3>Total Rounds</h3><p>${stats.total_rounds}</p></div>
        <div class="stat-card"><h3>Highest Multiplier</h3><p>${stats.highest_multiplier.toFixed(2)}x</p></div>
        <div class="stat-card"><h3>Average Multiplier</h3><p>${stats.average_multiplier.toFixed(2)}x</p></div>
        <div class="stat-card"><h3>Max Streak Below 2.1x</h3><p>${stats.max_streak_below}</p></div>
        <div class="stat-card"><h3>Max Streak Above 2.1x</h3><p>${stats.max_streak_above}</p></div>
        <div class="stat-card"><h3>Streaks Below 2.1x (== 4)</h3><p>${stats.streaks_below_eq_4}</p></div>
    `;

    // Render raw data table
    const tableContainer = document.getElementById("raw-data-table");
    let table = "<table><thead><tr><th>Round ID</th><th>Multiplier</th><th>Timestamp</th><th>Below 2.1?</th><th>Streak (< 2.1)</th></tr></thead><tbody>";
    for (const row of rawData) {
        table += `<tr><td>${row.round_id}</td><td>${row.multiplier}</td><td>${row.timestamp}</td><td>${row.is_below_2_1}</td><td>${row.streak_below_2_1}</td></tr>`;
    }
    table += "</tbody></table>";
    tableContainer.innerHTML = table;

    // Render charts
    new Chart(document.getElementById("line-chart"), {
        type: 'line',
        data: {
            labels: rawData.map(d => d.timestamp),
            datasets: [
                {
                    label: 'Crash Multiplier',
                    data: rawData.map(d => d.multiplier),
                    borderColor: '#4BC0C0',
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Moving Average (10 rounds)',
                    data: rawData.map(d => d.moving_average),
                    borderColor: '#FF9F40',
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            scales: {
                x: {
                    title: { display: true, text: 'Timestamp' }
                },
                y: {
                    title: { display: true, text: 'Multiplier' }
                }
            },
            plugins: {
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x'
                    },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x'
                    }
                }
            }
        }
    });

    new Chart(document.getElementById("streak-chart"), {
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
                x: {
                    title: { display: true, text: 'Streak Sequence' }
                },
                y: {
                    title: { display: true, text: 'Streak Length' }
                }
            },
            plugins: {
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x'
                    },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x'
                    }
                }
            }
        }
    });

    new Chart(document.getElementById("pie-chart"), {
        type: 'pie',
        data: {
            labels: ['Below 2.1x', 'Above 2.1x'],
            datasets: [{
                data: [analysisData.below_2_1, analysisData.above_2_1],
                backgroundColor: ['#FF6384', '#36A2EB'],
            }]
        }
    });

    new Chart(document.getElementById("bar-chart"), {
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
                x: {
                    title: { display: true, text: 'Multiplier' }
                },
                y: {
                    title: { display: true, text: 'Count' }
                }
            }
        }
    });
});