const ENDPOINT = "https://script.google.com/macros/s/AKfycby1TDgfHLt-bUN3zIrV1Job5Wht_3BoRJM0fQGLnrRFMGD_925KFpGnxtkmNxiYRZEptQ/exec";

async function tryPostJson(username) {
  return fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
}

function jsonpFallback(username, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const callbackName = '__gs_cb_' + Date.now() + Math.floor(Math.random() * 1000);
    window[callbackName] = (data) => {
      try { delete window[callbackName]; } catch(e){ window[callbackName]=null; }
      script.remove();
      resolve({ ok: true, json: () => Promise.resolve(data) });
    };

    const script = document.createElement('script');
    // endpoint?username=...&callback=callbackName
    script.src = ENDPOINT + '?username=' + encodeURIComponent(username) + '&callback=' + callbackName;
    script.onerror = function(err) {
      try { delete window[callbackName]; } catch(e){ window[callbackName]=null; }
      script.remove();
      reject(new Error('JSONP script load error'));
    };
    document.head.appendChild(script);

    // timeout
    setTimeout(() => {
      if (window[callbackName]) {
        try { delete window[callbackName]; } catch(e){ window[callbackName]=null; }
        script.remove();
        reject(new Error('JSONP timeout'));
      }
    }, timeout);
  });
}

async function saveUsername(username) {
  // try normal POST first
  try {
    const res = await tryPostJson(username);
    if (res && res.ok) {
      // success
      return true;
    } else {
      // fallback to JSONP
      console.warn('POST returned non-ok, falling back to JSONP', res && res.status);
      const r = await jsonpFallback(username);
      const payload = await r.json();
      return payload && payload.status === 'OK';
    }
  } catch (err) {
    // likely CORS/preflight blocked -> try JSONP fallback
    console.warn('POST failed, using JSONP fallback', err);
    try {
      const r = await jsonpFallback(username);
      const payload = await r.json();
      return payload && payload.status === 'OK';
    } catch (err2) {
      console.error('Both POST and JSONP failed', err2);
      return false;
    }
  }
}

