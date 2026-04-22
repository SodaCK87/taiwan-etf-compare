"use strict";

/**
 * ETF Growth Comparison - Main Application
 * Handles UI state, user interactions, chart rendering, and results display.
 */

// ==================== State ====================
const AppState = {
    chart: null,
    chartMode: "portfolio",
    results: null,
    selectedETFs: ["0050", "006208", "0050L", "0056", "00878"],
    withdrawalEnabled: false,
    taxInfo: null,      // calculateDividendTaxRate() result
};

// ==================== DOM References ====================
const DOM = {
    initialCapital:   () => document.getElementById("inp-initial"),
    monthlyContrib:   () => document.getElementById("inp-monthly-contrib"),
    years:            () => document.getElementById("inp-years"),
    yearsLabel:       () => document.getElementById("lbl-years"),
    annualIncome:     () => document.getElementById("inp-annual-income"),
    taxResultPanel:   () => document.getElementById("tax-result-panel"),
    withdrawalToggle: () => document.getElementById("toggle-withdrawal"),
    withdrawalFields: () => document.getElementById("withdrawal-fields"),
    withdrawalAmount: () => document.getElementById("inp-withdrawal"),
    withdrawalMode:   () => document.getElementById("sel-withdrawal-mode"),
    btnRun:           () => document.getElementById("btn-run"),
    chartCanvas:      () => document.getElementById("growth-chart"),
    statsGrid:        () => document.getElementById("stats-grid"),
    tableBody:        () => document.getElementById("table-body"),
    chartTabs:        () => document.querySelectorAll(".chart-tab"),
    statsSection:     () => document.getElementById("stats-section"),
    tableSection:     () => document.getElementById("table-section"),
};

// ==================== Init ====================
function init() {
    buildETFChips();
    bindEvents();
    DOM.yearsLabel().textContent = DOM.years().value;
    updateTaxPanel();
    runSimulation();
}

// ==================== ETF Chip Builder ====================
function buildETFChips() {
    const container = document.getElementById("etf-chip-container");
    container.innerHTML = "";

    Object.entries(ETF_DATA).forEach(([key, etf]) => {
        const chip = document.createElement("div");
        chip.className = "etf-chip" + (AppState.selectedETFs.includes(key) ? " active" : "");
        chip.dataset.key = key;
        chip.style.color = etf.color;
        chip.innerHTML = `
            <span class="chip-dot" style="background:${etf.color}"></span>
            <span class="chip-label">${etf.shortLabel}</span>
            <span class="chip-type ${etf.type}">${etf.type === "market" ? "市值型" : "高股息"}</span>
        `;
        chip.addEventListener("click", () => toggleETF(key, chip));
        container.appendChild(chip);
    });
}

function toggleETF(key, chip) {
    const idx = AppState.selectedETFs.indexOf(key);
    if (idx > -1) {
        if (AppState.selectedETFs.length === 1) return;
        AppState.selectedETFs.splice(idx, 1);
        chip.classList.remove("active");
    } else {
        AppState.selectedETFs.push(key);
        chip.classList.add("active");
    }
    runSimulation();
}

// ==================== Tax Panel ====================
/**
 * Re-calculate dividend tax rate from income input and refresh the panel display.
 * Called on income change and on init.
 */
function updateTaxPanel() {
    const income = parseFloat(DOM.annualIncome().value) || 0;
    const info   = calculateDividendTaxRate(income);
    AppState.taxInfo = info;

    const panel = DOM.taxResultPanel();
    const combinedBetter = info.combinedEffectiveRate <= info.separateEffectiveRate;

    panel.innerHTML = `
        <div class="tax-row">
            <span class="tax-label">邊際稅率</span>
            <span class="tax-value">${(info.marginalRate * 100).toFixed(0)}%</span>
        </div>
        <div class="tax-row">
            <span class="tax-label">合併計稅實質稅率</span>
            <span class="tax-value ${combinedBetter ? "tax-best" : ""}">
                <span style="font-size: 11px; color: var(--text-muted); margin-right: 6px; font-weight: normal;">
                    (${(info.marginalRate * 100).toFixed(0)}% - 8.5% + 2.11%) =
                </span>
                ${(info.combinedEffectiveRate * 100).toFixed(2)}%
            </span>
        </div>
        <div class="tax-row">
            <span class="tax-label">分開計稅實質稅率</span>
            <span class="tax-value ${!combinedBetter ? "tax-best" : ""}">
                <span style="font-size: 11px; color: var(--text-muted); margin-right: 6px; font-weight: normal;">
                    (28% + 2.11%) =
                </span>
                ${(info.separateEffectiveRate * 100).toFixed(2)}%
            </span>
        </div>
        <div class="tax-divider"></div>
        <div class="tax-row">
            <span class="tax-label">建議方案</span>
            <span class="tax-optimal">${info.optimalMethod}</span>
        </div>
        <div class="tax-row">
            <span class="tax-label">模擬使用稅率</span>
            <span class="tax-value tax-best">${(info.effectiveRate * 100).toFixed(2)}%</span>
        </div>
    `;
}

