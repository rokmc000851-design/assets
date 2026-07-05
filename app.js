const STORAGE_KEY = "portfolio-ledger-yearly-v3";
const SHEETS_SYNC_URL_KEY = "portfolio-ledger-sheets-web-app-url";
const MONTH_COUNT = 12;
const accountTypes = ["투자", "현금", "연금", "코인", "보험", "부채", "기타"];
const colors = ["#24765a", "#3b73a3", "#d59b2f", "#c25f4f", "#6d63a6", "#4d8e86", "#8b7355", "#9a4f68"];
const debtColor = "#b85a4b";
const livingColors = {
  food: "#3b73a3",
  living: "#24765a",
  other: "#d59b2f",
  koreanIncome: "#285f90",
  cardPayment: "#c25f4f",
};
const ALL_TREND_ACCOUNTS = "__all__";
const livingExpenseFields = ["food", "living", "other", "koreanIncome", "cardPayment"];

const seed2026Accounts = [
  [
    { name: "주식", type: "투자", principal: 262072854, valuation: 293685590, cashflow: -18570000 },
    { name: "CMA", type: "현금", principal: 18709002, valuation: 18741796, cashflow: 18570000 },
    { name: "개인연금", type: "연금", principal: 96710057, valuation: 99130245, cashflow: 0 },
    { name: "IRP", type: "연금", principal: 19717496, valuation: 19778256, cashflow: 0 },
    { name: "업비트(승수)", type: "코인", principal: 63553823, valuation: 61904674, cashflow: 3000000 },
    { name: "업비트(세진)", type: "코인", principal: 0, valuation: 0, cashflow: 0 },
    { name: "Metlife(은재)", type: "보험", principal: 0, valuation: 0, cashflow: 0 },
    { name: "마통", type: "부채", principal: 0, valuation: 0, cashflow: 0 },
  ],
  [
    { name: "주식", type: "투자", principal: 313685590, valuation: 311184257, cashflow: 20000000 },
    { name: "CMA", type: "현금", principal: 741796, valuation: 752087, cashflow: -18000000 },
    { name: "개인연금", type: "연금", principal: 99766045, valuation: 102993926, cashflow: 635800 },
    { name: "IRP", type: "연금", principal: 19778256, valuation: 19662887, cashflow: 0 },
    { name: "업비트(승수)", type: "코인", principal: 64904674, valuation: 52958151, cashflow: 3000000 },
    { name: "업비트(세진)", type: "코인", principal: 0, valuation: 0, cashflow: 0 },
    { name: "Metlife(은재)", type: "보험", principal: 0, valuation: 0, cashflow: 0 },
    { name: "마통", type: "부채", principal: -17660000, valuation: -17660000, cashflow: 0 },
  ],
  [
    { name: "주식", type: "투자", principal: 316184257, valuation: 280837181, cashflow: 5000000 },
    { name: "CMA", type: "현금", principal: 752087, valuation: 753405, cashflow: 0 },
    { name: "개인연금", type: "연금", principal: 103629726, valuation: 103013794, cashflow: 635800 },
    { name: "IRP", type: "연금", principal: 19662887, valuation: 19208105, cashflow: 0 },
    { name: "업비트(승수)", type: "코인", principal: 55958151, valuation: 55937423, cashflow: 3000000 },
    { name: "업비트(세진)", type: "코인", principal: 0, valuation: 0, cashflow: 0 },
    { name: "Metlife(은재)", type: "보험", principal: 44909941, valuation: 44909941, cashflow: 0 },
    { name: "마통", type: "부채", principal: -10221000, valuation: -10221000, cashflow: 0 },
  ],
  [
    { name: "주식", type: "투자", principal: 290837181, valuation: 343774008, cashflow: 10000000 },
    { name: "CMA", type: "현금", principal: 753405, valuation: 755621, cashflow: 0 },
    { name: "개인연금", type: "연금", principal: 103649594, valuation: 117194134, cashflow: 635800 },
    { name: "IRP", type: "연금", principal: 19208105, valuation: 21188578, cashflow: 0 },
    { name: "업비트(승수)", type: "코인", principal: 58937423, valuation: 66878919, cashflow: 3000000 },
    { name: "업비트(세진)", type: "코인", principal: 2090901, valuation: 2090901, cashflow: 0 },
    { name: "Metlife(은재)", type: "보험", principal: 45309941, valuation: 45588170, cashflow: 400000 },
    { name: "마통", type: "부채", principal: -10221000, valuation: -20000000, cashflow: -10000000 },
  ],
];

let state = loadState();
let activeYearIndex = Math.min(state.activeYearIndex ?? 0, state.years.length - 1);
let activeMonthIndex = Math.min(state.activeMonthIndex ?? getLastUpdatedMonthIndex(currentYear()), MONTH_COUNT - 1);
let undoState = null;
let activeTrendAccount = ALL_TREND_ACCOUNTS;
let trendHitAreas = [];
let allocationHitAreas = [];

const yearTabs = document.querySelector("#yearTabs");
const monthTabs = document.querySelector("#monthTabs");
const livingYearTabs = document.querySelector("#livingYearTabs");
const livingMonthTabs = document.querySelector("#livingMonthTabs");
const ledgerBody = document.querySelector("#ledgerBody");
const allocationChart = document.querySelector("#allocationChart");
const trendChart = document.querySelector("#trendChart");
const canadaLivingChart = document.querySelector("#canadaLivingChart");
const koreaLivingChart = document.querySelector("#koreaLivingChart");
const allocationCtx = allocationChart.getContext("2d");
const trendCtx = trendChart.getContext("2d");
const canadaLivingCtx = canadaLivingChart.getContext("2d");
const koreaLivingCtx = koreaLivingChart.getContext("2d");
const trendAccountFilter = document.querySelector("#trendAccountFilter");
const trendTooltip = document.querySelector("#trendTooltip");
const allocationTooltip = document.querySelector("#allocationTooltip");

document.querySelector("#addMonthBtn").addEventListener("click", () => {
  pushUndoState();
  const year = currentYear();
  const lastUpdatedIndex = getLastUpdatedMonthIndex(year);
  const nextIndex = Math.min(lastUpdatedIndex + 1, MONTH_COUNT - 1);
  const previous = year.months[lastUpdatedIndex] || year.months[0];
  year.months[nextIndex].accounts = previous.accounts.map((account) => ({
    ...account,
    principal: toNumber(account.valuation),
    cashflow: 0,
  }));
  activeMonthIndex = nextIndex;
  saveAndRender();
});

