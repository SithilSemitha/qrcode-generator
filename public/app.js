(() => {
  const qs = (sel) => document.querySelector(sel);

  const form = qs('#qrForm');
  const textEl = qs('#text');
  const sizeEl = qs('#size');
  const marginEl = qs('#margin');
  const levelEl = qs('#level');
  const darkEl = qs('#dark');
  const lightEl = qs('#light');

  const sizeValue = qs('#sizeValue');
  const marginValue = qs('#marginValue');

  const qrImg = qs('#qrImg');
  const qrEmpty = qs('#qrEmpty');

  const generateBtn = qs('#generateBtn');
  const genStatus = qs('#genStatus');

  const copyTextBtn = qs('#copyTextBtn');
  const copyStatus = qs('#copyStatus');

  const downloadPngBtn = qs('#downloadPngBtn');
  const downloadJpgBtn = qs('#downloadJpgBtn');
  const resetBtn = qs('#resetBtn');

  const setStatus = (el, msg, ms = 1600) => {
    if (!el) return;
    el.textContent = msg || '';
    if (ms > 0 && msg) {
      window.clearTimeout(setStatus._t);
      setStatus._t = window.setTimeout(() => {
        el.textContent = '';
      }, ms);
    }
  };

  const hasQr = () => !!(qrImg && qrImg.src && qrImg.src.startsWith('data:image/'));

  const setHasQrUi = (enabled) => {
    if (!qrImg || !qrEmpty) return;
    qrImg.style.display = enabled ? '' : 'none';
    qrEmpty.style.display = enabled ? 'none' : '';
    downloadPngBtn.disabled = !enabled;
    downloadJpgBtn.disabled = !enabled;
  };

  const syncLabels = () => {
    if (sizeValue && sizeEl) sizeValue.textContent = sizeEl.value;
    if (marginValue && marginEl) marginValue.textContent = marginEl.value;
  };

  const buildPayload = () => ({
    text: (textEl?.value || '').trim(),
    size: Number.parseInt(sizeEl?.value || '320', 10),
    margin: Number.parseInt(marginEl?.value || '4', 10),
    level: levelEl?.value || 'M',
    dark: darkEl?.value || '#0b1220',
    light: lightEl?.value || '#ffffff',
  });

  const generate = async () => {
    const payload = buildPayload();
    if (!payload.text) {
      setStatus(genStatus, 'Please enter a URL or text.');
      setHasQrUi(false);
      return;
    }

    generateBtn.disabled = true;
    setStatus(genStatus, 'Generating…', 0);

    try {
      const resp = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to generate.');

      qrImg.src = data.dataUrl;
      setHasQrUi(true);
      setStatus(genStatus, 'Done!');
    } catch (e) {
      setHasQrUi(false);
      setStatus(genStatus, e?.message || 'Failed to generate.');
    } finally {
      generateBtn.disabled = false;
    }
  };

  const copyText = async () => {
    const text = (textEl?.value || '').trim();
    if (!text) return setStatus(copyStatus, 'Nothing to copy.');

    try {
      await navigator.clipboard.writeText(text);
      setStatus(copyStatus, 'Copied!');
    } catch {
      // Fallback
      textEl.focus();
      textEl.select();
      const ok = document.execCommand('copy');
      setStatus(copyStatus, ok ? 'Copied!' : 'Copy failed.');
    }
  };

  const downloadDataUrl = (dataUrl, filename) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const rasterizeTo = async (mime, filename) => {
    if (!hasQr()) return;

    // Convert the current QR data URL into a raster export using canvas.
    const img = new Image();
    img.decoding = 'async';
    img.src = qrImg.src;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    const ctx = canvas.getContext('2d');
    // For JPG, there is no alpha; fill a white background first.
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.92));
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    textEl.value = '';
    sizeEl.value = '320';
    marginEl.value = '4';
    levelEl.value = 'M';
    darkEl.value = '#0b1220';
    lightEl.value = '#ffffff';
    syncLabels();
    setHasQrUi(false);
    setStatus(genStatus, '');
    setStatus(copyStatus, '');
  };

  // Wiring
  syncLabels();
  setHasQrUi(window.__QR_INITIAL__?.hasQr || hasQr());

  sizeEl?.addEventListener('input', () => {
    syncLabels();
  });
  marginEl?.addEventListener('input', () => {
    syncLabels();
  });

  // Live regen when options change (but only if we already have a QR)
  const debounced = (() => {
    let t;
    return () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        if (hasQr()) generate();
      }, 220);
    };
  })();

  for (const el of [sizeEl, marginEl, levelEl, darkEl, lightEl]) {
    el?.addEventListener('change', debounced);
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    generate();
  });

  copyTextBtn?.addEventListener('click', copyText);

  downloadPngBtn?.addEventListener('click', async () => {
    if (!hasQr()) return;
    // QR is already a PNG data URL; download directly.
    downloadDataUrl(qrImg.src, 'qr-code.png');
  });

  downloadJpgBtn?.addEventListener('click', async () => {
    await rasterizeTo('image/jpeg', 'qr-code.jpg');
  });

  resetBtn?.addEventListener('click', reset);
})();

