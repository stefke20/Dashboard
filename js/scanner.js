/* Barcode scanner using the phone camera.
   Uses the browser's BarcodeDetector when available (Chrome/Android), otherwise ZXing loaded from a CDN (iPhone). */
(function (PD) {
  const { $ } = PD;
  const ZXING = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
  let zxingLoading = null;

  const loadZXing = () => zxingLoading || (zxingLoading = new Promise((resolve, reject) => {
    if (window.ZXing) { resolve(window.ZXing); return; }
    const s = document.createElement('script');
    s.src = ZXING; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = () => resolve(window.ZXing); s.onerror = () => { zxingLoading = null; reject(new Error('Could not load the scanner library (offline?)')); };
    document.head.appendChild(s);
  }));

  async function makeDetector() {
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        const want = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter((f) => formats.includes(f));
        if (want.length) {
          const d = new window.BarcodeDetector({ formats: want });
          return async (video) => (await d.detect(video))[0]?.rawValue;
        }
      } catch { /* fall through to ZXing */ }
    }
    const Z = await loadZXing();
    const hints = new Map();
    hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
    hints.set(Z.DecodeHintType.TRY_HARDER, true);
    const reader = new Z.MultiFormatReader(); reader.setHints(hints);
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d', { willReadFrequently: true });
    return async (video) => {
      const w = video.videoWidth; const h = video.videoHeight;
      if (!w) return null;
      // decode a centred horizontal band — faster and matches the on-screen guide
      const bw = Math.round(w * 0.9); const bh = Math.round(h * 0.45);
      canvas.width = bw; canvas.height = bh;
      ctx.drawImage(video, (w - bw) / 2, (h - bh) / 2, bw, bh, 0, 0, bw, bh);
      try {
        const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(canvas)));
        return reader.decode(bmp).getText();
      } catch { return null; }
    };
  }

  /** Opens the scanner; calls onCode(digits) once a barcode is read (or typed). */
  function open(onCode) {
    let stream = null; let stopped = false; let timer = null;
    const stop = () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
    PD.modal('Scan a barcode', `
      <div class="scanner">
        <div class="scan-view"><video id="scanVideo" playsinline muted></video><div class="scan-guide"><i></i></div></div>
        <p class="muted small center" id="scanStatus">Starting camera…</p>
        <form id="scanManual" class="row gap">
          <input class="grow" name="code" inputmode="numeric" pattern="[0-9]{8,14}" placeholder="…or type the barcode digits">
          <button class="btn ghost">Look up</button>
        </form>
      </div>`, async (body, close) => {
      const dlg = $('#modal');
      dlg.addEventListener('close', stop, { once: true });
      const status = $('#scanStatus', body);
      const done = (code) => {
        if (stopped) return;
        stop(); navigator.vibrate?.(60); PD.fx.beep(1250, 0.09);
        close(); onCode(String(code).trim());
      };
      $('#scanManual', body).onsubmit = (e) => { e.preventDefault(); const v = e.target.code.value.replace(/\D/g, ''); if (v.length >= 8) done(v); };
      if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'No camera access in this browser — type the digits instead.'; return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (stopped) { stop(); return; }
        const video = $('#scanVideo', body);
        video.srcObject = stream; await video.play();
        status.textContent = 'Loading scanner…';
        const detect = await makeDetector();
        status.textContent = 'Point the camera at the barcode';
        const tick = async () => {
          if (stopped) return;
          try { const code = await detect(video); if (code) { done(code); return; } } catch { /* keep trying */ }
          timer = setTimeout(tick, 120);
        };
        tick();
      } catch (e) {
        status.textContent = e.name === 'NotAllowedError' ? 'Camera permission was denied — allow it in your browser settings, or type the digits.' : `Camera unavailable (${e.message}) — type the digits instead.`;
      }
    });
  }

  PD.scanner = { open };
})(window.PD);