document.querySelector("#addYearBtn").addEventListener("click", () => {
  pushUndoState();
  const latestYear = state.years[state.years.length - 1];
  const latestMonth = latestYear.months[getLastUpdatedMonthIndex(latestYear)];
  const nextYear = latestYear.year + 1;
  state.years.push(createEmptyYear(nextYear, latestMonth.accounts));
  activeYearIndex = state.years.length - 1;
  activeMonthIndex = 0;
  saveAndRender();
});

document.querySelector("#addAccountBtn").addEventListener("click", () => {
  document.querySelector("#quickEntrySection").classList.remove("hidden");
  document.querySelector("#nameInput").focus();
});

document.querySelector("#entryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#nameInput").value.trim();
  if (!name) return;

  pushUndoState();
  currentMonth().accounts.push({
    name,
    type: document.querySelector("#typeInput").value,
    principal: readNumber("#principalInput"),
    valuation: readNumber("#valuationInput"),
    cashflow: readNumber("#cashflowInput"),
  });

  event.currentTarget.reset();
  renderMoneyInputs();
  saveAndRender();
});

document.querySelector("#undoBtn").addEventListener("click", undoLastChange);
document.querySelector("#backupCsvBtn")?.addEventListener("click", exportCsv);
document.querySelector("#restoreCsvInput")?.addEventListener("change", importCsv);
document.querySelector("#saveSheetsUrlBtn")?.addEventListener("click", saveSheetsUrl);
document.querySelector("#pullSheetsBtn")?.addEventListener("click", pullFromSheets);
document.querySelector("#pushSheetsBtn")?.addEventListener("click", pushToSheets);
trendAccountFilter.addEventListener("change", () => {
  activeTrendAccount = trendAccountFilter.value;
  renderTrendChart();
});
allocationChart.addEventListener("mousemove", showAllocationTooltip);
allocationChart.addEventListener("mouseleave", hideAllocationTooltip);
trendChart.addEventListener("mousemove", showTrendTooltip);
trendChart.addEventListener("mouseleave", hideTrendTooltip);

const sheetsUrlInput = document.querySelector("#sheetsWebAppUrl");
if (sheetsUrlInput) sheetsUrlInput.value = localStorage.getItem(SHEETS_SYNC_URL_KEY) || "";

document.querySelectorAll(".money-entry").forEach((input) => {
  input.addEventListener("blur", () => {
    input.value = formatMoneyInput(readInputNumber(input.value));
  });
  input.addEventListener("focus", () => {
    input.value = String(readInputNumber(input.value) || "");
  });
});

document.querySelectorAll(".living-input").forEach((input) => {
  input.addEventListener("focus", () => {
    input.value = String(readInputNumber(input.value) || "");
  });
  input.addEventListener("blur", () => {
    input.value = formatMoneyInput(readInputNumber(input.value));
  });
  input.addEventListener("change", () => {
    pushUndoState();
    currentLivingExpenses()[input.dataset.livingField] = readInputNumber(input.value);
    saveAndRender();
  });
});

ledgerBody.addEventListener("focusin", (event) => {
  const input = event.target.closest(".money-input");
  if (input) input.value = String(readInputNumber(input.value) || "");
});

ledgerBody.addEventListener("change", (event) => {
  const input = event.target.closest("[data-field]");
  if (!input) return;
  const account = currentMonth().accounts[Number(input.dataset.index)];
  if (!account) return;

  if (input.dataset.field === "name" || input.dataset.field === "type") {
    pushUndoState();
    account[input.dataset.field] = input.value.trim() || account[input.dataset.field];
  } else {
    pushUndoState();
    account[input.dataset.field] = readInputNumber(input.value);
  }
  saveAndRender();
});

ledgerBody.addEventListener("focusout", (event) => {
  const input = event.target.closest(".money-input");
  if (input) input.value = formatMoneyInput(readInputNumber(input.value));
});

ledgerBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-index]");
  if (!button) return;
  pushUndoState();
  currentMonth().accounts.splice(Number(button.dataset.deleteIndex), 1);
  saveAndRender();
});

function createDefaultState() {
  return {
    activeYearIndex: 0,
    activeMonthIndex: 3,
    years: [
      {
        year: 2026,
        months: Array.from({ length: MONTH_COUNT }, (_, index) => ({
          month: index + 1,
          accounts: structuredClone(seed2026Accounts[index] || []),
          livingExpenses: createEmptyLivingExpenses(),
        })),
      },
    ],
  };
}

function createEmptyYear(year, accountTemplate = []) {
  return {
    year,
    months: Array.from({ length: MONTH_COUNT }, (_, index) => ({
      month: index + 1,
      livingExpenses: createEmptyLivingExpenses(),
      accounts:
        index === 0
          ? accountTemplate.map((account) => ({
              ...account,
              principal: toNumber(account.valuation),
              cashflow: 0,
            }))
          : [],
    })),
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.years?.length) return normalizeState(saved);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return createDefaultState();
}

function normalizeState(rawState) {
  rawState.years.forEach((year) => {
    year.months.forEach((month) => {
      month.livingExpenses = {
        ...createEmptyLivingExpenses(),
        ...(month.livingExpenses || {}),
      };
    });
  });
  return rawState;
}

function createEmptyLivingExpenses() {
  return {
    food: 0,
    living: 0,
    other: 0,
    koreanIncome: 0,
    cardPayment: 0,
  };
}

function pushUndoState() {
  undoState = {
    state: structuredClone(state),
    activeYearIndex,
    activeMonthIndex,
  };
  updateUndoButton();
}

function undoLastChange() {
  if (!undoState) return;
  state = structuredClone(undoState.state);
  activeYearIndex = undoState.activeYearIndex;
  activeMonthIndex = undoState.activeMonthIndex;
  undoState = null;
  saveAndRender();
}

function updateUndoButton() {
  const button = document.querySelector("#undoBtn");
  if (button) button.disabled = !undoState;
}

function saveAndRender() {
  state.activeYearIndex = activeYearIndex;
  state.activeMonthIndex = activeMonthIndex;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
  updateUndoButton();
}

function currentYear() {
  return state.years[activeYearIndex];
}

function currentMonth() {
  return currentYear().months[activeMonthIndex];
}

function currentLivingExpenses() {
  const month = currentMonth();
  month.livingExpenses = {
    ...createEmptyLivingExpenses(),
    ...(month.livingExpenses || {}),
  };
  return month.livingExpenses;
}