// ==================== Event Bindings ====================
function bindEvents() {
    DOM.years().addEventListener("input", () => {
        DOM.yearsLabel().textContent = DOM.years().value;
    });

    DOM.annualIncome().addEventListener("input", () => {
        updateTaxPanel();
    });

    DOM.withdrawalToggle().addEventListener("change", (e) => {
        AppState.withdrawalEnabled = e.target.checked;
        DOM.withdrawalFields().classList.toggle("visible", AppState.withdrawalEnabled);
    });

    DOM.btnRun().addEventListener("click", runSimulation);

    DOM.chartTabs().forEach(tab => {
        tab.addEventListener("click", () => {
            DOM.chartTabs().forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            AppState.chartMode = tab.dataset.mode;
            if (AppState.results) renderChart(AppState.results);
        });
    });

    document.querySelectorAll("input[type='number'], input[type='range']").forEach(inp => {
        inp.addEventListener("keydown", e => { if (e.key === "Enter") runSimulation(); });
    });
}

// ==================== Simulation Runner ====================
function runSimulation() {
    // Ensure tax info is current before simulation
    updateTaxPanel();

    const params = {
        initialCapital:   parseFloat(DOM.initialCapital().value) || 0,
        monthlyContrib:   parseFloat(DOM.monthlyContrib().value) || 0,
        years:            parseInt(DOM.years().value, 10) || 20,
        withdrawalAmount: AppState.withdrawalEnabled ? (parseFloat(DOM.withdrawalAmount().value) || 0) : 0,
        withdrawalMode:   DOM.withdrawalMode().value,
        dividendTaxRate:  AppState.taxInfo ? AppState.taxInfo.effectiveRate : 0.20,
    };

    if (params.initialCapital <= 0) {
        alert("請輸入大於 0 的初始資金");
        return;
    }

    AppState.results = runAllSimulations(AppState.selectedETFs, params);
    AppState.params  = params;

    renderChart(AppState.results);
    renderStats(AppState.results, params);
    renderTable(AppState.results, params);

    DOM.statsSection().style.display = "block";
    DOM.tableSection().style.display = "block";
}

