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

                // V29.115 FIX: แกน Y เดิมยึดตาม eMin/eMax (spec limit เต็มช่วง) ทำให้ tag ที่ spec กว้างแต่ค่า
                // จริงแกว่งแคบ (เช่น TI-2301 spec 220-262 แต่จริงวิ่งแค่ 253-254) เส้น Recorded Value ถูกบีบจน
                // ดูเหมือนเส้นตรง มองไม่เห็นความผิดปกติที่ Statistical Deviation จับได้ — เปลี่ยนมายึดตามช่วง
                // ค่าจริงที่วัดได้ (data ∪ UCL/LCL) แทน ด้วย hard min/max ปล่อยให้เส้น Spec วิ่งพ้นกรอบไปได้ถ้า
                // อยู่ไกลเกินช่วงข้อมูลจริงมาก (record ที่หลุด spec จริงจะรวมอยู่ใน data อยู่แล้ว แกนขยายให้เอง)
                const dataMin = Math.min(...data), dataMax = Math.max(...data);
                const rangeMin = Math.min(dataMin, lcl);
                const rangeMax = Math.max(dataMax, ucl);
                const pad = Math.max((rangeMax - rangeMin) * 0.15, Math.abs(mean) * 0.01, 0.5);

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
                                min: rangeMin - pad,
                                max: rangeMax + pad,
                                grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Inter', size: 10 } }
                            }
                        }
                    }
                });
            }
});
