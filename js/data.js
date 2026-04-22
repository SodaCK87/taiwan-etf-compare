/**
 * ETF Growth Comparison - Data Layer
 *
 * Return Model (v2 - corrected):
 *   Each ETF's return is decomposed into two independent components:
 *
 *   1. priceReturn  - Annual capital appreciation (ex-dividend price gain).
 *                     Derived from historical NAV data with dividends REMOVED.
 *                     Expense ratio drag is ALREADY embedded in this figure
 *                     (we use observed post-expense price appreciation).
 *
 *   2. dividendYield - Annual gross cash dividend yield (before any tax).
 *                     Taxed at the user-specified dividendTaxRate in the simulation.
 *
 *   Gross total return (no-tax DRIP)  = priceReturn + dividendYield
 *   Net   total return (taxed DRIP)   = priceReturn + dividendYield * (1 - taxRate)
 *
 * Why this split matters:
 *   High-dividend ETFs (e.g. 0056) have HIGH dividendYield but very LOW priceReturn
 *   because ex-dividend price erosion offsets the payout. Market-cap ETFs retain
 *   earnings inside the fund, compounding tax-free. Dividend tax creates a structural
 *   drag on high-dividend strategies versus market-cap strategies.
 *
 * Recency Bias Correction:
 *   Newer ETFs (00878, 00919, 00929) launched during a sustained bull run (2020~2024).
 *   Short-term realized returns are materially downward-adjusted toward factor-model
 *   estimates to avoid extrapolating bull-market alpha into a 20-40 year projection.
 *
 * Data sources:
 *  - 0050:   TEJ / 元大官網 (2003~2025, 22 yr; priceReturn ~9.3%, yield ~3.0%)
 *  - 006208: 富邦官網    (2012~2025, 13 yr; priceReturn ~9.3%, yield ~2.8%)
 *  - 0056:   元大官網    (2007~2025, 18 yr; priceReturn ~1.0%, yield ~7.5%)
 *  - 00878:  國泰官網    (2020~2025,  5 yr; adjusted: priceReturn ~3.0%, yield ~6.5%)
 *  - 00919:  群益官網    (2022~2025,  3 yr; adjusted: priceReturn ~2.5%, yield ~8.0%)
 *  - 00929:  復華官網    (2023~2025,  2 yr; adjusted: priceReturn ~2.0%, yield ~8.5%)
 *
 * Taiwan Dividend Tax Reference:
 *  - 健保補充保費:    2.11% per payout (threshold NT$20,000)
 *  - 所得稅 (合併計稅): 5%~40% marginal + 8.5% credit offset (capped NT$80,000)
 *  - 所得稅 (分開計稅): flat 28%
 *  - Typical retail investor effective rate: ~20-22% (including health insurance)
 */

"use strict";

