/* ===== 沙子消不停 ===== 沙粒物理下落 + 满行消除 | ←→移动 SPACE加速 */
GAME_MODULES.sandfall = (() => {
  const COLS = 64, ROWS = 58, CELL = 4;       // 4px 格子 → 256x232 游戏区
  const TOP_ROW = 2;                            // 料斗占前2行
  const HINT = i18n(
    ['操作说明','← → 移动料斗','Space 加速落沙','1/2/3 切换料斗宽度','填满整行自动消除'],
    ['Controls','← → Move hopper','Space Speed up','1/2/3 Nozzle width','Fill a row to clear it']
  );

  const SAND = ['#f4a460','#deb887','#d2b48c','#c9a96e','#e8c170','#b8954a','#cda870','#daa870'];

  let cv, cx, grid, hopperX, nozzleW, score, level, lines, running, rafId;
  let keys = {}, dropCd, dropRate, clearingRows, clearAnim;

  function init() {
    grid = Array.from({length: ROWS}, () => new Array(COLS).fill(0));
    hopperX  = Math.floor((COLS - 3) / 2);
    nozzleW  = 3;
    score    = 0;
    level    = 1;
    lines    = 0;
    dropCd   = 0;
    dropRate = 10;
    clearingRows = [];
    clearAnim = 0;
  }

  /* ── 落沙 ── */
  function spawnSand() {
    const ci = (Math.floor(Math.random() * SAND.length) || 0) + 1;
    for (let i = 0; i < nozzleW; i++) {
      const c = hopperX + i;
      if (c >= 0 && c < COLS && grid[TOP_ROW][c] === 0) {
        grid[TOP_ROW][c] = ci;
      }
    }
    // 若料斗下方堵死 → 游戏结束
    if (grid[TOP_ROW][hopperX + Math.floor(nozzleW / 2)] !== 0 &&
        grid[TOP_ROW].every(v => v !== 0)) {
      gameOver();
    }
  }

  /* ── 沙粒物理（从下往上扫描）── */
  function simSand() {
    for (let r = ROWS - 1; r >= TOP_ROW; r--) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === 0) continue;
        // 下落
        if (r + 1 < ROWS && grid[r + 1][c] === 0) {
          grid[r + 1][c] = grid[r][c];
          grid[r][c] = 0;
          continue;
        }
        // 斜向滑落（方向随机化，避免一致偏向）
        if (r + 1 < ROWS) {
          const lFree = c > 0 && grid[r + 1][c - 1] === 0;
          const rFree = c + 1 < COLS && grid[r + 1][c + 1] === 0;
          if (lFree && rFree) {
            const dir = Math.random() < 0.5 ? -1 : 1;
            grid[r + 1][c + dir] = grid[r][c];
            grid[r][c] = 0;
          } else if (lFree) {
            grid[r + 1][c - 1] = grid[r][c];
            grid[r][c] = 0;
          } else if (rFree) {
            grid[r + 1][c + 1] = grid[r][c];
            grid[r][c] = 0;
          }
        }
      }
    }
  }

  /* ── 满行消除 ── */
  function checkLines() {
    if (clearingRows.length > 0) return; // 动画中不重复检测
    const full = [];
    for (let r = ROWS - 1; r >= TOP_ROW; r--) {
      if (grid[r].every(v => v !== 0)) full.push(r);
    }
    if (full.length > 0) {
      clearingRows = full;
      clearAnim = 12; // 闪烁帧数
    }
  }

  function clearRows() {
    clearingRows.sort((a, b) => b - a); // 从下往上删
    clearingRows.forEach(r => {
      grid.splice(r, 1);
      grid.unshift(new Array(COLS).fill(0));
    });
    const n = clearingRows.length;
    lines += n;
    score += n * 100 * level;
    // 升级
    const newLv = Math.floor(lines / 5) + 1;
    if (newLv > level) {
      level = newLv;
      dropRate = Math.max(3, 10 - level); // 越来越快
    }
    clearingRows = [];
  }

  function gameOver() {
    running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    draw();
  }

  /* ── 渲染 ── */
  function draw() {
    // 背景
    cx.fillStyle = '#1a1208';
    cx.fillRect(0, 0, 256, 240);

    // 沙粒
    for (let r = TOP_ROW; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = grid[r][c];
        if (v === 0) continue;
        // 消除动画：闪烁白/原色
        if (clearingRows.includes(r)) {
          cx.fillStyle = (clearAnim % 4 < 2) ? '#fff' : SAND[(v - 1) % SAND.length];
        } else {
          cx.fillStyle = SAND[(v - 1) % SAND.length];
        }
        cx.fillRect(c * CELL, r * CELL, CELL, CELL);
      }
    }

    // 料斗
    const hx = hopperX * CELL;
    const hy = (TOP_ROW - 1) * CELL;
    cx.fillStyle = '#555';
    cx.fillRect(hx - 2, hy - 2, nozzleW * CELL + 4, CELL + 4);
    cx.fillStyle = '#888';
    cx.fillRect(hx, hy, nozzleW * CELL, CELL);
    // 料斗出口指示
    cx.fillStyle = '#f4a460';
    for (let i = 0; i < nozzleW; i++) {
      cx.fillRect(hx + i * CELL + 1, hy + CELL - 2, CELL - 2, 2);
    }

    // HUD
    cx.fillStyle = 'rgba(0,0,0,0.5)';
    cx.fillRect(0, 0, 256, TOP_ROW * CELL);
    cx.fillStyle = '#f4a460';
    cx.font = 'bold 9px monospace';
    cx.textAlign = 'left';
    cx.fillText(`Lv${level}  行:${lines}  分:${score}`, 5, 8);

    // 料斗宽度指示
    cx.fillStyle = '#aaa';
    cx.font = '7px monospace';
    cx.textAlign = 'right';
    cx.fillText(`宽:${nozzleW} [1/2/3]`, 252, 8);

    // 游戏结束
    if (!running && lines > 0) {
      cx.fillStyle = 'rgba(0,0,0,0.7)';
      cx.fillRect(0, 60, 256, 100);
      cx.fillStyle = '#f4a460';
      cx.font = 'bold 14px monospace';
      cx.textAlign = 'center';
      cx.fillText('沙子溢出!', 128, 90);
      cx.fillStyle = '#fff';
      cx.font = '10px monospace';
      cx.fillText(`Lv${level}  消除 ${lines} 行  得分 ${score}`, 128, 112);
      cx.fillText('按 R 重新开始', 128, 132);
    } else if (!running && lines === 0) {
      cx.fillStyle = '#f4a460';
      cx.font = 'bold 10px monospace';
      cx.textAlign = 'center';
      cx.fillText(i18n('按方向键开始','Press arrow to start'), 128, 130);
    }
  }

  /* ── 游戏循环 ── */
  let started = false, paused = false;
  function loop() {
    if (!running) return;
    rafId = requestAnimationFrame(loop);

    if (clearingRows.length > 0) {
      clearAnim--;
      if (clearAnim <= 0) clearRows();
      draw();
      return;
    }

    if (!started || paused) { draw(); return; }

    // 输入
    if (keys['ArrowLeft'])  hopperX = Math.max(0, hopperX - 1);
    if (keys['ArrowRight']) hopperX = Math.min(COLS - nozzleW, hopperX + 1);

    const speedUp = keys[' '] || keys['Space'];
    const cd = speedUp ? Math.max(2, dropRate - 3) : dropRate;
    dropCd++;
    if (dropCd >= cd) {
      dropCd = 0;
      spawnSand();
      score += nozzleW;
    }

    simSand();
    checkLines();
    draw();
  }

  /* ── 键盘 ── */
  function onKey(e) {
    keys[e.key] = true;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();

    if (e.key === 'r' || e.key === 'R') {
      if (!running) { init(); running = true; started = false; paused = false; rafId = requestAnimationFrame(loop); }
      return;
    }
    if (!started && (e.key.startsWith('Arrow') || e.key === ' ')) {
      started = true;
    }
    // 切换料斗宽度
    if (e.key === '1') { nozzleW = 2; hopperX = Math.min(hopperX, COLS - 2); }
    if (e.key === '2') { nozzleW = 3; hopperX = Math.min(hopperX, COLS - 3); }
    if (e.key === '3') { nozzleW = 5; hopperX = Math.min(hopperX, COLS - 5); }
  }
  function onKeyUp(e) { keys[e.key] = false; }

  function restart() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    init();
    running = true;
    started = false;
    paused  = false;
    rafId = requestAnimationFrame(loop);
    draw();
  }

  return {
    start(_cv, _cx) {
      cv = _cv; cx = _cx;
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKeyUp);
      document.addEventListener('keydown', onKey);
      document.addEventListener('keyup', onKeyUp);
      restart();
    },
    stop() {
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKeyUp);
    }
  };
})();
