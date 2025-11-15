// ===== CONFIG =====
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw7kv8ydTrxlgWTaEJhcqa5qoss4TEHh-ElVgQr4xrV38QKPwvCnCdyLHKIbeFIMk0VKw/exec";

// ===== BOOTSTRAP =====
document.addEventListener("DOMContentLoaded", () => {
  try {
    const app = document.getElementById("app");
    if (!app) {
      alert("Error: #app container not found in HTML");
      return;
    }
    initApp(app);
  } catch (e) {
    alert("Error initializing app:\n" + (e.message || e));
  }
});

async function initApp(app) {
  app.innerHTML = "<div class='ah-loading'>Loading…</div>";
  try {
    const data = await loadData();
    renderApp(app, data);
  } catch (e) {
    app.innerHTML = "<div class='ah-error'>Error loading data</div>";
    alert("Error loading:\n" + (e.message || "Load failed"));
  }
}

// ===== API =====
async function loadData() {
  const url = `${SCRIPT_URL}?endpoint=widget&ts=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Bad JSON");
  return json;
}

async function toggleHabitRemote(habit, currentDone) {
  const desired = !currentDone;
  const body = new URLSearchParams();
  body.set("endpoint", "toggle");
  body.set("habit", habit);
  body.set("done", desired ? "1" : "0");

  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body
    // без headers → нет CORS preflight, Apps Script спокойно принимает
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Save failed");

  return desired;
}

// ===== RENDER =====
function renderApp(app, data) {
  app.innerHTML = "";

  const container = document.createElement("div");
  container.className = "ah-widget";

  // header
  const header = document.createElement("div");
  header.className = "ah-header";
  header.textContent = "• calm heart · bright mind •";
  container.appendChild(header);

  // body
  const body = document.createElement("div");
  body.className = "ah-body";

  const items = Array.isArray(data.items) ? data.items.slice(0, 8) : [];
  items.forEach(item => {
    body.appendChild(makeRow(item));
  });
  // заполняем до 8 строк точками
  for (let i = items.length; i < 8; i++) {
    const row = document.createElement("div");
    row.className = "ah-row ah-row-empty";
    row.textContent = "·";
    body.appendChild(row);
  }

  container.appendChild(body);

  // footer
  const footer = document.createElement("div");
  footer.className = "ah-footer";

  const total = Number(data?.totals?.totalDone ?? 0);
  const pct   = Number(data?.totals?.weeklyPercent ?? 0);
  const xp    = Number(data?.totals?.xpWeek ?? 0);

  footer.appendChild(makeFooterChip(`✨ ${pct}%`));
  footer.appendChild(makeFooterSep());
  footer.appendChild(makeFooterChip(`Σ ${total}`));
  footer.appendChild(makeFooterSep());
  footer.appendChild(makeFooterChip(`⭐ ${xp >= 0 ? "+" + xp : String(xp)}`));

  footer.appendChild(makeFooterSep());
  const stamp = data?.updatedAt ? new Date(data.updatedAt) : new Date();
  const hh = String(stamp.getHours()).padStart(2, "0");
  const mm = String(stamp.getMinutes()).padStart(2, "0");
  footer.appendChild(makeFooterChip(`${hh}:${mm}`));

  container.appendChild(footer);

  app.appendChild(container);

  // подвешиваем обработчики
  wireRowHandlers(body, items);
}

function makeRow(item) {
  const row = document.createElement("div");
  row.className = "ah-row";

  const leftBtn = document.createElement("button");
  leftBtn.className = "ah-dot";
  leftBtn.type = "button";
  leftBtn.textContent = item.doneToday ? "🟢" : "⚫️";

  const title = document.createElement("div");
  title.className = "ah-title";
  title.textContent = item.habit;

  const right = document.createElement("div");
  right.className = "ah-progress";
  right.textContent = item.progress || "";

  // цвет прогресса для weekly
  const type = String(item.type || "");
  if (/^weekly/i.test(type)) {
    const col = (item.weeklyColor || "").trim();
    if (col) right.style.color = col;
  } else if (/^fixed/i.test(type)) {
    right.style.color = item.doneToday ? "#ffffff" : "#888888";
  } else {
    right.style.color = "#888888";
  }

  row.appendChild(leftBtn);
  row.appendChild(title);
  row.appendChild(right);

  // сохраняем мету
  row.dataset.habit = item.habit;
  row.dataset.done = item.doneToday ? "1" : "0";

  return row;
}

function wireRowHandlers(bodyEl, items) {
  const rows = Array.from(bodyEl.querySelectorAll(".ah-row"));
  rows.forEach(row => {
    const habit = row.dataset.habit;
    if (!habit) return;

    const btn = row.querySelector(".ah-dot");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const currentDone = row.dataset.done === "1";
      try {
        btn.disabled = true;
        const newDone = await toggleHabitRemote(habit, currentDone);
        // Обновим весь виджет, чтобы всё пересчиталось
        const app = document.getElementById("app");
        if (!app) return;
        const data = await loadData();
        renderApp(app, data);
      } catch (e) {
        alert("Error saving:\n" + (e.message || "Load failed"));
      } finally {
        btn.disabled = false;
      }
    });
  });
}

// footer helpers
function makeFooterChip(text) {
  const span = document.createElement("span");
  span.className = "ah-footer-chip";
  span.textContent = text;
  return span;
}
function makeFooterSep() {
  const span = document.createElement("span");
  span.className = "ah-footer-sep";
  span.textContent = " • ";
  return span;
}
