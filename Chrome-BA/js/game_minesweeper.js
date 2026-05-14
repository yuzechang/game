GAME_MODULES.minesweeper = (() => {
  const COLS = 9, ROWS = 9, MINES = 10, CELL = 24;
  const GX = 20, GY = 32;
  const NUM_COLORS = ['','#2563eb','#16a34a','#dc2626','#1e40af','#b91c1c','#0e7490','#111','#6b7280'];

  let cv, cx, board, revealed, flagged, mineCount, timer, started, over, won, rafId, mouseH, ctxH, lastSec;

  function initBoard() {
    board    = Array.from({length: ROWS}, () => new Array(COLS).fill(0));
    revealed = Array.from({length: ROWS}, () => new Array(COLS).fill(false));
    flagged  = Array.from({length: ROWS}, () => new Array(COLS).fill(false));
    mineCount = MINES; timer = 0; started = false; over = false; won = false; lastSec = 0;
  }

  function placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (board[r][c] === -1) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      board[r][c] = -1;
      placed++;
    }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (board[r][c] === -1) continue;
      let cnt = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r+dr, nc = c+dc;
        if (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&board[nr][nc]===-1) cnt++;
      }
      board[r][c] = cnt;
    }
  }

  function reveal(r, c) {
    if (r<0||r>=ROWS||c<0||c>=COLS||revealed[r][c]||flagged[r][c]) return;
    revealed[r][c] = true;
    if (board[r][c] === 0) {
      for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) reveal(r+dr,c+dc);
    }
  }

  function checkWin() {
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
      if (board[r][c] !== -1 && !revealed[r][c]) return false;
    }
    return true;
  }

  function getCell(px, py) {
    const c = Math.floor((px - GX) / CELL);
    const r = Math.floor((py - GY) / CELL);
    if (r<0||r>=ROWS||c<0||c>=COLS) return null;
    return {r, c};
  }

  function draw(ts) {
    if (!cv) return;
    if (started && !over && !won) {
      const sec = Math.floor((ts - lastSec) / 1000);
      if (sec > 0) { timer += sec; lastSec = ts; if (timer > 999) timer = 999; }
    }

    cx.fillStyle = '#c0c0c0';
    cx.fillRect(0, 0, cv.width, cv.height);

    // 头部面板
    cx.fillStyle = '#bdbdbd';
    cx.fillRect(2, 2, cv.width-4, 26);
    draw3D(2, 2, cv.width-4, 26, '#fff', '#808080');

    // 雷数计数器
    drawLCDNum(cx, mineCount, 6, 4);
    // 时间计数器
    drawLCDNum(cx, Math.min(timer, 999), cv.width - 6 - 39, 4);

    // 笑脸按钮
    const fx = Math.floor(cv.width/2)-9, fy = 4;
    cx.fillStyle = '#c0c0c0'; cx.fillRect(fx, fy, 18, 18);
    draw3D(fx, fy, 18, 18, '#fff', '#808080');
    cx.font = '13px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(over ? '😵' : (won ? '😎' : '🙂'), fx+9, fy+9);

    // 棋盘边框
    draw3D(GX-2, GY-2, COLS*CELL+4, ROWS*CELL+4, '#808080', '#fff');

    // 格子
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
      const x = GX + c*CELL, y = GY + r*CELL;
      if (revealed[r][c]) {
        cx.fillStyle = '#c0c0c0'; cx.fillRect(x,y,CELL,CELL);
        cx.strokeStyle='#808080'; cx.lineWidth=0.5;
        cx.strokeRect(x,y,CELL,CELL);
        if (board[r][c] === -1) {
          cx.fillStyle = over ? '#ff0000' : '#c0c0c0';
          cx.fillRect(x,y,CELL,CELL);
          cx.font='14px serif'; cx.textAlign='center'; cx.textBaseline='middle';
          cx.fillText('💣', x+CELL/2, y+CELL/2);
        } else if (board[r][c] > 0) {
          cx.fillStyle = NUM_COLORS[board[r][c]];
          cx.font = 'bold 13px monospace';
          cx.textAlign = 'center'; cx.textBaseline = 'middle';
          cx.fillText(board[r][c], x+CELL/2, y+CELL/2);
        }
      } else {
        cx.fillStyle='#c0c0c0'; cx.fillRect(x,y,CELL,CELL);
        draw3D(x,y,CELL,CELL,'#fff','#808080');
        if (flagged[r][c]) {
          cx.font='12px serif'; cx.textAlign='center'; cx.textBaseline='middle';
          cx.fillText('🚩', x+CELL/2, y+CELL/2);
        }
        if (over && board[r][c]===-1 && !flagged[r][c]) {
          cx.font='14px serif'; cx.textAlign='center'; cx.textBaseline='middle';
          cx.fillText('💣', x+CELL/2, y+CELL/2);
        }
      }
    }

    rafId = requestAnimationFrame(draw);
  }

  function draw3D(x,y,w,h,light,shadow) {
    cx.strokeStyle = light; cx.lineWidth = 1.5;
    cx.beginPath(); cx.moveTo(x,y+h); cx.lineTo(x,y); cx.lineTo(x+w,y); cx.stroke();
    cx.strokeStyle = shadow;
    cx.beginPath(); cx.moveTo(x+w,y); cx.lineTo(x+w,y+h); cx.lineTo(x,y+h); cx.stroke();
  }

  function drawLCDNum(ctx, val, x, y) {
    ctx.fillStyle='#200'; ctx.fillRect(x,y,39,16);
    ctx.fillStyle='#f00'; ctx.font='bold 14px monospace';
    ctx.textAlign='right'; ctx.textBaseline='middle';
    ctx.fillText(String(Math.max(0,val)).padStart(3,'0'), x+36, y+8);
  }

  function onClick(e) {
    if (over || won) {
      const fx = Math.floor(cv.width/2)-9, fy = 4;
      const rect = cv.getBoundingClientRect();
      const px = (e.clientX - rect.left) * (256/rect.width);
      const py = (e.clientY - rect.top) * (240/rect.height);
      if (px>=fx&&px<=fx+18&&py>=fy&&py<=fy+18) { initBoard(); return; }
      return;
    }
    const rect = cv.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (256/rect.width);
    const py = (e.clientY - rect.top) * (240/rect.height);
    const cell = getCell(px, py);
    if (!cell) return;
    const {r,c} = cell;
    if (revealed[r][c] || flagged[r][c]) return;
    if (!started) { started = true; lastSec = performance.now(); placeMines(r, c); }
    if (board[r][c] === -1) {
      revealed[r][c] = true; over = true;
      for (let i=0;i<ROWS;i++) for (let j=0;j<COLS;j++) if(board[i][j]===-1) revealed[i][j]=true;
      return;
    }
    reveal(r, c);
    if (checkWin()) { won = true; mineCount = 0; }
  }

  function onContext(e) {
    e.preventDefault();
    if (over || won) return;
    const rect = cv.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (256/rect.width);
    const py = (e.clientY - rect.top) * (240/rect.height);
    const cell = getCell(px, py);
    if (!cell) return;
    const {r,c} = cell;
    if (revealed[r][c]) return;
    if (!flagged[r][c] && mineCount > 0) { flagged[r][c] = true; mineCount--; }
    else if (flagged[r][c]) { flagged[r][c] = false; mineCount++; }
  }

  return {
    start(_cv, _cx) {
      cv = _cv; cx = _cx;
      initBoard();
      cv.addEventListener('click', mouseH = onClick);
      cv.addEventListener('contextmenu', ctxH = onContext);
      rafId = requestAnimationFrame(draw);
    },
    stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (cv) { cv.removeEventListener('click', mouseH); cv.removeEventListener('contextmenu', ctxH); }
      cv = null;
    }
  };
})();