function render() {
  renderYearTabs();
  renderMonthTabs();
  renderSummary();
  renderLedger();
  renderLivingExpenses();
  renderAllocationChart();
  renderTrendFilter();
  renderTrendChart();
  renderLivingCharts();
}

function renderYearTabs() {
  document.querySelector("#yearEyebrow").textContent = `${currentYear().year} Portfolio Ledger`;
  renderYearTabGroup(yearTabs);
  renderYearTabGroup(livingYearTabs);
}

function renderYearTabGroup(container) {
  if (!container) return;
  container.innerHTML = state.years
    .map(
      (year, index) => `
        <button class="year-tab ${index === activeYearIndex ? "active" : ""}" type="button" data-year-index="${index}">
          ${year.year}년
        </button>
      `
    )
    .join("");

  container.querySelectorAll("[data-year-index]").forEach((button) => {
    button.addEventListener("click", () => {
      activeYearIndex = Number(button.dataset.yearIndex);
      activeMonthIndex = Math.min(getLastUpdatedMonthIndex(currentYear()), MONTH_COUNT - 1);
      saveAndRender();
    });
  });
}

function renderMonthTabs() {
  renderMonthTabGroup(monthTabs);
  renderMonthTabGroup(livingMonthTabs);
}

function renderMonthTabGroup(container) {
  if (!container) return;
  const lastUpdatedIndex = getLastUpdatedMonthIndex(currentYear());
  container.innerHTML = currentYear().months
    .map((month, index) => {
      const status = index <= lastUpdatedIndex ? "" : "future";
      return `
        <button class="month-tab ${index === activeMonthIndex ? "active" : ""} ${status}" type="button" data-month-index="${index}">
          ${month.month}월
        </button>
      `;
    })
    .join("");

  container.querySelectorAll("[data-month-index]").forEach((button) => {
    button.addEventListener("click", () => {
      activeMonthIndex = Number(button.dataset.monthIndex);
      saveAndRender();
    });
  });
}

function renderSummary() {
  const totals = calculateMonthTotals(currentMonth());
  const monthLabel = `${currentMonth().month}월`;
  document.querySelector("#selectedMonthLabel").textContent = `${currentYear().year}년 ${monthLabel}`;
  document.querySelector("#principalMetricLabel").textContent = `${monthLabel}초 원금`;
  document.querySelector("#valuationMetricLabel").textContent = `${monthLabel}말 총 금액`;
  document.querySelector("#totalPrincipal").textContent = formatWon(totals.principal);
  document.querySelector("#totalValuation").textContent = formatWon(totals.valuation);
  setSignedText("#totalProfit", totals.profit, formatWon(totals.profit));
  setSignedText("#totalReturn", totals.returnRate, formatPercent(totals.returnRate));
  setSignedText("#ytdProfit", calculateYtdProfit(activeMonthIndex), formatWon(calculateYtdProfit(activeMonthIndex)));
  setSignedText("#cashflowTotal", totals.cashflow, formatWon(totals.cashflow));
}

