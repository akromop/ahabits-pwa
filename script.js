/*********************************************************
 * A.Habits — Web widget view for Alexandra (read/write)
 * - GET  ?endpoint=widget   → список привычек + итог
 * - POST ?endpoint=checkin  → {habit, done} toggle
 **********************************************************/

// URL твоего Web App (тот же, что в Scriptable FALLBACK_URL)
const API_BASE = "https://script.google.com/macros/s/AKfycbw7kv8ydTrxlgWTaEJhcqa5qoss4TEHh-ElVgQr4xrV38QKPwvCnCdyLHKIbeFIMk0VKw/exec";

// ==== DOM refs ====
const listEl   = document.getElementById("habits-list");
const statusEl = document.getElementById("status");
const pctEl    = document.getElementById("footer-pct");
const sumEl    = document.getElementById("footer-sum");
const xpEl     = document.getElementById("footer-xp");
const timeEl   = document.getElementById("footer-time");

// ==== Helpers ====
function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("error", !!isError);
}

function formatTimeFromIso(iso) {
  try {
    const d = iso ? new Date(iso) : new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

// ==== API calls ====
async function loadHabits() {
  setStatus("Updating…", false);
  try {
    const url = `${API_BASE}?endpoint=widget&ts=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    renderAll(data);
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus("Error loading data", true);
  }
}

async function toggleHabit(habit, currentDone) {
  try {
    setStatus("Saving…", false);
    const url = `${API_BASE}?endpoint=checkin`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit, done: !currentDone }),
    });
    await loadHabits();
  } catch (err) {
    console.error(err);
    setStatus("Error saving", true);
  }
}

// ==== Rendering ====
function renderAll(data) {
  const ok     = !!data?.ok;
  const items  = ok && Array.isArray(data.items) ? data.items.slice(0, 8) : [];
  const totals = data?.totals || {};
  const updatedAt = data?.updatedAt;

  renderList(items);
  renderFooter(totals, updatedAt);
}

function renderList(items) {
  listEl.innerHTML = "";

  // Если ничего не пришло — просто 8 плейсхолдеров
  if (!items.length) {
    for (let i = 0; i < 8; i++) {
      const row = document.createElement("div");
      row.className = "habit-row";
      const t = document.createElement("div");
      t.className = "placeholder";
      t.textContent = "  ·";
      row.appendChild(t);
      listEl.appendChild(row);
    }
    return;
  }

  // Рисуем до 8 строк, остальные игнорируем
  for (let i = 0; i < 8; i++) {
    const it = items[i];

    const row = document.createElement("div");
    row.className = "habit-row";

    if (!it) {
      const t = document.createElement("div");
      t.className = "placeholder";
      t.textContent = "  ·";
      row.appendChild(t);
      listEl.appendChild(row);
      continue;
    }

    const type      = String(it.type || "");
    const doneToday = !!it.doneToday;
    const dueToday  = !!it.dueToday;
    const habitName = String(it.habit || "");
    const progress  = String(it.progress || "");
    const weeklyColor = String(it.weeklyColor || "").trim();

    // Левая кнопка (иконка done/not)
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "habit-toggle " + (doneToday ? "done" : "not-done");

    let icon = "⚫️";
    if (/^daily/i.test(type) || /^weekly/i.test(type)) {
      icon = doneToday ? "🟢" : "⚫️";
    } else if (/^fixed/i.test(type)) {
      icon = dueToday ? (doneToday ? "🟢" : "⚫️") : "➖";
    }
    btn.textContent = icon;

    btn.addEventListener("click", () => {
      // Только если реально actionable, как в виджете
      if (/^fixed/i.test(type) && !dueToday) return;
      toggleHabit(habitName, doneToday);
    });

    // Центр — текст привычки
    const main = document.createElement("div");
    main.className = "habit-main";

    const label = document.createElement("div");
    label.className = "habit-label" + (doneToday ? " done" : "");
    label.textContent = habitName;
    main.appendChild(label);

    // Правый блок — плитка прогресса
    const rightWrap = document.createElement("div");
    rightWrap.className = "habit-right";

    const progEl = document.createElement("span");
    progEl.textContent = progress;

    if (/^weekly/i.test(type)) {
      if (weeklyColor) {
        progEl.style.color = weeklyColor;
      } else {
        progEl.style.color = "#888888";
      }
    } else if (/^fixed/i.test(type)) {
      progEl.style.color = doneToday ? "#ffffff" : "#888888";
    } else {
      // DAILY
      progEl.style.color = "#888888";
    }

    rightWrap.appendChild(progEl);

    row.appendChild(btn);
    row.appendChild(main);
    row.appendChild(rightWrap);

    listEl.appendChild(row);
  }
}

function renderFooter(totals, updatedAt) {
  const totalDone     = Number(totals?.totalDone ?? 0);
  const weeklyPercent = Number(totals?.weeklyPercent ?? 0);
  const xpWeek        = Number(totals?.xpWeek ?? 0);

  if (pctEl) {
    pctEl.textContent = `✨ ${weeklyPercent}%`;
  }

  if (sumEl) {
    sumEl.textContent = `Σ ${totalDone}`;
  }

  if (xpEl) {
    const txt = xpWeek >= 0 ? `⭐ +${xpWeek}` : `⭐ ${xpWeek}`;
    xpEl.textContent = txt;
    xpEl.classList.toggle("positive", xpWeek > 0);
  }

  if (timeEl) {
    const t = typeof updatedAt === "string" ? formatTimeFromIso(updatedAt) : formatTimeFromIso();
    timeEl.textContent = t || "";
  }
}

// ==== Init ====
document.addEventListener("DOMContentLoaded", () => {
  loadHabits();
});
