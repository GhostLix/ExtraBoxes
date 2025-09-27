const ENDPOINT =
  "https://script.google.com/macros/s/AKfycby1TDgfHLt-bUN3zIrV1Job5Wht_3BoRJM0fQGLnrRFMGD_925KFpGnxtkmNxiYRZEptQ/exec";

const input = document.getElementById("username-input");
const submitBtn = document.getElementById("submit-btn");
const datalist = document.getElementById("username-suggestions");

// Carica i suggerimenti dai JSON
async function loadSuggestions() {
  try {
    const [data1, data2] = await Promise.all([
      fetch("data/data.json").then((res) => res.json()),
      fetch("data/data2.json").then((res) => res.json()),
    ]);

    const values = [...data1, ...data2]
      .map((entry) => entry.string_list_data?.[0]?.value)
      .filter(Boolean);

    datalist.innerHTML = "";
    values.forEach((val) => {
      const opt = document.createElement("option");
      opt.value = val;
      datalist.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading suggestions:", err);
  }
}

// Salva username su Google Sheet
async function saveUsername(username) {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      body: JSON.stringify({ username }),
    });
    const text = await res.text();
    console.log("Server response:", text);
  } catch (err) {
    console.error("Error saving username:", err);
  }
}

// Al click → salva e ricarica mantenendo il valore
submitBtn.addEventListener("click", async () => {
  const username = input.value.trim();
  if (!username) return;

  await saveUsername(username);

  // salva localmente per ricaricare
  localStorage.setItem("lastUsername", username);
  location.reload();
});

// Ricarica mantenendo l’input
window.addEventListener("DOMContentLoaded", () => {
  loadSuggestions();
  const last = localStorage.getItem("lastUsername");
  if (last) {
    input.value = last;
  }
});