function renderLedger() {
  const month = currentMonth();
  if (!month.accounts.length) {
    ledgerBody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-row">아직 업데이트되지 않은 월입니다. "다음 업데이트 월 추가" 또는 "계좌 추가"로 시작하세요.</td>
      </tr>
    `;
  } else {
    ledgerBody.innerHTML = month.accounts
      .map((account, index) => {
        const profit = getProfit(account);
        const rate = getReturnRate(account);
        const ytd = calculateAccountYtd(account.name, activeMonthIndex);
        return `
          <tr>
            <td><input data-field="name" data-index="${index}" value="${escapeAttribute(account.name)}" aria-label="구분" /></td>
            <td>
              <select data-field="type" data-index="${index}" aria-label="분류">
                ${accountTypes.map((type) => `<option value="${type}" ${type === account.type ? "selected" : ""}>${type}</option>`).join("")}
              </select>
            </td>
            <td><input class="number-input money-input" data-field="principal" data-index="${index}" type="text" inputmode="numeric" value="${formatMoneyInput(account.principal)}" aria-label="원금" /></td>
            <td><input class="number-input money-input" data-field="valuation" data-index="${index}" type="text" inputmode="numeric" value="${formatMoneyInput(account.valuation)}" aria-label="평가금" /></td>
            <td class="amount ${getSignedClass(profit)}">${formatWon(profit)}</td>
            <td class="amount ${getSignedClass(rate)}">${formatPercent(rate)}</td>
            <td class="amount ${getSignedClass(ytd)}">${formatWon(ytd)}</td>
            <td><input class="number-input money-input ${getSignedClass(account.cashflow)}" data-field="cashflow" data-index="${index}" type="text" inputmode="numeric" value="${formatMoneyInput(account.cashflow)}" aria-label="입출금" /></td>
            <td><button class="delete-button" type="button" data-delete-index="${index}" title="삭제" aria-label="삭제">×</button></td>
          </tr>
        `;
      })
      .join("");
  }

  const totals = calculateMonthTotals(month);
  document.querySelector("#footerPrincipal").textContent = formatWon(totals.principal);
  document.querySelector("#footerValuation").textContent = formatWon(totals.valuation);
  setSignedText("#footerProfit", totals.profit, formatWon(totals.profit));
  setSignedText("#footerReturn", totals.returnRate, formatPercent(totals.returnRate));
  setSignedText("#footerYtd", calculateYtdProfit(activeMonthIndex), formatWon(calculateYtdProfit(activeMonthIndex)));
  setSignedText("#footerCashflow", totals.cashflow, formatWon(totals.cashflow));
}

function renderLivingExpenses() {
  const living = currentLivingExpenses();
  const ytd = calculateLivingYtd();
  document.querySelector("#livingSelectedMonth").textContent = `${currentYear().year}년 ${currentMonth().month}월`;
  livingExpenseFields.forEach((field) => {
    const input = document.querySelector(`[data-living-field="${field}"]`);
    if (input && document.activeElement !== input) input.value = formatMoneyInput(living[field]);
  });
  document.querySelector("#livingTotal").textContent = formatWon(living.food + living.living + living.other);
  document.querySelector("#canadaLivingYtd").textContent = formatWon(ytd.canada);
  document.querySelector("#koreanIncomeYtd").textContent = formatWon(ytd.koreanIncome);
  document.querySelector("#cardPaymentYtd").textContent = formatWon(ytd.cardPayment);
}

function renderLivingCharts() {
  const months = currentYear().months.map((month) => ({
    month: month.month,
    living: {
      ...createEmptyLivingExpenses(),
      ...(month.livingExpenses || {}),
    },
  }));

  drawLivingStackedChart(
    canadaLivingCtx,
    canadaLivingChart,
    months,
    [
      { field: "food", label: "식비", color: livingColors.food, sign: 1 },
      { field: "living", label: "생활비", color: livingColors.living, sign: 1 },
      { field: "other", label: "기타", color: livingColors.other, sign: 1 },
    ],
    { showPositiveTotals: true }
  );

  drawLivingStackedChart(koreaLivingCtx, koreaLivingChart, months, [
    { field: "koreanIncome", label: "월수입", color: livingColors.koreanIncome, sign: 1 },
    { field: "cardPayment", label: "카드값", color: livingColors.cardPayment, sign: -1 },
  ]);
}

function drawLivingStackedChart(ctx, canvas, months, series, options = {}) {
  const width = canvas.width;
  const height = canvas.height;
  const left = 46;
  const right = 16;
  const top = 20;
  const bottom = 36;
  const chartHeight = height - top - bottom;
  const chartWidth = width - left - right;
  const gap = 7;
  const barWidth = Math.max(20, (chartWidth - gap * (MONTH_COUNT - 1)) / MONTH_COUNT);
  const stacks = months.map((month) => {
    const values = series.map((item) => ({
      ...item,
      value: toNumber(month.living[item.field]) * item.sign,
    }));
    return {
      month: month.month,
      values,
      positiveTotal: values.filter((item) => item.value > 0).reduce((sum, item) => sum + item.value, 0),
      negativeTotal: values.filter((item) => item.value < 0).reduce((sum, item) => sum + item.value, 0),
    };
  });

  const maxPositive = Math.max(...stacks.map((stack) => stack.positiveTotal), 1);
  const minNegative = Math.min(...stacks.map((stack) => stack.negativeTotal), 0);
  const range = maxPositive - minNegative || 1;
  const zeroY = top + (maxPositive / range) * chartHeight;

  ctx.clearRect(0, 0, width, height);
  drawLivingGrid(ctx, left, top, chartWidth, chartHeight, maxPositive, minNegative, zeroY);

  stacks.forEach((stack, index) => {
    const x = left + index * (barWidth + gap);
    let positiveY = zeroY;
    let negativeY = zeroY;
    const grossTotal = stack.values.reduce((sum, item) => sum + Math.abs(item.value), 0);

    stack.values.forEach((item) => {
      if (!item.value) return;
      const segmentHeight = Math.max(1, (Math.abs(item.value) / range) * chartHeight);
      const percent = grossTotal ? Math.abs(item.value) / grossTotal : 0;
      ctx.fillStyle = item.color;

      if (item.value > 0) {
        positiveY -= segmentHeight;
        ctx.fillRect(x, positiveY, barWidth, segmentHeight);
        drawLivingStackLabel(ctx, x, positiveY, barWidth, segmentHeight, item.value, percent);
      } else {
        ctx.fillRect(x, negativeY, barWidth, segmentHeight);
        drawLivingStackLabel(ctx, x, negativeY, barWidth, segmentHeight, item.value, percent);
        negativeY += segmentHeight;
      }
    });

    if (options.showPositiveTotals && stack.positiveTotal > 0) {
      ctx.fillStyle = "#17211d";
      ctx.font = "700 10px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(formatManwon(stack.positiveTotal), x + barWidth / 2, Math.max(12, positiveY - 6));
    }

    if (!grossTotal) {
      ctx.fillStyle = "#edf2f0";
      ctx.fillRect(x, zeroY - 2, barWidth, 4);
    }

    if (index === activeMonthIndex) {
      const y = grossTotal ? Math.min(positiveY, zeroY) : zeroY - 2;
      const h = grossTotal ? Math.max(negativeY, zeroY) - y : 4;
      ctx.strokeStyle = "#17211d";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, barWidth + 4, h + 4);
    }

    ctx.fillStyle = "#52615c";
    ctx.font = "11px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${stack.month}월`, x + barWidth / 2, height - 10);
  });

  drawLivingLegend(ctx, series, left, 12);
}

function drawLivingGrid(ctx, left, top, chartWidth, chartHeight, maxPositive, minNegative, zeroY) {
  ctx.strokeStyle = "#dce5e1";
  ctx.fillStyle = "#6b7772";
  ctx.lineWidth = 1;
  ctx.font = "10px Segoe UI, sans-serif";
  ctx.textAlign = "right";

  const ticks = [maxPositive, maxPositive / 2, 0, minNegative / 2, minNegative].filter((value, index, list) => index === 0 || Math.abs(value - list[index - 1]) > 1000);
  ticks.forEach((value) => {
    const y = valueToY(value, top, chartHeight, maxPositive, minNegative);
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + chartWidth, y);
    ctx.stroke();
    ctx.fillText(formatManwon(value), left - 6, y + 4);
  });

  ctx.strokeStyle = "#7e8a86";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(left, zeroY);
  ctx.lineTo(left + chartWidth, zeroY);
  ctx.stroke();
}

function drawLivingStackLabel(ctx, x, y, width, height, value, percent) {
  if (height < 24 || width < 24) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 9px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(height > 38 ? formatManwon(value) : `(${Math.round(percent * 100)}%)`, x + width / 2, y + height / 2);
  ctx.restore();
}

function drawLivingLegend(ctx, series, left, y) {
  let x = left;
  series.forEach((item) => {
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y - 8, 9, 9);
    ctx.fillStyle = "#52615c";
    ctx.font = "11px Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(item.label, x + 13, y);
    x += item.label.length * 12 + 26;
  });
}

function calculateLivingYtd() {
  return currentYear().months.slice(0, activeMonthIndex + 1).reduce(
    (totals, month) => {
      const living = {
        ...createEmptyLivingExpenses(),
        ...(month.livingExpenses || {}),
      };
      totals.canada += toNumber(living.food) + toNumber(living.living) + toNumber(living.other);
      totals.koreanIncome += toNumber(living.koreanIncome);
      totals.cardPayment += toNumber(living.cardPayment);
      return totals;
    },
    { canada: 0, koreanIncome: 0, cardPayment: 0 }
  );
}

