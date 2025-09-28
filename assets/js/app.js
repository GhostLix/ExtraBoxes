// assets/js/app.js
const ENDPOINT = "https://script.google.com/macros/s/AKfycby1TDgfHLt-bUN3zIrV1Job5Wht_3BoRJM0fQGLnrRFMGD_925KFpGnxtkmNxiYRZEptQ/exec";
const DATA_FILES = ["data/data.json", "data/data2.json"];

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("username-input");
  const submitBtn = document.getElementById("submit-btn");
  const datalist = document.getElementById("username-suggestions");

  // ---- carica suggerimenti dai file JSON ----
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
      } catch (e) {
        console.error("Errore leggendo", file, e);
      }
    }
    datalist.innerHTML = "";
    Array.from(set).forEach(v => {
      const opt = document.createElement("option");
      opt.value = v;
      datalist.appendChild(opt);
    });
  }

  // ---- invia username con JSONP ----
  function saveUsername(username) {
    return new Promise((resolve, reject) => {
      const cb = "cb_" + Date.now();
      window[cb] = (data) => {
        delete window[cb];
        script.remove();
        if (data.status === "OK") resolve(true);
        else reject(data.message);
      };
      const script = document.createElement("script");
      script.src = `${ENDPOINT}?username=${encodeURIComponent(username)}&callback=${cb}`;
      script.onerror = () => reject("Request failed");
      document.body.appendChild(script);
    });
  }

  // ---- bottone ----
  submitBtn.addEventListener("click", async () => {
    const username = input.value.trim();
    if (!username) return alert("Please insert a username!");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    try {
      await saveUsername(username);
      localStorage.setItem("lastUsername", username);
      location.reload();
    } catch (err) {
      alert("Error: " + err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Get your extra box";
    }
  });

  // ---- mantieni ultimo username ----
  const last = localStorage.getItem("lastUsername");
  if (last) input.value = last;

  loadSuggestions();
});