// ==================== Chart Rendering ====================
function renderChart(results) {
    const canvas = DOM.chartCanvas();
    const ctx    = canvas.getContext("2d");

    if (AppState.chart) {
        AppState.chart.destroy();
        AppState.chart = null;
    }

    const datasets = AppState.selectedETFs.map(key => {
        const etf = ETF_DATA[key];
        const sim = results[key];
        let data;

        if (AppState.chartMode === "portfolio") {
            data = sim.values.map((v, i) => ({ x: i, y: v }));
        } else if (AppState.chartMode === "growth") {
            data = sim.values.map((v, i) => ({
                x: i,
                y: sim.contributions[i] > 0 ? ((v - sim.contributions[i]) / sim.contributions[i]) * 100 : 0,
            }));
        } else {
            data = sim.values.map((v, i) => ({ x: i, y: v - sim.contributions[i] }));
        }

        return {
            label: etf.shortLabel,
            data,
            borderColor: etf.color,
            backgroundColor: hexToRgba(etf.color, 0.05),
            borderWidth: key === "0050L" ? 4 : 2.5, // Make 0050L stand out
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: etf.color,
            tension: 0.4,
            fill: false,
        };
    });

    const totalMonths = (AppState.params.years * 12) + 1;
    const labels = Array.from({ length: totalMonths }, (_, i) => {
        if (i % 12 === 0) return `第${i / 12}年`;
        return "";
    });

    AppState.chart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: "easeInOutQuart" },
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    labels: {
                        color: "#8b9bbf",
                        font: { size: 12, family: "'Inter', 'Noto Sans TC', sans-serif", weight: "600" },
                        boxWidth: 12,
                        boxHeight: 12,
                        borderRadius: 6,
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: "circle",
                    },
                },
                tooltip: {
                    backgroundColor: "rgba(15, 20, 40, 0.95)",
                    borderColor: "rgba(255,255,255,0.12)",
                    borderWidth: 1,
                    padding: 14,
                    titleColor: "#8b9bbf",
                    titleFont: { size: 11, weight: "600" },
                    bodyColor: "#f0f4ff",
                    bodyFont: { size: 13, weight: "600", family: "'Inter', 'Noto Sans TC', sans-serif" },
                    callbacks: {
                        title: (items) => {
                            const monthIdx = items[0].dataIndex;
                            const year  = Math.floor(monthIdx / 12);
                            const month = monthIdx % 12;
                            return month === 0 ? `第 ${year} 年` : `第 ${year} 年 ${month} 個月`;
                        },
                        label: (item) => {
                            const v = item.raw.y;
                            if (AppState.chartMode === "growth") {
                                return ` ${item.dataset.label}: ${v.toFixed(1)}%`;
                            }
                            return ` ${item.dataset.label}: NT$ ${formatNumber(v)}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: { color: "rgba(255,255,255,0.04)", drawTicks: false },
                    ticks: {
                        color: "#4a5568",
                        font: { size: 11 },
                        maxTicksLimit: AppState.params.years + 1,
                        autoSkip: true,
                        maxRotation: 0,
                        callback: (val, idx) => labels[idx] || "",
                    },
                    border: { color: "transparent" },
                },
                y: {
                    grid: { color: "rgba(255,255,255,0.05)", drawTicks: false },
                    ticks: {
                        color: "#4a5568",
                        font: { size: 11 },
                        callback: (val) => {
                            if (AppState.chartMode === "growth") return val.toFixed(0) + "%";
                            return formatTWD(val);
                        },
                    },
                    border: { color: "transparent" },
                },
            },
        },
    });
}

// ==================== Stats Rendering ====================
function renderStats(results, params) {
    const container = DOM.statsGrid();
    container.innerHTML = "";

    const taxRate = params.dividendTaxRate;

    AppState.selectedETFs.forEach(key => {
        const etf = ETF_DATA[key];
        const sim = results[key];
        const finalValue   = sim.values[sim.values.length - 1];
        const totalContrib = sim.contributions[sim.contributions.length - 1];
        const profit       = finalValue - totalContrib;
        const roi          = totalContrib > 0 ? (profit / totalContrib) * 100 : 0;
        const cagr         = params.initialCapital > 0 && finalValue > 0
            ? (Math.pow(finalValue / params.initialCapital, 1 / params.years) - 1) * 100
            : 0;

        // Net effective annual return = priceReturn + dividendYield * (1 - taxRate)
        const netEffective = etf.priceReturn + etf.dividendYield * (1 - taxRate);

        const card = document.createElement("div");
        card.className = "stat-card";
        card.style.setProperty("--etf-color", etf.color);

        const profitClass    = profit >= 0 ? "positive" : "negative";
        const confidenceHtml = etf.confidence === "low"
            ? `<div class="data-warning" title="數據年限不足（${etf.dataYears}年），報酬率已向下修正">
                   數據 ${etf.dataYears} 年 · 已修正偏誤
               </div>`
            : `<div class="data-ok">數據 ${etf.dataYears} 年 · 高信心</div>`;

        card.innerHTML = `
            <div class="stat-card-header">
                <div class="stat-card-name">${etf.shortLabel}</div>
                <div class="stat-card-type ${etf.type}">${etf.type === "market" ? "市值型" : "高股息"}</div>
            </div>
            ${confidenceHtml}
            <div class="stat-row">
                <span class="stat-label">除息股價漲幅</span>
                <span class="stat-value">${(etf.priceReturn * 100).toFixed(1)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">毛配息殖利率</span>
                <span class="stat-value">${(etf.dividendYield * 100).toFixed(1)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">內扣費用率</span>
                <span class="stat-value">${(etf.expenseRatio * 100).toFixed(2)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">股息有效稅率</span>
                <span class="stat-value">${(taxRate * 100).toFixed(2)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">稅後年化預估</span>
                <span class="stat-value positive">${(netEffective * 100).toFixed(2)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">累計繳股息稅</span>
                <span class="stat-value negative">NT$ ${formatNumber(sim.taxPaidTotal)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">累計手續費</span>
                <span class="stat-value negative">NT$ ${formatNumber(sim.feesPaidTotal)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">總投入本金</span>
                <span class="stat-value">NT$ ${formatNumber(totalContrib)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">累計獲利</span>
                <span class="stat-value ${profitClass}">NT$ ${formatNumber(profit)}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">ROI</span>
                <span class="stat-value ${profitClass}">${roi.toFixed(1)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">實際CAGR</span>
                <span class="stat-value ${profitClass}">${cagr.toFixed(2)}%</span>
            </div>
            <div class="stat-final">
                <div class="label">${params.years} 年後總資產</div>
                <div class="amount" style="color:${etf.color}">
                    NT$ ${formatNumber(finalValue)}
                </div>
            </div>
            ${etf.type === "market" && etf.shortLabel !== "0050連結" ? `
                <div class="tax-tip">
                    <span class="tip-icon">💡</span>
                    <span>當資產 > 3,200 萬時，股息將觸及 8 萬抵減上限，屆時切換至連結基金(不配息)可每年省下約 0.3% 稅費。</span>
                </div>
            ` : ""}
        `;
        container.appendChild(card);
    });
}

// ==================== Table Rendering ====================
function renderTable(results, params) {
    const tbody = DOM.tableBody();
    tbody.innerHTML = "";

    const taxRate = params.dividendTaxRate;

    const rows = AppState.selectedETFs.map(key => {
        const etf        = ETF_DATA[key];
        const sim        = results[key];
        const finalValue = sim.values[sim.values.length - 1];
        const totalContrib = sim.contributions[sim.contributions.length - 1];
        const profit     = finalValue - totalContrib;
        const roi        = totalContrib > 0 ? (profit / totalContrib) * 100 : 0;
        const netEffective = etf.priceReturn + etf.dividendYield * (1 - taxRate);
        return { 
            key, 
            etf, 
            finalValue, 
            totalContrib, 
            profit, 
            roi, 
            taxPaidTotal: sim.taxPaidTotal, 
            feesPaidTotal: sim.feesPaidTotal, 
            irr: sim.irr,
            netEffective 
        };
    }).sort((a, b) => b.finalValue - a.finalValue);

    rows.forEach((row, idx) => {
        const rank      = idx + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : "rank-other";
        const profitClass = row.profit >= 0 ? "positive" : "negative";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="rank-badge ${rankClass}">${rank}</span></td>
            <td>
                <div class="etf-name-cell">
                    <span class="etf-dot" style="background:${row.etf.color}"></span>
                    <span>${row.etf.label}</span>
                    ${row.etf.confidence === "low" ? '<span class="warn-tag" title="數據年限不足，長期預測參考性有限">偏誤修正</span>' : ''}
                </div>
            </td>
            <td style="font-weight:600;color:var(--accent-teal)">${(row.irr * 100).toFixed(2)}%</td>
            <td>${(row.etf.dividendYield * 100).toFixed(1)}%</td>
            <td>${row.etf.dataYears} 年</td>
            <td>NT$ ${formatNumber(row.totalContrib)}</td>
            <td class="negative" title="股息稅 + 手續費">NT$ ${formatNumber(row.taxPaidTotal + row.feesPaidTotal)}</td>
            <td class="${profitClass}">${row.roi.toFixed(1)}%</td>
            <td style="font-weight:700;color:${row.etf.color}">NT$ ${formatNumber(row.finalValue)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==================== Utilities ====================
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// ==================== Boot ====================
document.addEventListener("DOMContentLoaded", init);
