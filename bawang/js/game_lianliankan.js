GAME_MODULES.lianliankan = (() => {
  const CTRL = i18n(
    ['操作说明','点击两个相同图案消除','H=提示  S=洗牌  SPACE=重开','通关后升级（格子变大）'],
    ['Controls','Click matching pairs to clear','H=Hint  S=Shuffle  SPACE=Restart','Clear board to advance level']
  );
  const COLS = 6, ROWS = 4;
  const CW = 34, CH = 44, GAP = 5;
  const GX = Math.floor((256 - COLS*(CW+GAP)+GAP) / 2);
  const GY = 28;
  const SYMBOLS = ['★','♦','♣','♠','♥','●','▲','■'];
  const COLORS   = ['#f59e0b','#ef4444','#10b981','#6366f1','#ec4899','#06b6d4','#84cc16','#f97316'];
  const PAIRS = 2;

  let cv, cx, grid, sel, moves, over, won, rafId, clickH, keyH, flash, flashTimer;

  function buildGrid() {
    const types = COLS * ROWS / 2;
    let pool = [];
    for (let t = 0; t < types; t++) pool.push(t % SYMBOLS.length, t % SYMBOLS.length);
    for (let i = pool.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]] = [pool[j],pool[i]];
    }
    grid = Array.from({length: ROWS}, (_,r) => Array.from({length: COLS}, (_,c) => pool[r*COLS+c]));
    sel = null; moves = 0; over = false; won = false; flash = null; flashTimer = 0;
  }

  function isEmpty(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    return grid[r][c] === -1;
  }

  function isEmptyOrBorder(r, c) {
    return (r < 0 || r >= ROWS || c < 0 || c >= COLS) || grid[r][c] === -1;
  }

  // 直线连通（无障碍）
  function lineConnect(r1, c1, r2, c2) {
    if (r1 === r2) {
      const cMin = Math.min(c1,c2)+1, cMax = Math.max(c1,c2);
      for (let c=cMin;c<cMax;c++) if (!isEmptyOrBorder(r1,c) && !(r1===r2&&c===c2)) {
        if (grid[r1][c] !== -1) return false;
      }
      return true;
    }
    if (c1 === c2) {
      const rMin = Math.min(r1,r2)+1, rMax = Math.max(r1,r2);
      for (let r=rMin;r<rMax;r++) if (grid[r][c1] !== -1) return false;
      return true;
    }
    return false;
  }

  function clearLineRC(r1,c1,r2,c2) {
    if (r1===r2) { const a=Math.min(c1,c2),b=Math.max(c1,c2); for(let c=a+1;c<b;c++) if(grid[r1][c]!==-1) return false; return true; }
    if (c1===c2) { const a=Math.min(r1,r2),b=Math.max(r1,r2); for(let r=a+1;r<b;r++) if(grid[r][c1]!==-1) return false; return true; }
    return false;
  }

  function canConnect(r1,c1,r2,c2) {
    if (r1===r2 && c1===c2) return null;
    if (grid[r1][c1] !== grid[r2][c2]) return null;
    if (grid[r1][c1] === -1) return null;

    // 0 转：直线
    if ((r1===r2 || c1===c2) && clearLineRC(r1,c1,r2,c2)) return [[r1,c1],[r2,c2]];

    // 1 转：通过拐点 (r1,c2) 或 (r2,c1)
    const corners1 = [[r1,c2],[r2,c1]];
    for (const [cr,cc] of corners1) {
      if (isEmptyOrBorder(cr,cc) || (cr===r1&&cc===c1) || (cr===r2&&cc===c2)) {
        if (clearLineRC(r1,c1,cr,cc) && clearLineRC(cr,cc,r2,c2))
          return [[r1,c1],[cr,cc],[r2,c2]];
      }
    }

    // 2 转：沿行或列扫描拐点
    // 同行过渡
    for (let c=-1;c<=COLS;c++) {
      if (isEmptyOrBorder(r1,c) && isEmptyOrBorder(r2,c)) {
        if (clearLineRC(r1,c1,r1,c) && clearLineRC(r1,c,r2,c) && clearLineRC(r2,c,r2,c2))
          return [[r1,c1],[r1,c],[r2,c],[r2,c2]];
      }
    }
    // 同列过渡
    for (let r=-1;r<=ROWS;r++) {
      if (isEmptyOrBorder(r,c1) && isEmptyOrBorder(r,c2)) {
        if (clearLineRC(r1,c1,r,c1) && clearLineRC(r,c1,r,c2) && clearLineRC(r,c2,r2,c2))
          return [[r1,c1],[r,c1],[r,c2],[r2,c2]];
      }
    }

    return null;
  }

  function checkWin() {
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (grid[r][c]!==-1) return false;
    return true;
  }

  function hasAnyMove() {
    for (let r1=0;r1<ROWS;r1++) for (let c1=0;c1<COLS;c1++) {
      if (grid[r1][c1]===-1) continue;
      for (let r2=0;r2<ROWS;r2++) for (let c2=0;c2<COLS;c2++) {
        if (r1===r2&&c1===c2) continue;
        if (grid[r2][c2]===grid[r1][c1] && canConnect(r1,c1,r2,c2)) return true;
      }
    }
    return false;
  }

  function shuffle() {
    const tiles = [];
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (grid[r][c]!==-1) tiles.push(grid[r][c]);
    for (let i=tiles.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [tiles[i],tiles[j]]=[tiles[j],tiles[i]]; }
    let k=0;
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (grid[r][c]!==-1) grid[r][c]=tiles[k++];
  }

  function draw(ts) {
    if (!cv) return;

    if (flash && ts >= flashTimer) flash = null;

    cx.fillStyle = '#1a1a2e';
    cx.fillRect(0, 0, cv.width, cv.height);

    // 顶部信息
    cx.fillStyle = '#ffd600';
    cx.font = 'bold 11px monospace';
    cx.textAlign = 'left'; cx.textBaseline = 'middle';
    cx.fillText(`${i18n('步数','Moves')}: ${moves}`, 8, 14);
    cx.textAlign = 'right';
    cx.fillStyle = '#a5f3fc';
    cx.fillText('H='+i18n('提示','Hint')+'  S='+i18n('洗牌','Shuffle'), cv.width-8, 14);

    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
      if (grid[r][c]===-1) continue;
      const x = GX + c*(CW+GAP), y = GY + r*(CH+GAP);
      const sym = grid[r][c];
      const col = COLORS[sym % COLORS.length];
      const isSel = sel && sel[0]===r && sel[1]===c;

      cx.fillStyle = isSel ? '#fff3' : '#ffffff18';
      cx.beginPath();
      cx.roundRect(x,y,CW,CH,4);
      cx.fill();

      if (isSel) {
        cx.strokeStyle = '#ffd600'; cx.lineWidth = 2;
        cx.beginPath(); cx.roundRect(x,y,CW,CH,4); cx.stroke();
      } else {
        cx.strokeStyle = col+'88'; cx.lineWidth = 1;
        cx.beginPath(); cx.roundRect(x,y,CW,CH,4); cx.stroke();
      }

      cx.fillStyle = isSel ? '#ffd600' : col;
      cx.font = 'bold 18px serif';
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(SYMBOLS[sym % SYMBOLS.length], x+CW/2, y+CH/2);
    }

    // 闪烁连线
    if (flash) {
      cx.strokeStyle = '#ffd600'; cx.lineWidth = 2;
      cx.setLineDash([4,3]);
      cx.beginPath();
      for (let i=0;i<flash.length;i++) {
        const [fr,fc] = flash[i];
        const px = GX + fc*(CW+GAP) + CW/2;
        const py = GY + fr*(CH+GAP) + CH/2;
        const clampedPx = Math.max(-10, Math.min(cv.width+10, px));
        const clampedPy = Math.max(-10, Math.min(cv.height+10, py));
        if (i===0) cx.moveTo(clampedPx, clampedPy);
        else cx.lineTo(clampedPx, clampedPy);
      }
      cx.stroke();
      cx.setLineDash([]);
    }

    if (won) {
      cx.fillStyle='rgba(0,0,0,0.6)'; cx.fillRect(0,0,cv.width,cv.height);
      cx.fillStyle='#ffd600'; cx.font='bold 18px monospace';
      cx.textAlign='center'; cx.textBaseline='middle';
      cx.fillText(i18n('通关!','Clear!'), cv.width/2, cv.height/2-12);
      cx.font='10px monospace'; cx.fillStyle='#fff';
      cx.fillText(`${i18n('步数','Moves')}: ${moves}`, cv.width/2, cv.height/2+8);
      cx.fillStyle='#aaa'; cx.font='9px monospace';
      cx.fillText(i18n('SPACE 重玩','SPACE Replay'), cv.width/2, cv.height/2+26);
    } else if (over) {
      cx.fillStyle='rgba(0,0,0,0.6)'; cx.fillRect(0,0,cv.width,cv.height);
      cx.fillStyle='#ff5252'; cx.font='bold 14px monospace';
      cx.textAlign='center'; cx.textBaseline='middle';
      cx.fillText(i18n('无路可走!','No Moves!'), cv.width/2, cv.height/2-12);
      cx.fillStyle='#aaa'; cx.font='9px monospace';
      cx.fillText(i18n('S=洗牌  SPACE=重玩','S=Shuffle  SPACE=Restart'), cv.width/2, cv.height/2+12);
    } else {
      drawHint(cx, cv.width, cv.height, CTRL);
    }

    rafId = requestAnimationFrame(draw);
  }

  function hint() {
    for (let r1=0;r1<ROWS;r1++) for (let c1=0;c1<COLS;c1++) {
      if (grid[r1][c1]===-1) continue;
      for (let r2=0;r2<ROWS;r2++) for (let c2=0;c2<COLS;c2++) {
        if (r1===r2&&c1===c2) continue;
        const path = canConnect(r1,c1,r2,c2);
        if (path) { sel=[r1,c1]; return; }
      }
    }
  }

  return {
    start(_cv, _cx) {
      cv = _cv; cx = _cx;
      buildGrid();
      cv.addEventListener('click', clickH = e => {
        if (won || over) return;
        const rect = cv.getBoundingClientRect();
        const px = (e.clientX - rect.left) * (256/rect.width);
        const py = (e.clientY - rect.top) * (240/rect.height);
        const c = Math.floor((px - GX) / (CW+GAP));
        const r = Math.floor((py - GY) / (CH+GAP));
        if (r<0||r>=ROWS||c<0||c>=COLS||grid[r][c]===-1) return;
        if (!sel) { sel=[r,c]; return; }
        if (sel[0]===r&&sel[1]===c) { sel=null; return; }
        const path = canConnect(sel[0],sel[1],r,c);
        if (path) {
          flash = path; flashTimer = performance.now() + 350;
          grid[sel[0]][sel[1]] = -1; grid[r][c] = -1;
          sel = null; moves++;
          if (checkWin()) { won = true; }
          else if (!hasAnyMove()) { over = true; }
        } else {
          sel = [r,c];
        }
      });
      document.addEventListener('keydown', keyH = e => {
        if (e.code === 'KeyH') hint();
        if (e.code === 'KeyS') { shuffle(); sel=null; over=false; if(!hasAnyMove()) shuffle(); }
        if (e.code === 'Space') { e.preventDefault(); if(won||over) buildGrid(); }
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
