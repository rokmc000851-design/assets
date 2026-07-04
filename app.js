const STORAGE_KEY = "portfolio-ledger-yearly-v3";
const SHEETS_SYNC_URL_KEY = "portfolio-ledger-sheets-web-app-url";
const MONTH_COUNT = 12;
const accountTypes = ["투자", "현금", "연금", "코인", "보험", "부채", "기타"];
const colors = ["#24765a", "#3b73a3", "#d59b2f", "#c25f4f", "#6d63a6", "#4d8e86", "#8b7355", "#9a4f68"];
const debtColor = "#b85a4b";

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

const yearTabs = document.querySelector("#yearTabs");
const monthTabs = document.querySelector("#monthTabs");
const ledgerBody = document.querySelector("#ledgerBody");
const allocationChart = document.querySelector("#allocationChart");
const trendChart = document.querySelector("#trendChart");
const allocationCtx = allocationChart.getContext("2d");
const trendCtx = trendChart.getContext("2d");

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

document.querySelector("#backupCsvBtn").addEventListener("click", exportCsv);
document.querySelector("#undoBtn").addEventListener("click", undoLastChange);
document.querySelector("#restoreCsvInput").addEventListener("change", importCsv);
document.querySelector("#saveSheetsUrlBtn").addEventListener("click", saveSheetsUrl);
document.querySelector("#pullSheetsBtn").addEventListener("click", pullFromSheets);
document.querySelector("#pushSheetsBtn").addEventListener("click", pushToSheets);

const sheetsUrlInput = document.querySelector("#sheetsWebAppUrl");
sheetsUrlInput.value = localStorage.getItem(SHEETS_SYNC_URL_KEY) || "";

