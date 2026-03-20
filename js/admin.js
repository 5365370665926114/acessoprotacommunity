/**
 * Prota Community — Painel Admin
 * 100% client-side, sem PHP ou MySQL
 * v2.0 — Security hardened + toast notifications
 */
(function () {
  'use strict';

  const STORAGE_PWD = 'prota_admin_pwd';
  const STORAGE_SESSION = 'prota_admin_session';
  const STORAGE_DATA = 'prota_admin_data';
  const STORAGE_ATTEMPTS = 'prota_admin_attempts';
  const SESSION_DURATION = 30 * 60 * 1000; // 30 min
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_DURATION = 60 * 1000; // 60 sec

  let data = { categorias: [], produtos: [] };

  // ─── Toast Notification System ───
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast--${type}`;

    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };

    toast.innerHTML = `
      <span class="admin-toast__icon">${icons[type] || icons.info}</span>
      <span class="admin-toast__msg">${escapeHtml(message)}</span>
      <button class="admin-toast__close" aria-label="Fechar">&times;</button>
    `;

    toast.querySelector('.admin-toast__close').addEventListener('click', () => dismissToast(toast));
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('admin-toast--visible'));

    setTimeout(() => dismissToast(toast), 4000);
  }

  function dismissToast(toast) {
    toast.classList.remove('admin-toast--visible');
    toast.classList.add('admin-toast--leaving');
    setTimeout(() => toast.remove(), 400);
  }

  function createToastContainer() {
    const c = document.createElement('div');
    c.id = 'toast-container';
    c.className = 'admin-toast-container';
    document.body.appendChild(c);
    return c;
  }

  // ─── SHA-256 (senha não fica em texto) ───
  async function hashPassword(pwd) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(pwd));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // ─── Rate Limiting ───
  function getLoginAttempts() {
    try {
      const data = JSON.parse(sessionStorage.getItem(STORAGE_ATTEMPTS) || '{}');
      if (data.lockUntil && Date.now() > data.lockUntil) {
        sessionStorage.removeItem(STORAGE_ATTEMPTS);
        return { count: 0, lockUntil: 0 };
      }
      return { count: data.count || 0, lockUntil: data.lockUntil || 0 };
    } catch (_) {
      return { count: 0, lockUntil: 0 };
    }
  }

  function recordLoginAttempt(success) {
    if (success) {
      sessionStorage.removeItem(STORAGE_ATTEMPTS);
      return;
    }
    const attempts = getLoginAttempts();
    attempts.count += 1;
    if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
      attempts.lockUntil = Date.now() + LOCKOUT_DURATION;
    }
    sessionStorage.setItem(STORAGE_ATTEMPTS, JSON.stringify(attempts));
  }

  function isLockedOut() {
    const attempts = getLoginAttempts();
    return attempts.lockUntil > Date.now();
  }

  function getRemainingLockTime() {
    const attempts = getLoginAttempts();
    return Math.ceil((attempts.lockUntil - Date.now()) / 1000);
  }

  // ─── Auth ───
  function checkAuth() {
    const hash = localStorage.getItem(STORAGE_PWD);
    if (!hash) {
      document.getElementById('login-setup').style.display = 'block';
      return false;
    }
    const session = sessionStorage.getItem(STORAGE_SESSION);
    if (session) {
      const { exp } = JSON.parse(session);
      if (Date.now() < exp) {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'flex';
        init();
        return true;
      }
    }
    return false;
  }

  function setSession() {
    sessionStorage.setItem(STORAGE_SESSION, JSON.stringify({
      exp: Date.now() + SESSION_DURATION
    }));
  }

  function renewSession() {
    const session = sessionStorage.getItem(STORAGE_SESSION);
    if (session) {
      setSession();
    }
  }

  // ─── Password Strength ───
  function getPasswordStrength(pwd) {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    return score; // 0-5
  }

  function updatePasswordStrength() {
    const pwd = document.getElementById('setup-password')?.value || '';
    const meter = document.getElementById('password-strength');
    if (!meter) return;

    const strength = getPasswordStrength(pwd);
    const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'];
    const classes = ['', 'weak', 'fair', 'good', 'strong', 'excellent'];

    meter.className = 'password-strength ' + (pwd.length > 0 ? classes[strength] || '' : '');
    meter.innerHTML = pwd.length > 0 ? `
      <div class="password-strength__bar">
        <div class="password-strength__fill" style="width: ${strength * 20}%"></div>
      </div>
      <span class="password-strength__label">${labels[strength] || ''}</span>
    ` : '';
  }

  document.getElementById('setup-password')?.addEventListener('input', updatePasswordStrength);

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isLockedOut()) {
      const remaining = getRemainingLockTime();
      showToast(`Muitas tentativas. Aguarde ${remaining}s.`, 'error');
      return;
    }

    const pwd = document.getElementById('login-password').value;
    const hash = localStorage.getItem(STORAGE_PWD);
    const inputHash = await hashPassword(pwd);
    const err = document.getElementById('login-error');

    if (inputHash === hash) {
      recordLoginAttempt(true);
      setSession();
      err.textContent = '';
      document.getElementById('admin-login').style.display = 'none';
      document.getElementById('admin-panel').style.display = 'flex';
      init();
    } else {
      recordLoginAttempt(false);
      const attempts = getLoginAttempts();
      const remaining = MAX_LOGIN_ATTEMPTS - attempts.count;
      if (remaining > 0) {
        err.textContent = `Senha incorreta. ${remaining} tentativa${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`;
      } else {
        err.textContent = `Conta bloqueada. Aguarde ${LOCKOUT_DURATION / 1000}s.`;
      }
    }
  });

  document.getElementById('setup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd = document.getElementById('setup-password').value;
    const conf = document.getElementById('setup-confirm').value;
    const err = document.getElementById('login-error');
    if (pwd !== conf) {
      err.textContent = 'As senhas não coincidem.';
      return;
    }
    if (pwd.length < 8) {
      err.textContent = 'Mínimo 8 caracteres.';
      return;
    }
    if (getPasswordStrength(pwd) < 2) {
      err.textContent = 'Senha muito fraca. Use letras, números e símbolos.';
      return;
    }
    const h = await hashPassword(pwd);
    localStorage.setItem(STORAGE_PWD, h);
    err.textContent = '';
    document.getElementById('login-setup').style.display = 'none';
    setSession();
    document.getElementById('admin-login').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'flex';
    init();
    showToast('Senha definida com sucesso!', 'success');
  });

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    sessionStorage.removeItem(STORAGE_SESSION);
    location.reload();
  });

  // ─── Load data ───
  function loadData() {
    const override = localStorage.getItem(STORAGE_DATA);
    if (override) {
      try {
        const parsed = JSON.parse(override);
        // Validate structure
        if (parsed && Array.isArray(parsed.categorias) && Array.isArray(parsed.produtos)) {
          data = parsed;
          return;
        }
      } catch (_) {}
    }
    if (typeof PROTA_DATA !== 'undefined') {
      data = {
        categorias: JSON.parse(JSON.stringify(PROTA_DATA.categorias)),
        produtos: JSON.parse(JSON.stringify(PROTA_DATA.produtos))
      };
    }
  }

  function saveData() {
    // Actually persist to localStorage
    localStorage.setItem(STORAGE_DATA, JSON.stringify(data));
    updateOverrideStatus();
    renderAll();
    renewSession();
  }

  // ─── Validation ───
  function getProductStatus(p) {
    const hasFile = p.arquivo && String(p.arquivo).trim().length > 0;
    const isExternal = hasFile && /^https?:\/\//i.test(String(p.arquivo).trim());
    const hasImg = p.img && String(p.img).trim().length > 0;
    if (!hasFile) return { type: 'sem-arquivo', label: 'Sem arquivo/link', cls: 'status--error' };
    if (!hasImg) return { type: 'sem-img', label: 'Sem imagem', cls: 'status--warning' };
    if (isExternal) return { type: 'link', label: 'Link externo', cls: 'status--info' };
    return { type: 'ok', label: 'OK', cls: 'status--ok' };
  }

  function getAlerts() {
    const alerts = [];
    data.produtos.forEach((p, i) => {
      const st = getProductStatus(p);
      if (st.type === 'sem-arquivo' || st.type === 'sem-img') {
        alerts.push({ ...p, index: i, status: st });
      }
    });
    return alerts;
  }

  // ─── Render ───
  function renderDashboard() {
    const semArquivo = data.produtos.filter(p => !p.arquivo || !String(p.arquivo).trim()).length;
    const semImg = data.produtos.filter(p => !p.img || !String(p.img).trim()).length;
    const links = data.produtos.filter(p => p.arquivo && /^https?:\/\//i.test(String(p.arquivo))).length;

    document.getElementById('stat-produtos').textContent = data.produtos.length;
    document.getElementById('stat-categorias').textContent = data.categorias.length;
    document.getElementById('stat-sem-arquivo').textContent = semArquivo;
    document.getElementById('stat-sem-img').textContent = semImg;
    document.getElementById('stat-links').textContent = links;

    const badge = document.getElementById('alert-badge');
    const total = semArquivo + semImg;
    badge.textContent = total;
    badge.style.display = total ? 'inline' : 'none';
  }

  function renderProdutos(filter = {}) {
    const tbody = document.getElementById('produtos-tbody');
    const search = (filter.search || '').toLowerCase();
    const cat = filter.categoria || '';
    const status = filter.status || '';

    let list = data.produtos.filter((p, i) => {
      const st = getProductStatus(p);
      if (search && !p.nome.toLowerCase().includes(search) && !(p.desc || '').toLowerCase().includes(search)) return false;
      if (cat && p.cat !== cat) return false;
      if (status && st.type !== status) return false;
      return true;
    });

    const getCatNome = id => data.categorias.find(c => c.id === id)?.nome || id;

    tbody.innerHTML = list.map((p, idx) => {
      const origIdx = data.produtos.indexOf(p);
      const st = getProductStatus(p);
      return `
        <tr data-index="${origIdx}">
          <td><strong>${escapeHtml(p.nome)}</strong></td>
          <td>${escapeHtml(getCatNome(p.cat))}</td>
          <td><code class="admin-code">${escapeHtml((p.arquivo || '-').substring(0, 40))}${(p.arquivo || '').length > 40 ? '…' : ''}</code></td>
          <td>${p.img ? '<span class="admin-badge status--ok">✓</span>' : '<span class="text-muted">—</span>'}</td>
          <td><span class="admin-badge ${st.cls}">${st.label}</span></td>
          <td>
            <button type="button" class="btn-icon btn-edit" data-index="${origIdx}" title="Editar">✎</button>
            <button type="button" class="btn-icon btn-duplicate" data-index="${origIdx}" title="Duplicar">⧉</button>
            <button type="button" class="btn-icon btn-delete" data-index="${origIdx}" title="Excluir">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openProdutoModal(parseInt(btn.dataset.index, 10)));
    });
    tbody.querySelectorAll('.btn-duplicate').forEach(btn => {
      btn.addEventListener('click', () => duplicateProduct(parseInt(btn.dataset.index, 10)));
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(parseInt(btn.dataset.index, 10)));
    });
  }

  function renderAlertas() {
    const alerts = getAlerts();
    const div = document.getElementById('alertas-list');
    const getCatNome = id => data.categorias.find(c => c.id === id)?.nome || id;

    if (!alerts.length) {
      div.innerHTML = `
        <div class="admin-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--success); margin-bottom: 12px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
          <p>Nenhum alerta. Todos os produtos estão OK.</p>
        </div>`;
      return;
    }

    div.innerHTML = alerts.map(a => `
      <div class="admin-alert-card" data-index="${a.index}">
        <div class="admin-alert-card__main">
          <h4>${escapeHtml(a.nome)}</h4>
          <p><span class="admin-badge ${a.status.cls}">${a.status.label}</span> · ${escapeHtml(getCatNome(a.cat))}</p>
          ${!a.arquivo || !String(a.arquivo).trim() ? '<p class="text-warning">Adicione um arquivo ou link de download.</p>' : ''}
          ${(!a.img || !String(a.img).trim()) && a.arquivo ? '<p class="text-muted">Imagem opcional — produto tem arquivo.</p>' : ''}
        </div>
        <button type="button" class="btn btn--primary btn-sm" data-edit="${a.index}">Editar</button>
      </div>
    `).join('');

    div.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => openProdutoModal(parseInt(btn.dataset.edit, 10)));
    });
  }

  function renderCategorias() {
    const div = document.getElementById('categorias-list');
    div.innerHTML = data.categorias.map((c, i) => {
      const count = data.produtos.filter(p => p.cat === c.id).length;
      return `
        <div class="admin-category-card" data-index="${i}">
          <div class="admin-category-card__body">
            <h4>${escapeHtml(c.nome)}</h4>
            <p><code>${escapeHtml(c.id)}</code> · ${count} produtos</p>
          </div>
          <div class="admin-category-card__actions">
            <button type="button" class="btn btn--ghost btn-sm btn-edit-cat" data-index="${i}">Editar</button>
            <button type="button" class="btn btn--ghost btn-sm btn-delete-cat" data-index="${i}" ${count > 0 ? 'disabled title="Remova os produtos antes"' : ''}>Excluir</button>
          </div>
        </div>
      `;
    }).join('');

    div.querySelectorAll('.btn-edit-cat').forEach(btn => {
      btn.addEventListener('click', () => openCategoriaModal(parseInt(btn.dataset.index, 10)));
    });
    div.querySelectorAll('.btn-delete-cat').forEach(btn => {
      btn.addEventListener('click', () => deleteCategoria(parseInt(btn.dataset.index, 10)));
    });
  }

  function renderAll() {
    renderDashboard();
    renderProdutos(getFilters());
    renderAlertas();
    renderCategorias();
    fillCategorySelects();
  }

  function fillCategorySelects() {
    const opts = data.categorias.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`).join('');
    document.querySelectorAll('#filter-categoria, #produto-categoria').forEach(el => {
      if (el.id === 'filter-categoria') {
        el.innerHTML = '<option value="">Todas categorias</option>' + opts;
      } else {
        el.innerHTML = opts;
      }
    });
  }

  function getFilters() {
    return {
      search: document.getElementById('search-produtos')?.value || '',
      categoria: document.getElementById('filter-categoria')?.value || '',
      status: document.getElementById('filter-status')?.value || ''
    };
  }

  // ─── Produto CRUD ───
  function openProdutoModal(index) {
    const modal = document.getElementById('modal-produto');
    const form = document.getElementById('form-produto');
    form.reset();
    document.getElementById('produto-index').value = String(index);

    if (index >= 0) {
      document.getElementById('modal-produto-title').textContent = 'Editar produto';
      const p = data.produtos[index];
      document.getElementById('produto-nome').value = p.nome;
      document.getElementById('produto-categoria').value = p.cat;
      document.getElementById('produto-arquivo').value = p.arquivo || '';
      document.getElementById('produto-img').value = p.img || '';
      document.getElementById('produto-desc').value = p.desc || '';
    } else {
      document.getElementById('modal-produto-title').textContent = 'Novo produto';
    }
    modal.classList.add('open');
  }

  document.getElementById('form-produto')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = parseInt(document.getElementById('produto-index').value, 10);

    // Sanitize inputs
    const nome = document.getElementById('produto-nome').value.trim();
    const arquivo = document.getElementById('produto-arquivo').value.trim();
    const img = document.getElementById('produto-img').value.trim();
    const desc = document.getElementById('produto-desc').value.trim();
    const cat = document.getElementById('produto-categoria').value;

    // Validate external URLs
    if (arquivo && /^https?:\/\//i.test(arquivo)) {
      try {
        new URL(arquivo);
      } catch (_) {
        showToast('URL do arquivo inválida.', 'error');
        return;
      }
    }

    const produto = { cat, nome, arquivo, img, desc };

    if (index >= 0) {
      data.produtos[index] = produto;
      showToast('Produto atualizado.', 'success');
    } else {
      data.produtos.push(produto);
      showToast('Produto adicionado.', 'success');
    }
    closeModal('modal-produto');
    saveData();
  });

  function duplicateProduct(index) {
    const p = { ...data.produtos[index], nome: data.produtos[index].nome + ' (cópia)' };
    data.produtos.splice(index + 1, 0, p);
    saveData();
    showToast('Produto duplicado.', 'success');
  }

  function deleteProduct(index) {
    const nome = data.produtos[index]?.nome || 'este produto';
    // Use a custom confirm dialog approach
    if (!confirm('Excluir "' + nome + '"?')) return;
    data.produtos.splice(index, 1);
    saveData();
    showToast('Produto excluído.', 'success');
  }

  // ─── Categoria CRUD ───
  function openCategoriaModal(index) {
    const modal = document.getElementById('modal-categoria');
    const form = document.getElementById('form-categoria');
    form.reset();
    document.getElementById('categoria-index').value = String(index);

    if (index >= 0) {
      document.getElementById('modal-categoria-title').textContent = 'Editar categoria';
      const c = data.categorias[index];
      document.getElementById('categoria-id').value = c.id;
      document.getElementById('categoria-id').readOnly = true;
      document.getElementById('categoria-nome').value = c.nome;
      document.getElementById('categoria-icon').value = c.icon || 'folder';
    } else {
      document.getElementById('modal-categoria-title').textContent = 'Nova categoria';
      document.getElementById('categoria-id').readOnly = false;
    }
    modal.classList.add('open');
  }

  document.getElementById('form-categoria')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = parseInt(document.getElementById('categoria-index').value, 10);
    const id = document.getElementById('categoria-id').value.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
    const nome = document.getElementById('categoria-nome').value.trim();
    const icon = document.getElementById('categoria-icon').value;

    if (!id || !nome) {
      showToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }

    if (index >= 0) {
      const oldId = data.categorias[index].id;
      data.categorias[index] = { id: oldId, nome, icon };
      showToast('Categoria atualizada.', 'success');
    } else {
      if (data.categorias.some(c => c.id === id)) {
        showToast('Já existe uma categoria com este ID.', 'error');
        return;
      }
      data.categorias.push({ id, nome, icon });
      showToast('Categoria adicionada.', 'success');
    }
    closeModal('modal-categoria');
    saveData();
  });

  function deleteCategoria(index) {
    const c = data.categorias[index];
    const count = data.produtos.filter(p => p.cat === c.id).length;
    if (count > 0) {
      showToast('Remova os ' + count + ' produtos desta categoria antes.', 'warning');
      return;
    }
    if (!confirm('Excluir a categoria "' + c.nome + '"?')) return;
    data.categorias.splice(index, 1);
    saveData();
    showToast('Categoria excluída.', 'success');
  }

  // ─── Modals ───
  function closeModal(id) {
    document.getElementById(id).classList.remove('open');
  }

  document.querySelectorAll('.admin-modal__backdrop, .admin-modal__close, .admin-modal-cancel').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.admin-modal.open').forEach(m => m.classList.remove('open'));
    });
  });

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.admin-modal.open').forEach(m => m.classList.remove('open'));
    }
  });

  // ─── Tabs ───
  document.querySelectorAll('.admin-nav__item[data-tab]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.dataset.tab;
      document.querySelectorAll('.admin-nav__item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      item.classList.add('active');
      const panel = document.getElementById('tab-' + tab);
      if (panel) panel.classList.add('active');
      const titles = { dashboard: 'Dashboard', produtos: 'Produtos', alertas: 'Alertas', categorias: 'Categorias', exportar: 'Exportar / Importar' };
      document.getElementById('admin-title').textContent = titles[tab] || '';
      renewSession();
    });
  });

  // Quick action buttons (NOT in nav)
  document.querySelectorAll('[data-action="add-product"]').forEach(btn => {
    btn.addEventListener('click', () => openProdutoModal(-1));
  });
  document.querySelector('[data-action="add-category"]')?.addEventListener('click', () => openCategoriaModal(-1));

  // Quick action "Ver alertas" button
  document.querySelector('.admin-quick-actions [data-tab="alertas"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    // Switch to alertas tab
    document.querySelectorAll('.admin-nav__item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    const navItem = document.querySelector('.admin-nav__item[data-tab="alertas"]');
    if (navItem) navItem.classList.add('active');
    const panel = document.getElementById('tab-alertas');
    if (panel) panel.classList.add('active');
    document.getElementById('admin-title').textContent = 'Alertas';
    renderAlertas();
  });

  // ─── Filters ───
  document.getElementById('search-produtos')?.addEventListener('input', () => renderProdutos(getFilters()));
  document.getElementById('filter-categoria')?.addEventListener('change', () => renderProdutos(getFilters()));
  document.getElementById('filter-status')?.addEventListener('change', () => renderProdutos(getFilters()));

  // ─── Export / Import ───
  function generateDataJS() {
    const catStr = JSON.stringify(data.categorias, null, 2).replace(/^/gm, '    ');
    const prodStr = JSON.stringify(data.produtos, null, 2).replace(/^/gm, '    ');
    return `/**
 * PROTA COMMUNITY — Dados de todos os produtos
 * Gerado pelo painel admin
 */
var PROTA_DATA = {
  categorias: ${catStr.trim()},
  produtos: ${prodStr.trim()}
};
`;
  }

  document.getElementById('btn-export-js')?.addEventListener('click', () => {
    const blob = new Blob([generateDataJS()], { type: 'application/javascript' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.js';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Arquivo data.js exportado.', 'success');
  });

  document.getElementById('btn-apply')?.addEventListener('click', () => {
    localStorage.setItem(STORAGE_DATA, JSON.stringify(data));
    updateOverrideStatus();
    showToast('Alterações aplicadas no navegador.', 'success');
  });

  document.getElementById('btn-remove-override')?.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_DATA);
    loadData();
    updateOverrideStatus();
    renderAll();
    showToast('Override removido. Dados originais restaurados.', 'info');
  });

  function updateOverrideStatus() {
    const el = document.getElementById('override-status');
    if (localStorage.getItem(STORAGE_DATA)) {
      el.textContent = '● Alterações aplicadas no navegador';
      el.classList.add('admin-status--active');
    } else {
      el.textContent = '';
      el.classList.remove('admin-status--active');
    }
  }

  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('import-file').click();
  });

  document.getElementById('import-file')?.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    // File size check (max 5MB)
    if (f.size > 5 * 1024 * 1024) {
      showToast('Arquivo muito grande. Máximo 5MB.', 'error');
      e.target.value = '';
      return;
    }

    const r = new FileReader();
    r.onload = () => {
      try {
        const json = JSON.parse(r.result);

        // Strict validation
        if (!json || typeof json !== 'object') throw new Error('Invalid');
        if (!Array.isArray(json.categorias)) throw new Error('categorias must be array');
        if (!Array.isArray(json.produtos)) throw new Error('produtos must be array');

        // Validate each category has required fields
        json.categorias.forEach(c => {
          if (!c.id || !c.nome) throw new Error('Categoria inválida');
          c.id = String(c.id).trim();
          c.nome = String(c.nome).trim();
          c.icon = String(c.icon || 'folder').trim();
        });

        // Validate each product has required fields
        json.produtos.forEach(p => {
          if (!p.nome || !p.cat) throw new Error('Produto inválido');
          p.nome = String(p.nome).trim();
          p.cat = String(p.cat).trim();
          p.arquivo = String(p.arquivo || '').trim();
          p.img = String(p.img || '').trim();
          p.desc = String(p.desc || '').trim();
        });

        data.categorias = json.categorias;
        data.produtos = json.produtos;
        saveData();
        showToast(`Importado: ${json.categorias.length} categorias, ${json.produtos.length} produtos.`, 'success');
      } catch (err) {
        showToast('JSON inválido: ' + err.message, 'error');
      }
      e.target.value = '';
    };
    r.readAsText(f);
  });

  function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  // ─── Init ───
  function init() {
    loadData();
    fillCategorySelects();
    renderAll();
    updateOverrideStatus();
  }

  if (checkAuth()) return;

  // Session check (renew on activity)
  let sessionCheck = setInterval(() => {
    const s = sessionStorage.getItem(STORAGE_SESSION);
    if (!s) return clearInterval(sessionCheck);
    const { exp } = JSON.parse(s);
    if (Date.now() > exp) {
      clearInterval(sessionCheck);
      sessionStorage.removeItem(STORAGE_SESSION);
      location.reload();
    }
  }, 60000);
})();
