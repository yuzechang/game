/* ===== RetroFC — Neo Arcade 主逻辑（双语版 + 打赏）===== */

/* ── 国际化文案映射 ── */
const I18N_MAP = {
  'status-standby':     ['待机中', 'Standby'],
  'standby-subtitle':   ['选择一款经典游戏，开始放松', 'Pick a classic game and relax'],
  'standby-start-btn':  ['浏览游戏库', 'Browse Game Library'],
  'btn-reset':          ['↺ 重置', '↺ Reset'],
  'btn-change-game':    ['浏览游戏库', 'Game Library'],
  'modal-title':        ['游戏库', 'Game Library'],
  'search-placeholder': ['搜索游戏...', 'Search games...'],
  'donate-title':       ['☕ 支持作者', '☕ Support the Author'],
  'donate-tab-cn':      ['🇨🇳 国内打赏', '🇨🇳 China'],
  'donate-tab-intl':    ['🌍 International', '🌍 International'],
  'donate-msg-cn':      ['感谢您的支持！<br>微信/支付宝扫码打赏', 'Thanks for your support!<br>Scan WeChat/Alipay QR code'],
  'donate-msg-intl':    ['Thanks for your support!<br>Every coffee keeps the games coming ☕', 'Thanks for your support!<br>Every coffee keeps the games coming ☕'],
  'playing-badge':      ['游戏中', 'Playing'],
  'loading-text':       ['加载中...', 'Loading...'],
  'toast-reset':        ['已重置', 'Reset'],
  'toast-not-found':    ['找不到游戏模块', 'Game module not found'],
  'toast-switch':       ['已切换为中文', 'Switched to English'],
};

function _i18n(key) {
  const pair = I18N_MAP[key] || [key, key];
  return i18n(pair[0], pair[1]);
}

/* ── 游戏操作提示（中英双语，结构化）── */
const GAME_HINTS = {
  snake: {
    zh: [
      { key: '↑ ↓ ← →', label: '控制蛇的移动方向' },
      { key: 'Space',    label: '暂停 / 继续游戏' },
      { key: 'R',        label: '重新开始' },
    ],
    en: [
      { key: '↑ ↓ ← →', label: 'Steer the snake' },
      { key: 'Space',    label: 'Pause / Resume' },
      { key: 'R',        label: 'Restart' },
    ],
  },
  g2048: {
    zh: [
      { key: '↑ ↓ ← →', label: '移动所有方块' },
      { key: 'R',        label: '重新开始' },
    ],
    en: [
      { key: '↑ ↓ ← →', label: 'Move all tiles' },
      { key: 'R',        label: 'Restart' },
    ],
  },
  memory: {
    zh: [
      { key: '🖱 左键点击', label: '翻开卡片' },
      { key: 'R',          label: '重新开始' },
    ],
    en: [
      { key: '🖱 Left Click', label: 'Flip a card' },
      { key: 'R',            label: 'Restart' },
    ],
  },
  breakout: {
    zh: [
      { key: '← →',   label: '移动挡板' },
      { key: '🖱 鼠标', label: '移动挡板（替代方案）' },
      { key: 'Space',  label: '发射球 / 开始' },
    ],
    en: [
      { key: '← →',   label: 'Move paddle' },
      { key: '🖱 Mouse', label: 'Move paddle (alternative)' },
      { key: 'Space',  label: 'Launch ball / Start' },
    ],
  },
  minesweeper: {
    zh: [
      { key: '🖱 左键', label: '揭开格子' },
      { key: '🖱 右键', label: '插旗 / 取消旗子' },
      { key: 'R',      label: '重新开始' },
    ],
    en: [
      { key: '🖱 Left',  label: 'Reveal cell' },
      { key: '🖱 Right', label: 'Flag / Unflag' },
      { key: 'R',       label: 'Restart' },
    ],
  },
  mole: {
    zh: [
      { key: '🖱 左键点击', label: '敲打钻出的地鼠' },
      { key: 'Space',      label: '开始新一局（30秒）' },
    ],
    en: [
      { key: '🖱 Left Click', label: 'Whack the moles' },
      { key: 'Space',        label: 'Start new round (30s)' },
    ],
  },
  lianliankan: {
    zh: [
      { key: '🖱 左键点击', label: '选择并消除相同图案' },
      { key: 'H',          label: '提示可消除的配对' },
      { key: 'S',          label: '重新洗牌' },
    ],
    en: [
      { key: '🖱 Left Click', label: 'Select & match pairs' },
      { key: 'H',            label: 'Hint a matchable pair' },
      { key: 'S',            label: 'Shuffle tiles' },
    ],
  },
  sokoban: {
    zh: [
      { key: '↑ ↓ ← →', label: '推动角色和箱子' },
      { key: 'R',        label: '重置当前关卡' },
      { key: 'N',        label: '跳到下一关' },
    ],
    en: [
      { key: '↑ ↓ ← →', label: 'Move & push boxes' },
      { key: 'R',        label: 'Reset current level' },
      { key: 'N',        label: 'Next level' },
    ],
  },
  sandfall: {
    zh: [
      { key: '← →',   label: '移动料斗（沙粒落点）' },
      { key: 'Space',  label: '加速落沙（按住）' },
      { key: '1 2 3',  label: '切换料斗宽度（窄/中/宽）' },
      { key: 'R',      label: '重新开始' },
    ],
    en: [
      { key: '← →',   label: 'Move hopper' },
      { key: 'Space',  label: 'Speed up sand (hold)' },
      { key: '1 2 3',  label: 'Nozzle width (narrow/med/wide)' },
      { key: 'R',      label: 'Restart' },
    ],
  },
};

