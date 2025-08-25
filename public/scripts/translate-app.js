// safe onTranslate handler — put inside window.Asc.plugin.init or replace existing onTranslate
function applyTranslations() {
  // safe wrapper: use Asc tr() when available, otherwise return original
  const t = (s) => {
    try {
      if (window?.Asc?.plugin && typeof window.Asc.plugin.tr === 'function') {
        return window.Asc.plugin.tr(s);
      }
    } catch (e) { /* ignore */ }
    return s;
  };

  // mapping id -> original English text (keys must match your translations file)
  const map = {
    "title-bg": "BG",
    "model-label": "Model:",
    "option-rmbg": "RMBG-1.4 (Cross-browser)",
    "option-modnet": "MODNet (WebGPU)",
    "ios-info": "Using optimized iOS background removal",
    "hero-title": "Remove Image Background",
    "hero-subtitle": "100% Automatically and Free",
    "hero-description": "Upload your image and let our AI remove the background instantly. Perfect for professional photos, product images, and more.",
    "hero-credit": "Built with love by Addy Osmani using Transformers.js",
    "loading-message": "Loading background removal model...",
    "switching-models-message": "Switching models...",
    /* DO NOT translate runtime error text — skip "error-message" */
    "dropzone-prompt-default": "Drag and drop images here",
    "dropzone-prompt-active": "Drop the images here...",
    "dropzone-instruction": "or click to select files",
    "sample-heading": "No image? Try one of these:",
    "sample-note": "All images are processed locally on your device and are not uploaded to any server."
  };

  Object.entries(map).forEach(([id, originalText]) => {
    const el = document.getElementById(id);
    if (!el) return; // elemento no presente (render condicional)

    // special handling by element type
    const translated = t(originalText);

    // OPTION elements — use text property so select shows correctly
    if (el.tagName === 'OPTION') {
      try { el.text = translated; } catch (e) { el.textContent = translated; }
      return;
    }

    // INPUT / TEXTAREA values
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = translated;
      return;
    }

    // Buttons might contain HTML; we set textContent to be safe (no HTML injection)
    // If you MUST allow small HTML fragments, swap textContent -> innerHTML for those specific IDs.
    el.textContent = translated;
  });

  // Extra: if you want to translate the "alt" text of the hero image (optional)
  const heroImg = document.querySelector('img[alt="Surprised man"]');
  if (heroImg) {
    heroImg.alt = t("Surprised man");
  }
}

// register with ONLYOFFICE when available, otherwise call once on load
if (window?.Asc?.plugin) {
  // ensure init wrapper calls this too; but exposing here is safe
  window.Asc.plugin.onTranslate = applyTranslations;
  // call once immediately in case translations are already available
  try { applyTranslations(); } catch (e) { /* ignore */ }
} else {
  // fallback for testing outside ONLYOFFICE
  window.addEventListener('load', applyTranslations);
}