document.querySelectorAll(".money-entry").forEach((input) => {
  input.addEventListener("blur", () => {
    input.value = formatMoneyInput(readInputNumber(input.value));
  });
  input.addEventListener("focus", () => {
    input.value = String(readInputNumber(input.value) || "");
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
    if (saved?.years?.length) return saved;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
  return createDefaultState();
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

function render() {
  renderYearTabs();
  renderMonthTabs();
  renderSummary();
  renderLedger();
  renderAllocationChart();
  renderTrendChart();
}

function renderYearTabs() {
  document.querySelector("#yearEyebrow").textContent = `${currentYear().year} Portfolio Ledger`;
  yearTabs.innerHTML = state.years
    .map(
      (year, index) => `
        <button class="year-tab ${index === activeYearIndex ? "active" : ""}" type="button" data-year-index="${index}">
          ${year.year}년
        </button>
      `
    )
    .join("");

  yearTabs.querySelectorAll("[data-year-index]").forEach((button) => {
    button.addEventListener("click", () => {
      activeYearIndex = Number(button.dataset.yearIndex);
      activeMonthIndex = Math.min(getLastUpdatedMonthIndex(currentYear()), MONTH_COUNT - 1);
      saveAndRender();
    });
  });
}

function renderMonthTabs() {
  const lastUpdatedIndex = getLastUpdatedMonthIndex(currentYear());
  monthTabs.innerHTML = currentYear().months
    .map((month, index) => {
      const status = index <= lastUpdatedIndex ? "" : "future";
      return `
        <button class="month-tab ${index === activeMonthIndex ? "active" : ""} ${status}" type="button" data-month-index="${index}">
          ${month.month}월
        </button>
      `;
    })
    .join("");

  monthTabs.querySelectorAll("[data-month-index]").forEach((button) => {
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
  document.querySelector("#totalProfit").textContent = formatWon(totals.profit);
  document.querySelector("#totalReturn").textContent = formatPercent(totals.returnRate);
  document.querySelector("#ytdProfit").textContent = formatWon(calculateYtdProfit(activeMonthIndex));
  document.querySelector("#cashflowTotal").textContent = formatWon(totals.cashflow);
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
            <td class="amount ${profit < 0 ? "negative" : "positive"}">${formatWon(profit)}</td>
            <td class="amount ${rate < 0 ? "negative" : "positive"}">${formatPercent(rate)}</td>
            <td class="amount ${ytd < 0 ? "negative" : "positive"}">${formatWon(ytd)}</td>
            <td><input class="number-input money-input" data-field="cashflow" data-index="${index}" type="text" inputmode="numeric" value="${formatMoneyInput(account.cashflow)}" aria-label="입출금" /></td>
            <td><button class="delete-button" type="button" data-delete-index="${index}" title="삭제" aria-label="삭제">×</button></td>
          </tr>
        `;
      })
      .join("");
  }

  const totals = calculateMonthTotals(month);
  document.querySelector("#footerPrincipal").textContent = formatWon(totals.principal);
  document.querySelector("#footerValuation").textContent = formatWon(totals.valuation);
  document.querySelector("#footerProfit").textContent = formatWon(totals.profit);
  document.querySelector("#footerReturn").textContent = formatPercent(totals.returnRate);
  document.querySelector("#footerYtd").textContent = formatWon(calculateYtdProfit(activeMonthIndex));
  document.querySelector("#footerCashflow").textContent = formatWon(totals.cashflow);
}

function renderAllocationChart() {
  const entries = currentMonth().accounts.filter((account) => toNumber(account.valuation) > 0);
  const total = entries.reduce((sum, account) => sum + toNumber(account.valuation), 0);
  allocationCtx.clearRect(0, 0, allocationChart.width, allocationChart.height);

  if (!total) {
    document.querySelector("#allocationLegend").innerHTML = '<span class="subtle">표시할 평가금이 없습니다.</span>';
    return;
  }

  let start = -Math.PI / 2;
  entries.forEach((account) => {
    const slice = (toNumber(account.valuation) / total) * Math.PI * 2;
    allocationCtx.beginPath();
    allocationCtx.moveTo(140, 140);
    allocationCtx.arc(140, 140, 116, start, start + slice);
    allocationCtx.closePath();
    allocationCtx.fillStyle = colors[getAccountColorIndex(account.name)];
    allocationCtx.fill();
    start += slice;
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
          <span class="swatch" style="background:${colors[getAccountColorIndex(account.name)]}"></span>
          <span>${escapeHtml(account.name)} ${formatEok(toNumber(account.valuation))} ${formatPercent(toNumber(account.valuation) / total)}</span>
        </div>
      `
    )
    .join("");
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
    const accounts = index <= lastUpdatedIndex ? month.accounts : [];
    const positive = accounts.filter((account) => toNumber(account.valuation) > 0);
    const negative = accounts.filter((account) => toNumber(account.valuation) < 0);
    return {
      positive,
      negative,
      positiveTotal: positive.reduce((sum, account) => sum + toNumber(account.valuation), 0),
      negativeTotal: negative.reduce((sum, account) => sum + toNumber(account.valuation), 0),
    };
  });
  const maxPositive = Math.max(...monthStacks.map((stack) => stack.positiveTotal), 1);
  const minNegative = Math.min(...monthStacks.map((stack) => stack.negativeTotal), 0);
  const range = maxPositive - minNegative || 1;
  const zeroY = top + (maxPositive / range) * chartHeight;
  const gap = 8;
  const barWidth = Math.max(28, (chartWidth - gap * (MONTH_COUNT - 1)) / MONTH_COUNT);

  trendCtx.clearRect(0, 0, width, height);
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
        const percent = value / stack.positiveTotal;
        positiveY -= segmentHeight;
        trendCtx.fillStyle = colors[getAccountColorIndex(account.name)];
        trendCtx.fillRect(x, positiveY, barWidth, segmentHeight);
        drawStackLabel(x, positiveY, barWidth, segmentHeight, value, percent);
      });

      stack.negative.forEach((account) => {
        const value = toNumber(account.valuation);
        const segmentHeight = Math.max(1, (Math.abs(value) / range) * chartHeight);
        trendCtx.fillStyle = debtColor;
        trendCtx.fillRect(x, negativeY, barWidth, segmentHeight);
        drawStackLabel(x, negativeY, barWidth, segmentHeight, value, value / stack.positiveTotal);
        negativeY += segmentHeight;
      });

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

  document.querySelector("#trendCaption").textContent = `${year.year}년 1월~12월, 마지막 업데이트: ${lastUpdatedIndex + 1}월`;
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
  const percentLabel = Number.isFinite(percent) ? `${Math.round(percent * 100)}%` : "";
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
  const names = Array.from(new Set(state.years.flatMap((year) => year.months.flatMap((month) => month.accounts.map((account) => account.name)))));
  const index = names.indexOf(accountName);
  return (index < 0 ? 0 : index) % colors.length;
}

function getProfit(account) {
  return toNumber(account.valuation) - toNumber(account.principal);
}

function getReturnRate(account) {
  const principal = toNumber(account.principal);
  return principal ? getProfit(account) / principal : 0;
}

function getExportRows() {
  const rows = [["연도", "월", "구분", "분류", "원금", "평가금", "평가손익", "수익률", "연간수익", "입출금"]];
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
        ]);
      });
    });
  });
  return rows;
}

async function exportCsv() {
  syncVisibleLedgerInputs();
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
    month.accounts.push({
      name,
      type: row[typeCol]?.trim() || "기타",
      principal: readInputNumber(row[principalCol]),
      valuation: readInputNumber(row[valuationCol]),
      cashflow: readInputNumber(row[cashflowCol]),
    });
  });

  const years = Array.from(yearsByNumber.values()).sort((a, b) => a.year - b.year);
  return { activeYearIndex: 0, activeMonthIndex: 0, years };
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
