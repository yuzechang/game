/* ===== 记忆配对 ===== 点击翻牌 / SPACE 重开 */
GAME_MODULES.memory = (() => {
  const COLS = 4, ROWS = 4, GAP = 5, HEADER = 22;
  const CW = Math.floor((256 - GAP * (COLS + 1)) / COLS);  // ~58
  const CH = Math.floor((240 - HEADER - GAP * (ROWS + 1)) / ROWS); // ~47

  const SYMBOLS = ['★','♦','♣','♠','♥','●','▲','■'];
  const COLORS  = ['#e74c3c','#2980b9','#27ae60','#f39c12','#8e44ad','#16a085','#d35400','#c0392b'];

  let cv, cx, cards, flipped, matchedPairs, moves, blocking, clickH, keyH, winH;

  function cardX(c) { return GAP + c * (CW + GAP); }
  function cardY(r) { return HEADER + GAP + r * (CH + GAP); }

  function init() {
    const vals = [...Array(8).keys()].flatMap(i => [i, i]);
    for (let i = vals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [vals[i], vals[j]] = [vals[j], vals[i]];
    }
    cards = vals.map((val, i) => ({ val, i, flipped: false, matched: false }));
    flipped = []; matchedPairs = 0; moves = 0; blocking = false;
  }

  function draw() {
    cx.fillStyle = '#1a2035';
    cx.fillRect(0, 0, 256, 240);

    cx.fillStyle = '#aab';
    cx.font = '8px monospace';
    cx.fillText('MEMORY MATCH', 4, 12);
    cx.fillText(`步数: ${moves}   配对: ${matchedPairs}/8`, 4, 21);

    cards.forEach(({ val, flipped: fp, matched, i }) => {
      const c = i % COLS, r = Math.floor(i / COLS);
      const x = cardX(c), y = cardY(r);
      const fs = Math.min(CW, CH) * 0.45;

      if (matched) {
        cx.fillStyle = '#27ae60';
        cx.fillRect(x, y, CW, CH);
        cx.fillStyle = 'rgba(255,255,255,0.4)';
        cx.fillRect(x, y, CW, 3);
        cx.font = `${fs}px sans-serif`;
        cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillStyle = '#fff';
        cx.fillText(SYMBOLS[val], x + CW/2, y + CH/2);
      } else if (fp) {
        cx.fillStyle = COLORS[val];
        cx.fillRect(x, y, CW, CH);
        cx.fillStyle = 'rgba(255,255,255,0.25)';
        cx.fillRect(x, y, CW, 3);
        cx.font = `${fs}px sans-serif`;
        cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillStyle = '#fff';
        cx.fillText(SYMBOLS[val], x + CW/2, y + CH/2);
      } else {
        cx.fillStyle = '#2c3e6a';
        cx.fillRect(x, y, CW, CH);
        cx.fillStyle = '#243058';
        for (let px = x + 6; px < x + CW - 4; px += 10)
          for (let py = y + 6; py < y + CH - 4; py += 10)
            cx.fillRect(px, py, 5, 5);
        cx.fillStyle = 'rgba(255,255,255,0.07)';
        cx.fillRect(x, y, CW, 3);
      }
      cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
    });

    if (matchedPairs === 8) {
      cx.fillStyle = 'rgba(0,0,0,0.78)';
      cx.fillRect(36, 86, 184, 68);
      cx.fillStyle = '#2ecc71';
      cx.font = 'bold 14px monospace';
      cx.textAlign = 'center';
      cx.fillText('恭喜通关!', 128, 112);
      cx.fillStyle = '#aaa';
      cx.font = '8px monospace';
      cx.fillText(`共用 ${moves} 步`, 128, 128);
      cx.fillText('[SPACE] 再来一局', 128, 143);
      cx.textAlign = 'left';
    }
  }

  function handleClick(e) {
    if (blocking || matchedPairs === 8) return;
    const rect = cv.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (256 / rect.width);
    const sy = (e.clientY - rect.top)  * (240 / rect.height);

    for (let i = 0; i < 16; i++) {
      const c = i % COLS, r = Math.floor(i / COLS);
      const x = cardX(c), y = cardY(r);
      if (sx >= x && sx < x + CW && sy >= y && sy < y + CH) {
        const card = cards[i];
        if (card.matched || card.flipped || flipped.length >= 2) return;
        card.flipped = true;
        flipped.push(i);

        if (flipped.length === 2) {
          moves++;
          const [a, b] = flipped;
          if (cards[a].val === cards[b].val) {
            cards[a].matched = cards[b].matched = true;
            flipped = []; matchedPairs++;
          } else {
            blocking = true;
            setTimeout(() => {
              cards[a].flipped = cards[b].flipped = false;
              flipped = []; blocking = false;
              draw();
            }, 900);
          }
        }
        draw();
        break;
      }
    }
  }

  function onKey(e) {
    if (e.key === ' ' && matchedPairs === 8) { init(); draw(); }
  }

  return {
    start(_cv, _cx) {
      cv = _cv; cx = _cx;
      if (clickH) cv.removeEventListener('click', clickH);
      clickH = handleClick;
      cv.addEventListener('click', clickH);
      document.removeEventListener('keydown', keyH);
      keyH = onKey;
      document.addEventListener('keydown', keyH);
      init(); draw();
    },
    stop() {
      if (clickH) { cv.removeEventListener('click', clickH); clickH = null; }
      document.removeEventListener('keydown', keyH);
    }
  };
})();
