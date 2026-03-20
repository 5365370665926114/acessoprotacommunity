/**
 * Prota Community — Proteção de conteúdo
 * Bloqueia DevTools, cópia de texto, inspeção de código
 */
(function () {
  'use strict';

  // ─── Bloquear seleção de texto via CSS ───
  const style = document.createElement('style');
  style.textContent = `
    body, body * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
    input, textarea, select, [contenteditable="true"] {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.head.appendChild(style);

  // ─── Bloquear menu de contexto (botão direito) ───
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    return false;
  });

  // ─── Bloquear atalhos de teclado ───
  document.addEventListener('keydown', function (e) {
    // F12 — DevTools
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I — Inspect Element
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+J — Console
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+C — Inspect picker
    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+U — View source
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+S — Save page
    if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+A — Select all
    if (e.ctrlKey && (e.key === 'A' || e.key === 'a' || e.keyCode === 65)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+C — Copy
    if (e.ctrlKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67) && !e.shiftKey) {
      e.preventDefault();
      return false;
    }

    // Ctrl+X — Cut
    if (e.ctrlKey && (e.key === 'X' || e.key === 'x' || e.keyCode === 88)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+P — Print
    if (e.ctrlKey && (e.key === 'P' || e.key === 'p' || e.keyCode === 80)) {
      e.preventDefault();
      return false;
    }
  });

  // ─── Bloquear arrastar elementos ───
  document.addEventListener('dragstart', function (e) {
    e.preventDefault();
    return false;
  });

  // ─── Bloquear cópia ───
  document.addEventListener('copy', function (e) {
    e.preventDefault();
    return false;
  });

  document.addEventListener('cut', function (e) {
    e.preventDefault();
    return false;
  });

  // ─── Detecção de DevTools aberto ───
  (function detectDevTools() {
    const threshold = 160;
    let devToolsOpen = false;

    function check() {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;

      if (widthDiff || heightDiff) {
        if (!devToolsOpen) {
          devToolsOpen = true;
          document.body.innerHTML = '';
          document.body.style.cssText = 'display:flex;align-items:center;justify-content:center;min-height:100vh;background:#050507;color:#a855f7;font-family:Syne,sans-serif;font-size:1.5rem;text-align:center;padding:40px;';
          document.body.textContent = '⚠️ DevTools detectado. Feche o inspetor para continuar.';
        }
      } else {
        if (devToolsOpen) {
          devToolsOpen = false;
          location.reload();
        }
      }
    }

    setInterval(check, 1000);
  })();
})();
