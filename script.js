const API_BASE = "https://script.google.com/macros/s/AKfycbw7kv8ydTrxlgWTaEJhcqa5qoss4TEHh-ElVgQr4xrV38QKPwvCnCdyLHKIbeFIMk0VKw/exec";  // <-- заменишь потом

async function loadData() {
    try {
        const res = await fetch(`${API_BASE}?endpoint=widget&ts=${Date.now()}`);
        const data = await res.json();

        if (!data.ok) {
            document.body.innerHTML = "<p>Failed to load data.</p>";
            return;
        }

        renderList(data.items);
    } catch (err) {
        document.body.innerHTML = "<p>Error loading data.</p>";
    }
}

function renderList(items) {
    const container = document.getElementById("list");
    container.innerHTML = "";

    items.forEach(item => {
        const row = document.createElement("div");
        row.className = "row";

        const btn = document.createElement("button");
        btn.className = item.doneToday ? "btn done" : "btn not";
        btn.textContent = item.doneToday ? "✓" : "○";

        btn.onclick = async () => {
            const newVal = item.doneToday ? 0 : 1;
            btn.disabled = true;

            const url = `${API_BASE}?endpoint=toggle&habit=${encodeURIComponent(item.habit)}&value=${newVal}`;

            try {
                const res = await fetch(url);
                const j = await res.json();
                if (j.ok) {
                    item.doneToday = !!newVal;
                    btn.className = item.doneToday ? "btn done" : "btn not";
                    btn.textContent = item.doneToday ? "✓" : "○";
                }
            } finally {
                btn.disabled = false;
            }
        };

        const name = document.createElement("span");
        name.className = "habit";
        name.textContent = item.habit;

        const prog = document.createElement("span");
        prog.className = "progress";
        prog.textContent = item.progress;

        row.appendChild(btn);
        row.appendChild(name);
        row.appendChild(prog);
        container.appendChild(row);
    });
}

document.addEventListener("DOMContentLoaded", loadData);