function renderAllocationChart() {
  const entries = currentMonth().accounts.filter((account) => toNumber(account.valuation) !== 0);
  const total = entries.reduce((sum, account) => sum + toNumber(account.valuation), 0);
  const magnitudeTotal = entries.reduce((sum, account) => sum + Math.abs(toNumber(account.valuation)), 0);
  allocationCtx.clearRect(0, 0, allocationChart.width, allocationChart.height);
  allocationHitAreas = [];
  hideAllocationTooltip();

  if (!magnitudeTotal) {
    document.querySelector("#allocationLegend").innerHTML = '<span class="subtle">표시할 평가금이 없습니다.</span>';
    return;
  }

  let start = -Math.PI / 2;
  entries.forEach((account) => {
    const value = toNumber(account.valuation);
    const slice = (Math.abs(value) / magnitudeTotal) * Math.PI * 2;
    const end = start + slice;
    const mid = start + slice / 2;
    allocationCtx.beginPath();
    allocationCtx.moveTo(140, 140);
    allocationCtx.arc(140, 140, 116, start, end);
    allocationCtx.closePath();
    allocationCtx.fillStyle = value < 0 ? debtColor : colors[getAccountColorIndex(account.name)];
    allocationCtx.fill();
    allocationHitAreas.push({
      accountName: account.name,
      value,
      percent: total ? value / total : 0,
      start,
      end,
    });
    drawAllocationSliceLabel(mid, slice, value, total ? value / total : 0);
    start = end;
  });

  allocationCtx.beginPath();
  allocationCtx.arc(140, 140, 64, 0, Math.PI * 2);
  allocationCtx.fillStyle = "#ffffff";
  allocationCtx.fill();
  allocationCtx.fillStyle = "#17211d";
  allocationCtx.font = "700 18px Segoe UI, sans-serif";
  allocationCtx.textAlign = "center";
  allocationCtx.fillText("평가금", 140, 134);
  allocationCtx.font = "700 20px Segoe UI, sans-serif";
  allocationCtx.fillText(formatEok(total), 140, 160);

  document.querySelector("#allocationLegend").innerHTML = entries
    .map(
      (account) => `
        <div class="legend-item">
          <span class="swatch" style="background:${toNumber(account.valuation) < 0 ? debtColor : colors[getAccountColorIndex(account.name)]}"></span>
          <span>${escapeHtml(account.name)} ${formatEok(toNumber(account.valuation))} (${formatPercent(total ? toNumber(account.valuation) / total : 0)})</span>
        </div>
      `
    )
    .join("");
}

function drawAllocationSliceLabel(angle, slice, value, percent) {
  if (slice < 0.28) return;
  const radius = 91;
  const x = 140 + Math.cos(angle) * radius;
  const y = 140 + Math.sin(angle) * radius;
  allocationCtx.save();
  allocationCtx.fillStyle = "#ffffff";
  allocationCtx.font = slice > 0.5 ? "700 10px Segoe UI, sans-serif" : "700 9px Segoe UI, sans-serif";
  allocationCtx.textAlign = "center";
  allocationCtx.textBaseline = "middle";
  allocationCtx.fillText(formatEok(value), x, y - 6);
  allocationCtx.fillText(`(${formatPercent(percent)})`, x, y + 7);
  allocationCtx.restore();
}

function renderTrendFilter() {
  const names = getAllAccountNames();
  if (activeTrendAccount !== ALL_TREND_ACCOUNTS && !names.includes(activeTrendAccount)) {
    activeTrendAccount = ALL_TREND_ACCOUNTS;
  }

  trendAccountFilter.innerHTML = [
    `<option value="${ALL_TREND_ACCOUNTS}">전체</option>`,
    ...names.map((name) => `<option value="${escapeAttribute(name)}">${escapeHtml(name)}</option>`),
  ].join("");
  trendAccountFilter.value = activeTrendAccount;
}

function renderTrendChart() {
  const width = trendChart.width;
  const height = trendChart.height;
  const left = 52;
  const right = 18;
  const top = 24;
  const bottom = 40;
  const chartHeight = height - top - bottom;
  const chartWidth = width - left - right;
  const year = currentYear();
  const lastUpdatedIndex = getLastUpdatedMonthIndex(year);
  const monthStacks = year.months.map((month, index) => {
    const accounts = index <= lastUpdatedIndex ? getTrendAccounts(month.accounts) : [];
    const positive = accounts.filter((account) => toNumber(account.valuation) > 0);
    const negative = accounts.filter((account) => toNumber(account.valuation) < 0);
    return {
      positive,
      negative,
      positiveTotal: positive.reduce((sum, account) => sum + toNumber(account.valuation), 0),
      negativeTotal: negative.reduce((sum, account) => sum + toNumber(account.valuation), 0),
      grossTotal: accounts.reduce((sum, account) => sum + Math.abs(toNumber(account.valuation)), 0),
    };
  });
  const maxPositive = Math.max(...monthStacks.map((stack) => stack.positiveTotal), 1);
  const minNegative = Math.min(...monthStacks.map((stack) => stack.negativeTotal), 0);
  const range = maxPositive - minNegative || 1;
  const zeroY = top + (maxPositive / range) * chartHeight;
  const gap = 8;
  const barWidth = Math.max(28, (chartWidth - gap * (MONTH_COUNT - 1)) / MONTH_COUNT);

  trendCtx.clearRect(0, 0, width, height);
  trendHitAreas = [];
  hideTrendTooltip();
  drawTrendGrid(left, top, chartWidth, chartHeight, maxPositive, minNegative, zeroY);

  year.months.forEach((month, monthIndex) => {
    const stack = monthStacks[monthIndex];
    const x = left + monthIndex * (barWidth + gap);
    let positiveY = zeroY;
    let negativeY = zeroY;

    if (monthIndex <= lastUpdatedIndex && (stack.positiveTotal || stack.negativeTotal)) {
      stack.positive.forEach((account) => {
        const value = toNumber(account.valuation);
        const segmentHeight = Math.max(1, (value / range) * chartHeight);
        const percent = stack.grossTotal ? Math.abs(value) / stack.grossTotal : 0;
        positiveY -= segmentHeight;
        trendCtx.fillStyle = colors[getAccountColorIndex(account.name)];
        trendCtx.fillRect(x, positiveY, barWidth, segmentHeight);
        trendHitAreas.push({
          x,
          y: positiveY,
          width: barWidth,
          height: segmentHeight,
          month: month.month,
          accountName: account.name,
          value,
          percent,
        });
        drawStackLabel(x, positiveY, barWidth, segmentHeight, value, percent);
      });

      stack.negative.forEach((account) => {
        const value = toNumber(account.valuation);
        const segmentHeight = Math.max(1, (Math.abs(value) / range) * chartHeight);
        trendCtx.fillStyle = debtColor;
        trendCtx.fillRect(x, negativeY, barWidth, segmentHeight);
        const percent = stack.grossTotal ? Math.abs(value) / stack.grossTotal : 0;
        trendHitAreas.push({
          x,
          y: negativeY,
          width: barWidth,
          height: segmentHeight,
          month: month.month,
          accountName: account.name,
          value,
          percent,
        });
        drawStackLabel(x, negativeY, barWidth, segmentHeight, value, percent);
        negativeY += segmentHeight;
      });

      const netTotal = stack.positiveTotal + stack.negativeTotal;
      trendCtx.fillStyle = netTotal < 0 ? debtColor : "#17211d";
      trendCtx.font = "700 11px Segoe UI, sans-serif";
      trendCtx.textAlign = "center";
      const totalLabelY = stack.positiveTotal > 0 ? Math.max(12, positiveY - 7) : Math.min(height - bottom + 14, negativeY + 13);
      trendCtx.fillText(formatEok(netTotal), x + barWidth / 2, totalLabelY);

      if (monthIndex === activeMonthIndex) {
        const y = Math.min(positiveY, zeroY);
        const h = Math.max(negativeY, zeroY) - y;
        trendCtx.strokeStyle = "#17211d";
        trendCtx.lineWidth = 2;
        trendCtx.strokeRect(x - 2, y - 2, barWidth + 4, h + 4);
      }
    } else {
      trendCtx.fillStyle = "#edf2f0";
      trendCtx.fillRect(x, zeroY - 2, barWidth, 4);
    }

    trendCtx.fillStyle = monthIndex <= lastUpdatedIndex ? "#52615c" : "#a6b1ad";
    trendCtx.font = "12px Segoe UI, sans-serif";
    trendCtx.textAlign = "center";
    trendCtx.fillText(`${month.month}월`, x + barWidth / 2, height - 12);
  });

  const filterLabel = activeTrendAccount === ALL_TREND_ACCOUNTS ? "전체" : activeTrendAccount;
  document.querySelector("#trendCaption").textContent = `${year.year}년 1월~12월, ${filterLabel}, 마지막 업데이트: ${lastUpdatedIndex + 1}월`;
}

