/* ===== 打砖块 ===== 鼠标移动 / ←→键 控制挡板 / SPACE 发球 & 重开 */
GAME_MODULES.breakout = (() => {
  const PW = 48, PH = 6, PY = 228, BALL_R = 4;
  const BC = 8, BR = 5, BW = 26, BH = 9, BPX = 4, BPY = 22;
  const BCOLORS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db'];

  let cv, cx, paddle, ball, bricks, score, lives, over, launched, keyH, keyHUp, mousH, rafId, keys;

  function mkBricks() {
    const b = [];
    for (let r = 0; r < BR; r++)
      for (let c = 0; c < BC; c++)
        b.push({ x: BPX + c*(BW+2), y: BPY + r*(BH+3), alive: true, row: r });
    return b;
  }

  function draw() {
    cx.fillStyle = '#0a0a1a';
    cx.fillRect(0, 0, 256, 240);

    cx.fillStyle = '#fff';
    cx.font = '8px monospace';
    cx.fillText(`SCORE: ${score}`, 4, 10);
    cx.fillText(`LIVES: ${'♥'.repeat(lives)}`, 170, 10);

    bricks.forEach(b => {
      if (!b.alive) return;
      cx.fillStyle = BCOLORS[b.row];
      cx.fillRect(b.x, b.y, BW, BH);
      cx.fillStyle = 'rgba(255,255,255,0.3)';
      cx.fillRect(b.x, b.y, BW, 2);
    });

    cx.fillStyle = '#4fa3e8';
    cx.fillRect(paddle.x, PY, PW, PH);
    cx.fillStyle = 'rgba(255,255,255,0.35)';
    cx.fillRect(paddle.x, PY, PW, 2);

    cx.fillStyle = '#fff';
    cx.beginPath();
    cx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    cx.fill();

    if (!launched) {
      cx.fillStyle = 'rgba(255,255,255,0.6)';
      cx.font = '7px monospace';
      cx.textAlign = 'center';
      cx.fillText('[SPACE] 发球', 128, 210);
      cx.textAlign = 'left';
    }

    if (over) {
      const allDead = bricks.every(b => !b.alive);
      cx.fillStyle = 'rgba(0,0,0,0.8)';
      cx.fillRect(44, 95, 168, 60);
      cx.textAlign = 'center';
      cx.fillStyle = allDead ? '#2ecc71' : '#e74c3c';
      cx.font = 'bold 14px monospace';
      cx.fillText(allDead ? '通关!' : 'GAME OVER', 128, 120);
      cx.fillStyle = '#aaa';
      cx.font = '8px monospace';
      cx.fillText(`SCORE: ${score}`, 128, 136);
      cx.fillText('[SPACE] 重新开始', 128, 150);
      cx.textAlign = 'left';
    }
  }

  function loop() {
    if (over) { draw(); return; }

    if (keys.ArrowLeft)  paddle.x = Math.max(0, paddle.x - 5);
    if (keys.ArrowRight) paddle.x = Math.min(256 - PW, paddle.x + 5);

    if (launched) {
      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.x - BALL_R <= 0)   { ball.x = BALL_R;       ball.dx =  Math.abs(ball.dx); }
      if (ball.x + BALL_R >= 256)  { ball.x = 256 - BALL_R; ball.dx = -Math.abs(ball.dx); }
      if (ball.y - BALL_R <= 14)   { ball.y = 14 + BALL_R;  ball.dy =  Math.abs(ball.dy); }

      if (ball.y + BALL_R >= PY && ball.y - BALL_R <= PY + PH &&
          ball.x >= paddle.x - BALL_R && ball.x <= paddle.x + PW + BALL_R &&
          ball.dy > 0) {
        ball.dy = -Math.abs(ball.dy);
        const rel = (ball.x - paddle.x) / PW - 0.5;
        ball.dx = rel * 6 + (ball.dx > 0 ? 0.5 : -0.5);
        ball.dx = Math.max(-5, Math.min(5, ball.dx));
      }

      if (ball.y > 248) {
        lives--;
        if (lives <= 0) { over = true; }
        else { resetBall(); }
      }

      let alive = false;
      bricks.forEach(b => {
        if (!b.alive) return;
        alive = true;
        if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + BW &&
            ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + BH) {
          b.alive = false;
          score += (BR - b.row) * 10;
          const midX = b.x + BW/2, midY = b.y + BH/2;
          const overlapX = Math.min(Math.abs(ball.x - b.x), Math.abs(ball.x - (b.x+BW)));
          const overlapY = Math.min(Math.abs(ball.y - b.y), Math.abs(ball.y - (b.y+BH)));
          if (overlapX < overlapY) ball.dx = -ball.dx;
          else ball.dy = -ball.dy;
        }
      });
      if (!alive) over = true;
    } else {
      ball.x = paddle.x + PW / 2;
    }

    draw();
    rafId = requestAnimationFrame(loop);
  }

  function resetBall() {
    launched = false;
    ball = { x: paddle.x + PW/2, y: PY - BALL_R - 2, dx: 3, dy: -3.5 };
  }

  function restart() {
    paddle = { x: (256 - PW) / 2 };
    bricks = mkBricks();
    score = 0; lives = 3; over = false;
    resetBall();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function onKeyDown(e) {
    keys[e.key] = true;
    if (e.key === ' ') {
      if (over) restart();
      else if (!launched) launched = true;
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
  }

  function onKeyUp(e) { keys[e.key] = false; }

  function onMouse(e) {
    const rect = cv.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (256 / rect.width);
    paddle.x = Math.max(0, Math.min(256 - PW, mx - PW / 2));
    if (!launched) ball.x = paddle.x + PW / 2;
  }

  return {
    start(_cv, _cx) {
      cv = _cv; cx = _cx;
      keys = {};
      document.removeEventListener('keydown', keyH);
      document.removeEventListener('keyup', keyHUp);
      keyH = onKeyDown; keyHUp = onKeyUp;
      document.addEventListener('keydown', keyH);
      document.addEventListener('keyup', keyHUp);
      if (mousH) cv.removeEventListener('mousemove', mousH);
      mousH = onMouse;
      cv.addEventListener('mousemove', mousH);
      restart();
    },
    stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      document.removeEventListener('keydown', keyH);
      document.removeEventListener('keyup', keyHUp);
      if (mousH) { cv.removeEventListener('mousemove', mousH); mousH = null; }
    }
  };
})();
