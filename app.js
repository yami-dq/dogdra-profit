const STORAGE_KEY = "dqx-profit-v5";

const state = {
  activeMode: "kisei",

  modes: {
    kisei: {
      label: "輝晶核",
      saleMethod: "bazaar",

      prices: {
        core: 1280000,
        fragment: 15000,
        cell: 103000,
      },

      drops: [],
    },

    senkisei: {
      label: "閃輝晶核",
      saleMethod: "bazaar",

      prices: {
        core: 0,
        fragment: 0,
        cell: 0,
      },

      drops: [],
    },
  },
};

const yen = new Intl.NumberFormat("ja-JP");

function currentMode() {
  return state.modes[state.activeMode];
}

function getFeeRate(mode = currentMode()) {
  return mode.saleMethod === "moomon" ? 1 : 0.95;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);

    if (parsed.activeMode) {
      state.activeMode = parsed.activeMode;
    }

    if (parsed.modes) {
      if (parsed.modes.kisei) {
        state.modes.kisei = {
          ...state.modes.kisei,
          ...parsed.modes.kisei,
          prices: {
            ...state.modes.kisei.prices,
            ...parsed.modes.kisei.prices,
          },
        };
      }

      if (parsed.modes.senkisei) {
        state.modes.senkisei = {
          ...state.modes.senkisei,
          ...parsed.modes.senkisei,
          prices: {
            ...state.modes.senkisei.prices,
            ...parsed.modes.senkisei.prices,
          },
        };
      }
    }
  } catch {}
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setMode(mode) {
  state.activeMode = mode;
  saveState();
  render();
}

function setSaleMethod(method) {
  currentMode().saleMethod = method;
  saveState();
  render();
}

function counts(drops = currentMode().drops) {
  return drops.reduce(
    (acc, drop) => {
      if (drop === "45" || drop === "75" || drop === "core") {
        acc[drop]++;
      }
      return acc;
    },
    { "45": 0, "75": 0, core: 0 }
  );
}

function calcProfit(drops = currentMode().drops, mode = currentMode()) {
  const c = counts(drops);
  const fee = getFeeRate(mode);

  const fragments = c["45"] * 45 + c["75"] * 75;
  const exchanged = Math.floor(fragments / 99);
  const remainder = fragments % 99;
  const battleCount = c["45"] + c["75"] + c.core;

  const coreSales =
    (exchanged + c.core) *
    mode.prices.core *
    fee;

  const remainderSales =
    remainder *
    mode.prices.fragment *
    fee;

  const cost =
    (battleCount / 4) *
    30 *
    mode.prices.cell;

  return coreSales + remainderSales - cost;
}

function metrics() {
  const mode = currentMode();
  const c = counts();

  const fragments = c["45"] * 45 + c["75"] * 75;
  const exchanged = Math.floor(fragments / 99);
  const remainder = fragments % 99;
  const battleCount = c["45"] + c["75"] + c.core;
  const profit = calcProfit();

  const fee = getFeeRate(mode);

  const expectedSalesPerBattle =
    ((54 / 99) + 0.1) *
    mode.prices.core *
    fee;

  const expectedCostPerBattle =
    (30 / 4) *
    mode.prices.cell;

  const expectedPerBattle =
    expectedSalesPerBattle - expectedCostPerBattle;

  const breakEvenCell =
    (expectedSalesPerBattle * 4) / 30;

  return {
    c,
    fragments,
    exchanged,
    remainder,
    battleCount,
    profit,
    breakEvenCell,
    expectedPerBattle,
  };
}

function addDrop(type) {
  currentMode().drops.push(type);
  saveState();
  render();
}

function undoLast() {
  currentMode().drops.pop();
  saveState();
  render();
}

function resetAll() {
  const mode = currentMode();

  if (!confirm(`${mode.label} のログをリセットしますか？`)) return;

  mode.drops = [];
  saveState();
  render();
}

function updatePrices() {
  const mode = currentMode();

  mode.prices.core = Number(document.getElementById("corePrice").value || 0);
  mode.prices.fragment = Number(document.getElementById("fragmentPrice").value || 0);
  mode.prices.cell = Number(document.getElementById("cellPrice").value || 0);

  saveState();
  render();
}