function drawTrendGrid(left, top, chartWidth, chartHeight, maxPositive, minNegative, zeroY) {
  trendCtx.strokeStyle = "#dce5e1";
  trendCtx.fillStyle = "#6b7772";
  trendCtx.lineWidth = 1;
  trendCtx.font = "11px Segoe UI, sans-serif";
  trendCtx.textAlign = "right";

  const ticks = [maxPositive, maxPositive / 2, 0, minNegative / 2, minNegative].filter((value, index, list) => index === 0 || Math.abs(value - list[index - 1]) > 1000);
  ticks.forEach((value) => {
    const y = valueToY(value, top, chartHeight, maxPositive, minNegative);
    trendCtx.beginPath();
    trendCtx.moveTo(left, y);
    trendCtx.lineTo(left + chartWidth, y);
    trendCtx.stroke();
    trendCtx.fillText(formatEok(value), left - 6, y + 4);
  });

  trendCtx.strokeStyle = "#7e8a86";
  trendCtx.lineWidth = 1.5;
  trendCtx.beginPath();
  trendCtx.moveTo(left, zeroY);
  trendCtx.lineTo(left + chartWidth, zeroY);
  trendCtx.stroke();
}

function valueToY(value, top, chartHeight, maxPositive, minNegative) {
  const range = maxPositive - minNegative || 1;
  return top + ((maxPositive - value) / range) * chartHeight;
}

function drawStackLabel(x, y, width, height, value, percent) {
  if (height < 28 || width < 32) return;
  const amountLabel = formatEok(value);
  const percentLabel = Number.isFinite(percent) ? `(${Math.round(percent * 100)}%)` : "";
  trendCtx.save();
  trendCtx.beginPath();
  trendCtx.rect(x, y, width, height);
  trendCtx.clip();
  trendCtx.fillStyle = "#ffffff";
  trendCtx.font = height > 42 ? "700 11px Segoe UI, sans-serif" : "700 10px Segoe UI, sans-serif";
  trendCtx.textAlign = "center";
  trendCtx.textBaseline = "middle";
  if (height > 42) {
    trendCtx.fillText(amountLabel, x + width / 2, y + height / 2 - 7);
    trendCtx.fillText(percentLabel, x + width / 2, y + height / 2 + 7);
  } else {
    trendCtx.fillText(percentLabel || amountLabel, x + width / 2, y + height / 2);
  }
  trendCtx.restore();
}

function calculateMonthTotals(month) {
  const principal = month.accounts.reduce((sum, account) => sum + toNumber(account.principal), 0);
  const valuation = month.accounts.reduce((sum, account) => sum + toNumber(account.valuation), 0);
  const cashflow = month.accounts.reduce((sum, account) => sum + toNumber(account.cashflow), 0);
  const profit = valuation - principal;
  return {
    principal,
    valuation,
    cashflow,
    profit,
    returnRate: principal ? profit / principal : 0,
  };
}

function calculateAccountYtd(accountName, monthIndex) {
  return currentYear()
    .months.slice(0, monthIndex + 1)
    .reduce((sum, month) => {
      const account = month.accounts.find((item) => item.name === accountName);
      return sum + (account ? getProfit(account) : 0);
    }, 0);
}

function calculateYtdProfit(monthIndex) {
  return currentYear()
    .months.slice(0, monthIndex + 1)
    .reduce((sum, month) => sum + calculateMonthTotals(month).profit, 0);
}

function getLastUpdatedMonthIndex(year) {
  for (let index = year.months.length - 1; index >= 0; index -= 1) {
    if (year.months[index].accounts.length) return index;
  }
  return 0;
}

function getAccountColorIndex(accountName) {
  const names = getAllAccountNames();
  const index = names.indexOf(accountName);
  return (index < 0 ? 0 : index) % colors.length;
}

function getAllAccountNames() {
  return Array.from(new Set(state.years.flatMap((year) => year.months.flatMap((month) => month.accounts.map((account) => account.name)))));
}

