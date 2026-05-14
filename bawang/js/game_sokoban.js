GAME_MODULES.sokoban = (() => {
  const CTRL = i18n(
    ['操作说明','↑↓←→ 推动箱子入目标','R=重置当前关  N=下一关','★ = 所有箱子到位即通关'],
    ['Controls','↑↓←→ Push boxes to targets','R=Reset level  N=Next level','★ = All boxes on targets wins']
  );
  const CELL = 20;

  // 原创关卡（5关，越来越难）
  const LEVELS = [
    [
      '#####',
      '#@$.#',
      '#####',
    ],
    [
      '#####',
      '# $ #',
      '#.@.#',
      '# $ #',
      '#####',
    ],
    [
      '#######',
      '#.@ $ #',
      '#  $  #',
      '#. .  #',
      '#######',
    ],
    [
      '########',
      '#.  #  #',
      '#  @$  #',
      '#  $   #',
      '##.  ###',
      '#      #',
      '#  .   #',
      '########',
    ],
    [
      '#########',
      '#.      #',
      '# $$$ . #',
      '#   @   #',
      '# .$$.  #',
      '#       #',
      '#########',
    ],
  ];

  const W_WALL='#', W_FLOOR=' ', W_TARGET='.', W_BOX='$', W_PLAYER='@', W_BOX_ON='*', W_PLR_ON='+';

  let cv, cx, state, px, py, lvl, moves, rafId, keyH, dirty;

  function parseLevel(lvIdx) {
    const raw = LEVELS[Math.min(lvIdx, LEVELS.length-1)];
    const rows = raw.map(r => r.split(''));
    let pr=0,pc=0;
    for (let r=0;r<rows.length;r++) for (let c=0;c<rows[r].length;c++) {
      if (rows[r][c]===W_PLAYER||rows[r][c]===W_PLR_ON) { pr=r; pc=c; }
    }
    return { rows, pr, pc };
  }

  function resetLevel() {
    const p = parseLevel(lvl);
    state = p.rows; px = p.pc; py = p.pr; moves = 0; dirty = true;
  }

  function cell(r, c) {
    if (r<0||r>=state.length||c<0||(state[r]&&c>=state[r].length)) return W_WALL;
    return state[r][c] || W_FLOOR;
  }

  function isTarget(ch) { return ch===W_TARGET||ch===W_BOX_ON||ch===W_PLR_ON; }
  function isBox(ch)    { return ch===W_BOX||ch===W_BOX_ON; }
  function isFloor(ch)  { return ch===W_FLOOR||ch===W_TARGET; }

  function move(dr, dc) {
    const nr=py+dr, nc=px+dc;
    const nch=cell(nr,nc);
    if (nch===W_WALL) return;
    if (isBox(nch)) {
      const br=nr+dr, bc=nc+dc;
      const bch=cell(br,bc);
      if (!isFloor(bch)) return;
      state[br][bc] = isTarget(bch) ? W_BOX_ON : W_BOX;
      state[nr][nc] = isTarget(nch) ? W_TARGET : W_FLOOR;
    }
    const oc = cell(py,px);
    state[py][px] = isTarget(oc) ? W_TARGET : W_FLOOR;
    const nc2 = cell(nr,nc);
    state[nr][nc] = isTarget(nc2) ? W_PLR_ON : W_PLAYER;
    px=nc; py=nr; moves++; dirty=true;
  }

  function checkWin() {
    for (let r=0;r<state.length;r++) for (let c=0;c<(state[r]||[]).length;c++) {
      if (state[r][c]===W_BOX) return false;
    }
    return true;
  }

  function getLevelBounds() {
    let maxC = 0;
    state.forEach(r => { if(r.length>maxC) maxC=r.length; });
    return { rows: state.length, cols: maxC };
  }

  function draw() {
    if (!cv || !dirty) { rafId = requestAnimationFrame(draw); return; }
    dirty = false;

    cx.fillStyle = '#1a1a2e';
    cx.fillRect(0, 0, cv.width, cv.height);

    // 顶部信息
    cx.fillStyle = '#ffd600';
    cx.font = 'bold 10px monospace';
    cx.textAlign = 'left'; cx.textBaseline = 'middle';
    cx.fillText(`${i18n('关卡','Lv')} ${lvl+1}/${LEVELS.length}   ${i18n('步数','Moves')}: ${moves}`, 8, 12);
    cx.textAlign='right'; cx.fillStyle='#aaa';
    cx.fillText(i18n('R=重置  N=下关','R=Reset  N=Next'), cv.width-8, 12);

    const {rows, cols} = getLevelBounds();
    const offX = Math.floor((cv.width  - cols*CELL) / 2);
    const offY = Math.floor((cv.height - rows*CELL) / 2) + 2;

    for (let r=0;r<state.length;r++) {
      for (let c=0;c<(state[r]||[]).length;c++) {
        const x=offX+c*CELL, y=offY+r*CELL;
        const ch = state[r][c]||W_FLOOR;

        // 地板
        if (ch!==W_WALL) {
          cx.fillStyle='#2d2d44'; cx.fillRect(x,y,CELL,CELL);
        }
        // 目标点
        if (ch===W_TARGET||ch===W_BOX_ON||ch===W_PLR_ON) {
          cx.fillStyle='#f59e0b33';
          cx.fillRect(x+2,y+2,CELL-4,CELL-4);
          cx.strokeStyle='#f59e0b'; cx.lineWidth=1.5;
          cx.beginPath();
          cx.arc(x+CELL/2, y+CELL/2, CELL*0.3, 0, Math.PI*2);
          cx.stroke();
        }

        if (ch===W_WALL) {
          cx.fillStyle='#4a5568'; cx.fillRect(x,y,CELL,CELL);
          cx.fillStyle='#5a6578'; cx.fillRect(x+1,y+1,CELL-2,CELL-2);
          cx.fillStyle='#3a4555'; cx.fillRect(x+CELL-2,y+CELL-2,2,2);
        } else if (isBox(ch)) {
          const isOnTarget = ch===W_BOX_ON;
          cx.fillStyle = isOnTarget ? '#10b981' : '#d97706';
          cx.fillRect(x+2,y+2,CELL-4,CELL-4);
          cx.strokeStyle = isOnTarget ? '#059669' : '#b45309'; cx.lineWidth=1.5;
          cx.strokeRect(x+3,y+3,CELL-6,CELL-6);
          cx.strokeStyle='rgba(255,255,255,0.3)'; cx.lineWidth=1;
          cx.beginPath(); cx.moveTo(x+4,y+4); cx.lineTo(x+CELL-4,y+4); cx.lineTo(x+CELL-4,y+CELL-4); cx.stroke();
        } else if (ch===W_PLAYER||ch===W_PLR_ON) {
          // 玩家身体
          cx.fillStyle='#6366f1';
          cx.beginPath();
          cx.ellipse(x+CELL/2, y+CELL*0.65, CELL*0.28, CELL*0.3, 0, 0, Math.PI*2);
          cx.fill();
          // 玩家头
          cx.fillStyle='#fde68a';
          cx.beginPath();
          cx.arc(x+CELL/2, y+CELL*0.3, CELL*0.2, 0, Math.PI*2);
          cx.fill();
        }
      }
    }

    if (checkWin()) {
      cx.fillStyle='rgba(0,0,0,0.65)'; cx.fillRect(0,0,cv.width,cv.height);
      cx.fillStyle='#ffd600'; cx.font='bold 16px monospace';
      cx.textAlign='center'; cx.textBaseline='middle';
      cx.fillText('通关!', cv.width/2, cv.height/2-14);
      cx.fillStyle='#aaa'; cx.font='10px monospace';
      if (lvl < LEVELS.length-1)
        cx.fillText('N=下一关  R=重置', cv.width/2, cv.height/2+10);
      else
        cx.fillText('全部通关! R=重玩', cv.width/2, cv.height/2+10);
    }

    rafId = requestAnimationFrame(draw);
  }

  return {
    start(_cv, _cx) {
      cv = _cv; cx = _cx;
      lvl = 0; resetLevel();
      document.addEventListener('keydown', keyH = e => {
        const win = checkWin();
        if (e.code==='KeyR') { resetLevel(); return; }
        if (e.code==='KeyN') {
          if (win || true) { lvl=Math.min(lvl+1,LEVELS.length-1); resetLevel(); }
          return;
        }
        if (win) return;
        if (e.code==='ArrowUp')    { e.preventDefault(); move(-1,0); }
        if (e.code==='ArrowDown')  { e.preventDefault(); move(1,0); }
        if (e.code==='ArrowLeft')  { e.preventDefault(); move(0,-1); }
        if (e.code==='ArrowRight') { e.preventDefault(); move(0,1); }
      });
      rafId = requestAnimationFrame(draw);
    },
    stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      document.removeEventListener('keydown', keyH);
      cv = null;
    }
  };
})();
