/* ===== 2048 ===== 方向键控制 / SPACE 重开 */
GAME_MODULES.g2048 = (() => {
  const GAP = 4, HEADER = 22, CELL = 49;
  const BX = Math.floor((256 - (4 * CELL + 5 * GAP)) / 2); // 水平居中
  const BW = 4 * CELL + 5 * GAP;

  const TILE_BG = {
    0:'#cdc1b4', 2:'#eee4da', 4:'#ede0c8', 8:'#f2b179',
    16:'#f59563', 32:'#f67c5f', 64:'#f65e3b',
    128:'#edcf72', 256:'#edcc61', 512:'#edc850',
    1024:'#edc53f', 2048:'#edc22e',
  };
  const TILE_FG = { 2:'#776e65', 4:'#776e65' };

  let cv, cx, board, score, best, over, won, keyH;

  function cellX(c) { return BX + GAP + c * (CELL + GAP); }
  function cellY(r) { return HEADER + GAP + r * (CELL + GAP); }

  function newBoard() {
    const b = Array.from({length:4}, () => Array(4).fill(0));
    addTile(b); addTile(b); return b;
  }

  function addTile(b) {
    const empty = [];
    b.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push({r,c}); }));
    if (!empty.length) return;
    const {r,c} = empty[Math.floor(Math.random() * empty.length)];
    b[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function slide(row) {
    let arr = row.filter(Boolean), merged = false;
    for (let i = 0; i < arr.length - 1; i++) {
      if (!merged && arr[i] === arr[i+1]) {
        arr[i] *= 2; score += arr[i];
        if (arr[i] >= 2048) won = true;
        arr.splice(i+1, 1); merged = true;
      } else { merged = false; }
    }
    while (arr.length < 4) arr.push(0);
    return arr;
  }

  function move(dir) {
    const old = board.map(r => [...r]);
    if (dir === 'left')  board = board.map(r => slide(r));
    if (dir === 'right') board = board.map(r => slide([...r].reverse()).reverse());
    if (dir === 'up' || dir === 'down') {
      for (let c = 0; c < 4; c++) {
        const col = [board[0][c],board[1][c],board[2][c],board[3][c]];
        const slid = dir === 'up' ? slide(col) : slide([...col].reverse()).reverse();
        slid.forEach((v, r) => board[r][c] = v);
      }
    }
    const moved = board.some((r,ri) => r.some((v,ci) => v !== old[ri][ci]));
    if (moved) addTile(board);

    if (!board.flat().includes(0)) {
      let ok = false;
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++) {
          if (c < 3 && board[r][c] === board[r][c+1]) ok = true;
          if (r < 3 && board[r][c] === board[r+1][c]) ok = true;
        }
      if (!ok) over = true;
    }
    best = Math.max(best, score);
    localStorage.g2048Best = best;
    draw();
  }

  function draw() {
    cx.fillStyle = '#faf8ef';
    cx.fillRect(0, 0, 256, 240);

    cx.fillStyle = '#776e65';
    cx.font = 'bold 14px monospace';
    cx.fillText('2048', BX, 16);
    cx.font = '8px monospace';
    cx.fillText(`SCORE:${score}`, BX + 50, 10);
    cx.fillText(`BEST:${best}`, BX + 50, 20);

    cx.fillStyle = '#bbada0';
    cx.fillRect(BX, HEADER, BW, BW);

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const v = board[r][c], x = cellX(c), y = cellY(r);
        cx.fillStyle = TILE_BG[v] || '#3c3a32';
        cx.fillRect(x, y, CELL, CELL);
        if (v) {
          const fs = v >= 1000 ? 10 : v >= 100 ? 12 : 14;
          cx.fillStyle = TILE_FG[v] || '#f9f6f2';
          cx.font = `bold ${fs}px monospace`;
          cx.textAlign = 'center';
          cx.textBaseline = 'middle';
          cx.fillText(String(v), x + CELL/2, y + CELL/2);
        }
      }
    }
    cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';

    if (over || won) {
      cx.fillStyle = 'rgba(238,228,218,0.88)';
      cx.fillRect(BX, HEADER, BW, BW);
      cx.textAlign = 'center';
      cx.fillStyle = over ? '#776e65' : '#f67c5f';
      cx.font = 'bold 16px monospace';
      cx.fillText(over ? 'GAME OVER' : 'YOU WIN!', BX + BW/2, HEADER + BW/2 - 10);
      cx.fillStyle = '#aaa';
      cx.font = '8px monospace';
      cx.fillText(`SCORE: ${score}`, BX + BW/2, HEADER + BW/2 + 8);
      cx.fillText('[SPACE] restart', BX + BW/2, HEADER + BW/2 + 22);
      cx.textAlign = 'left';
    }
  }

  function onKey(e) {
    const dirs = { ArrowLeft:'left', ArrowRight:'right', ArrowUp:'up', ArrowDown:'down' };
    if (dirs[e.key] && !over) { move(dirs[e.key]); e.preventDefault(); }
    if (e.key === ' ') {
      if (over || won) restart();
      e.preventDefault();
    }
  }

  function restart() {
    board = newBoard(); score = 0; over = false; won = false;
    best = +localStorage.g2048Best || 0;
    draw();
  }

  return {
    start(_cv, _cx) {
      cv = _cv; cx = _cx;
      document.removeEventListener('keydown', keyH);
      keyH = onKey;
      document.addEventListener('keydown', keyH);
      restart();
    },
    stop() { document.removeEventListener('keydown', keyH); }
  };
})();