function getTrendAccounts(accounts) {
  if (activeTrendAccount === ALL_TREND_ACCOUNTS) return accounts;
  return accounts.filter((account) => account.name === activeTrendAccount);
}

function showTrendTooltip(event) {
  const rect = trendChart.getBoundingClientRect();
  const scaleX = trendChart.width / rect.width;
  const scaleY = trendChart.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const hit = trendHitAreas.find((area) => x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height);

  if (!hit) {
    hideTrendTooltip();
    return;
  }

  trendTooltip.innerHTML = `
    <strong>${hit.month}월 ${escapeHtml(hit.accountName)}</strong>
    <span>${formatWon(hit.value)}</span>
    <span>비중 (${formatPercent(hit.percent)})</span>
  `;
  trendTooltip.classList.remove("hidden");
  trendTooltip.style.left = `${event.clientX + 14}px`;
  trendTooltip.style.top = `${event.clientY + 14}px`;
}

function hideTrendTooltip() {
  trendTooltip.classList.add("hidden");
}

function showAllocationTooltip(event) {
  const rect = allocationChart.getBoundingClientRect();
  const scaleX = allocationChart.width / rect.width;
  const scaleY = allocationChart.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX - 140;
  const y = (event.clientY - rect.top) * scaleY - 140;
  const distance = Math.sqrt(x * x + y * y);

  if (distance < 64 || distance > 116) {
    hideAllocationTooltip();
    return;
  }

  let angle = Math.atan2(y, x);
  if (angle < -Math.PI / 2) angle += Math.PI * 2;
  const hit = allocationHitAreas.find((area) => angle >= area.start && angle <= area.end);

  if (!hit) {
    hideAllocationTooltip();
    return;
  }

  allocationTooltip.innerHTML = `
    <strong>${escapeHtml(hit.accountName)}</strong>
    <span>${formatWon(hit.value)}</span>
    <span>비중 (${formatPercent(hit.percent)})</span>
  `;
  allocationTooltip.classList.remove("hidden");
  allocationTooltip.style.left = `${event.clientX + 14}px`;
  allocationTooltip.style.top = `${event.clientY + 14}px`;
}

function hideAllocationTooltip() {
  allocationTooltip.classList.add("hidden");
}

function getProfit(account) {
  return toNumber(account.valuation) - toNumber(account.principal);
}

function getReturnRate(account) {
  const principal = toNumber(account.principal);
  return principal ? getProfit(account) / principal : 0;
}

function getSignedClass(value) {
  const number = toNumber(value);
  if (number > 0) return "positive";
  if (number < 0) return "negative";
  return "";
}

function setSignedText(selector, value, text) {
  const element = document.querySelector(selector);
  element.textContent = text;
  element.classList.remove("positive", "negative");
  const className = getSignedClass(value);
  if (className) element.classList.add(className);
}

function getExportRows() {
  const rows = [["연도", "월", "구분", "분류", "원금", "평가금", "평가손익", "수익률", "연간수익", "입출금", "데이터구분"]];
  state.years.forEach((year) => {
    year.months.forEach((month, monthIndex) => {
      month.accounts.forEach((account) => {
        rows.push([
          year.year,
          month.month,
          account.name,
          account.type,
          toNumber(account.principal),
          toNumber(account.valuation),
          getProfit(account),
          getReturnRate(account),
          calculateAccountYtdForYear(year, account.name, monthIndex),
          toNumber(account.cashflow),
          "자산",
        ]);
      });
      const living = {
        ...createEmptyLivingExpenses(),
        ...(month.livingExpenses || {}),
      };
      [
        ["식비", living.food],
        ["생활비", living.living],
        ["기타", living.other],
        ["한국 월수입", living.koreanIncome],
        ["카드값", living.cardPayment],
      ].forEach(([name, value]) => {
        rows.push([year.year, month.month, name, "생활비", 0, toNumber(value), 0, 0, 0, 0, "생활비"]);
      });
    });
  });
  return rows;
}

async function exportCsv() {
  syncVisibleLedgerInputs();
  syncVisibleLivingInputs();
  const rows = getExportRows();
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const suggestedName = `투자_및_자산현황_${timestamp}.csv`;

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "CSV 파일",
            accept: { "text/csv": [".csv"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
}

function saveSheetsUrl() {
  const url = getSheetsUrlFromInput();
  if (!url) {
    setSheetsStatus("Google Apps Script 웹앱 주소를 먼저 입력하세요.");
    return;
  }
  localStorage.setItem(SHEETS_SYNC_URL_KEY, url);
  sheetsUrlInput.value = url;
  setSheetsStatus("웹앱 주소를 저장했습니다.");
}

async function pushToSheets() {
  const url = getSheetsUrl();
  if (!url) return;

  syncVisibleLedgerInputs();
  syncVisibleLivingInputs();
  setSheetsStatus("Google Sheets로 저장하는 중입니다...");
  try {
    const body = new URLSearchParams({
      action: "save",
      payload: JSON.stringify({ rows: getExportRows() }),
    });

    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body,
    });

    setSheetsStatus("저장 요청을 보냈습니다. 다른 기기에서는 '시트에서 불러오기'를 누르세요.");
  } catch (error) {
    setSheetsStatus(`시트 저장 실패: ${error.message}`);
  }
}

async function pullFromSheets() {
  const url = getSheetsUrl();
  if (!url) return;

  setSheetsStatus("Google Sheets에서 불러오는 중입니다...");
  try {
    const result = await loadSheetsRows(url);
    const rows = result.rows || result;
    if (!Array.isArray(rows)) throw new Error("시트 응답에서 행 데이터를 찾지 못했습니다.");

    const imported = stateFromCsv(rows);
    if (!imported.years.length) throw new Error("시트 안에서 불러올 자산 데이터를 찾지 못했습니다.");

    pushUndoState();
    state = imported;
    activeYearIndex = 0;
    activeMonthIndex = getLastUpdatedMonthIndex(currentYear());
    saveAndRender();
    setSheetsStatus("Google Sheets 데이터를 불러왔습니다.");
  } catch (error) {
    setSheetsStatus(`시트 불러오기 실패: ${error.message}`);
  }
}

