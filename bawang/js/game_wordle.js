/* ===== Wordle 猜词游戏 ===== 键盘输入 / Enter 确认 / Space 新游戏 */
GAME_MODULES.wordle = (() => {
  const WORDS = [
    'ABOUT','ABOVE','ABUSE','ACTOR','ACUTE','ADMIT','ADOPT','ADULT','AFTER','AGAIN',
    'AGENT','AGREE','AHEAD','ALARM','ALBUM','ALERT','ALIEN','ALIGN','ALIKE','ALIVE',
    'ALLEY','ALLOW','ALONG','ALTER','ANGEL','ANGER','ANGLE','ANGRY','APART','APPLE',
    'APPLY','ARENA','ARGUE','ARISE','ARRAY','ASIDE','ASSET','AUDIO','AUDIT','AVOID',
    'AWAKE','AWARD','AWARE','AWFUL','BASIC','BASIS','BATCH','BEACH','BEGIN','BEING',
    'BELOW','BENCH','BLACK','BLADE','BLANK','BLAST','BLAZE','BLEND','BLESS','BLIND',
    'BLOCK','BLOOD','BLOOM','BLOWN','BOARD','BOOST','BOUND','BRAIN','BRAND','BRAVE',
    'BREAK','BREED','BRIEF','BRING','BROAD','BROKE','BROWN','BUILD','BUILT','BURST',
    'BUYER','CABLE','CHAIN','CHAIR','CHAOS','CHART','CHEAP','CHECK','CHESS','CHILD',
    'CHORD','CHUNK','CLAIM','CLASH','CLASS','CLEAN','CLEAR','CLICK','CLIFF','CLOCK',
    'CLOSE','COACH','COAST','CORAL','COUNT','COVER','CRACK','CRAFT','CRASH','CRAZY',
    'CREAM','CRIME','CROSS','CROWD','CROWN','CRUSH','CURVE','CYCLE','DAILY','DANCE',
    'DEATH','DEBUG','DELTA','DENSE','DEPTH','DIARY','DIGIT','DIRTY','DISCO','DOUBT',
    'DOUGH','DRAFT','DRAIN','DRAMA','DRANK','DRAWN','DREAM','DRESS','DRIED','DRINK',
    'DRIVE','DROVE','DRUGS','DRUMS','DRUNK','DRYING','DUNNO','DUSTY','DWARF','DYING',
    'EAGER','EARLY','EARTH','EIGHT','ELITE','EMPTY','ENEMY','ENJOY','ENTER','EQUAL',
    'ERROR','ESSAY','EVENT','EVERY','EXACT','EXIST','EXTRA','FAINT','FAIRY','FAITH',
    'FALSE','FANCY','FATAL','FAULT','FEAST','FENCE','FEVER','FIBER','FIELD','FIFTH',
    'FIFTY','FIGHT','FINAL','FIRST','FIXED','FLAME','FLASH','FLEET','FLESH','FLOAT',
    'FLOOD','FLOOR','FLORA','FLOUR','FLUID','FLUTE','FOCUS','FORCE','FORGE','FORMA',
    'FORTH','FOUND','FRAME','FRANK','FRAUD','FRESH','FRONT','FROST','FRUIT','FULLY'
  ].filter(w => w.length === 5);

  // 布局常量
  const TILE_W = 30, TILE_H = 28, GAP = 3;
  const GX = Math.floor((256 - 5 * (TILE_W + GAP) + GAP) / 2);
  const GY = 18;
  const KB_Y = GY + 6 * (TILE_H + GAP) + 6;

  // 键盘行
  const KB_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const KB_KEY_W = 20, KB_KEY_H = 16, KB_GAP = 2;

  const CTRL = i18n(
    ['操作', '键盘输入字母  Enter=确认', '绿=正确 黄=有但错位 灰=没有'],
    ['Controls', 'Type letters, Enter=Submit', 'Green=right  Yellow=wrong pos  Gray=no']
  );

  // 颜色
  const COL_CORRECT = '#538d4e';
  const COL_PRESENT = '#b59f3b';
  const COL_ABSENT  = '#3a3a3c';
  const COL_EMPTY   = '#121213';
  const COL_BORDER  = '#3a3a3c';
  const COL_ACTIVE  = '#565758';
  const COL_TEXT    = '#ffffff';
  const COL_BG      = '#121213';

  const WIN_MSGS = ['Genius!', 'Magnificent!', 'Impressive!', 'Splendid!', 'Great!', 'Phew!'];

  let cv, cx, rafId, keyH, mouseH;
  let answer, guesses, currentRow, currentTile, gameOver, won;
  let streak, bestStreak;
  let message, messageTick;
  let keyColors; // 每个字母的颜色状态
  let tileAnim;  // 翻转动画 {row, col, progress}[]
  let cursorTick;

  function pickWord() {
    // streak越高，从词库后部选词（更少见）
    const offset = Math.min(streak * 3, WORDS.length - 30);
    const pool = WORDS.slice(offset);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function init() {
    streak = parseInt(localStorage.getItem('retro_wordle_streak') || '0');
    bestStreak = parseInt(localStorage.getItem('retro_wordle_best') || '0');
    newGame();
  }

  function newGame() {
    answer = pickWord();
    guesses = Array(6).fill(null).map(() => Array(5).fill(''));
    currentRow = 0;
    currentTile = 0;
    gameOver = false;
    won = false;
    message = '';
    messageTick = 0;
    keyColors = {};
    tileAnim = [];
    cursorTick = 0;
  }

  function getTileColor(row, col) {
    const guess = guesses[row];
    const letter = guess[col];
    if (!letter) return COL_EMPTY;
    // 计算颜色
    if (letter === answer[col]) return COL_CORRECT;
    // 检查是否在单词中（考虑重复字母）
    const answerArr = answer.split('');
    // 标记已匹配的位置
    const used = Array(5).fill(false);
    for (let i = 0; i < 5; i++) {
      if (guess[i] === answer[i]) used[i] = true;
    }
    // 检查该列的字母是否在剩余位置中
    let found = false;
    for (let i = 0; i < 5; i++) {
      if (!used[i] && answerArr[i] === letter) {
        // 计算该字母在猜测中被标记为present的次数
        let presentCount = 0;
        for (let j = 0; j < col; j++) {
          if (guess[j] === letter && guess[j] !== answer[j]) presentCount++;
        }
        let availCount = 0;
        for (let i2 = 0; i2 < 5; i2++) {
          if (answerArr[i2] === letter && guess[i2] !== answer[i2]) availCount++;
        }
        if (presentCount < availCount) { found = true; break; }
      }
    }
    return found ? COL_PRESENT : COL_ABSENT;
  }

  function evaluateGuess(row) {
    const guess = guesses[row].join('');
    const colors = [];
    for (let col = 0; col < 5; col++) {
      colors.push(getTileColor(row, col));
    }
    // 更新键盘颜色（优先级: correct > present > absent）
    const priority = { [COL_CORRECT]: 3, [COL_PRESENT]: 2, [COL_ABSENT]: 1 };
    for (let col = 0; col < 5; col++) {
      const letter = guesses[row][col];
      const cur = keyColors[letter];
      const newCol = colors[col];
      if (!cur || (priority[newCol] || 0) > (priority[cur] || 0)) {
        keyColors[letter] = newCol;
      }
    }
    return colors;
  }

  function submitGuess() {
    if (currentTile < 5) return;
    const word = guesses[currentRow].join('');
    if (!WORDS.includes(word)) {
      message = i18n('不在词库中', 'Not in list');
      messageTick = 90;
      return;
    }
    // 启动翻转动画
    const colors = evaluateGuess(currentRow);
    for (let col = 0; col < 5; col++) {
      tileAnim.push({ row: currentRow, col, delay: col * 8, progress: 0, color: colors[col] });
    }
    const row = currentRow;
    currentRow++;
    currentTile = 0;

    // 判断胜负（延迟，等动画结束）
    setTimeout(() => {
      if (word === answer) {
        won = true;
        gameOver = true;
        streak++;
        if (streak > bestStreak) bestStreak = streak;
        localStorage.setItem('retro_wordle_streak', streak);
        localStorage.setItem('retro_wordle_best', bestStreak);
        message = WIN_MSGS[Math.min(row, 5)];
        messageTick = 180;
      } else if (currentRow >= 6) {
        gameOver = true;
        streak = 0;
        localStorage.setItem('retro_wordle_streak', '0');
        message = answer;
        messageTick = 999;
      }
    }, 5 * 8 * (1000 / 60) + 300);
  }

  function handleKey(key) {
    if (gameOver) {
      if (key === ' ') newGame();
      return;
    }
    key = key.toUpperCase();
    if (key === 'ENTER') {
      submitGuess();
    } else if (key === 'BACKSPACE') {
      if (currentTile > 0) {
        currentTile--;
        guesses[currentRow][currentTile] = '';
      }
    } else if (/^[A-Z]$/.test(key) && currentTile < 5) {
      guesses[currentRow][currentTile] = key;
      currentTile++;
    }
  }

  function getAnimColor(row, col) {
    const anim = tileAnim.find(a => a.row === row && a.col === col);
    if (!anim) return null;
    return anim.progress >= 1 ? anim.color : null;
  }

  function draw() {
    cx.fillStyle = COL_BG;
    cx.fillRect(0, 0, 256, 240);

    // Header
    cx.fillStyle = '#ffffff';
    cx.font = 'bold 10px monospace';
    cx.textAlign = 'center';
    cx.textBaseline = 'top';
    cx.fillText('WORDLE', 128, 2);

    cx.font = '7px monospace';
    cx.fillStyle = '#ffd600';
    cx.textAlign = 'left';
    cx.fillText(`🔥${streak}`, 4, 4);
    cx.fillStyle = '#aaa';
    cx.fillText(`BEST:${bestStreak}`, 40, 4);

    cursorTick++;

    // 格子
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 5; col++) {
        const x = GX + col * (TILE_W + GAP);
        const y = GY + row * (TILE_H + GAP);
        const letter = guesses[row][col];

        // 确定颜色
        let bgCol = COL_EMPTY;
        let borderCol = COL_BORDER;

        if (row < currentRow) {
          // 已提交的行
          const animColor = getAnimColor(row, col);
          bgCol = animColor || getTileColor(row, col);
          borderCol = bgCol;
        } else if (row === currentRow) {
          if (col < currentTile) {
            borderCol = COL_ACTIVE;
          } else if (col === currentTile) {
            // 光标闪烁
            borderCol = (Math.floor(cursorTick / 30) % 2 === 0) ? '#ffffff' : COL_ACTIVE;
          }
        }

        cx.fillStyle = bgCol;
        cx.fillRect(x, y, TILE_W, TILE_H);

        // 边框
        cx.strokeStyle = borderCol;
        cx.lineWidth = 2;
        cx.strokeRect(x + 1, y + 1, TILE_W - 2, TILE_H - 2);

        // 字母
        if (letter) {
          cx.fillStyle = COL_TEXT;
          cx.font = 'bold 14px monospace';
          cx.textAlign = 'center';
          cx.textBaseline = 'middle';
          cx.fillText(letter, x + TILE_W / 2, y + TILE_H / 2);
        }
      }
    }

    // 消息提示
    if (messageTick > 0) {
      messageTick--;
      cx.fillStyle = 'rgba(255,255,255,0.92)';
      cx.font = 'bold 10px monospace';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      const tw = cx.measureText(message).width;
      cx.fillRect(128 - tw / 2 - 6, 4, tw + 12, 14);
      cx.fillStyle = '#000';
      cx.fillText(message, 128, 11);
    }

    // 游戏结束提示
    if (gameOver && messageTick <= 0) {
      cx.fillStyle = 'rgba(0,0,0,0.7)';
      cx.fillRect(0, KB_Y - 4, 256, 240 - KB_Y + 4);
      cx.fillStyle = won ? '#538d4e' : '#ff4444';
      cx.font = 'bold 9px monospace';
      cx.textAlign = 'center';
      cx.fillText(won ? WIN_MSGS[Math.min(currentRow - 1, 5)] : answer, 128, KB_Y + 8);
      cx.fillStyle = '#ccc';
      cx.font = '7px monospace';
      cx.fillText(i18n('SPACE=新游戏', 'SPACE=New Game'), 128, KB_Y + 20);
    }

    // 屏幕键盘
    KB_ROWS.forEach((row, ri) => {
      const keys = row.split('');
      let totalW = keys.length * (KB_KEY_W + KB_GAP) - KB_GAP;
      // 第三行加 Enter 和 Backspace
      if (ri === 2) totalW += 2 * (28 + KB_GAP);
      const startX = Math.floor((256 - totalW) / 2);
      const y = KB_Y + ri * (KB_KEY_H + KB_GAP);

      let x = startX;
      // 第三行前面加 Enter
      if (ri === 2) {
        cx.fillStyle = '#818384';
        cx.fillRect(x, y, 28, KB_KEY_H);
        cx.fillStyle = '#fff';
        cx.font = '6px monospace';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText('ENT', x + 14, y + KB_KEY_H / 2);
        x += 28 + KB_GAP;
      }

      keys.forEach(letter => {
        const col = keyColors[letter] || '#818384';
        cx.fillStyle = col;
        cx.fillRect(x, y, KB_KEY_W, KB_KEY_H);
        cx.fillStyle = '#fff';
        cx.font = 'bold 7px monospace';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(letter, x + KB_KEY_W / 2, y + KB_KEY_H / 2);
        x += KB_KEY_W + KB_GAP;
      });

      // 第三行后面加 Backspace
      if (ri === 2) {
        cx.fillStyle = '#818384';
        cx.fillRect(x, y, 28, KB_KEY_H);
        cx.fillStyle = '#fff';
        cx.font = '6px monospace';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText('DEL', x + 14, y + KB_KEY_H / 2);
      }
    });

    // 操作提示
    drawHint(cx, 256, 240, CTRL);
  }

  function update() {
    // 更新翻转动画
    tileAnim.forEach(a => {
      if (a.delay > 0) { a.delay--; return; }
      a.progress = Math.min(1, a.progress + 0.08);
    });
    tileAnim = tileAnim.filter(a => a.progress < 1 || true); // 保留已完成的用于显示颜色
  }

  function loop() {
    update();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function getKBClick(px, py) {
    // 检测点击的键盘按键
    for (let ri = 0; ri < KB_ROWS.length; ri++) {
      const keys = KB_ROWS[ri].split('');
      let totalW = keys.length * (KB_KEY_W + KB_GAP) - KB_GAP;
      if (ri === 2) totalW += 2 * (28 + KB_GAP);
      const startX = Math.floor((256 - totalW) / 2);
      const y = KB_Y + ri * (KB_KEY_H + KB_GAP);
      if (py < y || py > y + KB_KEY_H) continue;

      let x = startX;
      if (ri === 2) {
        if (px >= x && px < x + 28) return 'ENTER';
        x += 28 + KB_GAP;
      }
      for (const letter of keys) {
        if (px >= x && px < x + KB_KEY_W) return letter;
        x += KB_KEY_W + KB_GAP;
      }
      if (ri === 2) {
        if (px >= x && px < x + 28) return 'BACKSPACE';
      }
    }
    return null;
  }

  function start(canvas) {
    cv = canvas;
    cx = cv.getContext('2d');
    init();

    keyH = e => handleKey(e.key === ' ' ? ' ' : e.key === 'Backspace' ? 'BACKSPACE' : e.key === 'Enter' ? 'ENTER' : e.key);
    mouseH = e => {
      const rect = cv.getBoundingClientRect();
      const scaleX = 256 / rect.width;
      const scaleY = 240 / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      const key = getKBClick(px, py);
      if (key) handleKey(key);
    };
    document.addEventListener('keydown', keyH);
    cv.addEventListener('click', mouseH);
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(rafId);
    document.removeEventListener('keydown', keyH);
    if (cv) cv.removeEventListener('click', mouseH);
  }

  return { start, stop };
})();