const ETF_DATA = {
    "0050": {
        label: "0050 元大台灣50",
        shortLabel: "0050",
        color: "#4F8EF7",
        type: "market",
        // Price CAGR (ex-dividend, post-expense) derived from 2003~2025 NAV history
        priceReturn: 0.093,
        dividendYield: 0.030,    // gross annual cash dividend yield
        expenseRatio: 0.0046,    // display only; already embedded in priceReturn
        inceptionYear: 2003,
        dataYears: 22,
        confidence: "high",
        description: "追蹤台灣50指數，市值型龍頭，22年實證數據",
        volatility: 0.18,
        buyFeeRate: 0.001425, // 券商手續費
    },
    "006208": {
        label: "006208 富邦台50",
        shortLabel: "006208",
        color: "#34C9A5",
        type: "market",
        priceReturn: 0.093,
        dividendYield: 0.028,
        expenseRatio: 0.0023,
        inceptionYear: 2012,
        dataYears: 13,
        confidence: "high",
        description: "追蹤台灣50指數，費用率業界最低，13年實證數據",
        volatility: 0.18,
        buyFeeRate: 0.001425,
    },
    "0056": {
        label: "0056 元大高股息",
        shortLabel: "0056",
        color: "#F7A94F",
        type: "dividend",
        // Ex-dividend price return is very low (~1%); ETF retains little unrealized gain.
        // High yield + low price growth = structural underperformance vs. market-cap after tax.
        priceReturn: 0.010,
        dividendYield: 0.075,
        expenseRatio: 0.0093,
        inceptionYear: 2007,
        dataYears: 18,
        confidence: "high",
        description: "台灣最知名高股息ETF，18年數據，高配息但稅後長期落後市值型",
        volatility: 0.14,
        buyFeeRate: 0.001425,
    },
    "00878": {
        label: "00878 國泰永續高股息",
        shortLabel: "00878",
        color: "#E06FD8",
        type: "dividend",
        priceReturn: 0.030,      // adjusted down from 5-yr bull-market realized figure
        dividendYield: 0.065,
        expenseRatio: 0.0145,
        inceptionYear: 2020,
        dataYears: 5,
        confidence: "low",
        description: "ESG 永續高股息，季配息（5年數據，含牛市偏誤修正）",
        volatility: 0.16,
        buyFeeRate: 0.001425,
    },
    "00919": {
        label: "00919 群益台灣精選高息",
        shortLabel: "00919",
        color: "#FF6B6B",
        type: "dividend",
        priceReturn: 0.025,      // adjusted down from 3-yr bull-market realized figure
        dividendYield: 0.080,
        expenseRatio: 0.0160,
        inceptionYear: 2022,
        dataYears: 3,
        confidence: "low",
        description: "精選高息月配，3年數據，含牛市偏誤修正",
        volatility: 0.22,
        buyFeeRate: 0.001425,
    },
    "00929": {
        label: "00929 復華台灣科技優息",
        shortLabel: "00929",
        color: "#FFD93D",
        type: "dividend",
        priceReturn: 0.020,      // adjusted down from 2-yr realized figure
        dividendYield: 0.085,
        expenseRatio: 0.0165,
        inceptionYear: 2023,
        dataYears: 2,
        confidence: "low",
        description: "科技高息月配，2年數據，含嚴重牛市偏誤修正",
        volatility: 0.24,
        buyFeeRate: 0.001425,
    },
    "0050L": {
        label: "0050連結(不配息)",
        shortLabel: "0050連結",
        color: "#D500F9", // Bright Purple/Magenta for distinct visibility
        type: "market",
        priceReturn: 0.1222,     // 0050總報酬(12.3%) - 連結基金額外經管費(~0.08%)
        dividendYield: 0.000,    // A類型不配息，股息直接滾入淨值（無股息稅拖累）
        expenseRatio: 0.0054,    // 0050內扣(0.46%) + 連結基金額外(0.08%)
        inceptionYear: 2019,
        dataYears: 6,
        confidence: "high",
        description: "元大卓越50ETF連結基金(不配息A類型)，股息自動滾入淨值免稅",
        volatility: 0.18,
        buyFeeRate: 0.007, // 共同基金申購手續費 (銀行通路約 0.6% ~ 0.7%)
    },
};

/**
 * Simulate monthly portfolio value for a single ETF.
 *
 * Return decomposition:
 *   - Price appreciation: priceReturn (annual, ex-dividend, post-expense; from historical NAV)
 *   - Dividend income:    dividendYield * portfolio (gross, per year)
 *   - Tax on dividends:   gross dividend * dividendTaxRate
 *   - Net dividend DRIP:  gross - tax (reinvested back into portfolio if reinvestDividend=true)
 *
 * @param {string}  etfKey
 * @param {object}  params
 * @param {number}  params.initialCapital    - Initial lump-sum (TWD)
 * @param {number}  params.monthlyContrib    - Monthly regular contribution (TWD)
 * @param {number}  params.withdrawalAmount  - Periodic withdrawal (TWD)
 * @param {string}  params.withdrawalMode    - 'monthly' | 'annually'
 * @param {number}  params.years             - Simulation horizon (years)
 * @param {number}  params.dividendTaxRate   - Effective tax rate on dividend income (0~1)
 * @returns {{
 *   months: number[],
 *   values: number[],
 *   contributions: number[],
 *   grossDividendsTotal: number,
 *   taxPaidTotal: number,
 *   netDividendsTotal: number
 * }}
 */