async function loadSheetsRows(url) {
  const readUrl = addQueryParams(url, { action: "read", t: Date.now() });
  try {
    const response = await fetch(readUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return loadSheetsRowsByJsonp(url);
  }
}

function loadSheetsRowsByJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `receiveSheetsRows_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("응답 시간이 초과되었습니다."));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Google Apps Script 주소를 불러오지 못했습니다."));
    };
    script.src = addQueryParams(url, { action: "read", callback: callbackName, t: Date.now() });
    document.body.appendChild(script);
  });
}

function getSheetsUrl() {
  const url = getSheetsUrlFromInput();
  if (!url) {
    setSheetsStatus("Google Apps Script 웹앱 주소를 먼저 입력하세요.");
    return "";
  }
  localStorage.setItem(SHEETS_SYNC_URL_KEY, url);
  return url;
}

function getSheetsUrlFromInput() {
  return sheetsUrlInput.value.trim();
}

function setSheetsStatus(message) {
  document.querySelector("#sheetsSyncStatus").textContent = message;
}

function addQueryParams(url, params) {
  const parsed = new URL(url);
  Object.entries(params).forEach(([key, value]) => parsed.searchParams.set(key, value));
  return parsed.toString();
}

function syncVisibleLedgerInputs() {
  let changed = false;
  ledgerBody.querySelectorAll("[data-field]").forEach((input) => {
    const account = currentMonth().accounts[Number(input.dataset.index)];
    if (!account) return;

    const field = input.dataset.field;
    const nextValue = field === "name" || field === "type" ? input.value.trim() || account[field] : readInputNumber(input.value);

    if (account[field] !== nextValue) {
      account[field] = nextValue;
      changed = true;
    }
  });

  if (changed) {
    state.activeYearIndex = activeYearIndex;
    state.activeMonthIndex = activeMonthIndex;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
  }
}

function syncVisibleLivingInputs() {
  let changed = false;
  const living = currentLivingExpenses();
  document.querySelectorAll(".living-input").forEach((input) => {
    const field = input.dataset.livingField;
    const nextValue = readInputNumber(input.value);
    if (living[field] !== nextValue) {
      living[field] = nextValue;
      changed = true;
    }
  });

  if (changed) {
    state.activeYearIndex = activeYearIndex;
    state.activeMonthIndex = activeMonthIndex;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
  }
}

function importCsv(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(String(reader.result || ""));
      const imported = stateFromCsv(rows);
      if (!imported.years.length) throw new Error("CSV 안에서 불러올 자산 데이터를 찾지 못했습니다.");
      pushUndoState();
      state = imported;
      activeYearIndex = 0;
      activeMonthIndex = getLastUpdatedMonthIndex(currentYear());
      saveAndRender();
      alert("CSV 복원이 완료되었습니다.");
    } catch (error) {
      alert(`CSV 복원 실패: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function stateFromCsv(rows) {
  const [header, ...dataRows] = rows;
  if (!header) return { activeYearIndex: 0, activeMonthIndex: 0, years: [] };
  const headers = header.map((cell) => cell.replace(/^\uFEFF/, "").trim());
  const column = (name) => headers.indexOf(name);
  const yearCol = column("연도");
  const monthCol = column("월");
  const nameCol = column("구분");
  const typeCol = column("분류");
  const principalCol = column("원금");
  const valuationCol = column("평가금");
  const cashflowCol = column("입출금");
  const dataTypeCol = column("데이터구분");

  if ([yearCol, monthCol, nameCol, typeCol, principalCol, valuationCol, cashflowCol].some((index) => index < 0)) {
    throw new Error("필수 열(연도, 월, 구분, 분류, 원금, 평가금, 입출금)이 필요합니다.");
  }

  const yearsByNumber = new Map();
  dataRows.forEach((row) => {
    const yearNumber = Number(row[yearCol]);
    const monthNumber = Number(row[monthCol]);
    const name = row[nameCol]?.trim();
    if (!yearNumber || !monthNumber || !name) return;

    if (!yearsByNumber.has(yearNumber)) {
      yearsByNumber.set(yearNumber, {
        year: yearNumber,
        months: Array.from({ length: MONTH_COUNT }, (_, index) => ({ month: index + 1, accounts: [] })),
      });
    }

    const year = yearsByNumber.get(yearNumber);
    const month = year.months[Math.min(Math.max(monthNumber, 1), MONTH_COUNT) - 1];
    const dataType = dataTypeCol >= 0 ? row[dataTypeCol]?.trim() : "자산";

    if (dataType === "생활비") {
      month.livingExpenses = {
        ...createEmptyLivingExpenses(),
        ...(month.livingExpenses || {}),
      };
      const field = livingExpenseNameToField(name);
      if (field) month.livingExpenses[field] = readInputNumber(row[valuationCol]);
      return;
    }

    month.accounts.push({
      name,
      type: row[typeCol]?.trim() || "기타",
      principal: readInputNumber(row[principalCol]),
      valuation: readInputNumber(row[valuationCol]),
      cashflow: readInputNumber(row[cashflowCol]),
    });
  });

  const years = Array.from(yearsByNumber.values()).sort((a, b) => a.year - b.year);
  return normalizeState({ activeYearIndex: 0, activeMonthIndex: 0, years });
}

function livingExpenseNameToField(name) {
  return {
    식비: "food",
    생활비: "living",
    기타: "other",
    "한국 월수입": "koreanIncome",
    카드값: "cardPayment",
  }[name];
}

function calculateAccountYtdForYear(year, accountName, monthIndex) {
  return year.months.slice(0, monthIndex + 1).reduce((sum, month) => {
    const account = month.accounts.find((item) => item.name === accountName);
    return sum + (account ? getProfit(account) : 0);
  }, 0);
}

function renderMoneyInputs() {
  document.querySelectorAll(".money-entry").forEach((input) => {
    input.value = input.value ? formatMoneyInput(readInputNumber(input.value)) : "";
  });
}

function readNumber(selector) {
  return readInputNumber(document.querySelector(selector).value);
}

function readInputNumber(value) {
  const normalized = String(value).replaceAll(",", "").replaceAll("₩", "").replaceAll("원", "").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function formatMoneyInput(value) {
  const number = toNumber(value);
  return `₩${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(number)}`;
}

function formatWon(value) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(value);
}

function formatEok(value) {
  const eok = value / 100000000;
  if (Math.abs(eok) >= 10) return `${Math.round(eok)}억`;
  return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(eok)}억`;
}

function formatManwon(value) {
  const manwon = value / 10000;
  if (!value) return "0";
  if (Math.abs(manwon) >= 100) return `${Math.round(manwon)}만`;
  return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(manwon)}만`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ko-KR", { style: "percent", maximumFractionDigits: 2 }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}

render();
