/* 飞机大战 Space Shooter - 256×240 FC 风格 */
GAME_MODULES.shooter = (() => {
  let cv, cx;
  let rafId, keyH, mouseH;

  const W = 256, H = 240;
  const HEADER_H = 20;
  const PLAY_H = H - HEADER_H; // 220

  const CTRL = i18n(
    ['操作说明', '←→ 移动  SPACE 射击', '消灭所有敌人通关升级', '★★★ = 生命值'],
    ['Controls', '←→ Move  SPACE Shoot', 'Defeat all enemies to advance', '★★★ = Lives']
  );

  // 星星背景
  const STAR_COUNT = 50;
  let stars = [];

  // 游戏状态
  let state; // 'title' | 'playing' | 'levelup' | 'gameover' | 'win'
  let score, bestScore, lives, level;

  // 玩家
  let player; // {x, y, w, h, vx}
  const PW = 28, PH = 20;
  const BULLET_SPEED = 5;
  const MAX_BULLETS = 6;

  // 子弹
  let bullets = [];   // 玩家子弹
  let eBullets = [];  // 敌人子弹

  // 敌人
  let enemies = [];
  let boss = null;
  let enemyDir = 1;  // 1 右 -1 左
  let enemySpeed = 0;
  let enemyDropY = 0;

  // 关卡过渡
  let celebrateTimer = 0;
  let levelUpTimer = 0;

  // 无敌帧（碰撞后短暂无敌）
  let invincibleTimer = 0;

  // 键盘状态
  const keys = {};

  // ---- 初始化星星 ----
  function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 0.2 + Math.random() * 0.5,
        size: Math.random() < 0.3 ? 2 : 1
      });
    }
  }

  // ---- 关卡配置 ----
  function getLevelConfig(lv) {
    const base = [
      null,
      { rows: 3, cols: 4, speed: 0.4, fireRate: 0,    boss: false },
      { rows: 3, cols: 5, speed: 0.6, fireRate: 0.10, boss: false },
      { rows: 4, cols: 5, speed: 0.8, fireRate: 0.20, boss: false },
      { rows: 4, cols: 5, speed: 1.0, fireRate: 0.25, boss: true  },
    ];
    if (lv <= 4) return base[lv];
    // Level 5+
    const prev = getLevelConfig(lv - 1);
    return {
      rows: prev.rows,
      cols: Math.min(prev.cols + (lv % 2 === 0 ? 1 : 0), 10),
      speed: +(prev.speed * 1.15).toFixed(3),
      fireRate: Math.min(prev.fireRate + 0.05, 0.45),
      boss: true,
      extraEnemies: ((lv - 4) * 2)
    };
  }

  function enemyColor(lv) {
    const cols = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#9b59b6'];
    return cols[Math.min(lv - 1, cols.length - 1)];
  }

  // ---- 初始化关卡 ----
  function initLevel() {
    const cfg = getLevelConfig(level);
    enemies = [];
    boss = null;
    bullets = [];
    eBullets = [];
    enemyDir = 1;
    enemySpeed = cfg.speed;

    const EW = 25, EH = 16;
    const startX = 14;
    const startY = HEADER_H + 10;
    const gapX = 30, gapY = 22;

    let rows = cfg.rows;
    let cols = cfg.cols;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        enemies.push({
          x: startX + c * gapX,
          y: startY + r * gapY,
          w: EW, h: EH,
          alive: true,
          color: enemyColor(level)
        });
      }
    }

    // Boss
    if (cfg.boss) {
      boss = {
        x: W / 2 - 25,
        y: startY - 36,
        w: 50, h: 30,
        hp: 3,
        maxHp: 3,
        dir: 1,
        speed: cfg.speed * 1.6,
        fireCooldown: 0,
        alive: true,
        color: '#00eaff'
      };
    }

    // 重置玩家位置
    player = { x: W / 2 - PW / 2, y: 215, w: PW, h: PH };
    invincibleTimer = 0;
  }

  // ---- 初始化游戏 ----
  function startGame() {
    score = 0;
    lives = 3;
    level = 1;
    state = 'playing';
    celebrateTimer = 0;
    levelUpTimer = 0;
    initLevel();
  }

  // ---- 绘制星星 ----
  function drawStars() {
    cx.fillStyle = '#fff';
    for (const s of stars) {
      cx.fillRect(s.x, s.y, s.size, s.size);
    }
  }

  // ---- 更新星星 ----
  function updateStars() {
    for (const s of stars) {
      s.y += s.speed;
      if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
    }
  }

  // ---- 绘制玩家飞船 ----
  function drawPlayer() {
    if (!player) return;
    if (invincibleTimer > 0 && Math.floor(invincibleTimer / 4) % 2 === 0) return; // 闪烁
    const { x, y, w, h } = player;

    // 机身（三角）
    cx.fillStyle = '#4fa3e8';
    cx.beginPath();
    cx.moveTo(x + w / 2, y);
    cx.lineTo(x + w, y + h);
    cx.lineTo(x, y + h);
    cx.closePath();
    cx.fill();

    // 机翼
    cx.fillStyle = '#2980b9';
    cx.fillRect(x - 4, y + h - 8, 10, 6);
    cx.fillRect(x + w - 6, y + h - 8, 10, 6);

    // 驾驶舱
    cx.fillStyle = '#aee4ff';
    cx.beginPath();
    cx.ellipse(x + w / 2, y + 8, 4, 5, 0, 0, Math.PI * 2);
    cx.fill();
  }

  // ---- 绘制敌人 ----
  function drawEnemy(e) {
    if (!e.alive) return;
    cx.fillStyle = e.color;
    // 椭圆机身
    cx.beginPath();
    cx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
    cx.fill();
    // 触须
    cx.strokeStyle = e.color;
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(e.x + 6, e.y + 2);
    cx.lineTo(e.x + 4, e.y - 4);
    cx.moveTo(e.x + e.w - 6, e.y + 2);
    cx.lineTo(e.x + e.w - 4, e.y - 4);
    cx.stroke();
    // 眼睛
    cx.fillStyle = '#111';
    cx.fillRect(e.x + 7, e.y + 5, 3, 3);
    cx.fillRect(e.x + e.w - 10, e.y + 5, 3, 3);
  }

  // ---- 绘制 Boss ----
  function drawBoss() {
    if (!boss || !boss.alive) return;
    const { x, y, w, h, hp, maxHp } = boss;
    cx.fillStyle = boss.color;
    // 主体
    cx.beginPath();
    cx.roundRect(x, y + 8, w, h - 8, 6);
    cx.fill();
    // 机翼
    cx.fillStyle = '#00bfb3';
    cx.beginPath();
    cx.moveTo(x, y + 16);
    cx.lineTo(x - 10, y + h);
    cx.lineTo(x + 10, y + h);
    cx.closePath();
    cx.fill();
    cx.beginPath();
    cx.moveTo(x + w, y + 16);
    cx.lineTo(x + w + 10, y + h);
    cx.lineTo(x + w - 10, y + h);
    cx.closePath();
    cx.fill();
    // 炮口
    cx.fillStyle = '#ff0';
    cx.fillRect(x + w / 2 - 3, y + h - 2, 6, 5);
    // HP 条
    cx.fillStyle = '#333';
    cx.fillRect(x, y, w, 6);
    cx.fillStyle = '#f00';
    cx.fillRect(x, y, w * (hp / maxHp), 6);
    // 眼睛
    cx.fillStyle = '#ff0';
    cx.beginPath();
    cx.arc(x + w / 2 - 8, y + 16, 4, 0, Math.PI * 2);
    cx.arc(x + w / 2 + 8, y + 16, 4, 0, Math.PI * 2);
    cx.fill();
  }

  // ---- 绘制子弹 ----
  function drawBullets() {
    cx.fillStyle = '#ffd600';
    for (const b of bullets) {
      cx.fillRect(b.x - 1, b.y, 3, 8);
    }
    cx.fillStyle = '#ff4444';
    for (const b of eBullets) {
      cx.fillRect(b.x - 2, b.y, 4, 6);
    }
  }

  // ---- Header ----
  function drawHeader() {
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, W, HEADER_H);
    cx.font = 'bold 9px monospace';
    cx.textBaseline = 'middle';

    // 分数
    cx.fillStyle = '#ffd600';
    cx.textAlign = 'left';
    cx.fillText('SCORE:' + score, 4, 10);

    // 关卡
    cx.fillStyle = '#aaffaa';
    cx.textAlign = 'center';
    cx.fillText('LV.' + level, W / 2, 10);

    // 生命
    cx.fillStyle = '#ff6666';
    cx.textAlign = 'right';
    cx.fillText('★'.repeat(lives), W - 4, 10);
  }

  // ---- AABB 碰撞 ----
  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ---- 更新游戏逻辑 ----
  let lastTs = 0;
  let shootCooldown = 0;
  let bossFireTimer = 0;
  let enemyFireTimer = 0;

  function update(ts) {
    const dt = Math.min(ts - lastTs, 50);
    lastTs = ts;

    updateStars();

    if (state === 'levelup') {
      celebrateTimer -= dt;
      if (celebrateTimer <= 0) {
        level++;
        if (level > 5 && score < 9999) { /* 继续 */ }
        initLevel();
        state = 'playing';
      }
      return;
    }

    if (state !== 'playing') return;

    // 无敌计时
    if (invincibleTimer > 0) invincibleTimer--;

    // 玩家移动
    if (keys['ArrowLeft'] || keys['a']) player.x -= 3;
    if (keys['ArrowRight'] || keys['d']) player.x += 3;
    player.x = Math.max(0, Math.min(W - player.w, player.x));

    // 射击
    if (shootCooldown > 0) shootCooldown--;
    if ((keys[' '] || keys['Space']) && shootCooldown === 0) {
      if (bullets.length < MAX_BULLETS) {
        bullets.push({ x: player.x + player.w / 2, y: player.y, w: 3, h: 8 });
        shootCooldown = 12;
      }
    }

    // 移动玩家子弹
    bullets = bullets.filter(b => {
      b.y -= BULLET_SPEED;
      return b.y + 8 > HEADER_H;
    });

    // 敌人整体移动
    const liveEnemies = enemies.filter(e => e.alive);
    let minX = Infinity, maxX = -Infinity;
    for (const e of liveEnemies) {
      minX = Math.min(minX, e.x);
      maxX = Math.max(maxX, e.x + e.w);
    }
    let baseSpeed = enemySpeed * (dt / 16);
    // 消灭越多敌人速度越快
    const aliveRatio = liveEnemies.length / Math.max(enemies.length, 1);
    const speedBoost = 1 + (1 - aliveRatio) * 1.5;
    baseSpeed *= speedBoost;

    for (const e of enemies) {
      e.x += enemyDir * baseSpeed;
    }
    if (maxX >= W - 2 && enemyDir > 0) {
      enemyDir = -1;
      for (const e of enemies) e.y += 8;
    }
    if (minX <= 2 && enemyDir < 0) {
      enemyDir = 1;
      for (const e of enemies) e.y += 8;
    }

    // Boss 移动
    if (boss && boss.alive) {
      boss.x += boss.dir * boss.speed * (dt / 16);
      if (boss.x <= 0) { boss.dir = 1; boss.x = 0; }
      if (boss.x + boss.w >= W) { boss.dir = -1; boss.x = W - boss.w; }

      // Boss 射击
      bossFireTimer += dt;
      if (bossFireTimer > 1200) {
        bossFireTimer = 0;
        eBullets.push({ x: boss.x + boss.w / 2, y: boss.y + boss.h, w: 4, h: 6, vy: 2.5 });
      }
    }

    // 敌人反击
    const cfg = getLevelConfig(level);
    enemyFireTimer += dt;
    if (enemyFireTimer > 800 && liveEnemies.length > 0 && cfg.fireRate > 0) {
      enemyFireTimer = 0;
      if (Math.random() < cfg.fireRate) {
        const shooter = liveEnemies[Math.floor(Math.random() * liveEnemies.length)];
        eBullets.push({ x: shooter.x + shooter.w / 2, y: shooter.y + shooter.h, w: 4, h: 6, vy: 1.8 });
      }
    }

    // 移动敌人子弹
    eBullets = eBullets.filter(b => {
      b.y += b.vy;
      return b.y < H;
    });

    // 玩家子弹碰撞敌人
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      let hit = false;

      // 碰 Boss
      if (boss && boss.alive) {
        if (aabb(b, boss)) {
          boss.hp--;
          if (boss.hp <= 0) {
            boss.alive = false;
            score += 50 * level;
          }
          bullets.splice(i, 1);
          hit = true;
        }
      }
      if (hit) continue;

      // 碰普通敌人
      for (const e of enemies) {
        if (!e.alive) continue;
        if (aabb(b, e)) {
          e.alive = false;
          score += 10 * level;
          bullets.splice(i, 1);
          hit = true;
          break;
        }
      }
    }

    // 敌人子弹碰玩家
    if (invincibleTimer === 0) {
      for (let i = eBullets.length - 1; i >= 0; i--) {
        const b = eBullets[i];
        const pb = { x: player.x, y: player.y, w: player.w, h: player.h };
        if (aabb(b, pb)) {
          eBullets.splice(i, 1);
          loseLife();
          break;
        }
      }
    }

    // 敌人碰玩家
    if (invincibleTimer === 0) {
      const pb = { x: player.x, y: player.y, w: player.w, h: player.h };
      for (const e of liveEnemies) {
        if (aabb(e, pb)) {
          loseLife();
          break;
        }
      }
      if (boss && boss.alive) {
        if (aabb(boss, pb)) loseLife();
      }
    }

    // 敌人到达底部
    for (const e of liveEnemies) {
      if (e.y + e.h >= H - 10) {
        gameOver();
        return;
      }
    }

    // 判断过关
    const allDead = enemies.every(e => !e.alive) && (!boss || !boss.alive);
    if (allDead) {
      celebrateTimer = 500;
      state = 'levelup';
      if (level >= 5) {
        // 继续挑战更难的关卡
      }
    }

    // 更新最高分
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('retro_shooter_best', bestScore);
    }
  }

  function loseLife() {
    lives--;
    invincibleTimer = 90;
    if (lives <= 0) gameOver();
  }

  function gameOver() {
    state = 'gameover';
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('retro_shooter_best', bestScore);
    }
  }

  // ---- 绘制主帧 ----
  let blinkTimer = 0;

  function draw(ts) {
    if (!cv) return;
    blinkTimer = (blinkTimer + 1) % 60;

    // 黑色背景
    cx.fillStyle = '#000';
    cx.fillRect(0, 0, W, H);

    drawStars();

    if (state === 'title') {
      drawTitle();
    } else if (state === 'playing' || state === 'levelup') {
      update(ts);
      drawHeader();
      drawEnemies();
      drawBoss();
      drawBullets();
      drawPlayer();
      if (state === 'levelup') drawLevelUp();
    } else if (state === 'gameover') {
      drawHeader();
      drawGameOver();
    } else if (state === 'win') {
      drawWin();
    }

    rafId = requestAnimationFrame(draw);
  }

  function drawEnemies() {
    for (const e of enemies) drawEnemy(e);
  }

  function drawTitle() {
    cx.font = 'bold 18px monospace';
    cx.fillStyle = '#ffd600';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('SHOOTER', W / 2, 75);

    cx.font = '9px monospace';
    cx.fillStyle = '#aaa';
    cx.fillText('BEST: ' + bestScore, W / 2, 100);

    if (blinkTimer < 40) {
      cx.fillStyle = '#fff';
      cx.fillText(i18n('按 SPACE 开始', 'Press SPACE to Start'), W / 2, 125);
    }

    drawHint(cx, W, H, CTRL);
  }

  function drawLevelUp() {
    cx.fillStyle = 'rgba(0,0,0,0.5)';
    cx.fillRect(0, H / 2 - 20, W, 40);
    cx.font = 'bold 14px monospace';
    cx.fillStyle = '#ffd600';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(i18n('第 ' + level + ' 关通过！', 'Level ' + level + ' Clear!'), W / 2, H / 2);
  }

  function drawGameOver() {
    cx.font = 'bold 16px monospace';
    cx.fillStyle = '#ff4444';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('GAME OVER', W / 2, H / 2 - 24);

    cx.font = '10px monospace';
    cx.fillStyle = '#ffd600';
    cx.fillText('SCORE: ' + score, W / 2, H / 2 - 4);
    cx.fillStyle = '#aaa';
    cx.fillText('BEST: ' + bestScore, W / 2, H / 2 + 12);

    if (blinkTimer < 40) {
      cx.fillStyle = '#fff';
      cx.fillText(i18n('SPACE 重玩', 'SPACE to Restart'), W / 2, H / 2 + 32);
    }
  }

  function drawWin() {
    cx.font = 'bold 16px monospace';
    cx.fillStyle = '#00ff99';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('YOU WIN!', W / 2, H / 2 - 24);

    cx.font = '10px monospace';
    cx.fillStyle = '#ffd600';
    cx.fillText('SCORE: ' + score, W / 2, H / 2 - 4);

    if (blinkTimer < 40) {
      cx.fillStyle = '#fff';
      cx.fillText(i18n('SPACE 重玩', 'SPACE to Restart'), W / 2, H / 2 + 20);
    }
  }

  // ---- 事件处理 ----
  function onKey(e) {
    const down = e.type === 'keydown';
    keys[e.key] = down;
    keys[e.code] = down;

    if (down && (e.key === ' ' || e.code === 'Space')) {
      if (state === 'title') { startGame(); }
      else if (state === 'gameover') { startGame(); }
      else if (state === 'win') { startGame(); }
      e.preventDefault();
    }
  }

  function onMouse(e) {
    if (!cv || !player) return;
    const rect = cv.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    player.x = Math.max(0, Math.min(W - player.w, mx - player.w / 2));
  }

  return {
    start(_cv, _cx) {
      cv = _cv; cx = _cx;
      bestScore = parseInt(localStorage.getItem('retro_shooter_best') || '0', 10);
      initStars();
      state = 'title';
      score = 0; lives = 3; level = 1;
      lastTs = 0;

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
