const ENDPOINT = "https://script.google.com/macros/s/AKfycby1TDgfHLt-bUN3zIrV1Job5Wht_3BoRJM0fQGLnrRFMGD_925KFpGnxtkmNxiYRZEptQ/exec";
const DATA_FILES = ["data/data.json", "data/data2.json"];

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("username-input");
  const submitBtn = document.getElementById("submit-btn");
  const datalist = document.getElementById("username-suggestions");

  // ---- Carica suggerimenti dai JSON ----
  async function loadSuggestions() {
    const set = new Set();

    for (const file of DATA_FILES) {
      try {
        const res = await fetch(file);
        if (!res.ok) continue;

        const data = await res.json();
        if (!Array.isArray(data)) continue;

        data.forEach(item => {
          if (Array.isArray(item.string_list_data)) {
            item.string_list_data.forEach(s => {
              if (s.value) set.add(s.value);
            });
          }
        });
      } catch (err) {
        console.error("Errore caricando", file, err);
      }
    }

    datalist.innerHTML = "";
    Array.from(set).forEach(val => {
      const opt = document.createElement("option");
      opt.value = val;
      datalist.appendChild(opt);
    });
  }

  // ---- Salva username su Google Sheets ----
  async function saveUsername(username) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    if (!res.ok) throw new Error("Request failed: " + res.status);
    return await res.text();
  }

  // ---- Gestione click bottone ----
  submitBtn.addEventListener("click", async () => {
    const username = input.value.trim();
    if (!username) return alert("Please insert a username!");

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
      await saveUsername(username);
      localStorage.setItem("lastUsername", username);
      location.reload(); // 🔄 ricarica la pagina
    } catch (err) {
      console.error(err);
      alert("Error sending username!");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Get your extra box";
    }
  });

  // ---- Mantieni l’ultimo username dopo reload ----
  const last = localStorage.getItem("lastUsername");
  if (last) input.value = last;

  // ---- Avvia caricamento suggerimenti ----
  loadSuggestions();
});

