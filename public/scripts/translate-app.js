// public/onlyoffice-translations.js
(function () {
  'use strict';

  // --- helper seguro para traducciones ---
  function tSafe(s) {
    try {
      if (window?.Asc?.plugin && typeof window.Asc.plugin.tr === 'function') {
        return window.Asc.plugin.tr(s);
      }
    } catch (e) { /* ignore */ }
    return s;
  }

  // --- MAP: array de specs ---
  // cada spec: { selector: "#id" | ".class" | "selector", original: "English text", target: "textContent"|"optionText"|"value"|"innerHTML"|"alt"|"attr", attrName?: "title" }
  const MAP = [
    { selector: '#title-bg', original: 'BG', target: 'textContent' },
    { selector: '#model-label', original: 'Model:', target: 'textContent' },
    { selector: '#option-rmbg', original: 'RMBG-1.4 (Cross-browser)', target: 'optionText' },
    { selector: '#option-modnet', original: 'MODNet (WebGPU)', target: 'optionText' },
    { selector: '#ios-info', original: 'Using optimized iOS background removal', target: 'textContent' },
    { selector: '#hero-title', original: 'Remove Image Background', target: 'textContent' },
    { selector: '#hero-subtitle', original: '100% Automatically and Free', target: 'textContent' },
    { selector: '#hero-description', original: 'Upload your image and let our AI remove the background instantly. Perfect for professional photos, product images, and more.', target: 'textContent' },
    { selector: '#hero-credit', original: 'Built with love by Addy Osmani using Transformers.js', target: 'textContent' },
    { selector: '#loading-message', original: 'Loading background removal model...', target: 'textContent' },
    { selector: '#switching-models-message', original: 'Switching models...', target: 'textContent' },
    // nota: no sobrescribimos error-message (runtime)
    { selector: '#dropzone-prompt-default', original: 'Drag and drop images here', target: 'textContent' },
    { selector: '#dropzone-prompt-active', original: 'Drop the images here...', target: 'textContent' },
    { selector: '#dropzone-instruction', original: 'or click to select files', target: 'textContent' },
    { selector: '#sample-heading', original: 'No image? Try one of these:', target: 'textContent' },
    { selector: '#sample-note', original: 'All images are processed locally on your device and are not uploaded to any server.', target: 'textContent' },
    //IMG LIST
    { selector: '.processing-text', original: 'Processing...', target: 'textContent' },
    { selector: '.btn-delete-label', original: 'Delete', target: 'textContent' },
    { selector: '.btn-edit-label', original: 'Edit', target: 'textContent' },
    { selector: '.btn-download-label', original: 'Download', target: 'textContent' },
    //EDIT IMAGE
    { selector: '#edit-image-title', original: 'Edit Image', target: 'textContent' },
    { selector: '#bg-heading', original: 'Background', target: 'textContent' },
    { selector: '#custom-color-btn', original: 'Custom Color', target: 'textContent' },
    { selector: '#effects-heading', original: 'Effects', target: 'textContent' },
    { selector: '#preview-heading', original: 'Preview', target: 'textContent' },
    { selector: '#btn-cancel-edit', original: 'Cancel', target: 'textContent' },
    { selector: '#btn-save-edit', original: 'Save Changes', target: 'textContent' },
    { selector: '#option-effect-none', original: 'None', target: 'textContent' },
    { selector: '#option-effect-blur', original: 'Blur', target: 'textContent' },
    { selector: '#option-effect-brightness', original: 'Bright', target: 'textContent' },
    { selector: '#option-effect-contrast', original: 'Contrast', target: 'textContent' },
    { selector: '#bg-option-color', original: 'Solid Color', target: 'textContent' },
    { selector: '#bg-option-image', original: 'Image', target: 'textContent' }
  ];

  // --- util: escape selector (para construir combinaciones seguras si hace falta) ---
  function escapeSelector(s) {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s);
    return s.replace(/([ #;?%&,.+*~\':"!\^$\[\]\(\)=>|\/@])/g, '\\$1');
  }

  // --- aplica una sola spec a un elemento ---
  function applySpecToElement(el, spec) {
    if (!el || !spec) return;
    const translated = tSafe(spec.original);

    try {
      switch (spec.target) {
        case 'optionText':
          if (el.tagName === 'OPTION') {
            if (el.text !== translated) el.text = translated;
          } else {
            if (el.textContent !== translated) el.textContent = translated;
          }
          break;

        case 'value':
          if (el.value !== undefined && el.value !== translated) el.value = translated;
          break;

        case 'innerHTML':
          if (el.innerHTML !== translated) el.innerHTML = translated;
          break;

        case 'attr':
          if (spec.attrName) {
            if (el.getAttribute(spec.attrName) !== translated) el.setAttribute(spec.attrName, translated);
          } else {
            if (el.textContent !== translated) el.textContent = translated;
          }
          break;

        case 'alt':
          if ('alt' in el && el.alt !== translated) el.alt = translated;
          break;

        case 'textContent':
        default:
          if (el.textContent !== translated) el.textContent = translated;
          break;
      }
    } catch (e) {
      // fallback seguro
      try { el.textContent = translated; } catch (err) { /* ignore */ }
    }
  }

  // --- devuelve los elementos relevantes para una spec dentro de un nodo raíz dado ---
  function elementsForSpecInNode(spec, rootNode) {
    const sel = spec.selector;
    const results = [];

    if (!rootNode) return results;

    try {
      // Si selector es id (empieza con #), buscar con querySelector (single)
      if (typeof sel === 'string' && sel.startsWith('#')) {
        // incluir rootNode si coincide
        if (rootNode.nodeType === 1 && rootNode.matches && rootNode.matches(sel)) {
          results.push(rootNode);
          return results;
        }
        // buscar dentro de rootNode
        const found = rootNode.querySelector ? rootNode.querySelector(sel) : null;
        if (found) results.push(found);
        return results;
      }

      // Para clases u otros selectores: devolver todos en el subtree (y rootNode si coincide)
      if (rootNode.nodeType === 1 && rootNode.matches && rootNode.matches(sel)) {
        results.push(rootNode);
      }
      if (rootNode.querySelectorAll) {
        const nodeList = rootNode.querySelectorAll(sel);
        if (nodeList && nodeList.length) {
          nodeList.forEach(n => results.push(n));
        }
      }
    } catch (e) {
      // si selector inválido, ignorar silenciosamente
    }
    return results;
  }

  // --- aplicar todas las traducciones (pasada completa sobre document) ---
  function applyTranslations() {
    try {
      for (const spec of MAP) {
        // para selectors por id usamos document.querySelector (single), para otros querySelectorAll
        if (spec.selector && typeof spec.selector === 'string' && spec.selector.startsWith('#')) {
          const el = document.querySelector(spec.selector);
          if (el) applySpecToElement(el, spec);
        } else {
          let nodeList = [];
          try {
            nodeList = document.querySelectorAll(spec.selector);
          } catch (e) { nodeList = []; }
          if (nodeList && nodeList.length) {
            nodeList.forEach(el => applySpecToElement(el, spec));
          }
        }
      }

      // ejemplo opt: traducir alt del hero si existe
      const heroImg = document.querySelector('img[alt="Surprised man"]');
      if (heroImg) {
        const altTranslated = tSafe("Surprised man");
        if (heroImg.alt !== altTranslated) heroImg.alt = altTranslated;
      }
    } catch (e) {
      // si algo falla, no romper la UI
      console.warn('applyTranslations error', e);
    }
  }

  // --- aplicar traducciones a un subtree concreto (más eficiente) ---
  function applyTranslationsToTree(rootNode) {
    if (!rootNode) return;

    // Para cada spec, buscar elementos dentro del subtree y aplicar
    for (const spec of MAP) {
      const els = elementsForSpecInNode(spec, rootNode);
      if (els && els.length) {
        els.forEach(el => applySpecToElement(el, spec));
      }
    }
  }

  // --- MutationObserver sobre #root (aplica solo donde hace falta) ---
  let observer = null;
  function setupObserver() {
    const root = document.getElementById('root');
    if (!root) return false;

    const opts = { childList: true, subtree: true, attributes: true, attributeOldValue: false };

    observer = new MutationObserver((mutations) => {
      // desconectar para evitar loop por nuestros cambios
      if (observer) observer.disconnect();

      try {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            // nodos añadidos: aplicar en sus subtrees
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === 1) applyTranslationsToTree(node);
            });
            // nodos removidos -> no hace falta
          } else if (mutation.type === 'attributes') {
            const tgt = mutation.target;
            if (!tgt || tgt.nodeType !== 1) continue;

            // Chequear si el elemento modificado coincide con alguna spec
            for (const spec of MAP) {
              try {
                if (spec.selector && typeof spec.selector === 'string' && spec.selector.startsWith('#')) {
                  // si el id coincide
                  const id = spec.selector.slice(1);
                  if (tgt.id === id) {
                    applySpecToElement(tgt, spec);
                    break; // ya aplicado para esta mutation
                  }
                } else {
                  // usar matches para clasess y selectores complejos
                  if (tgt.matches && tgt.matches(spec.selector)) {
                    applySpecToElement(tgt, spec);
                    break;
                  }
                }
              } catch (e) {
                // ignore selector errors
              }
            }
          }
        }
      } catch (e) {
        // fallback: aplicar todo si algo va mal
        try { applyTranslations(); } catch (ee) { /* ignore */ }
      } finally {
        // reconectar
        if (observer) observer.observe(root, opts);
      }
    });

    observer.observe(root, opts);
    return true;
  }

  // --- inicialización: registrar onTranslate y montar observer ---
  function initTranslationSystem() {
    // pasada inicial
    try { applyTranslations(); } catch (e) { /* ignore */ }

    // registrar onTranslate en ONLYOFFICE
    if (window?.Asc?.plugin) {
      try { window.Asc.plugin.onTranslate = applyTranslations; } catch (e) { /* ignore */ }
    }

    // montar observer en #root (o esperar a load si no existe)
    if (!setupObserver()) {
      window.addEventListener('load', () => {
        try { setupObserver(); } catch (e) { /* ignore */ }
      }, { once: true });
    }
  }

  // helper global ligero para usar en React/JSX: window.t("text")
  if (!window.t) {
    window.t = function (s) { return tSafe(s); };
  }

  // arrancar cuando DOM listo
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initTranslationSystem();
  } else {
    window.addEventListener('DOMContentLoaded', initTranslationSystem, { once: true });
  }

  // Exponer para debug/inspección
  window.__onlyofficeTranslations = {
    MAP,
    applyTranslations,
    applyTranslationsToTree
  };

})();
