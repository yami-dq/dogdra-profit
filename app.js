const STORAGE_KEY = "dogdra-profit-v1";

const state = {
  prices: {
    core: 1280000,
    fragment: 15000,
    cell: 103000,
  },
  drops: [],
};

const yen = new Intl.NumberFormat("ja-JP");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    if (parsed.prices) state.prices = parsed.prices;
    if (Array.isArray(parsed.drops)) state.drops = parsed.drops;
  } catch {}
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function counts() {
  return state.drops.reduce(
    (acc, drop) => {
      acc[drop]++;
      return acc;
    },
    { "45": 0, "75": 0, core: 0 }
  );
}

function calcProfit(drops) {
  const c = drops.reduce(
    (acc, drop) => {
      acc[drop]++;
      return acc;
    },
    { "45": 0, "75": 0, core: 0 }
  );

  const fragments = c["45"] * 45 + c["75"] * 75;
  const exchanged = Math.floor(fragments / 99);
  const remainder = fragments % 99;
  const battleCount = c["45"] + c["75"] + c.core;

  const sales =
    (exchanged + c.core) * state.prices.core * 0.95 +
    remainder * state.prices.fragment * 0.95;

  const cost = (battleCount / 4) * 30 * state.prices.cell;

  return sales - cost;
}

function metrics() {
  const c = counts();

  const fragments = c["45"] * 45 + c["75"] * 75;
  const exchanged = Math.floor(fragments / 99);
  const remainder = fragments % 99;
  const battleCount = c["45"] + c["75"] + c.core;
  const profit = calcProfit(state.drops);

  const breakEvenCell =
    ((((54 / 99) + 0.1) * state.prices.core * 0.95) * 4) / 30;

  const expectedPerBattle =
    (((54 / 99) + 0.1) * state.prices.core * 0.95) -
      (30 / 4) * state.prices.cell;

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
  state.drops.push(type);
  saveState();
  render();
}

function undoLast() {
  state.drops.pop();
  saveState();
  render();
}

function resetAll() {
  if (!confirm("本当にリセットしますか？")) return;
  state.drops = [];
  saveState();
  render();
}

function updatePrices() {
  state.prices.core = Number(document.getElementById("corePrice").value || 0);
  state.prices.fragment = Number(document.getElementById("fragmentPrice").value || 0);
  state.prices.cell = Number(document.getElementById("cellPrice").value || 0);

  saveState();
  render();
}

function render() {
  document.getElementById("corePrice").value = state.prices.core;
  document.getElementById("fragmentPrice").value = state.prices.fragment;
  document.getElementById("cellPrice").value = state.prices.cell;

  const m = metrics();

  const profitEl = document.getElementById("profit");
  profitEl.textContent = `${yen.format(Math.round(m.profit))} G`;

  profitEl.classList.remove("plus", "minus");
  profitEl.classList.add(m.profit >= 0 ? "plus" : "minus");

  document.getElementById("battleCount").textContent = yen.format(m.battleCount);
  document.getElementById("personalBattleCount").textContent = m.battleCount / 4;
  document.getElementById("fragmentTotal").textContent = yen.format(m.fragments);
  document.getElementById("exchangeInfo").textContent =
    `${m.exchanged} / ${m.remainder}`;

  document.getElementById("breakEvenCell").textContent =
    `${yen.format(Math.floor(m.breakEvenCell))} G`;

  document.getElementById("expectedPerBattle").textContent =
    `${yen.format(Math.round(m.expectedPerBattle))} G`;

  document.getElementById("count45").textContent = m.c["45"];
  document.getElementById("count75").textContent = m.c["75"];
  document.getElementById("countCore").textContent = m.c.core;

  renderHistory();
  drawProfitChart();
  drawRatioChart();
}

function renderHistory() {
  const box = document.getElementById("historyTable");

  if (state.drops.length === 0) {
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

  state.drops.forEach((drop, i) => {
    const label = drop === "core" ? "核" : `${drop}個`;
    const profit = calcProfit(state.drops.slice(0, i + 1));

    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${label}</td>
        <td>${yen.format(Math.round(profit))} G</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  box.innerHTML = html;
}

function drawProfitChart() {
  const canvas = document.getElementById("profitChart");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const data = state.drops.map((_, i) =>
    calcProfit(state.drops.slice(0, i + 1))
  );

  if (!data.length) return;

  const min = Math.min(...data, 0);
  const max = Math.max(...data, 0);
  const range = max - min || 1;

  ctx.strokeStyle = "#36d399";
  ctx.lineWidth = 4;
  ctx.beginPath();

  data.forEach((v, i) => {
    const x = 40 + (i / Math.max(data.length - 1, 1)) * 520;
    const y = 260 - ((v - min) / range) * 220;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

function drawRatioChart() {
  const canvas = document.getElementById("ratioChart");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const c = counts();
  const values = [c["45"], c["75"], c.core];
  const colors = ["#2b6cb0", "#f59e0b", "#b8860b"];
  const total = values.reduce((a, b) => a + b, 0);

  if (!total) return;

  let start = -Math.PI / 2;

  values.forEach((v, i) => {
    const angle = (v / total) * Math.PI * 2;

    ctx.beginPath();
    ctx.moveTo(300, 150);
    ctx.arc(300, 150, 100, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[i];
    ctx.fill();

    start += angle;
  });
}

document.getElementById("corePrice").addEventListener("input", updatePrices);
document.getElementById("fragmentPrice").addEventListener("input", updatePrices);
document.getElementById("cellPrice").addEventListener("input", updatePrices);

loadState();
render();
