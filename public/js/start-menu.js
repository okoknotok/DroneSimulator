(function startMenuModule(global) {
  const MENU_MODES = [
    {
      id: 'programming',
      accent: 'player',
      icon: '🧩',
      title: '編程模式',
      navHint: '18 關入門',
      desc: '使用 Blockly 積木編程控制無人機，挑戰 18 個關卡（含 3 個 AI 自動駕駛大關）。',
      tags: ['📘 18 關', '🧠 邏輯思維', '♾️ 自動巡邏'],
      statsKey: 'programming',
      cta: '開始編程 →',
    },
    {
      id: 'mission',
      accent: 'gold',
      icon: '📚',
      title: '任務故事模式',
      navHint: '情境任務',
      desc: '進入校園巡邏、災區搜救、農田巡檢、倉庫送貨和太空基地探索，用編程完成情境任務。',
      tags: ['📖 故事任務', '🎯 情境目標', '🏅 任務評級'],
      statsKey: 'mission',
      cta: '接受任務 →',
    },
    {
      id: 'battle',
      accent: 'cpu',
      icon: '⚔️',
      title: '編程對決',
      navHint: '限時對決',
      desc: '限時寫好 Blockly 程式，再與電腦 AI 同場競速！三局兩勝，鬥快完成目標。',
      tags: ['🤖 電腦對手', '⏱️ 限時編程', '🏁 同步競速'],
      statsKey: 'battle',
      featured: true,
      cta: '進入對決 →',
    },
    {
      id: 'freeflight',
      accent: 'neon',
      icon: '🌃',
      title: '無盡 Cyberpunk',
      navHint: '手動操控',
      desc: '5 階段越來越誇張的賽博龐克世界！射擊紅球、收集金幣、閃避能量牆，挑戰你的反應極限。',
      tags: ['🌃 5 種場景', '💥 真實子彈', '🔥 越來越快'],
      statsKey: 'freeflight',
      cta: '起飛衝刺 →',
    },
    {
      id: 'builder',
      accent: 'builder',
      icon: '🏗️',
      title: '關卡設計',
      navHint: '自由設計',
      desc: '自己設計關卡！放置障礙物、設定起終點、加寶物，然後分享關卡碼畀同學挑戰。',
      tags: ['🏗️ 自由設計', '📤 分享關卡', '📥 匯入挑戰'],
      statsKey: 'builder',
      cta: '開啟設計器 →',
    },
  ];

  let selectedId = 'programming';
  let ctx = {};
  let missionStats = { completed: 0, total: 0 };

  function getMode(id) {
    return MENU_MODES.find((m) => m.id === id) || MENU_MODES[0];
  }

  function getSelectedIndex() {
    return Math.max(0, MENU_MODES.findIndex((m) => m.id === selectedId));
  }

  function renderNav() {
    const nav = document.getElementById('menuNavList');
    if (!nav) return;
    nav.innerHTML = MENU_MODES.map((mode) => {
      const active = mode.id === selectedId ? ' active' : '';
      const featured = mode.featured ? ' featured' : '';
      return `
        <button type="button" class="menu-nav-item${active}${featured}" data-mode="${mode.id}" aria-current="${mode.id === selectedId ? 'true' : 'false'}">
          <span class="menu-nav-icon">${mode.icon}</span>
          <span class="menu-nav-text">
            <span class="menu-nav-label">${mode.title}</span>
            <span class="menu-nav-hint">${mode.navHint || ''}</span>
          </span>
          ${mode.featured ? '<span class="menu-nav-badge">NEW</span>' : ''}
        </button>
      `;
    }).join('');
    nav.querySelectorAll('.menu-nav-item').forEach((btn) => {
      btn.addEventListener('click', () => selectMode(btn.dataset.mode));
    });
  }

  function buildProgressBlock(label, completed, total) {
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return `
      <div class="menu-progress-block">
        <div class="menu-progress-head"><span>${label}</span><em>${completed}/${total}</em></div>
        <div class="menu-progress-bar"><div class="menu-progress-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }

  function triggerSwapAnimation() {
    const inner = document.querySelector('.menu-hero-copy-inner');
    if (!inner) return;
    inner.classList.remove('menu-content-swap');
    void inner.offsetWidth;
    inner.classList.add('menu-content-swap');
  }

  function renderHero() {
    const mode = getMode(selectedId);
    const hero = document.getElementById('menuHero');
    const icon = document.getElementById('menuHeroIcon');
    const title = document.getElementById('menuHeroTitle');
    const desc = document.getElementById('menuHeroDesc');
    const tags = document.getElementById('menuHeroTags');
    const stats = document.getElementById('menuHeroStats');
    const cta = document.getElementById('menuCta');

    if (hero) {
      hero.dataset.mode = mode.id;
      hero.dataset.accent = mode.accent;
    }
    if (icon) icon.textContent = mode.icon;
    if (title) title.textContent = mode.title;
    if (desc) desc.textContent = mode.desc;
    if (tags) {
      tags.innerHTML = mode.tags.map((tag) => `<span class="menu-hero-tag">${tag}</span>`).join('');
    }
    if (stats) stats.innerHTML = buildStatsHtml(mode);
    if (cta) cta.textContent = mode.cta;

    document.querySelectorAll('.menu-nav-item').forEach((btn) => {
      const isActive = btn.dataset.mode === selectedId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  function buildStatsHtml(mode) {
    const items = [];
    if (mode.statsKey === 'programming' && ctx.getProgrammingStats) {
      const { completed, total } = ctx.getProgrammingStats();
      items.push(buildProgressBlock('關卡完成', completed, total));
    }
    if (mode.statsKey === 'mission') {
      items.push(buildProgressBlock('任務完成', missionStats.completed, missionStats.total));
    }
    if (mode.statsKey === 'battle' && ctx.getBattleStats) {
      const s = ctx.getBattleStats();
      items.push(`<span class="menu-stat"><em>${s.wins || 0}</em> 勝 <em>${s.losses || 0}</em> 負</span>`);
      if (s.matches) items.push(`<span class="menu-stat">共 <em>${s.matches}</em> 場對決</span>`);
    }
    if (mode.statsKey === 'freeflight') {
      items.push('<span class="menu-stat">WASD 操控 · 滑鼠射擊</span>');
    }
    if (mode.statsKey === 'builder') {
      const hasDraft = ctx.hasBuilderDraft?.();
      items.push(`<span class="menu-stat">${hasDraft ? '有未完成的關卡草稿' : '從零開始設計關卡'}</span>`);
    }
    return items.length ? items.join('') : '';
  }

  function selectMode(id) {
    if (!getMode(id) || id === selectedId) return;
    selectedId = id;
    const mode = getMode(id);
    renderNav();
    renderHero();
    triggerSwapAnimation();
    ctx.onModeChange?.(mode);
  }

  function selectRelative(delta) {
    const idx = getSelectedIndex();
    const next = (idx + delta + MENU_MODES.length) % MENU_MODES.length;
    selectMode(MENU_MODES[next].id);
  }

  function enterSelected() {
    if (typeof ctx.onEnter === 'function') ctx.onEnter(selectedId);
    else if (typeof global.enterMode === 'function') global.enterMode(selectedId);
  }

  function toggleSettings(open) {
    const drawer = document.getElementById('menuSettingsDrawer');
    const backdrop = document.getElementById('menuSettingsBackdrop');
    const on = Boolean(open);
    drawer?.classList.toggle('open', on);
    backdrop?.classList.toggle('show', on);
    document.body.classList.toggle('menu-settings-open', on);
  }

  function refreshUserChip() {
    const chip = document.getElementById('menuUserChipLabel');
    if (!chip || typeof ctx.getUserLabel !== 'function') return;
    chip.textContent = ctx.getUserLabel();
  }

  function refreshStats() {
    renderHero();
  }

  function setMissionStats(completed, total) {
    missionStats = { completed, total };
    if (selectedId === 'mission') renderHero();
  }

  function bindEvents() {
    document.getElementById('menuCta')?.addEventListener('click', enterSelected);
    document.addEventListener('keydown', (event) => {
      const menu = document.getElementById('startMenu');
      if (!menu?.classList.contains('show')) return;
      if (document.body.classList.contains('menu-settings-open')) {
        if (event.key === 'Escape') toggleSettings(false);
        return;
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        selectRelative(-1);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        selectRelative(1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        enterSelected();
      }
    });
  }

  function init(options = {}) {
    ctx = options;
    renderNav();
    renderHero();
    refreshUserChip();
    bindEvents();
    const mode = getMode(selectedId);
    ctx.onModeChange?.(mode);
  }

  global.StartMenu = {
    init,
    selectMode,
    enterSelected,
    toggleSettings,
    refreshStats,
    refreshUserChip,
    setMissionStats,
    getSelectedId: () => selectedId,
  };
})(window);
