// === A.Habits PWA ===
// 1) Загружаем данные с твоего GAS widget endpoint
// 2) Рисуем привычки
// 3) Позволяем нажимать "Done/Undo"

const API_URL = "https://script.google.com/macros/s/AKfycbw7kv8ydTrxlgWTaEJhcqa5qoss4TEHh-ElVgQr4xrV38QKPwvCnCdyLHKIbeFIMk0VKw/exec?endpoint=widget";

async function loadHabits() {
  try {
    const res = await fetch(API_URL + "&ts=" + Date.now());
    const data = await res.json();

    const list = document.getElementById("habit-list");
    list.innerHTML = "";

    data.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "habit-row";

      // иконка включения/выключения
      const btn = document.createElement("button");
      btn.className = item.doneToday ? "btn done" : "btn";
      btn.textContent = item.doneToday ? "✓" : "○";

      btn.onclick = () => toggleHabit(item.habit, !item.doneToday, btn);

      const name = document.createElement("span");
      name.className = "habit-name";
      name.textContent = item.habit;

      const prog = document.createElement("span");
      prog.className = "habit-progress";
      prog.textContent = item.progress || "";

      if (item.weeklyColor) {
        prog.style.color = item.weeklyColor;
      }

      row.appendChild(btn);
      row.appendChild(name);
      row.appendChild(prog);
      list.appendChild(row);
    });

  } catch (e) {
    console.error(e);
  }
}

// отправляем изменение done/not done в GAS (через checkin sheet)
async function toggleHabit(habit, value, btn) {
  btn.disabled = true;

  const url =
    API_URL.replace("endpoint=widget", "endpoint=toggle") +
    "&habit=" + encodeURIComponent(habit) +
    "&value=" + (value ? "1" : "0");

  try {
    await fetch(url);
    btn.className = value ? "btn done" : "btn";
    btn.textContent = value ? "✓" : "○";
  } catch (e) {
    console.error(e);
  } finally {
    btn.disabled = false;
  }
}

loadHabits();