/* 游戏卡片图标 */
const GAME_ICONS = {
  g2048: '🧩', snake: '🐍', memory: '🧠', breakout: '🧱',
  minesweeper: '💣', mole: '🔨', lianliankan: '💎', sokoban: '📦',
  sandfall: '⏳',
};

/* ── 主类 ── */
class RetroFC {
  constructor() {
    this.canvas      = document.getElementById('game-canvas');
    this.ctx         = this.canvas.getContext('2d');
    this.screenFrame = document.getElementById('screen-frame');
    this.currentGame   = null;
    this.currentModule = null;
    this.CW = 256;
    this.CH = 240;

    // 恢复存储的语言偏好
    const stored = getStoredLang();
    if (stored) setLang(stored);

    this.init();
  }

  init() {
    this.setupCanvas();
    this.refreshI18n();
    this.setupButtons();
    this.renderGameGrid(GAMES_DATA);
    this.bindSearch();
    this.bindResize();
  }

  /* ── Canvas 尺寸自适应 ── */
  setupCanvas() {
    this.canvas.width  = this.CW;
    this.canvas.height = this.CH;
    this.ctx.fillStyle = '#080c13';
    this.ctx.fillRect(0, 0, this.CW, this.CH);
    this.resizeScreenFrame();
  }

  resizeScreenFrame() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const availW = Math.min(vw - 40, 800);
    const availH = Math.min(vh - 150, 680);
    const ratio = this.CW / this.CH;
    let w, h;
    if (availW / availH > ratio) {
      h = Math.min(availH, 640);
      w = h * ratio;
    } else {
      w = Math.min(availW, 680);
      h = w / ratio;
    }
    this.screenFrame.style.width  = Math.floor(w) + 'px';
    this.screenFrame.style.height = Math.floor(h) + 'px';
  }

  bindResize() {
    window.addEventListener('resize', () => this.resizeScreenFrame());
  }

  /* ── 国际化刷新：遍历所有 data-i18n / data-i18n-placeholder / data-i18n-html ── */
  refreshI18n() {
    // 更新语言切换按钮文字
    const langBtn = document.getElementById('btn-lang');
    if (langBtn) langBtn.textContent = RETRO_LANG === 'zh' ? 'EN' : '中';

    // data-i18n → textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = _i18n(el.getAttribute('data-i18n'));
    });
    // data-i18n-placeholder → placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = _i18n(el.getAttribute('data-i18n-placeholder'));
    });
    // data-i18n-html → innerHTML
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = _i18n(el.getAttribute('data-i18n-html'));
    });

    // 刷新游戏列表（卡片上的"游戏中"标签文字）
    if (this.currentGame) {
      this.renderGameGrid(GAMES_DATA);
      // 保留搜索关键词
      const q = document.getElementById('search-input').value.trim();
      if (q) {
        document.getElementById('search-input').value = q;
        this.bindSearch();
      }
    } else {
      // 刷新游戏计数文字
      const countEl = document.getElementById('game-count');
      if (countEl) {
        countEl.textContent = i18n(
          `共 ${GAMES_DATA.length} 款游戏`,
          `${GAMES_DATA.length} games total`
        );
      }
    }

    // 刷新游戏状态（待机中）
    if (!this.currentGame) {
      const statusEl = document.getElementById('game-status');
      if (statusEl) {
        statusEl.textContent = _i18n('status-standby');
        statusEl.classList.remove('playing');
      }
    }

    // 刷新控制提示
    if (this.currentGame) {
      this.updateHints(this.currentGame.module);
    }
  }

  /* ── 语言切换 ── */
  toggleLang() {
    setLang(RETRO_LANG === 'zh' ? 'en' : 'zh');
    this.refreshI18n();
    this.showToast(_i18n('toast-switch'), 1800);
  }

  /* ── 渲染游戏列表 ── */
  renderGameGrid(games) {
    const grid  = document.getElementById('game-grid');
    const count = document.getElementById('game-count');
    grid.innerHTML = '';
    games.forEach(g => {
      const icon  = GAME_ICONS[g.module] || '🎮';
      const gname = i18n(g.name, g.nameEn || g.name);
      const card  = document.createElement('div');
      card.className = 'game-card';
      card.dataset.id = g.id;
      card.dataset.gameId = g.id;
      card.innerHTML = `
        <div class="game-cover">
          <span class="game-cover-icon">${icon}</span>
        </div>
        <div class="game-name">${gname}</div>`;
      card.addEventListener('click', () => { this.closeModal(); this.loadGame(g); });
      grid.appendChild(card);
    });
    count.textContent = i18n(
      `共 ${games.length} 款游戏`,
      `${games.length} games total`
    );
    // "游戏中" 标签的 CSS ::after content 需要动态更新，统一用 JS 数据属性
    document.querySelectorAll('.game-card.playing').forEach(c => {
      c.style.setProperty('--badge-text', `'${_i18n('playing-badge')}'`);
    });
    if (this.currentGame) {
      this.markPlaying(this.currentGame.id);
    }
  }

  bindSearch() {
    document.getElementById('search-input').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      this.renderGameGrid(q ? GAMES_DATA.filter(g =>
        i18n(g.name, g.nameEn || '').toLowerCase().includes(q) ||
        (g.nameEn || '').toLowerCase().includes(q)
      ) : GAMES_DATA);
    });
  }

  /* ── 游戏加载 ── */
  loadGame(game) {
    if (this.currentModule) {
      this.currentModule.stop();
      this.currentModule = null;
    }
    this.setLoading(true, _i18n('loading-text'));
    this.currentGame = game;

    const mod = GAME_MODULES[game.module];
    if (!mod) {
      this.setLoading(false);
      this.showToast(_i18n('toast-not-found'));
      return;
    }

    setTimeout(() => {
      this.setLoading(false);
      this.hideLobby();
      this.currentModule = mod;
      mod.start(this.canvas, this.ctx);
      this.showToast(i18n(game.name, game.nameEn || game.name));
      this.markPlaying(game.id);
      this.updateStatus(i18n(game.name, game.nameEn || game.name));
      this.updateHints(game.module);
      this.screenFrame.classList.add('active');
    }, 400);
  }

  /* ── UI 状态 ── */
  setLoading(show, text = '') {
    const el = document.getElementById('loading-overlay');
    if (show) {
      el.classList.add('show');
      document.getElementById('loading-text').textContent = text;
      let w = 0;
      const bar = document.getElementById('loading-bar');
      const t = setInterval(() => {
        w += Math.random() * 18;
        if (w >= 92) { clearInterval(t); w = 92; }
        bar.style.width = w + '%';
      }, 120);
    } else {
      el.classList.remove('show');
      document.getElementById('loading-bar').style.width = '100%';
      setTimeout(() => {
        document.getElementById('loading-bar').style.width = '0%';
      }, 250);
    }
  }

  hideLobby() { document.getElementById('standby').style.display = 'none'; }
  showLobby() { document.getElementById('standby').style.display = 'flex'; }

  updateStatus(text) {
    const el = document.getElementById('game-status');
    el.textContent = text;
    el.classList.add('playing');
  }

  /* ── 更新控制提示（双语版本，多行布局）── */
  updateHints(module) {
    const hintData = GAME_HINTS[module];
    if (!hintData) return;
    const hints = RETRO_LANG === 'zh' ? hintData.zh : hintData.en;
    const container = document.getElementById('controls-hint');
    container.innerHTML = hints.map(h => {
      const keysHTML = h.key.split(' ').map(k => `<kbd>${k}</kbd>`).join('');
      return `<div class="hint-row"><div class="hint-keys">${keysHTML}</div><span class="hint-label">${h.label}</span></div>`;
    }).join('');
  }

  markPlaying(id) {
    document.querySelectorAll('.game-card').forEach(c => {
      const isPlaying = c.dataset.id === String(id);
      c.classList.toggle('playing', isPlaying);
      if (isPlaying) {
        c.style.setProperty('--badge-text', `'${_i18n('playing-badge')}'`);
      }
    });
  }

  showToast(msg, duration = 2200) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), duration);
  }

  /* ── 游戏库弹窗 ── */
  openModal() {
    document.getElementById('modal-overlay').classList.add('open');
    document.getElementById('search-input').value = '';
    this.renderGameGrid(GAMES_DATA);
    setTimeout(() => document.getElementById('search-input').focus(), 100);
  }
  closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
  }

  /* ── 打赏弹窗 ── */
  openDonate() {
    document.getElementById('donate-overlay').classList.add('open');
    // 根据当前语言默认选中对应 Tab
    const defaultTab = RETRO_LANG === 'zh' ? 'cn' : 'intl';
    this._switchDonateTab(defaultTab);
  }
  _switchDonateTab(target) {
    document.querySelectorAll('.donate-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === target));
    document.querySelectorAll('.donate-panel').forEach(p => p.classList.toggle('active', p.id === 'donate-panel-' + target));
  }
  closeDonate() {
    document.getElementById('donate-overlay').classList.remove('open');
  }

  /* ── 按钮事件绑定 ── */
  setupButtons() {
    // 语言切换
    document.getElementById('btn-lang')?.addEventListener('click', () => this.toggleLang());

    // 打赏
    document.getElementById('btn-donate')?.addEventListener('click', () => this.openDonate());
    document.getElementById('donate-modal-close')?.addEventListener('click', () => this.closeDonate());
    document.getElementById('donate-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) this.closeDonate();
    });
    // 打赏 Tab 切换
    document.querySelectorAll('.donate-tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchDonateTab(tab.dataset.tab));
    });

    // 游戏库
    document.getElementById('standby-start-btn')?.addEventListener('click', () => this.openModal());
    document.getElementById('btn-change-game')?.addEventListener('click', () => this.openModal());
    document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
    document.getElementById('modal-overlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) this.closeModal();
    });

    // 重置
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (!this.currentGame || !this.currentModule) return;
      this.currentModule.stop();
      this.currentModule.start(this.canvas, this.ctx);
      this.showToast(_i18n('toast-reset'));
    });

    // ESC 关闭任意弹窗
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const gameModal = document.getElementById('modal-overlay');
        const donateModal = document.getElementById('donate-overlay');
        if (donateModal.classList.contains('open')) {
          this.closeDonate();
        } else if (gameModal.classList.contains('open')) {
          this.closeModal();
        }
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new RetroFC();
});