function simulateETF(etfKey, params) {
    const etf = ETF_DATA[etfKey];
    if (!etf) throw new Error(`Unknown ETF key: ${etfKey}`);

    const {
        initialCapital = 100000,
        monthlyContrib = 0,
        withdrawalAmount = 0,
        withdrawalMode = "monthly",
        years = 20,
        dividendTaxRate = 0.20,
    } = params;

    const BROKERAGE_FEE_RATE = etf.buyFeeRate || 0.001425; // Use ETF specific rate
    const NHI_THRESHOLD = 20000;         // NT$20,000 threshold for supplemental premium
    const NHI_RATE = 0.0211;             // 2.11%

    const totalMonths = years * 12;

    // Standardizing Total Return calculation to remove bias:
    // We treat (priceReturn + dividendYield) as the target annual gross return.
    const annualGrossReturn = etf.priceReturn + etf.dividendYield;
    const monthlyGrossReturn = Math.pow(1 + annualGrossReturn, 1 / 12) - 1;

    // The portion of growth that comes from dividends (and is thus taxable)
    const dividendPortionRatio = annualGrossReturn > 0 ? etf.dividendYield / annualGrossReturn : 0;

    const months = [];
    const values = [];
    const contributions = [];
    const cashFlows = new Array(totalMonths + 1).fill(0);

    // Deduct brokerage fee from initial capital
    let portfolio = initialCapital * (1 - BROKERAGE_FEE_RATE);
    let totalContrib = initialCapital;
    
    // CF[0] is the initial cash outflow from the investor's pocket
    cashFlows[0] = -initialCapital;

    let grossDividendsTotal = 0;
    let taxPaidTotal = 0;
    let feesPaidTotal = initialCapital * BROKERAGE_FEE_RATE;
    let annualDivTracker = 0;

    for (let m = 0; m <= totalMonths; m++) {
        months.push(m);
        values.push(Math.max(0, portfolio));
        contributions.push(totalContrib);

        if (m === totalMonths) break;

        // 1. Calculate Gross Growth for this month
        const grossGrowth = portfolio * monthlyGrossReturn;

        // 2. Identify Dividend Component (Subject to Taiwan Tax)
        const grossDividend = grossGrowth * dividendPortionRatio;
        annualDivTracker += grossDividend;

        const marginalRate = AppState.taxInfo.marginalRate;

        // Calculate tax for this month's dividend
        let monthlyTax;
        if (AppState.taxInfo.optimalMethod === "分開計稅") {
            // Option B: 28% flat + NHI (if hits threshold)
            const nhiPart = grossDividend >= NHI_THRESHOLD ? grossDividend * NHI_RATE : 0;
            monthlyTax = (grossDividend * 0.28) + nhiPart;
        } else {
            // Option A: Combined tax
            const incomeTaxPart = grossDividend * marginalRate;
            // NHI is only charged if the payout hits the threshold
            const nhiPart = grossDividend >= NHI_THRESHOLD ? grossDividend * NHI_RATE : 0;

            // 8.5% Credit logic (max 80k/year)
            const totalCreditPossible = annualDivTracker * 0.085;
            const creditAlreadyTaken = (annualDivTracker - grossDividend) * 0.085;

            const creditThisMonth = Math.max(0,
                Math.min(80000, totalCreditPossible) - Math.min(80000, creditAlreadyTaken)
            );

            monthlyTax = incomeTaxPart + nhiPart - creditThisMonth;
        }

        const taxOnDividend = monthlyTax;
        const netDividend = grossDividend - taxOnDividend;

        // Reset annual tracker every 12 months
        if ((m + 1) % 12 === 0) annualDivTracker = 0;

        grossDividendsTotal += grossDividend;
        taxPaidTotal += taxOnDividend;

        // 3. Apply Net Growth to Portfolio
        // Portfolio = Old + (Total Growth - Tax on Dividend Component)
        portfolio += (grossGrowth - taxOnDividend);

        let currentMonthCF = 0;

        // 4. Regular contribution (with brokerage fee)
        if (monthlyContrib > 0) {
            const fee = monthlyContrib * BROKERAGE_FEE_RATE;
            portfolio += (monthlyContrib - fee);
            totalContrib += monthlyContrib;
            feesPaidTotal += fee;
            currentMonthCF -= monthlyContrib; // Cash outflow
        }

        // 5. Periodic withdrawal
        if (withdrawalAmount > 0) {
            if (withdrawalMode === "monthly") {
                portfolio -= withdrawalAmount;
                currentMonthCF += withdrawalAmount; // Cash inflow to investor
            } else if (withdrawalMode === "annually" && (m + 1) % 12 === 0) {
                portfolio -= withdrawalAmount;
                currentMonthCF += withdrawalAmount; // Cash inflow to investor
            }
        }

        if (portfolio < 0) portfolio = 0;
        
        // Record the net cash flow occurring at the end of this month (m+1)
        cashFlows[m + 1] = currentMonthCF;
    }

    const finalValue = Math.max(0, portfolio);
    
    // The final remaining portfolio value is considered a terminal cash inflow
    cashFlows[totalMonths] += finalValue;
    const irr = calculateArrayIRR(cashFlows);

    return {
        months,
        values,
        contributions,
        grossDividendsTotal,
        taxPaidTotal,
        feesPaidTotal,
        netDividendsTotal: grossDividendsTotal - taxPaidTotal,
        irr
    };
}

/**
 * Calculate the Internal Rate of Return (IRR) using an array of cash flows.
 * This correctly accounts for BOTH contributions (negative CF) and withdrawals (positive CF).
 * 
 * @param {number[]} cashFlows - Array of net cash flows per month, where CF[0] is initial.
 * @returns {number} - Annualized IRR (decimal)
 */
