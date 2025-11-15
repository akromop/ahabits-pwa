// ===================== CONFIG =====================
const API_URL = "https://script.google.com/macros/s/AKfycbw7kv8ydTrxlgWTaEJhcqa5qoss4TEHh-ElVgQr4xrV38QKPwvCnCdyLHKIbeFIMk0VKw/exec";

// ===================== STATE ======================
let currentData = null;

// ===================== BOOT =======================
document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  if (!app) {
    alert("Error: #app container not found in HTML");
    return;
  }
  loadAndRender();
});

// ===================== LOAD + RENDER ==============
async function loadAndRender() {
  const app = document.getElementById("app");
  app.innerHTML = "Loading…";

  try {
    const url = `${API_URL}?endpoint=widget&ts=${Date.now()}`;
    const res = await fetch(url, { method: "GET" });

    if (!res.ok) {
      const text = await safeReadText_(res);
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
    }

    const raw = await res.text();

    if (raw.trim().startsWith("<")) {
      throw new Error("GAS returned HTML instead of JSON (auth / access issue)");
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new Error("JSON parse error: " + e.message + " | raw: " + raw.slice(0, 200));
    }

    currentData = json;
    renderApp_(json);
  } catch (err) {
    console.error(err);
    alert("Error loading data:\n" + String(err.message || err));
    const app2 = document.getElementById("app");
    app2.innerHTML = "<div style='color:#ff8888;font-size:14px;'>Error loading data</div>";
  }
}

function renderApp_(data) {
  const app = document.getElementById("app");
  app.innerHTML = "";

  const items = Array.isArray(data.items) ? data.items : [];
  const totals = data.totals || {};

  // ==== HEADER (как виджет) ====
  const header = document.createElement("div");
  header.style.textAlign = "center";
  header.style.marginBottom = "4px";
  header.style.fontSize = "10px";
  header.style.color = "#00BFFF";

  const dotLeft = document.createElement("span");
  dotLeft.textContent = "• ";
  const titleSpan = document.createElement("span");
  titleSpan.textContent = "calm heart · bright mind";
  const dotRight = document.createElement("span");
  dotRight.textContent = " •";

  header.appendChild(dotLeft);
  header.appendChild(titleSpan);
  header.appendChild(dotRight);
  app.appendChild(header);

  // ==== BODY (строки привычек) ====
  const list = document.createElement("div");
  app.appendChild(list);

  const maxRows = 8;
  for (let i = 0; i < maxRows; i++) {
    const it = items[i];

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.fontSize = "12px";
    row.style.color = "#ffffff";
    row.style.marginBottom = i < maxRows - 1 ? "2px" : "0";

    if (!it) {
      const placeholder = document.createElement("div");
      placeholder.textContent = "  ·";
      placeholder.style.color = "#6f6f6f";
      row.appendChild(placeholder);
      list.appendChild(row);
      continue;
    }

    const type = String(it.type || "");
    const doneToday = !!it.doneToday;
    const dueToday = !!it.dueToday;
    const progress = String(it.progress || "");
    const weeklyColor = String(it.weeklyColor || "");

    // ===== Left: icon button + habit name =====
    const leftWrap = document.createElement("div");
    leftWrap.style.display = "flex";
    leftWrap.style.alignItems = "center";
    leftWrap.style.flex = "1 1 auto";
    leftWrap.style.minWidth = "0"; // чтобы текст мог сжиматься

    const iconBtn = document.createElement("button");
    iconBtn.type = "button";
    iconBtn.style.border = "none";
    iconBtn.style.margin = "0";
    iconBtn.style.padding = "0 4px 0 0";
    iconBtn.style.background = "transparent";
    iconBtn.style.fontSize = "14px";
    iconBtn.style.cursor = "pointer";

    const iconChar = getIconFor_(type, doneToday, dueToday);
    iconBtn.textContent = iconChar;

    const nameSpan = document.createElement("span");
    nameSpan.textContent = it.habit;
    nameSpan.style.whiteSpace = "nowrap";
    nameSpan.style.overflow = "hidden";
    nameSpan.style.textOverflow = "ellipsis";
    nameSpan.style.color = doneToday ? "#ffffff" : "#888888";

    leftWrap.appendChild(iconBtn);
    leftWrap.appendChild(nameSpan);

    // ===== Right: progress =====
    const rightSpan = document.createElement("span");
    rightSpan.textContent = progress;
    rightSpan.style.fontSize = "12px";
    rightSpan.style.marginLeft = "6px";
    rightSpan.style.whiteSpace = "nowrap";

    if (/^weekly/i.test(type)) {
      rightSpan.style.color = weeklyColor ? weeklyColor : "#888888";
    } else if (/^fixed/i.test(type)) {
      rightSpan.style.color = doneToday ? "#ffffff" : "#888888";
    } else {
      rightSpan.style.color = "#888888";
    }

    row.appendChild(leftWrap);
    row.appendChild(rightSpan);
    list.appendChild(row);

    // ===== CLICK HANDLER (по иконке слева) =====
    iconBtn.addEventListener("click", async () => {
      await onToggleClick_(it, iconBtn, nameSpan, rightSpan);
    });
  }

  // ==== FOOTER ====
  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.alignItems = "center";
  footer.style.justifyContent = "center";
  footer.style.marginTop = "4px";
  footer.style.fontSize = "8px";
  footer.style.color = "#888888";

  const totalDone = Number(totals.totalDone || 0);
  const weeklyPercent = Number(totals.weeklyPercent || 0);
  const xpWeek = Number(totals.xpWeek || 0);

  footer.appendChild(makeFooterChunk_("✨ " + weeklyPercent + "%"));
  footer.appendChild(makeFooterSep_());
  footer.appendChild(makeFooterChunk_("Σ " + totalDone));
  footer.appendChild(makeFooterSep_());
  footer.appendChild(
    makeFooterChunk_("⭐ " + (xpWeek >= 0 ? "+" + xpWeek : String(xpWeek)))
  );
  footer.appendChild(makeFooterSep_());

  const stamp = data.updatedAt ? new Date(data.updatedAt) : new Date();
  const hh = String(stamp.getHours()).padStart(2, "0");
  const mm = String(stamp.getMinutes()).padStart(2, "0");
  footer.appendChild(makeFooterChunk_(hh + ":" + mm));

  app.appendChild(footer);
}

