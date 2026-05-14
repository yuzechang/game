/* ===== 积木叠叠 ===== SPACE/点击 落下方块 */
GAME_MODULES.stack = (() => {
  const W = 256, H = 240;
  const BLOCK_H = 14;
  const INIT_W = 80;
  const HEADER_H = 18;
  const BASE_Y = 222; // 地基顶部 y

  const PALETTES = [
    ['#00b4d8', '#0077b6', '#023e8a'],
    ['#f4a261', '#e76f51', '#e63946'],
    ['#7b2d8b', '#c77dff', '#e0aaff'],
    ['#2d6a4f', '#52b788', '#b7e4c7'],
    ['#f72585', '#b5179e', '#7209b7'],
  ];

  const CTRL = i18n(
    ['操作说明', 'SPACE / 点击  落下方块', '误差≤4px → 完美不缩短还+3px', '层数越多速度越快'],
    ['Controls', 'SPACE / Click to drop', 'Error≤4px → Perfect! +3px bonus', 'Speed increases each level']
  );

  let cv, cx;
  let state; // 'start' | 'play' | 'over'
  let stack; // [{x, w, colorIdx}]
  let moving; // {x, w, dir}
  let score, best, level;
  let rafId;
  let lastTs;
  let shakeTimer; // ms remaining
  let shakeDir;
  let perfectMsg; // {text, alpha, y}
  let keyH, clickH;

  function getSpeed(lv) {
    return Math.min(4.5, 1.2 + (lv - 1) * 0.25);
  }

  function getPalette(lv) {
    return PALETTES[(lv - 1) % PALETTES.length];
  }

  function initGame() {
    score = 0;
    level = 1;
    stack = [];
    // 地基层（固定）：全宽灰色
    stack.push({ x: 0, w: W, colorIdx: -1 }); // colorIdx -1 = 地基
    // 第一层，居中，初始宽度
    stack.push({ x: (W - INIT_W) / 2, w: INIT_W, colorIdx: 0 });
    // 移动平台从顶部开始
    spawnMoving();
    shakeTimer = 0;
    perfectMsg = null;
    state = 'play';
    lastTs = null;
  }

  function spawnMoving() {
    const top = stack[stack.length - 1];
    moving = {
      x: 0,
      w: top.w,
      dir: 1,
    };
  }

  // 计算已叠好的方块视口偏移
  function getOffsetY() {
    const s = score;
    return Math.max(0, (s - 8) * BLOCK_H);
  }

  // 获取第 i 层方块的屏幕 y（i=0 为地基）
  function getBlockY(i) {
    const offsetY = getOffsetY();
    // i=0 地基在 BASE_Y；往上每层 -BLOCK_H
    return BASE_Y - i * BLOCK_H - offsetY;
  }

  // 获取当前移动平台的屏幕 y
  function getMovingY() {
    return getBlockY(stack.length - 1) - BLOCK_H;
  }

  function drop() {
    if (state !== 'play') return;
    const top = stack[stack.length - 1];

    // 计算重叠
    const left = Math.max(moving.x, top.x);
    const right = Math.min(moving.x + moving.w, top.x + top.w);
    const overlap = right - left;

    if (overlap <= 0) {
      // 完全错过
      state = 'over';
      best = Math.max(best, score);
      localStorage.setItem('retro_stack_best', best);
      return;
    }

    const diff = Math.abs(moving.x - top.x);

    let newX = left;
    let newW = overlap;

    if (diff <= 4) {
      // 完美对齐，不缩小，反而 +3px 宽度（上限 INIT_W）
      newX = top.x;
      newW = Math.min(INIT_W, top.w + 3);
      perfectMsg = { text: 'PERFECT!', alpha: 1.0, y: getMovingY() };
    }

    if (newW < 5) {
      state = 'over';
      best = Math.max(best, score);
      localStorage.setItem('retro_stack_best', best);
      return;
    }

    stack.push({ x: newX, w: newW, colorIdx: stack.length % 3 });
    score++;
    level = Math.floor(score / 8) + 1;

    // 触发震动
    shakeTimer = 120;
    shakeDir = 1;

    spawnMoving();
  }

  function update(ts) {
    if (!lastTs) lastTs = ts;
    const dt = ts - lastTs;
    lastTs = ts;

    if (state === 'play') {
      const speed = getSpeed(level);
      moving.x += speed * moving.dir * (dt / 16.67);

      const maxX = W - moving.w;
      if (moving.x >= maxX) {
        moving.x = maxX;
        moving.dir = -1;
      } else if (moving.x <= 0) {
        moving.x = 0;
        moving.dir = 1;
      }

      if (shakeTimer > 0) {
        shakeTimer -= dt;
        shakeDir = shakeTimer > 60 ? 1 : -1;
      }

      if (perfectMsg) {
        perfectMsg.alpha -= dt / 800;
        perfectMsg.y -= dt / 80;
        if (perfectMsg.alpha <= 0) perfectMsg = null;
      }
    }

    draw();
    rafId = requestAnimationFrame(update);
  }

  function draw() {
    cx.fillStyle = '#0a0a1a';
    cx.fillRect(0, 0, W, H);

    const shake = (shakeTimer > 0) ? shakeDir * 2 : 0;

    cx.save();
    cx.translate(0, shake);

    const palette = getPalette(level);

    // 绘制已叠好的方块
    for (let i = 0; i < stack.length; i++) {
      const b = stack[i];
      const by = getBlockY(i);
      if (by > H + BLOCK_H || by < HEADER_H - BLOCK_H) continue;

      if (b.colorIdx === -1) {
        // 地基
        cx.fillStyle = '#555';
      } else {
        cx.fillStyle = palette[i % palette.length] || palette[0];
      }
      cx.fillRect(b.x, by, b.w, BLOCK_H - 1);

      // 高光
      if (b.colorIdx !== -1) {
        cx.fillStyle = 'rgba(255,255,255,0.15)';
        cx.fillRect(b.x, by, b.w, 3);
      }
    }

    // 绘制移动平台
    if (state === 'play') {
      const my = getMovingY();
      if (my > HEADER_H && my < H) {
        cx.fillStyle = palette[stack.length % palette.length] || palette[0];
        cx.fillRect(moving.x, my, moving.w, BLOCK_H - 1);
        cx.fillStyle = 'rgba(255,255,255,0.2)';
        cx.fillRect(moving.x, my, moving.w, 3);
      }
    }

    cx.restore();

    // Header
    cx.fillStyle = 'rgba(0,0,0,0.8)';
    cx.fillRect(0, 0, W, HEADER_H);
    cx.font = '8px monospace';
    cx.textAlign = 'left';
    cx.textBaseline = 'middle';
    cx.fillStyle = '#ffd600';
    cx.fillText('LV ' + level, 4, 9);
    cx.fillStyle = '#fff';
    cx.textAlign = 'center';
    cx.fillText('SCORE ' + score, W / 2, 9);
    cx.fillStyle = '#0cf';
    cx.textAlign = 'right';
    cx.fillText('BEST ' + best, W - 4, 9);

    // PERFECT 浮动文字
    if (perfectMsg && perfectMsg.alpha > 0) {
      cx.save();
      cx.globalAlpha = Math.max(0, perfectMsg.alpha);
      cx.font = 'bold 11px monospace';
      cx.fillStyle = '#ffd600';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(perfectMsg.text, W / 2, perfectMsg.y);
      cx.restore();
    }

    // 操作提示
    drawHint(cx, W, H, CTRL);

    // 开始画面
    if (state === 'start') {
      cx.fillStyle = 'rgba(0,0,0,0.82)';
      cx.fillRect(0, 0, W, H);

      cx.font = 'bold 32px monospace';
      cx.fillStyle = '#00b4d8';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText('STACK', W / 2, 80);

      cx.font = '9px monospace';
      cx.fillStyle = '#ccc';
      cx.fillText(i18n('积木叠叠', 'Stacking Blocks'), W / 2, 108);

      cx.font = 'bold 9px monospace';
      cx.fillStyle = '#ffd600';
      cx.fillText(i18n('SPACE / 点击 开始', 'SPACE / Click to Start'), W / 2, 135);

      cx.font = '8px monospace';
      cx.fillStyle = '#0cf';
      cx.fillText('BEST: ' + best, W / 2, 155);

      drawHint(cx, W, H, CTRL);
    }

    // 结束画面
    if (state === 'over') {
      cx.fillStyle = 'rgba(0,0,0,0.78)';
      cx.fillRect(40, 70, 176, 100);

      cx.font = 'bold 14px monospace';
      cx.fillStyle = '#ff3c3c';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText('GAME OVER', W / 2, 105);

      cx.font = '9px monospace';
      cx.fillStyle = '#fff';
      cx.fillText('SCORE: ' + score, W / 2, 125);
      cx.fillStyle = '#0cf';
      cx.fillText('BEST: ' + best, W / 2, 140);

      cx.font = 'bold 8px monospace';
      cx.fillStyle = '#ffd600';
      cx.fillText(i18n('SPACE / 点击 重玩', 'SPACE / Click to Retry'), W / 2, 157);

      drawHint(cx, W, H, CTRL);
    }
  }

  function onKey(e) {
    if (e.code === 'Space') {
      e.preventDefault();
      handleAction();
    }
  }

  function onClick() {
    handleAction();
  }

  function handleAction() {
    if (state === 'start') {
      initGame();
    } else if (state === 'play') {
      drop();
    } else if (state === 'over') {
      initGame();
    }
  }

  return {
    start(canvas) {
      cv = canvas;
      cx = cv.getContext('2d');
      best = +(localStorage.getItem('retro_stack_best') || 0);
      state = 'start';
      shakeTimer = 0;
      perfectMsg = null;

      keyH = onKey.bind(this);
      clickH = onClick.bind(this);
      window.addEventListener('keydown', keyH);
      cv.addEventListener('click', clickH);

      lastTs = null;
      rafId = requestAnimationFrame(update);
    },
    stop() {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', keyH);
      if (cv) cv.removeEventListener('click', clickH);
    }
  };
})();
