/* 接苹果 Catch Falling Items - 256×240 FC 风格 */
GAME_MODULES.catch_game = (() => {
  let cv, cx;
  let rafId, keyH, mouseH;

  const W = 256, H = 240;
  const HEADER_H = 18;
  const BASKET_Y = 224;

  const CTRL = i18n(
    ['操作说明', '←→ / 鼠标 移动篮子', '接住水果加分，躲避炸弹💣', '♥♥♥ = 生命值'],
    ['Controls', '←→ / Mouse move basket', 'Catch fruits, dodge bombs💣', '♥♥♥ = Lives']
  );

  // 关卡阈值
  const LEVEL_THRESHOLDS = [0, 80, 200, 380, 600];

  // 关卡篮子宽度
  const BASKET_WIDTHS = [52, 46, 42, 36, 30];

  // 关卡配置
  const LEVEL_CONFIGS = [
    null,
    { items: ['apple'],                        speed: 0.9, maxItems: 3, spawnMin: 1200, spawnMax: 1600 },
    { items: ['apple', 'orange'],              speed: 1.2, maxItems: 4, spawnMin: 1000, spawnMax: 1400 },
    { items: ['apple', 'orange', 'bomb'],      speed: 1.6, maxItems: 4, spawnMin: 800,  spawnMax: 1200 },
    { items: ['apple', 'orange', 'bomb', 'star'], speed: 2.0, maxItems: 5, spawnMin: 700, spawnMax: 1000 },
    { items: ['apple', 'orange', 'bomb', 'bomb', 'star'], speed: 2.5, maxItems: 5, spawnMin: 600, spawnMax: 900 },
  ];

  // 物品类型数据
  const ITEM_TYPES = {
    apple:  { emoji: '🍎', score: 10, isBomb: false, color: '#e74c3c' },
    orange: { emoji: '🍊', score: 15, isBomb: false, color: '#e67e22' },
    star:   { emoji: '⭐', score: 30, isBomb: false, color: '#f1c40f' },
    bomb:   { emoji: '💣', score: 0,  isBomb: true,  color: '#555' },
  };

  // 背景颜色随关卡渐变
  const BG_COLORS = [
    '#0a0a2e', // Level 1 深蓝
    '#0e1a3a',
    '#1a1a0e',
    '#2a1a0a',
    '#3a0a0a',  // Level 5 暖橙红
  ];

  // 游戏状态
  let state; // 'title' | 'playing' | 'gameover'
  let score, bestScore, lives, level;

  // 篮子
  let basket; // {x, y, w, h}

  // 下落物品
  let items = [];

  // 提示文字列表 [{text, x, y, timer, color}]
  let floatTexts = [];

  // 屏幕红闪
  let flashTimer = 0;

  // 无敌（接到炸弹后短暂无敌）
  let invincibleTimer = 0;

  // 关卡升级提示
  let levelUpText = '';
  let levelUpTimer = 0;

  // 生成计时
  let spawnTimer = 0;
  let nextSpawnInterval = 1200;

  // 键盘状态
  const keys = {};

  // ---- 关卡计算 ----
  function getLevel(s) {
    let lv = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (s >= LEVEL_THRESHOLDS[i]) { lv = i + 1; break; }
    }
    return Math.min(lv, 5);
  }

  function getLevelCfg(lv) {
    return LEVEL_CONFIGS[Math.min(lv, 5)];
  }

  // ---- 初始化游戏 ----
  function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    state = 'playing';
    items = [];
    floatTexts = [];
    flashTimer = 0;
    invincibleTimer = 0;
    levelUpText = '';
    levelUpTimer = 0;
    spawnTimer = 0;
    nextSpawnInterval = 1200;

    const bw = BASKET_WIDTHS[level - 1];
    basket = { x: W / 2 - bw / 2, y: BASKET_Y, w: bw, h: 12 };
  }

  // ---- 生成物品 ----
  function spawnItem() {
    const cfg = getLevelCfg(level);
    if (items.length >= cfg.maxItems) return;

    const pool = cfg.items;
    const typeKey = pool[Math.floor(Math.random() * pool.length)];
    const type = ITEM_TYPES[typeKey];
    const r = 10;
    const x = r + Math.random() * (W - r * 2);

    items.push({
      x, y: HEADER_H + r,
      r,
      typeKey,
      emoji: type.emoji,
      isBomb: type.isBomb,
      scoreVal: type.score,
      color: type.color,
      vy: cfg.speed
    });

    // 设置下次生成间隔
    nextSpawnInterval = cfg.spawnMin + Math.random() * (cfg.spawnMax - cfg.spawnMin);
  }

  // ---- 绘制篮子 ----
  function drawBasket() {
    const { x, y, w, h } = basket;
    const tw = w - 4; // 底部稍窄
    cx.fillStyle = '#a0522d';
    cx.beginPath();
    cx.moveTo(x, y);
    cx.lineTo(x + w, y);
    cx.lineTo(x + w - 2 + (w - tw) / 2, y + h);
    cx.lineTo(x + (w - tw) / 2, y + h);
    cx.closePath();
    cx.fill();
    // 篮子高光
    cx.fillStyle = '#c47a3a';
    cx.fillRect(x + 2, y + 1, w - 4, 3);
  }

  // ---- 绘制物品 ----
  function drawItems() {
    for (const item of items) {
      cx.save();
      cx.font = '14px serif';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(item.emoji, item.x, item.y);
      cx.restore();
    }
  }

  // ---- 绘制浮动文字 ----
  function drawFloatTexts() {
    for (const ft of floatTexts) {
      cx.save();
      cx.globalAlpha = ft.timer / 60;
      cx.font = 'bold 10px monospace';
      cx.fillStyle = ft.color || '#ffd600';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(ft.text, ft.x, ft.y);
      cx.restore();
    }
  }

  // ---- Header ----
  function drawHeader() {
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, W, HEADER_H);
    cx.font = 'bold 9px monospace';
    cx.textBaseline = 'middle';

    cx.fillStyle = '#ffd600';
    cx.textAlign = 'left';
    cx.fillText('SCORE:' + score, 4, 9);

    cx.fillStyle = '#aaffaa';
    cx.textAlign = 'center';
    cx.fillText('LV.' + level, W / 2, 9);

    cx.fillStyle = '#ff6666';
    cx.textAlign = 'right';
    cx.fillText('♥'.repeat(lives), W - 4, 9);
  }

  // ---- 背景 ----
  function drawBackground() {
    const bgCol = BG_COLORS[Math.min(level - 1, BG_COLORS.length - 1)];
    cx.fillStyle = bgCol;
    cx.fillRect(0, HEADER_H, W, H - HEADER_H);

    // 简单星点装饰
    cx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let i = 0; i < 20; i++) {
      // 用伪随机（固定seed）画静态星星
      const sx = ((i * 97 + 23) % W);
      const sy = HEADER_H + ((i * 53 + 41) % (H - HEADER_H - 20));
      cx.fillRect(sx, sy, 1, 1);
    }
  }

  // ---- 关卡提示 ----
  function drawLevelUpHint() {
    if (levelUpTimer <= 0) return;
    cx.save();
    cx.globalAlpha = Math.min(levelUpTimer / 30, 1);
    cx.font = 'bold 14px monospace';
    cx.fillStyle = '#ffd600';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(levelUpText, W / 2, H / 2);
    cx.restore();
  }

  // ---- 更新 ----
  let lastTs = 0;

  function update(ts) {
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;

    if (state !== 'playing') return;

    // 无敌计时
    if (invincibleTimer > 0) invincibleTimer -= dt;
    if (flashTimer > 0) flashTimer -= dt;

    // 关卡升级提示计时
    if (levelUpTimer > 0) levelUpTimer -= dt;

    // 检查关卡升级
    const newLv = getLevel(score);
    if (newLv > level) {
      level = newLv;
      levelUpText = i18n('Level ' + level + ' UP!', 'Level ' + level + ' UP!');
      levelUpTimer = 1000;
      // 更新篮子宽度
      const bw = BASKET_WIDTHS[level - 1];
      basket.x = Math.min(basket.x, W - bw);
      basket.w = bw;
    }

    // 篮子移动
    if (keys['ArrowLeft'] || keys['a']) basket.x -= 4;
    if (keys['ArrowRight'] || keys['d']) basket.x += 4;
    basket.x = Math.max(0, Math.min(W - basket.w, basket.x));

    // 生成物品
    spawnTimer += dt;
    if (spawnTimer >= nextSpawnInterval) {
      spawnTimer = 0;
      spawnItem();
    }

    // 移动物品
    const cfg = getLevelCfg(level);
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      item.y += item.vy * (dt / 16);

      // 碰撞检测（圆形 vs 矩形篮子顶部）
      const bLeft = basket.x, bRight = basket.x + basket.w;
      const bTop = basket.y;
      if (
        item.y + item.r >= bTop &&
        item.y - item.r <= bTop + basket.h &&
        item.x >= bLeft - item.r &&
        item.x <= bRight + item.r
      ) {
        // 接住
        if (item.isBomb) {
          if (invincibleTimer <= 0) {
            lives--;
            flashTimer = 300;
            invincibleTimer = 800;
            floatTexts.push({ text: '-1♥', x: basket.x + basket.w / 2, y: basket.y - 10, timer: 60, color: '#ff4444' });
            if (lives <= 0) { gameOver(); return; }
          }
        } else {
          score += item.scoreVal;
          floatTexts.push({ text: '+' + item.scoreVal, x: item.x, y: item.y - 15, timer: 60, color: '#ffd600' });
          // 更新最高分
          if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('retro_catch_best', bestScore);
          }
        }
        items.splice(i, 1);
        continue;
      }

      // 掉出底部
      if (item.y - item.r > H) {
        items.splice(i, 1);
      }
    }

    // 更新浮动文字
    for (let i = floatTexts.length - 1; i >= 0; i--) {
      floatTexts[i].y -= 0.5;
      floatTexts[i].timer--;
      if (floatTexts[i].timer <= 0) floatTexts.splice(i, 1);
    }
  }

  function gameOver() {
    state = 'gameover';
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('retro_catch_best', bestScore);
    }
  }

  // ---- 绘制帧 ----
  let blinkTimer = 0;

  function draw(ts) {
    if (!cv) return;
    blinkTimer = (blinkTimer + 1) % 60;

    update(ts);

    // 背景
    if (state === 'playing' || state === 'gameover') {
      drawBackground();
    } else {
      cx.fillStyle = '#000';
      cx.fillRect(0, 0, W, H);
    }

    // 红闪叠加
    if (flashTimer > 0) {
      cx.fillStyle = `rgba(255,0,0,${Math.min(flashTimer / 300, 0.4)})`;
      cx.fillRect(0, HEADER_H, W, H - HEADER_H);
    }

    if (state === 'title') {
      drawTitle();
    } else if (state === 'playing') {
      drawHeader();
      drawItems();
      drawBasket();
      drawFloatTexts();
      drawLevelUpHint();
    } else if (state === 'gameover') {
      drawHeader();
      drawItems();
      drawBasket();
      drawGameOver();
    }

    rafId = requestAnimationFrame(draw);
  }

  function drawTitle() {
    cx.font = 'bold 20px monospace';
    cx.fillStyle = '#ffd600';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('CATCH!', W / 2, 70);

    cx.font = '9px monospace';
    cx.fillStyle = '#aaa';
    cx.textAlign = 'center';
    cx.fillText('BEST: ' + bestScore, W / 2, 96);

    if (blinkTimer < 40) {
      cx.fillStyle = '#fff';
      cx.fillText(i18n('按 SPACE 开始', 'Press SPACE to Start'), W / 2, 120);
    }

    // 展示几个水果装饰
    cx.font = '20px serif';
    cx.textBaseline = 'middle';
    cx.fillText('🍎', W / 2 - 40, 50);
    cx.fillText('🍊', W / 2 + 40, 50);
    cx.fillText('⭐', W / 2, 45);

    drawHint(cx, W, H, CTRL);
  }

  function drawGameOver() {
    cx.fillStyle = 'rgba(0,0,0,0.6)';
    cx.fillRect(0, H / 2 - 45, W, 90);

    cx.font = 'bold 16px monospace';
    cx.fillStyle = '#ff4444';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('GAME OVER', W / 2, H / 2 - 26);

    cx.font = '10px monospace';
    cx.fillStyle = '#ffd600';
    cx.fillText('SCORE: ' + score, W / 2, H / 2 - 8);
    cx.fillStyle = '#aaa';
    cx.fillText('BEST: ' + bestScore, W / 2, H / 2 + 8);

    if (blinkTimer < 40) {
      cx.fillStyle = '#fff';
      cx.fillText(i18n('SPACE 重玩', 'SPACE to Restart'), W / 2, H / 2 + 28);
    }
  }

  // ---- 事件处理 ----
  function onKey(e) {
    const down = e.type === 'keydown';
    keys[e.key] = down;
    keys[e.code] = down;

    if (down && (e.key === ' ' || e.code === 'Space')) {
      if (state === 'title') startGame();
      else if (state === 'gameover') startGame();
      e.preventDefault();
    }
  }

  function onMouse(e) {
    if (!cv || !basket) return;
    const rect = cv.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    basket.x = Math.max(0, Math.min(W - basket.w, mx - basket.w / 2));
  }

  return {
    start(_cv, _cx) {
      cv = _cv; cx = _cx;
      bestScore = parseInt(localStorage.getItem('retro_catch_best') || '0', 10);
      state = 'title';
      score = 0; lives = 3; level = 1;
      lastTs = 0;
      items = [];
      floatTexts = [];

      keyH = onKey;
      mouseH = onMouse;
      window.addEventListener('keydown', keyH);
      window.addEventListener('keyup', keyH);
      cv.addEventListener('mousemove', mouseH);

      rafId = requestAnimationFrame(draw);
    },
    stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (keyH) {
        window.removeEventListener('keydown', keyH);
        window.removeEventListener('keyup', keyH);
        keyH = null;
      }
      if (mouseH && cv) {
        cv.removeEventListener('mousemove', mouseH);
        mouseH = null;
      }
      cv = null;
    }
  };
})();