function render() {
  const mode = currentMode();
  const m = metrics();

  document
    .getElementById("modeKisei")
    .classList.toggle("active", state.activeMode === "kisei");

  document
    .getElementById("modeSenkisei")
    .classList.toggle("active", state.activeMode === "senkisei");

  document
    .getElementById("saleBazaar")
    .classList.toggle("active", mode.saleMethod === "bazaar");

  document
    .getElementById("saleMoomon")
    .classList.toggle("active", mode.saleMethod === "moomon");

  document.getElementById("priceTitle").textContent =
    `${mode.label} 価格設定`;

  document.getElementById("summaryTitle").textContent =
    `${mode.label} 現在利益`;

  document.getElementById("corePrice").value = mode.prices.core;
  document.getElementById("fragmentPrice").value = mode.prices.fragment;
  document.getElementById("cellPrice").value = mode.prices.cell;

  const profitEl = document.getElementById("profit");
  profitEl.textContent = `${yen.format(Math.round(m.profit))} G`;

  profitEl.classList.remove("plus", "minus");
  profitEl.classList.add(m.profit >= 0 ? "plus" : "minus");

  document.getElementById("battleCount").textContent =
    yen.format(m.battleCount);

  document.getElementById("personalBattleCount").textContent =
    yen.format(m.battleCount / 4);

  document.getElementById("fragmentTotal").textContent =
    yen.format(m.fragments);

  document.getElementById("exchangeInfo").textContent =
    `${yen.format(m.exchanged)} / ${yen.format(m.remainder)}`;

  document.getElementById("breakEvenCell").textContent =
    `${yen.format(Math.floor(m.breakEvenCell))} G`;

  document.getElementById("expectedPerBattle").textContent =
    `${yen.format(Math.round(m.expectedPerBattle))} G`;

  document.getElementById("count45").textContent =
    yen.format(m.c["45"]);

  document.getElementById("count75").textContent =
    yen.format(m.c["75"]);

  document.getElementById("countCore").textContent =
    yen.format(m.c.core);

  renderHistory();
  drawProfitChart();
  drawRatioChart();
}

function renderHistory() {
  const mode = currentMode();
  const box = document.getElementById("historyTable");

  if (mode.drops.length === 0) {
    box.innerHTML = `<div class="empty">まだログがありません</div>`;
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>戦数</th>
          <th>結果</th>
          <th>累積利益</th>
        </tr>
      </thead>
      <tbody>
  `;

  mode.drops.forEach((drop, i) => {
    const label = drop === "core" ? "核" : `${drop}個`;
    const profit = calcProfit(mode.drops.slice(0, i + 1), mode);

    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${label}</td>
        <td>${yen.format(Math.round(profit))} G</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  box.innerHTML = html;
}

function drawProfitChart() {
  const mode = currentMode();
  const canvas = document.getElementById("profitChart");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const data = mode.drops.map((_, i) =>
    calcProfit(mode.drops.slice(0, i + 1), mode)
  );

  if (!data.length) {
    drawEmptyChart(ctx, canvas.width, canvas.height, "ログを入力すると表示されます");
    return;
  }

  const min = Math.min(...data, 0);
  const max = Math.max(...data, 0);
  const range = max - min || 1;

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = 40 + i * 55;
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(560, y);
    ctx.stroke();
  }

  const zeroY = 260 - ((0 - min) / range) * 220;

  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.moveTo(40, zeroY);
  ctx.lineTo(560, zeroY);
  ctx.stroke();

  ctx.strokeStyle = "#36d399";
  ctx.lineWidth = 4;
  ctx.beginPath();

  data.forEach((v, i) => {
    const x =
      40 +
      (i / Math.max(data.length - 1, 1)) *
      520;

    const y =
      260 -
      ((v - min) / range) *
      220;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.fillStyle = "#f5f7fa";
  ctx.font = "16px system-ui";
  ctx.fillText(`${yen.format(Math.round(max))}G`, 44, 28);
  ctx.fillText(`${yen.format(Math.round(min))}G`, 44, 292);
}

function drawRatioChart() {
  const canvas = document.getElementById("ratioChart");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const c = counts();
  const values = [c["45"], c["75"], c.core];
  const labels = ["45個", "75個", "核"];
  const colors = ["#2b6cb0", "#f59e0b", "#b8860b"];
  const total = values.reduce((a, b) => a + b, 0);

  if (!total) {
    drawEmptyChart(ctx, canvas.width, canvas.height, "ログを入力すると表示されます");
    return;
  }

  let start = -Math.PI / 2;

  values.forEach((v, i) => {
    const angle = (v / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(300, 130);
    ctx.arc(300, 130, 95, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();

    start += angle;
  });

  labels.forEach((label, i) => {
    const x = 95 + i * 145;
    const y = 270;
    const percent = Math.round((values[i] / total) * 100);

    ctx.fillStyle = colors[i];
    ctx.fillRect(x, y - 14, 14, 14);

    ctx.fillStyle = "#f5f7fa";
    ctx.font = "16px system-ui";
    ctx.fillText(`${label} ${percent}%`, x + 22, y);
  });
}

function drawEmptyChart(ctx, width, height, text) {
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "22px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2);
  ctx.textAlign = "left";
}

document.getElementById("corePrice").addEventListener("input", updatePrices);
document.getElementById("fragmentPrice").addEventListener("input", updatePrices);
document.getElementById("cellPrice").addEventListener("input", updatePrices);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

loadState();
render();