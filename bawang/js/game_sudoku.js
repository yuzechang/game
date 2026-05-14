/* ===== 数独 ===== 点击格子 + 键盘1-9输入 */
GAME_MODULES.sudoku = (() => {
  const W = 256, H = 240;
  const CELL = 23;
  const GX = 5, GY = 20;
  const HEADER_H = 18;

  const CTRL = i18n(
    ['操作说明', '点击格子 → 输入1-9', 'H=提示  N=新题  Del=清除'],
    ['Controls', 'Click cell → type 1-9', 'H=Hint  N=New  Del=Clear']
  );

  // 每难度5题，81字符，'0'=空格
  const PUZZLES = {
    easy: [
      "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
      "200080300060070084030500209000105408000000000402706000301007040720040060004010003",
      "000000907000420180000705026100904000050000040000507009920108000034059000507000000",
      "020810740700003100090002805009040087400208001680030900501700060007600008064080020",
      "001900003900700160030005007050070800000654000004080070300200090086007005200008400",
    ],
    medium: [
      "800000000003600000070090200060005300000300000300001060020060500500870000000000040",
      "030050040008010500460000012070502080000040000010806040900000051005080600040030020",
      "020000000000600003074080000000003002080400010600500000000060720500200000000000040",
      "000700800200000040080090600050408020000000000090601040008040060010000005006009000",
      "010009803000310020004000100003006400600050001007200600009000700080024000605900080",
    ],
    hard: [
      "800000000003600000070090200060005300000300000300001060020060500500870000000000040",
      "000006000059000008200008000045000000003000200000100030001000068008000490000000700",
      "040000050001943600000000000007000030000010200020400000800500009050080600070060000",
      "060000080070800090000030000805000300000607000009000504000060000030009060080000020",
      "004000900000081020700003004060000801900104005102000060400600008030950000008000300",
    ],
  };

  // 用回溯法求解数独
  function solveSudoku(board) {
    const b = board.slice();
    function isValid(b, pos, num) {
      const row = Math.floor(pos / 9), col = pos % 9;
      for (let c = 0; c < 9; c++) if (b[row * 9 + c] === num) return false;
      for (let r = 0; r < 9; r++) if (b[r * 9 + col] === num) return false;
      const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
      for (let r = br; r < br + 3; r++)
        for (let c = bc; c < bc + 3; c++)
          if (b[r * 9 + c] === num) return false;
      return true;
    }
    function solve(b) {
      const idx = b.indexOf(0);
      if (idx === -1) return true;
      for (let n = 1; n <= 9; n++) {
        if (isValid(b, idx, n)) {
          b[idx] = n;
          if (solve(b)) return true;
          b[idx] = 0;
        }
      }
      return false;
    }
    if (solve(b)) return b;
    return null;
  }

  let cv, cx;
  let state; // 'select' | 'play' | 'win'
  let difficulty; // 'easy' | 'medium' | 'hard'
  let puzzleIdx;
  let puzzle; // number[81], 0=blank
  let solution; // number[81]
  let userBoard; // number[81], user filled
  let given; // bool[81], true=puzzle given
  let selected; // index 0-80 or -1
  let moves;
  let timerSec;
  let timerInterval;
  let rafId;
  let keyH, clickH;

  // 难度按钮区域（开始画面）
  const BTN_DEFS = [
    { key: 'easy',   label: 'EASY',   x: 28,  y: 100, w: 60, h: 22 },
    { key: 'medium', label: 'MEDIUM', x: 98,  y: 100, w: 60, h: 22 },
    { key: 'hard',   label: 'HARD',   x: 168, y: 100, w: 60, h: 22 },
  ];

  function loadPuzzle(diff, idx) {
    difficulty = diff;
    puzzleIdx = idx % PUZZLES[diff].length;
    const str = PUZZLES[diff][puzzleIdx];
    puzzle = Array.from(str).map(Number);
    solution = solveSudoku(puzzle.slice());
    userBoard = puzzle.slice();
    given = puzzle.map(v => v !== 0);
    selected = -1;
    moves = 0;
    timerSec = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => { if (state === 'play') timerSec++; }, 1000);
    state = 'play';
  }

  function isComplete() {
    for (let i = 0; i < 81; i++) {
      if (userBoard[i] === 0 || userBoard[i] !== solution[i]) return false;
    }
    return true;
  }

  function countEmpty() {
    let n = 0;
    for (let i = 0; i < 81; i++) if (userBoard[i] === 0) n++;
    return n;
  }

  function hint() {
    // 随机填入一个正确答案
    const empties = [];
    for (let i = 0; i < 81; i++) if (userBoard[i] === 0) empties.push(i);
    if (empties.length === 0) return;
    const idx = empties[Math.floor(Math.random() * empties.length)];
    userBoard[idx] = solution[idx];
    moves++;
    if (isComplete()) winGame();
  }

  function winGame() {
    clearInterval(timerInterval);
    // 保存最快时间
    const key = 'retro_sudoku_best_' + difficulty;
    const prev = +(localStorage.getItem(key) || 0);
    if (prev === 0 || timerSec < prev) {
      localStorage.setItem(key, timerSec);
    }
    state = 'win';
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function cellToRowCol(idx) {
    return { r: Math.floor(idx / 9), c: idx % 9 };
  }

  function cellScreenPos(idx) {
    const { r, c } = cellToRowCol(idx);
    return { x: GX + c * CELL, y: GY + r * CELL };
  }

  function draw() {
    cx.fillStyle = '#0a0a1a';
    cx.fillRect(0, 0, W, H);

    if (state === 'select') {
      drawSelectScreen();
      drawHint(cx, W, H, CTRL);
      return;
    }
    if (state === 'win') {
      drawGrid();
      drawWinScreen();
      drawHint(cx, W, H, CTRL);
      return;
    }

    // Header
    cx.fillStyle = 'rgba(0,0,0,0.8)';
    cx.fillRect(0, 0, W, HEADER_H);
    cx.font = '8px monospace';
    cx.textBaseline = 'middle';

    const diffLabel = { easy: i18n('简单','EASY'), medium: i18n('中等','MED'), hard: i18n('困难','HARD') }[difficulty];
    cx.fillStyle = '#ffd600';
    cx.textAlign = 'left';
    cx.fillText(diffLabel, 4, 9);

    cx.fillStyle = '#fff';
    cx.textAlign = 'center';
    cx.fillText(fmtTime(timerSec), W / 2, 9);

    cx.fillStyle = '#0cf';
    cx.textAlign = 'right';
    cx.fillText(i18n('剩余 ', 'Left ') + countEmpty(), W - 4, 9);

    drawGrid();
    drawHint(cx, W, H, CTRL);
  }

  function drawGrid() {
    // 背景
    cx.fillStyle = '#111827';
    cx.fillRect(GX, GY, 9 * CELL, 9 * CELL);

    // 格子内容
    for (let i = 0; i < 81; i++) {
      const { r, c } = cellToRowCol(i);
      const sx = GX + c * CELL;
      const sy = GY + r * CELL;

      // 选中高亮
      if (i === selected) {
        cx.fillStyle = '#1e3a5f';
        cx.fillRect(sx + 1, sy + 1, CELL - 2, CELL - 2);
      }

      const val = userBoard[i];
      if (val !== 0) {
        if (given[i]) {
          cx.fillStyle = '#fff';
        } else if (solution && val === solution[i]) {
          cx.fillStyle = '#7ecff5';
        } else {
          cx.fillStyle = '#ff5252';
        }
        cx.font = 'bold 13px monospace';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(val, sx + CELL / 2, sy + CELL / 2);
      }
    }

    // 细格线 0.5px
    cx.strokeStyle = 'rgba(255,255,255,0.18)';
    cx.lineWidth = 0.5;
    for (let i = 0; i <= 9; i++) {
      if (i % 3 === 0) continue;
      cx.beginPath();
      cx.moveTo(GX + i * CELL, GY);
      cx.lineTo(GX + i * CELL, GY + 9 * CELL);
      cx.stroke();
      cx.beginPath();
      cx.moveTo(GX, GY + i * CELL);
      cx.lineTo(GX + 9 * CELL, GY + i * CELL);
      cx.stroke();
    }

    // 宫格粗线 2px
    cx.strokeStyle = 'rgba(255,255,255,0.75)';
    cx.lineWidth = 2;
    for (let i = 0; i <= 9; i += 3) {
      cx.beginPath();
      cx.moveTo(GX + i * CELL, GY);
      cx.lineTo(GX + i * CELL, GY + 9 * CELL);
      cx.stroke();
      cx.beginPath();
      cx.moveTo(GX, GY + i * CELL);
      cx.lineTo(GX + 9 * CELL, GY + i * CELL);
      cx.stroke();
    }
  }

  function drawSelectScreen() {
    cx.fillStyle = 'rgba(0,0,0,0.0)';
    cx.fillRect(0, 0, W, H);

    cx.font = 'bold 20px monospace';
    cx.fillStyle = '#7ecff5';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText('SUDOKU', W / 2, 55);

    cx.font = '9px monospace';
    cx.fillStyle = '#ccc';
    cx.fillText(i18n('选择难度', 'Choose Difficulty'), W / 2, 80);

    BTN_DEFS.forEach(btn => {
      cx.fillStyle = '#1e3a5f';
      cx.fillRect(btn.x, btn.y, btn.w, btn.h);
      cx.strokeStyle = '#7ecff5';
      cx.lineWidth = 1.5;
      cx.strokeRect(btn.x, btn.y, btn.w, btn.h);
      cx.font = 'bold 9px monospace';
      cx.fillStyle = '#fff';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    });

    // 最快记录
    const bestLabels = ['easy', 'medium', 'hard'].map(d => {
      const t = +(localStorage.getItem('retro_sudoku_best_' + d) || 0);
      const lbl = { easy: i18n('简单','Easy'), medium: i18n('中等','Med'), hard: i18n('困难','Hard') }[d];
      return lbl + ': ' + (t ? fmtTime(t) : '--:--');
    });
    cx.font = '7px monospace';
    cx.fillStyle = '#ffd600';
    cx.textAlign = 'center';
    bestLabels.forEach((txt, i) => {
      cx.fillText(txt, BTN_DEFS[i].x + BTN_DEFS[i].w / 2, BTN_DEFS[i].y + BTN_DEFS[i].h + 12);
    });
  }

  function drawWinScreen() {
    cx.fillStyle = 'rgba(0,0,0,0.82)';
    cx.fillRect(30, 60, 196, 110);

    cx.font = 'bold 16px monospace';
    cx.fillStyle = '#ffd600';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(i18n('🎉 通关！', 'YOU WIN!'), W / 2, 98);

    const diffLabel = { easy: i18n('简单','EASY'), medium: i18n('中等','MEDIUM'), hard: i18n('困难','HARD') }[difficulty];
    cx.font = '8px monospace';
    cx.fillStyle = '#7ecff5';
    cx.fillText(diffLabel + '  ' + fmtTime(timerSec), W / 2, 118);

    cx.fillStyle = '#ccc';
    cx.fillText(i18n('步数: ', 'Moves: ') + moves, W / 2, 133);

    const bestKey = 'retro_sudoku_best_' + difficulty;
    const bestT = +(localStorage.getItem(bestKey) || 0);
    cx.fillStyle = '#ffd600';
    cx.fillText(i18n('最佳: ', 'Best: ') + fmtTime(bestT), W / 2, 148);

    cx.font = 'bold 8px monospace';
    cx.fillStyle = '#0cf';
    cx.fillText(i18n('N=新题  任意键继续', 'N=New  Any key to continue'), W / 2, 163);
  }

  function handleKey(e) {
    if (state === 'win') {
      if (e.key === 'n' || e.key === 'N') {
        loadPuzzle(difficulty, puzzleIdx + 1);
      } else {
        state = 'select';
        clearInterval(timerInterval);
      }
      return;
    }
    if (state === 'select') return;
    if (state !== 'play') return;

    if (e.key === 'n' || e.key === 'N') {
      loadPuzzle(difficulty, puzzleIdx + 1);
      return;
    }
    if (e.key === 'h' || e.key === 'H') {
      hint();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selected >= 0 && !given[selected]) {
        userBoard[selected] = 0;
        moves++;
      }
      return;
    }
    const n = parseInt(e.key);
    if (n >= 1 && n <= 9) {
      if (selected >= 0 && !given[selected]) {
        userBoard[selected] = n;
        moves++;
        if (isComplete()) winGame();
      }
    }
    // 方向键移动选中格
    if (selected >= 0) {
      const { r, c } = cellToRowCol(selected);
      if (e.key === 'ArrowLeft'  && c > 0) { selected = r * 9 + (c - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight' && c < 8) { selected = r * 9 + (c + 1); e.preventDefault(); }
      if (e.key === 'ArrowUp'    && r > 0) { selected = (r - 1) * 9 + c; e.preventDefault(); }
      if (e.key === 'ArrowDown'  && r < 8) { selected = (r + 1) * 9 + c; e.preventDefault(); }
    }
  }

  function handleClick(e) {
    const rect = cv.getBoundingClientRect();
    const scaleX = cv.width / rect.width;
    const scaleY = cv.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (state === 'select') {
      BTN_DEFS.forEach(btn => {
        if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
          loadPuzzle(btn.key, 0);
        }
      });
      return;
    }

    if (state === 'win') {
      state = 'select';
      clearInterval(timerInterval);
      return;
    }

    if (state === 'play') {
      const gc = Math.floor((mx - GX) / CELL);
      const gr = Math.floor((my - GY) / CELL);
      if (gc >= 0 && gc < 9 && gr >= 0 && gr < 9) {
        selected = gr * 9 + gc;
      } else {
        selected = -1;
      }
    }
  }

  function loop() {
    draw();
    rafId = requestAnimationFrame(loop);
  }

  return {
    start(canvas) {
      cv = canvas;
      cx = cv.getContext('2d');
      state = 'select';
      selected = -1;
      timerSec = 0;

      keyH = handleKey.bind(this);
      clickH = handleClick.bind(this);
      window.addEventListener('keydown', keyH);
      cv.addEventListener('click', clickH);

      rafId = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(rafId);
      clearInterval(timerInterval);
      window.removeEventListener('keydown', keyH);
      if (cv) cv.removeEventListener('click', clickH);
    }
  };
})();
