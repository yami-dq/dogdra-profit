const STORAGE_KEY = "dqx-profit-v4";

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

function feeRate() {
  return currentMode().saleMethod === "moomon" ? 1 : 0.95;
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
      Object.assign(state.modes, parsed.modes);
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
      acc[drop]++;
      return acc;
    },
    { "45": 0, "75": 0, core: 0 }
  );
}

function calcProfit(drops = currentMode().drops) {
  const mode = currentMode();

  const c = counts(drops);

  const fragments =
    c["45"] * 45 +
    c["75"] * 75;

  const exchanged = Math.floor(fragments / 99);

  const remainder = fragments % 99;

  const battleCount =
    c["45"] +
    c["75"] +
    c.core;

  const sales =
    (exchanged + c.core) *
      mode.prices.core *
      feeRate() +

    remainder *
      mode.prices.fragment *
      feeRate();

  const cost =
    (battleCount / 4) *
    30 *
    mode.prices.cell;

  return sales - cost;
}

function metrics() {
  const mode = currentMode();

  const c = counts();

  const fragments =
    c["45"] * 45 +
    c["75"] * 75;

  const exchanged =
    Math.floor(fragments / 99);

  const remainder =
    fragments % 99;

  const battleCount =
    c["45"] +
    c["75"] +
    c.core;

  const profit = calcProfit();

  const breakEvenCell =
    ((((54 / 99) + 0.1) *
      mode.prices.core *
      feeRate()) * 4) / 30;

  const expectedPerBattle =
    (((54 / 99) + 0.1) *
      mode.prices.core *
      feeRate()) -

    (30 / 4) *
      mode.prices.cell;

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

  if (
    !confirm(
      `${mode.label} のログをリセットしますか？`
    )
  ) {
    return;
  }

  mode.drops = [];

  saveState();
  render();
}

function updatePrices() {
  const mode = currentMode();

  mode.prices.core =
    Number(document.getElementById("corePrice").value || 0);

  mode.prices.fragment =
    Number(document.getElementById("fragmentPrice").value || 0);

  mode.prices.cell =
    Number(document.getElementById("cellPrice").value || 0);

  saveState();
  render();
}

function render() {
  const mode = currentMode();

  const m = metrics();

  document
    .getElementById("modeKisei")
    .classList.toggle(
      "active",
      state.activeMode === "kisei"
    );

  document
    .getElementById("modeSenkisei")
    .classList.toggle(
      "active",
      state.activeMode === "senkisei"
    );

  document
    .getElementById("saleBazaar")
    .classList.toggle(
      "active",
      mode.saleMethod === "bazaar"
    );

  document
    .getElementById("saleMoomon")
    .classList.toggle(
      "active",
      mode.saleMethod === "moomon"
    );

  document.getElementById(
    "priceTitle"
  ).textContent =
    `${mode.label} 価格設定`;

  document.getElementById(
    "summaryTitle"
  ).textContent =
    `${mode.label} 現在利益`;

  document.getElementById(
    "corePrice"
  ).value =
    mode.prices.core;

  document.getElementById(
    "fragmentPrice"
  ).value =
    mode.prices.fragment;

  document.getElementById(
    "cellPrice"
  ).value =
    mode.prices.cell;

  const profitEl =
    document.getElementById("profit");

  profitEl.textContent =
    `${yen.format(Math.round(m.profit))} G`;

  profitEl.classList.remove(
    "plus",
    "minus"
  );

  profitEl.classList.add(
    m.profit >= 0 ? "plus" : "minus"
  );

  document.getElementById(
    "battleCount"
  ).textContent =
    yen.format(m.battleCount);

  document.getElementById(
    "personalBattleCount"
  ).textContent =
    m.battleCount / 4;

  document.getElementById(
    "fragmentTotal"
  ).textContent =
    yen.format(m.fragments);

  document.getElementById(
    "exchangeInfo"
  ).textContent =
    `${m.exchanged} / ${m.remainder}`;

  document.getElementById(
    "breakEvenCell"
  ).textContent =
    `${yen.format(
      Math.floor(m.breakEvenCell)
    )} G`;

  document.getElementById(
    "expectedPerBattle"
  ).textContent =
    `${yen.format(
      Math.round(m.expectedPerBattle)
    )} G`;

  document.getElementById(
    "count45"
  ).textContent =
    m.c["45"];

  document.getElementById(
    "count75"
  ).textContent =
    m.c["75"];

  document.getElementById(
    "countCore"
  ).textContent =
    m.c.core;

  renderHistory();
}

function renderHistory() {
  const mode = currentMode();

  const box =
    document.getElementById(
      "historyTable"
    );

  if (mode.drops.length === 0) {
    box.innerHTML =
      `<div class="empty">まだログがありません</div>`;

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
    const label =
      drop === "core"
        ? "核"
        : `${drop}個`;

    const profit =
      calcProfit(
        mode.drops.slice(0, i + 1)
      );

    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${label}</td>
        <td>${yen.format(
          Math.round(profit)
        )} G</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  box.innerHTML = html;
}

document
  .getElementById("corePrice")
  .addEventListener(
    "input",
    updatePrices
  );

document
  .getElementById("fragmentPrice")
  .addEventListener(
    "input",
    updatePrices
  );

document
  .getElementById("cellPrice")
  .addEventListener(
    "input",
    updatePrices
  );

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(
      "./service-worker.js"
    );
  });
}

loadState();
render();