// ===================== TOGGLE LOGIC ==================
async function onToggleClick_(item, iconBtn, nameSpan, rightSpan) {
  const habit = item.habit;
  const currentDone = !!item.doneToday;
  const desired = !currentDone;

  // Оптимистично меняем иконку/цвет (но можем откатить при ошибке)
  const prevIcon = iconBtn.textContent;
  const prevNameColor = nameSpan.style.color;

  iconBtn.textContent = getIconFor_(item.type, desired, item.dueToday);
  nameSpan.style.color = desired ? "#ffffff" : "#888888";

  try {
    const url = `${API_URL}?endpoint=checkin&ts=${Date.now()}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ habit, done: desired })
    });

    if (!res.ok) {
      const text = await safeReadText_(res);
      throw new Error(`HTTP ${res.status} ${res.statusText} — ${text}`);
    }

    let raw;
    try {
      raw = await res.text();
    } catch (e) {
      throw new Error("Failed to read response: " + e.message);
    }

    if (!raw) {
      throw new Error("Empty response from server");
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new Error("JSON parse error on save: " + e.message + " | raw: " + raw.slice(0, 200));
    }

    if (!json.ok) {
      throw new Error(json.error || "Server returned ok:false");
    }

    // Успех → перезагружаем данные, чтобы прогрессы/цвета подтянулись из таблицы
    await loadAndRender();
  } catch (err) {
    console.error(err);
    // Откат визуала
    iconBtn.textContent = prevIcon;
    nameSpan.style.color = prevNameColor;
    alert("Error saving:\n" + String(err.message || err));
  }
}

// ===================== HELPERS ======================
function getIconFor_(typeRaw, done, dueToday) {
  const t = String(typeRaw || "");
  if (/^daily/i.test(t)) {
    return done ? "🟢" : "⚫️";
  }
  if (/^fixed/i.test(t)) {
    if (!dueToday) return "➖";
    return done ? "🟢" : "⚫️";
  }
  if (/^weekly/i.test(t)) {
    return done ? "🟢" : "⚫️";
  }
  return "·";
}

function makeFooterChunk_(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
}

function makeFooterSep_() {
  const span = document.createElement("span");
  span.textContent = " • ";
  span.style.margin = "0 2px";
  return span;
}

async function safeReadText_(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}
