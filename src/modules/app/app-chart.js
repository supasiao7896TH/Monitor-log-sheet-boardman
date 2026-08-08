import { parseNum } from '../shared.js';
import { APP } from './app.js';
/* global Chart */

let trendChartInstance = null;

Object.assign(APP, {

            renderChart: (historyData, eMin, eMax, eExact) => {
                const canvas = document.getElementById('trend-chart');
                const errorDiv = document.getElementById('chart-error');
                if (!canvas || !errorDiv) return;

                if (trendChartInstance) trendChartInstance.destroy();

                const numericHistory = historyData.map(h => ({
                    time: `${(h.dateStr||'').substring(0,5)} ${h.timeStr}`, val: parseNum(h.value), isAb: h.isAbnormal
                })).filter(h => !isNaN(h.val));

                const mMean = document.getElementById('modal-stat-mean');
                const mSd = document.getElementById('modal-stat-sd');

                if (numericHistory.length === 0) {
                    canvas.style.display = 'none';
                    errorDiv.classList.remove('hidden');
                    if (mMean) mMean.textContent = '-';
                    if (mSd) mSd.textContent = '-';
                    return;
                }

                canvas.style.display = 'block';
                errorDiv.classList.add('hidden');

                const labels = numericHistory.map(h => h.time);
                const data = numericHistory.map(h => h.val);
                const pointColors = numericHistory.map(h => h.isAb === 1 ? '#ef4444' : '#14b8a6');
                const pointRadii = numericHistory.map(h => h.isAb === 1 ? 6 : 4);

                const mean = data.reduce((a, b) => a + b, 0) / data.length;
                const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
                const stdDev = Math.sqrt(variance);
                const ucl = mean + (3 * stdDev);
                const lcl = mean - (3 * stdDev);

                if (mMean) mMean.textContent = mean.toFixed(2);
                if (mSd) mSd.textContent = stdDev.toFixed(2);

                const datasets = [
                    {
                        label: 'Recorded Value',
                        data: data,
                        borderColor: '#14b8a6', 
                        backgroundColor: '#14b8a6',
                        pointBackgroundColor: pointColors,
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 1.5,
                        pointRadius: pointRadii,
                        pointHoverRadius: 8,
                        borderWidth: 2,
                        tension: 0.3 
                    },
                    {
                        label: `UCL (+3σ)`, data: labels.map(() => ucl),
                        borderColor: '#8b5cf6', borderDash: [4, 4], pointRadius: 0, pointHoverRadius: 0, borderWidth: 1.5, fill: false
                    },
                    {
                        label: `LCL (-3σ)`, data: labels.map(() => lcl),
                        borderColor: '#8b5cf6', borderDash: [4, 4], pointRadius: 0, pointHoverRadius: 0, borderWidth: 1.5, fill: false
                    }
                ];

                if (eMax !== null) {
                    datasets.push({
                        label: `Max Spec (${eMax})`, data: labels.map(() => eMax),
                        borderColor: '#ef4444', borderDash: [2, 2], pointRadius: 0, pointHoverRadius: 0, borderWidth: 1.5, fill: false
                    });
                }
                if (eMin !== null) {
                    datasets.push({
                        label: `Min Spec (${eMin})`, data: labels.map(() => eMin),
                        borderColor: '#f59e0b', borderDash: [2, 2], pointRadius: 0, pointHoverRadius: 0, borderWidth: 1.5, fill: false
                    });
                }

                trendChartInstance = new Chart(canvas.getContext('2d'), {
                    type: 'line',
                    data: { labels, datasets },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true, font: { family: 'Inter', size: 10 } } },
                            tooltip: { titleFont: { family: 'Inter', size: 11 }, bodyFont: { family: 'Inter', size: 12, weight: 'bold' }, cornerRadius: 8 }
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10, weight: 'bold' } } },
                            y: { 
                                suggestedMin: eMin !== null ? eMin - (Math.abs(eMin)*0.1) : undefined,
                                suggestedMax: eMax !== null ? eMax + (Math.abs(eMax)*0.1) : undefined,
                                grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 10 } } 
                            }
                        }
                    }
                });
            }
});
