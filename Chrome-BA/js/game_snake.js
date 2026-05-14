/* ===== 贪吃蛇 ===== 方向键控制 / SPACE 重开 */
GAME_MODULES.snake = (() => {
  const COLS = 16, ROWS = 15, CELL = 16;
  let cv, cx, snake, dir, nextDir, food, score, speed, lastTs, rafId, dead, keyH;

  function rand(n) { return Math.floor(Math.random() * n); }

  function spawnFood() {
    let p;
    do { p = { x: rand(COLS), y: rand(ROWS) }; }
    while (snake.some(s => s.x === p.x && s.y === p.y));
    food = p;
  }

  function draw() {
    cx.fillStyle = '#0d1117';
    cx.fillRect(0, 0, 256, 240);

    cx.fillStyle = '#1a2030';
    for (let x = 0; x < COLS; x++)
      for (let y = 0; y < ROWS; y++)
        cx.fillRect(x * CELL + 7, y * CELL + 7, 2, 2);

    cx.fillStyle = '#ff3c3c';
    cx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);

    snake.forEach((seg, i) => {
      cx.fillStyle = i === 0 ? '#00e64d' : '#009933';
      cx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
      if (i === 0) {
        const ex = seg.x * CELL + (dir.x >= 0 ? 10 : 3);
        const ey = seg.y * CELL + (dir.y >= 0 ? 3 : 10);
        cx.fillStyle = '#000';
        cx.fillRect(ex, ey, 2, 2);
      }
    });

    cx.fillStyle = 'rgba(0,0,0,0.55)';
    cx.fillRect(0, 0, 106, 13);
    cx.fillStyle = '#fff';
    cx.font = '8px monospace';
    cx.fillText(`SCORE: ${score}  HI: ${Math.max(score, +localStorage.snakeHi || 0)}`, 4, 10);

    if (dead) {
      cx.fillStyle = 'rgba(0,0,0,0.75)';
      cx.fillRect(48, 88, 160, 64);
      cx.fillStyle = '#ff3c3c';
      cx.font = 'bold 14px monospace';
      cx.textAlign = 'center';
      cx.fillText('GAME OVER', 128, 112);
      cx.fillStyle = '#ccc';
      cx.font = '8px monospace';
      cx.fillText(`SCORE: ${score}`, 128, 128);
      cx.fillText('[SPACE] restart', 128, 143);
      cx.textAlign = 'left';
    }
  }

  function step(ts) {
    if (dead) return;
    if (ts - lastTs >= speed) {
      lastTs = ts;
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
          snake.some(s => s.x === head.x && s.y === head.y)) {
        dead = true;
        localStorage.snakeHi = Math.max(score, +localStorage.snakeHi || 0);
        draw();
        return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        speed = Math.max(80, 200 - Math.floor(score / 50) * 20);
        spawnFood();
      } else {
        snake.pop();
      }
    }
    draw();
    rafId = requestAnimationFrame(step);
  }

  function onKey(e) {
    const m = { ArrowUp: {x:0,y:-1}, ArrowDown: {x:0,y:1}, ArrowLeft: {x:-1,y:0}, ArrowRight: {x:1,y:0} };
    if (m[e.key]) {
      const d = m[e.key];
      if (d.x !== -dir.x || d.y !== -dir.y) nextDir = d;
      e.preventDefault();
    }
    if (e.key === ' ') {
      if (dead) restart();
      e.preventDefault();
    }
  }

  function restart() {
    snake = [{x:8,y:7},{x:7,y:7},{x:6,y:7}];
    dir = nextDir = {x:1,y:0};
    score = 0; speed = 200; dead = false; lastTs = 0;
    spawnFood();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(step);
  }

  return {
    start(_cv, _cx) {
      cv = _cv; cx = _cx;
      document.removeEventListener('keydown', keyH);
      keyH = onKey;
      document.addEventListener('keydown', keyH);
      restart();
    },
    stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      document.removeEventListener('keydown', keyH);
    }
  };
})();
