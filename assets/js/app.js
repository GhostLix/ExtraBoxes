// assets/js/app.js
const ENDPOINT = "https://script.google.com/macros/s/AKfycby1TDgfHLt-bUN3zIrV1Job5Wht_3BoRJM0fQGLnrRFMGD_925KFpGnxtkmNxiYRZEptQ/exec";
const DATA_FILES = ['data/data.json', 'data/data2.json'];

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('username-input');
  const submitBtn = document.getElementById('submit-btn');
  const datalist = document.getElementById('username-suggestions');

  // ---------- suggestions loader (dedup & sort) ----------
  async function loadSuggestions() {
    const set = new Set();
    for (const path of DATA_FILES) {
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (!res.ok) { console.warn('Missing suggestion file:', path); continue; }
        const json = await res.json();
        if (!Array.isArray(json)) continue;
        for (const item of json) {
          if (!item) continue;
          const list = item.string_list_data;
          if (Array.isArray(list)) {
            for (const s of list) if (s && s.value) set.add(String(s.value).trim());
          }
        }
      } catch (err) {
        console.error('Error reading suggestion file', path, err);
      }
    }
    datalist.innerHTML = '';
    Array.from(set).sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base'})).forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      datalist.appendChild(opt);
    });
  }

  // ---------- network helpers ----------
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

  function jsonpFallback(username, timeout = 9000) {
    return new Promise((resolve, reject) => {
      const callbackName = '__gs_cb_' + Date.now() + '_' + Math.floor(Math.random()*10000);
      let timedOut = false;

      window[callbackName] = (data) => {
        if (timedOut) return;
        cleanup();
        resolve({ ok: true, payload: data });
      };

      const script = document.createElement('script');
      script.src = ENDPOINT + '?username=' + encodeURIComponent(username) + '&callback=' + callbackName;
      script.async = true;
      script.onerror = (e) => {
        cleanup();
        reject(new Error('JSONP script error'));
      };

      const timer = setTimeout(() => {
        timedOut = true;
        cleanup();
        reject(new Error('JSONP timeout'));
      }, timeout);

      function cleanup() {
        try { delete window[callbackName]; } catch(e){ window[callbackName]=null; }
        if (script.parentNode) script.parentNode.removeChild(script);
        clearTimeout(timer);
      }

      document.head.appendChild(script);
    });
  }

  // ---------- main save logic (tries JSON -> form -> JSONP) ----------
  async function saveUsername(username) {
    // try JSON POST
    try {
      const res = await postJSON(username);
      if (res && res.ok) {
        // success (200-299)
        return true;
      } else {
        console.warn('POST JSON returned non-ok', res && res.status);
      }
    } catch (err) {
      console.warn('POST JSON failed (likely CORS/preflight)', err);
    }

    // try form-encoded POST
    try {
      const res2 = await postForm(username);
      if (res2 && res2.ok) {
        return true;
      } else {
        console.warn('POST form returned non-ok', res2 && res2.status);
      }
    } catch (err2) {
      console.warn('POST form failed', err2);
    }

    // fallback JSONP
    try {
      const jsonpRes = await jsonpFallback(username);
      if (jsonpRes && jsonpRes.payload && jsonpRes.payload.status === 'OK') {
        return true;
      } else {
        // some JSONP may return {status:'OK'} or other; accept non-error
        return !!(jsonpRes && jsonpRes.payload);
      }
    } catch (err3) {
      console.error('JSONP fallback failed', err3);
      return false;
    }
  }

  // ---------- UI handlers ----------
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
      localStorage.setItem('lastUsername', username);
      // reload to match requested behavior
      location.reload();
    } else {
      alert('Unable to save username. Check the browser console (Network tab) for details.');
    }
  });

  // ---------- init ----------
  const last = localStorage.getItem('lastUsername');
  if (last) input.value = last;
  loadSuggestions();
});
