/**
 * Prota Community — Site de Downloads v2.0
 * Renderização, animações, partículas, navegação
 */
(function () {
  'use strict';

  // ─── Customer Gate ───
  const GATE_SESSION_KEY = 'prota_customer_session';
  const customerGate = document.getElementById('customer-gate');

  function isCustomerVerified() {
    try {
      const session = JSON.parse(sessionStorage.getItem(GATE_SESSION_KEY));
      if (
        session &&
        typeof session.token === 'string' &&
        /^[a-f0-9]{64}$/.test(session.token) &&
        typeof session.exp === 'number' &&
        session.exp > Date.now() &&
        session.exp < Date.now() + (25 * 60 * 60 * 1000) // max 25h, prevents absurd values
      ) {
        return true;
      }
      sessionStorage.removeItem(GATE_SESSION_KEY);
    } catch (_) {
      sessionStorage.removeItem(GATE_SESSION_KEY);
    }
    return false;
  }

  if (customerGate) {
    if (isCustomerVerified()) {
      customerGate.classList.add('hidden');
    } else {
      customerGate.classList.remove('hidden');
      document.body.style.overflow = 'hidden';

      // CPF mask
      const cpfInput = document.getElementById('gate-cpf');
      if (cpfInput) {
        cpfInput.addEventListener('input', function () {
          let v = this.value.replace(/\D/g, '').substring(0, 11);
          if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
          else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
          else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
          this.value = v;
        });
      }

      // Form submit
      const gateForm = document.getElementById('gate-form');
      if (gateForm) {
        gateForm.addEventListener('submit', async function (e) {
          e.preventDefault();

          const email = document.getElementById('gate-email').value.trim();
          const cpfRaw = document.getElementById('gate-cpf').value.replace(/\D/g, '');
          const errorEl = document.getElementById('gate-error');
          const submitBtn = document.getElementById('gate-submit');
          const btnText = document.getElementById('gate-btn-text');
          const btnLoading = document.getElementById('gate-btn-loading');

          errorEl.textContent = '';

          if (!email || cpfRaw.length !== 11) {
            errorEl.textContent = 'Preencha email e CPF corretamente.';
            return;
          }

          // Loading state
          submitBtn.disabled = true;
          btnText.style.display = 'none';
          btnLoading.style.display = 'inline-flex';

          try {
            // Tentar múltiplos endpoints: Netlify, Vercel, XAMPP
            const apiUrls = ['/.netlify/functions/verify', '/api/verify', 'api/verify.php'];
            let lastError = null;
            let data = null;

            for (const apiUrl of apiUrls) {
              try {
                const res = await fetch(apiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: email, cpf: cpfRaw })
                });

                const text = await res.text();
                try {
                  data = JSON.parse(text);
                } catch (parseErr) {
                  console.error('[Prota] Resposta não é JSON de ' + apiUrl + ':', text.substring(0, 200));
                  lastError = 'Resposta inválida do servidor (' + apiUrl + ')';
                  continue; // Tentar próximo URL
                }

                // Se chegou aqui, temos uma resposta JSON válida
                lastError = null;
                break;
              } catch (fetchErr) {
                console.error('[Prota] Fetch falhou para ' + apiUrl + ':', fetchErr.message);
                lastError = fetchErr.message;
                continue; // Tentar próximo URL
              }
            }

            if (!data) {
              errorEl.textContent = 'Erro de conexão. Tente novamente. (' + (lastError || 'sem resposta') + ')';
              return;
            }

            if (data.success) {
              // Save session (24 hours)
              sessionStorage.setItem(GATE_SESSION_KEY, JSON.stringify({
                token: data.token,
                name: data.name || '',
                exp: Date.now() + (24 * 60 * 60 * 1000)
              }));

              customerGate.style.transition = 'opacity 0.5s';
              customerGate.style.opacity = '0';
              setTimeout(() => {
                customerGate.classList.add('hidden');
                customerGate.style.opacity = '';
                document.body.style.overflow = '';
              }, 500);
            } else {
              errorEl.textContent = data.error || 'Compra não encontrada. Verifique seus dados.';
            }
          } catch (err) {
            errorEl.textContent = 'Erro inesperado: ' + err.message;
          } finally {
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
          }
        });
      }
    }
  }
  // ─── End Customer Gate ───

  const { categorias, produtos } = PROTA_DATA;

  // ─── Announcement bar ───
  const announcementBar = document.getElementById('announcement-bar');
  const closeAnnouncement = document.getElementById('close-announcement');
  if (announcementBar && sessionStorage.getItem('prota_announcement_closed')) {
    announcementBar.classList.add('hidden');
  }
  if (closeAnnouncement) {
    closeAnnouncement.addEventListener('click', () => {
      announcementBar.classList.add('hidden');
      sessionStorage.setItem('prota_announcement_closed', '1');
    });
  }

  function iconSvg(key) {
    const k = key || 'folder';
    const icons = window.ICONS || {};
    return icons[k] || icons.folder || '';
  }

  // ─── Animated counter ───
  function animateCounter(el, target, duration) {
    if (!el) return;
    const start = 0;
    const startTime = performance.now();
    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // Total de produtos (with animated counter)
  const totalEl = document.getElementById('total-produtos');
  if (totalEl) {
    animateCounter(totalEl, produtos.length, 1200);
  }

  function getFileType(arquivo) {
    const ext = (arquivo || '').split('.').pop()?.toUpperCase();
    if (ext === 'PDF') return 'PDF';
    if (['ZIP', 'RAR', '7Z'].includes(ext)) return ext;
    if (ext === 'APK') return 'App';
    if (arquivo?.startsWith('http')) return 'Link';
    return 'Download';
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ─── Particle System ───
  const canvas = document.getElementById('particle-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;
    let width, height;

    function resizeCanvas() {
      const hero = canvas.parentElement;
      width = canvas.width = hero.offsetWidth;
      height = canvas.height = hero.offsetHeight;
    }

    function createParticle() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.01 + 0.005
      };
    }

    function initParticles() {
      resizeCanvas();
      const count = Math.min(Math.floor((width * height) / 12000), 120);
      particles = Array.from({ length: count }, createParticle);
    }

    function drawParticles() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        // Wrap around
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const alpha = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 130, 247, ${alpha})`;
        ctx.fill();
      });

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.08;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(168, 130, 247, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(drawParticles);
    }

    // Throttled resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(initParticles, 200);
    }, { passive: true });

    // Only run particles when hero is visible
    const heroObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!animId) drawParticles();
        } else {
          if (animId) {
            cancelAnimationFrame(animId);
            animId = null;
          }
        }
      });
    }, { threshold: 0 });

    initParticles();
    heroObs.observe(canvas.parentElement);
  }

  // ─── Header scroll ───
  const header = document.getElementById('header');
  if (header) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          header.classList.toggle('scrolled', window.scrollY > 60);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ─── Mobile menu ───
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ─── Back to top ───
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 600);
    }, { passive: true });
    backToTop.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ─── Reveal on scroll ───
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

  document.querySelectorAll('[data-reveal]').forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i * 0.06, 0.5)}s`;
    revealObserver.observe(el);
  });

  // ─── Renderizar categorias ───
  const catGrid = document.getElementById('categorias-grid');
  if (catGrid) {
    const counts = {};
    produtos.forEach(p => { counts[p.cat] = (counts[p.cat] || 0) + 1; });

    catGrid.innerHTML = categorias.map(cat => {
      const count = counts[cat.id] || 0;
      return `
        <a href="#produtos" class="categoria-card" data-cat="${cat.id}">
          <span class="categoria-card__icon icon-svg">${iconSvg(cat.icon)}</span>
          <span class="categoria-card__nome">${cat.nome}</span>
          <span class="categoria-card__count">${count} produtos</span>
        </a>
      `;
    }).join('');

    catGrid.querySelectorAll('.categoria-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        catGrid.querySelectorAll('.categoria-card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectCategory(btn.dataset.cat);
      });
    });
  }

  const produtosEmpty = document.getElementById('produtos-empty');
  const produtosContent = document.getElementById('produtos-content');
  const produtosTitulo = document.getElementById('produtos-titulo');

  function selectCategory(catId) {
    if (!catId) return;
    const catInfo = categorias.find(c => c.id === catId);
    if (produtosEmpty) produtosEmpty.style.display = 'none';
    if (produtosContent) {
      produtosContent.style.display = 'block';
      requestAnimationFrame(() => {
        produtosContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (produtosTitulo && catInfo) produtosTitulo.textContent = catInfo.nome;
    filterProducts(catId, document.getElementById('search')?.value || '');
  }

  function resetToEmptyState() {
    if (produtosEmpty) produtosEmpty.style.display = 'flex';
    if (produtosContent) produtosContent.style.display = 'none';
    if (produtosTitulo) produtosTitulo.textContent = 'Catálogo';
  }

  // ─── Renderizar produtos ───
  const prodGrid = document.getElementById('produtos-grid');
  const countDisplay = document.getElementById('count-display');
  let currentFilter = { cat: null, search: '' };

  function renderProducts(list) {
    if (!prodGrid) return;

    const TELEGRAM_LINK = 'https://t.me/+m_qDQVmBiHc1ODYx';

    prodGrid.innerHTML = list.map((p, i) => {
      const catInfo = categorias.find(c => c.id === p.cat);
      const iconKey = catInfo?.icon || 'folder';
      const thumbContent = p.img
        ? `<img src="${p.img}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="produto-card__thumb-fallback" style="display:none"><span class="placeholder-icon icon-svg">${iconSvg(iconKey)}</span></div>`
        : `<div class="produto-card__thumb-fallback"><span class="placeholder-icon icon-svg">${iconSvg(iconKey)}</span></div>`;

      return `
        <article class="produto-card" data-delay="${i}" data-cat="${p.cat}">
          <div class="produto-card__thumb">
            <span class="produto-card__badge">Telegram</span>
            ${thumbContent}
          </div>
          <div class="produto-card__body">
            <h3>${escapeHtml(p.nome)}</h3>
            <p>${escapeHtml(p.desc)}</p>
            <a href="${TELEGRAM_LINK}" class="produto-card__btn" target="_blank" rel="noopener">
              <span>Baixar no Telegram</span>
              <span class="icon-svg">${iconSvg('telegram')}</span>
            </a>
          </div>
        </article>
      `;
    }).join('');

    const cards = prodGrid.querySelectorAll('.produto-card');
    const cardObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { rootMargin: '0px 0px -50px 0px', threshold: 0 });

    cards.forEach((card, i) => {
      // Reset visible state for proper re-animation
      card.classList.remove('visible');
      card.style.transitionDelay = `${Math.min(i * 0.05, 0.6)}s`;
      cardObs.observe(card);
    });

    if (countDisplay) countDisplay.textContent = list.length;
  }

  function filterProducts(cat, search) {
    currentFilter = { cat: cat || null, search: (search || '').toLowerCase().trim() };
    let filtered = produtos;
    if (currentFilter.cat) filtered = filtered.filter(p => p.cat === currentFilter.cat);
    if (currentFilter.search) {
      filtered = filtered.filter(p =>
        p.nome.toLowerCase().includes(currentFilter.search) ||
        (p.desc && p.desc.toLowerCase().includes(currentFilter.search))
      );
    }
    renderProducts(filtered);
  }

  // Busca
  const searchInput = document.getElementById('search');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const activeCat = document.querySelector('.categoria-card.active');
        filterProducts(activeCat?.dataset.cat || null, e.target.value);
      }, 150);
    });
  }

  resetToEmptyState();

  // Hidratar ícones data-icon
  document.querySelectorAll('.icon-svg[data-icon]').forEach(el => {
    const key = el.dataset.icon;
    if (window.ICONS && window.ICONS[key]) el.innerHTML = window.ICONS[key];
  });

  const searchIconEl = document.getElementById('search-icon-svg');
  if (searchIconEl && window.ICONS?.search) searchIconEl.innerHTML = window.ICONS.search;

  // Botão trocar categoria
  const clearBtn = document.getElementById('clear-filter');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.querySelectorAll('.categoria-card').forEach(b => b.classList.remove('active'));
      if (searchInput) searchInput.value = '';
      resetToEmptyState();
      document.getElementById('categorias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      // Don't interfere with categoria-card clicks
      if (this.classList.contains('categoria-card')) return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ─── Keyboard navigation ───
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      // Close mobile nav
      if (nav?.classList.contains('open')) {
        nav.classList.remove('open');
        burger?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    }
  });
})();
