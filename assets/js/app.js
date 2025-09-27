const ENDPOINT = "https://script.google.com/macros/s/AKfycby1TDgfHLt-bUN3zIrV1Job5Wht_3BoRJM0fQGLnrRFMGD_925KFpGnxtkmNxiYRZEptQ/exec";

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('username-input');
  const submitBtn = document.getElementById('submit-btn');
  const datalist = document.getElementById('username-suggestions');
  const DATA_FILES = ['data/data.json', 'data/data2.json'];

  async function loadSuggestions() {
    const set = new Set();
    for (const path of DATA_FILES) {
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) { console.warn('Suggestion file not found:', path); continue; }
        const json = await res.json();
        const arr = Array.isArray(json) ? json : [];
        for (const item of arr) {
          if (!item) continue;
          const list = item.string_list_data;
          if (Array.isArray(list)) {
            for (const s of list) {
              if (s && s.value) set.add(String(s.value).trim());
            }
          } else if (s && item.string_list_data && item.string_list_data.value) {
            set.add(String(item.string_list_data.value).trim());
          }
        }
      } catch (err) {
        console.error('Error reading', path, err);
      }
    }

    // populate datalist (deduplicated & sorted)
    datalist.innerHTML = '';
    Array.from(set).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })).forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      datalist.appendChild(opt);
    });
  }

  async function postJSON(username) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
  }

  async function postForm(username) {
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username })
    });
  }

  async function saveUsername(username) {
    // First try JSON POST — modern, explicit.
    try {
      const r = await postJSON(username);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      // try to read text (some deployments respond with plain text)
      const txt = await r.text().catch(() => '');
      console.log('POST JSON ok:', txt);
      return true;
    } catch (err) {
      console.warn('POST JSON failed, trying form-encoded fallback', err);
      // fallback to form-encoded (often avoids preflight / CORS issues)
      try {
        const r2 = await postForm(username);
        const txt2 = await r2.text().catch(() => '');
        console.log('POST form ok:', txt2);
        return true;
      } catch (err2) {
        console.error('Both POST attempts failed', err2);
        return false;
      }
    }
  }

  submitBtn.addEventListener('click', async (ev) => {
    ev.preventDefault();
    const username = input.value.trim();
    if (!username) { input.focus(); return; }

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';

    const ok = await saveUsername(username);

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    if (ok) {
      // persist and refresh (value will be restored on load)
      localStorage.setItem('lastUsername', username);
      location.reload();
    } else {
      // friendly error + console
      alert('Unable to save username. Check the browser console (Network tab) for details.');
    }
  });

  // restore last username (if any)
  const lastUsername = localStorage.getItem('lastUsername');
  if (lastUsername) input.value = lastUsername;

  // load datalist suggestions
  loadSuggestions();
});

