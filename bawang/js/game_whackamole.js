GAME_MODULES.mole = (() => {
  const CTRL = i18n(
    ['操作说明','点击地鼠得分','SPACE 开始/重玩','关卡越高地鼠越快'],
    ['Controls','Click moles to score','SPACE Start/Replay','Higher level = faster moles']
  );
  const COLS = 3, ROWS = 3, HW = 72, HH = 52, GAP = 8;
  const GX = Math.floor((256 - COLS*(HW+GAP)+GAP) / 2);
  const GY = 42;
  const GAME_TIME = 30;

  let cv, cx, holes, score, timeLeft, running, rafId, spawnTimer, clickH, keyH;
  let lastTs, spawnInterval;

  function initGame() {
    holes = Array.from({length: ROWS*COLS}, () => ({ mole: false, hit: false, hideAt: 0 }));
    score = 0; timeLeft = GAME_TIME; running = false;
    spawnTimer = 0; spawnInterval = 1200;
  }

  function startGame() {
    initGame();
    running = true;
    lastTs = performance.now();
  }

  function spawnMole() {
    const idle = holes.map((h,i) => (!h.mole ? i : -1)).filter(i => i >= 0);
    if (idle.length === 0) return;
    const idx = idle[Math.floor(Math.random() * idle.length)];
    holes[idx].mole = true;
    holes[idx].hit  = false;
    const stayMs = Math.max(600, 1500 - (GAME_TIME - timeLeft) * 25);
    holes[idx].hideAt = performance.now() + stayMs;
  }

  function draw(ts) {
    if (!cv) return;
    const dt = ts - (lastTs || ts);
    lastTs = ts;

    if (running) {
      timeLeft -= dt / 1000;
      if (timeLeft <= 0) { timeLeft = 0; running = false; }
      spawnTimer += dt;
      if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnInterval = Math.max(500, 1200 - (GAME_TIME - timeLeft) * 20);
        spawnMole();
      }
      const now = performance.now();
      holes.forEach(h => { if (h.mole && now >= h.hideAt) h.mole = false; });
    }

    // 背景
    cx.fillStyle = '#5d4037';
    cx.fillRect(0, 0, cv.width, cv.height);

    // 草地纹理
    cx.fillStyle = '#388e3c';
    cx.fillRect(0, GY - 18, cv.width, cv.height - GY + 18);

    // 顶部信息栏
    cx.fillStyle = '#1a1a2e';
    cx.fillRect(0, 0, cv.width, GY - 18);
    cx.fillStyle = '#ffd600';
    cx.font = 'bold 11px monospace';
    cx.textAlign = 'left'; cx.textBaseline = 'middle';
    cx.fillText(`${i18n('分数','Score')}: ${score}`, 8, 12);
    cx.textAlign = 'right';
    const secLeft = Math.ceil(timeLeft);
    cx.fillStyle = secLeft <= 5 ? '#ff5252' : '#ffd600';
    cx.fillText(`${secLeft}s`, cv.width - 8, 12);

    if (!running && timeLeft <= 0) {
      // 标题
      cx.fillStyle = 'rgba(0,0,0,0.55)';
      cx.fillRect(0, GY - 18, cv.width, cv.height);
      cx.fillStyle = '#ffd600';
      cx.font = 'bold 16px monospace';
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText('游戏结束!', cv.width/2, cv.height/2 - 20);
      cx.font = '12px monospace';
      cx.fillStyle = '#fff';
      cx.fillText(`得分: ${score}`, cv.width/2, cv.height/2 + 2);
      cx.font = '9px monospace';
      cx.fillStyle = '#aaa';
      cx.fillText(i18n('点击或按 SPACE 重玩','Click or SPACE Replay'), cv.width/2, cv.height/2 + 22);
      drawHint(cx, cv.width, cv.height, CTRL);
    } else if (!running) {
      cx.fillStyle = '#ffd600';
      cx.font = 'bold 13px monospace';
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(i18n('打地鼠','Whack-a-Mole'), cv.width/2, GY - 10);
      cx.font = '9px monospace';
      cx.fillStyle = '#fff';
      cx.fillText(i18n('点击或按 SPACE 开始','Click or SPACE to Start'), cv.width/2, cv.height - 28);
      drawHint(cx, cv.width, cv.height, CTRL);
    }

    // 洞和地鼠
    const now = performance.now();
    for (let i = 0; i < ROWS*COLS; i++) {
      const r = Math.floor(i/COLS), c = i % COLS;
      const x = GX + c*(HW+GAP), y = GY + r*(HH+GAP);
      const h = holes[i];

      // 洞背景（椭圆形）
      cx.fillStyle = '#2e1b0e';
      cx.beginPath();
      cx.ellipse(x+HW/2, y+HH*0.7, HW*0.44, HH*0.22, 0, 0, Math.PI*2);
      cx.fill();

      // 草丛前景（遮住地鼠下半身）
      cx.fillStyle = '#2e7d32';

      if (h.mole) {
        const pop = Math.min(1, (now - (h.hideAt - 1500)) / 250);
        const moleY = y + HH*0.08 + (1-pop)*HH*0.5;

        // 地鼠身体
        cx.fillStyle = h.hit ? '#795548' : '#8d6e63';
        cx.beginPath();
        cx.ellipse(x+HW/2, moleY+18, 18, 22, 0, 0, Math.PI*2);
        cx.fill();

        // 地鼠头
        cx.fillStyle = h.hit ? '#795548' : '#a1887f';
        cx.beginPath();
        cx.ellipse(x+HW/2, moleY, 14, 13, 0, 0, Math.PI*2);
        cx.fill();

        // 眼睛
        cx.fillStyle = '#212121';
        cx.beginPath(); cx.arc(x+HW/2-5, moleY-3, 2.5, 0, Math.PI*2); cx.fill();
        cx.beginPath(); cx.arc(x+HW/2+5, moleY-3, 2.5, 0, Math.PI*2); cx.fill();

        // 鼻子
        cx.fillStyle = '#e91e63';
        cx.beginPath(); cx.ellipse(x+HW/2, moleY+2, 3, 2, 0, 0, Math.PI*2); cx.fill();

        if (h.hit) {
          cx.fillStyle = '#ffd600';
          cx.font = 'bold 10px monospace';
          cx.textAlign = 'center'; cx.textBaseline = 'middle';
          cx.fillText('+10', x+HW/2, moleY-18);
        }
      }

      // 草丛遮罩
      cx.fillStyle = '#388e3c';
      cx.fillRect(x, y+HH*0.58, HW, HH*0.42+2);
      cx.fillStyle = '#2e7d32';
      for (let g=0; g<5; g++) {
        const gx = x + g*(HW/4.5);
        cx.beginPath();
        cx.moveTo(gx, y+HH*0.58);
        cx.quadraticCurveTo(gx+5, y+HH*0.38, gx+10, y+HH*0.58);
        cx.fill();
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  function hitTest(px, py) {
    for (let i = 0; i < ROWS*COLS; i++) {
      const r = Math.floor(i/COLS), c = i % COLS;
      const x = GX + c*(HW+GAP) + HW/2;
      const y = GY + r*(HH+GAP) + HH*0.2;
      const dx = px - x, dy = py - y;
      if (holes[i].mole && !holes[i].hit && dx*dx + dy*dy < (HW/2)*(HW/2)) {
        holes[i].hit = true;
        holes[i].hideAt = performance.now() + 300;
        score += 10;
        return;
      }
    }
  }

  return {
    start(_cv, _cx) {
      cv = _cv; cx = _cx;
      initGame();
      cv.addEventListener('click', clickH = e => {
        if (!running) { startGame(); return; }
        const rect = cv.getBoundingClientRect();
        const px = (e.clientX - rect.left) * (256/rect.width);
        const py = (e.clientY - rect.top) * (240/rect.height);
        hitTest(px, py);
      });
      document.addEventListener('keydown', keyH = e => {
        if (e.code === 'Space') {
          e.preventDefault();
          if (!running) startGame();
        }
      });
      rafId = requestAnimationFrame(draw);
    },
    stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (cv) cv.removeEventListener('click', clickH);
      document.removeEventListener('keydown', keyH);
      cv = null;
    }
  };
})();