function calculateArrayIRR(cashFlows) {
    if (!cashFlows || cashFlows.length === 0) return 0;
    
    // Verify we have both positive and negative cash flows to solve for IRR
    let hasPositive = false;
    let hasNegative = false;
    for (let i = 0; i < cashFlows.length; i++) {
        if (cashFlows[i] > 0) hasPositive = true;
        if (cashFlows[i] < 0) hasNegative = true;
    }
    if (!hasPositive || !hasNegative) return 0;

    let low = -0.99; 
    let high = 1.0;  
    let r = 0;
    const tolerance = 1e-6;
    
    for (let i = 0; i < 100; i++) {
        r = (low + high) / 2;
        let npv = 0;
        
        for (let t = 0; t < cashFlows.length; t++) {
            npv += cashFlows[t] / Math.pow(1 + r, t);
        }
        
        if (Math.abs(npv) < tolerance) break;
        
        // Standard investment NPV typically decreases as discount rate increases.
        if (npv > 0) {
            low = r; // Discount rate too low, need to increase r to lower NPV
        } else {
            high = r; // Discount rate too high
        }
    }
    
    // Convert monthly internal rate to annualized return
    return Math.pow(1 + r, 12) - 1;
}

/**
 * Run simulation for all selected ETFs.
 *
 * @param {string[]} selectedKeys - Array of ETF keys to simulate
 * @param {object}   params       - Same params object as simulateETF
 * @returns {object} Map of etfKey -> simulation result
 */
function runAllSimulations(selectedKeys, params) {
    const results = {};
    for (const key of selectedKeys) {
        results[key] = simulateETF(key, params);
    }
    return results;
}

/**
 * Calculate effective Taiwan dividend tax rate from annual taxable income.
 *
 * Taiwan post-2018 dividend tax system (Income Tax Act §14-1):
 *   Option A - 合併計稅 (Combined with income tax):
 *     Gross dividend added to income; taxed at marginal rate.
 *     Tax credit: 8.5% of gross dividend (capped at NT$80,000/yr).
 *     Effective rate = max(marginalRate - 8.5%, 0) + NHI supplement (2.11%)
 *
 *   Option B - 分開計稅 (Separate flat rate):
 *     Gross dividend taxed at flat 28%.
 *     Tax credit: 8.5% of gross dividend (capped at NT$80,000/yr).
 *     Effective rate = 28% - 8.5% + 2.11% = 21.61%
 *
 *   System chooses whichever is lower (legal tax optimization).
 *
 * Note: The NT$80,000 cap on the 8.5% credit applies when annual gross
 * dividend income exceeds ~NT$941,176. For very large portfolios this
 * rate will underestimate tax slightly; treated as acceptable simplification.
 *
 * @param {number} annualTaxableIncome - Annual taxable income in TWD
 *                                       (after standard deduction, personal exemption, etc.)
 * @returns {{
 *   marginalRate: number,
 *   combinedEffectiveRate: number,
 *   separateEffectiveRate: number,
 *   effectiveRate: number,
 *   optimalMethod: string
 * }}
 */
function calculateDividendTaxRate(annualTaxableIncome) {
    // Taiwan 2024 progressive income tax brackets (taxable income thresholds)
    const brackets = [
        { ceiling: 590000, rate: 0.05 },
        { ceiling: 1330000, rate: 0.12 },
        { ceiling: 2660000, rate: 0.20 },
        { ceiling: 4980000, rate: 0.30 },
        { ceiling: Infinity, rate: 0.40 },
    ];

    let marginalRate = brackets[0].rate;
    for (const b of brackets) {
        if (annualTaxableIncome <= b.ceiling) {
            marginalRate = b.rate;
            break;
        }
        marginalRate = b.rate;
    }

    const IMPUTATION_CREDIT = 0.085;  // 8.5% dividend tax credit (imputation)
    const NHI_RATE = 0.0211; // 健保補充保費

    // Option A: 合併計稅
    // 低所得者（5% 級距）的 8.5% 可抵減稅額大於應納稅額，會產生實質「退稅」（負稅率）。
    const combinedEffectiveRate = (marginalRate - IMPUTATION_CREDIT) + NHI_RATE;

    // Option B: 分開計稅 — 28% flat rate, plus NHI. Cannot use 8.5% credit.
    // So 28% + 2.11% = 30.11%
    const separateEffectiveRate = 0.28 + NHI_RATE;

    const effectiveRate = Math.min(combinedEffectiveRate, separateEffectiveRate);
    const optimalMethod = combinedEffectiveRate <= separateEffectiveRate ? "合併計稅" : "分開計稅";

    return { marginalRate, combinedEffectiveRate, separateEffectiveRate, effectiveRate, optimalMethod };
}

/**
 * Format a TWD number to a human-readable string.
 * @param {number} value
 * @returns {string}
 */
function formatTWD(value) {
    if (value >= 1e8) {
        return (value / 1e8).toFixed(2) + " 億";
    }
    if (value >= 1e4) {
        return (value / 1e4).toFixed(1) + " 萬";
    }
    return value.toFixed(0) + " 元";
}

/**
 * Format a number with thousand separators.
 * @param {number} value
 * @returns {string}
 */
function formatNumber(value) {
    return Math.round(value).toLocaleString("zh-TW");
}
