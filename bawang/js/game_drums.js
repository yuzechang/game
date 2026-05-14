/* ===== 节奏打鼓 ===== D F J K 按键 / 音符到判定线时按下 */
GAME_MODULES.drums = (() => {
  // 布局常量
  const LANE_COUNT = 4;
  const LANE_X = [4, 67, 130, 193];
  const LANE_W = 59;
  const JUDGE_Y = 210;
  const NOTE_R = 12;
  const NOTE_TRAVEL = 200;

  const KEYS = ['d', 'f', 'j', 'k'];
  const LANE_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff'];
  const LANE_FREQS  = [220, 330, 440, 550];

  // 判定阈值
  const PERFECT_RANGE = 25;
  const GOOD_RANGE = 50;

  // 关卡配置
  const LEVELS = [
    { bpm: 80,  beats: 32, gen: genLevel1 },
    { bpm: 95,  beats: 32, gen: genLevel2 },
    { bpm: 110, beats: 32, gen: genLevel3 },
    { bpm: 125, beats: 32, gen: genLevel4 },
    { bpm: 140, beats: 32, gen: genLevel5 },
  ];

  const CTRL = i18n(
    ['操作说明', 'D F J K → 按下对应键', '音符到达横线时按下', 'Perfect±25px, Good±50px'],
    ['Controls', 'D F J K → Press key', 'Hit when note reaches line', 'Perfect±25px, Good±50px']
  );

  // 各关卡谱面生成函数（返回 [{beat, lane}] 列表）
  function genLevel1() {
    // 简单四四拍，只用单个音符
    const notes = [];
    for (let b = 0; b < 32; b++) {
      notes.push({ beat: b, lane: b % 4 });
    }
    return notes;
  }
  function genLevel2() {
    // 加入八分音符（0.5拍）
    const notes = [];
    for (let b = 0; b < 32; b++) {
      notes.push({ beat: b, lane: b % 4 });
      if (b % 2 === 0) notes.push({ beat: b + 0.5, lane: (b + 2) % 4 });
    }
    return notes;
  }
  function genLevel3() {
    // 双轨道同时出现
    const notes = [];
    for (let b = 0; b < 32; b++) {
      notes.push({ beat: b, lane: b % 4 });
      if (b % 4 === 0) notes.push({ beat: b, lane: (b + 1) % 4 });
      if (b % 2 === 0) notes.push({ beat: b + 0.5, lane: (b + 3) % 4 });
    }
    return notes;
  }
  function genLevel4() {
    // 快速连续音符
    const notes = [];
    for (let b = 0; b < 32; b++) {
      notes.push({ beat: b, lane: b % 4 });
      notes.push({ beat: b + 0.25, lane: (b + 1) % 4 });
      if (b % 2 === 0) notes.push({ beat: b + 0.5, lane: (b + 2) % 4 });
    }
    return notes;
  }
  function genLevel5() {
    // 复杂节奏型
    const notes = [];
    const pattern = [0,1,2,3, 0,2, 1,3, 0,1,2,3, 0,3,1,2];
    for (let b = 0; b < 32; b++) {
      notes.push({ beat: b, lane: pattern[b % pattern.length] });
      notes.push({ beat: b + 0.5, lane: pattern[(b + 4) % pattern.length] });
      if (b % 4 < 2) notes.push({ beat: b + 0.25, lane: pattern[(b + 8) % pattern.length] });
    }
    return notes;
  }

  let cv, cx, rafId, keyH;
  let audioCtx;
  let level, score, combo, misses, bestScore;
  let notes, activeNotes;
  let startTime, levelStartTime;
  let keyDown;       // 当前按下的键
  let keyFlash;      // 按键闪光 {lane, color, tick}[]
  let judgements;    // 判定文字 {text, x, y, tick, color}[]
  let gameState;     // 'playing' | 'clear' | 'gameover'
  let clearTick;

  function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function playBeep(freq, dur) {
    if (!audioCtx) return;
    dur = dur || 0.12;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  }

  function startLevel(lv) {
    level = lv;
    const cfg = LEVELS[level];
    const beatDur = 60 / cfg.bpm; // 秒/拍
    const noteSpeed = NOTE_TRAVEL / (beatDur * 1000); // px/ms
    const noteTemplate = cfg.gen();

    // 转换为绝对时间（ms）和初始 y 位置
    notes = noteTemplate.map(n => ({
      lane: n.lane,
      hitTime: n.beat * beatDur * 1000, // 从关卡开始的ms
      y: JUDGE_Y - NOTE_TRAVEL,         // 初始y（顶部）
      hit: false,
      missed: false,
    }));

    activeNotes = [];
    levelStartTime = performance.now();
    startTime = levelStartTime;
  }

  function init() {
    bestScore = parseInt(localStorage.getItem('retro_drums_best') || '0');
    score = 0;
    combo = 0;
    misses = 0;
    keyDown = {};
    keyFlash = [];
    judgements = [];
    gameState = 'playing';
    startLevel(0);
  }

  function tryHit(lane) {
    const now = performance.now() - levelStartTime;
    // 找距离判定线最近的未被击中的音符
    let best = null, bestDist = Infinity;
    activeNotes.forEach(n => {
      if (n.lane !== lane || n.hit || n.missed) return;
      const dist = Math.abs(n.y - JUDGE_Y);
      if (dist < bestDist) { bestDist = dist; best = n; }
    });
    if (!best || bestDist > GOOD_RANGE) {
      // 空按也触发音效
      playBeep(LANE_FREQS[lane], 0.06);
      return;
    }
    best.hit = true;
    playBeep(LANE_FREQS[lane]);
    let text, color, pts;
    if (bestDist <= PERFECT_RANGE) {
      text = 'PERFECT'; color = '#ffd600'; pts = 300;
      keyFlash.push({ lane, color: '#ffd600aa', tick: 18 });
    } else {
      text = 'GOOD'; color = '#4d96ff'; pts = 100;
      keyFlash.push({ lane, color: '#4d96ff88', tick: 18 });
    }
    combo++;
    score += pts * Math.max(1, Math.floor(combo / 10));
    judgements.push({
      text, color,
      x: LANE_X[lane] + LANE_W / 2,
      y: JUDGE_Y - 20,
      tick: 40
    });
  }

  function update() {
    if (gameState !== 'playing') {
      if (gameState === 'clear') {
        clearTick--;
        if (clearTick <= 0) {
          if (level + 1 < LEVELS.length) startLevel(level + 1);
          else { gameState = 'gameover'; }
        }
      }
      return;
    }

    const cfg = LEVELS[level];
    const beatDur = 60 / cfg.bpm;
    const noteSpeed = NOTE_TRAVEL / (beatDur * 1000); // px/ms
    const elapsed = performance.now() - levelStartTime; // ms

    // 将应该出现的音符加入 activeNotes
    notes.forEach(n => {
      if (n.active || n.hit || n.missed) return;
      // 音符出现时间 = hitTime - 到达时间
      const spawnTime = n.hitTime - (NOTE_TRAVEL / noteSpeed);
      if (elapsed >= spawnTime) {
        n.active = true;
        n.y = JUDGE_Y - NOTE_TRAVEL + (elapsed - spawnTime) * noteSpeed;
        activeNotes.push(n);
      }
    });

    // 更新活动音符位置
    activeNotes.forEach(n => {
      if (n.hit) return;
      n.y = JUDGE_Y - NOTE_TRAVEL + (elapsed - (n.hitTime - NOTE_TRAVEL / noteSpeed)) * noteSpeed;
      // 判断是否 Miss
      if (!n.missed && n.y > JUDGE_Y + GOOD_RANGE) {
        n.missed = true;
        combo = 0;
        misses++;
        judgements.push({
          text: 'MISS', color: '#ff4444',
          x: LANE_X[n.lane] + LANE_W / 2,
          y: JUDGE_Y - 20, tick: 35
        });
      }
    });
    activeNotes = activeNotes.filter(n => !n.missed || n.y < JUDGE_Y + 80);

    // 更新闪光
    keyFlash = keyFlash.filter(f => { f.tick--; return f.tick > 0; });

    // 更新判定文字
    judgements = judgements.filter(j => { j.tick--; j.y -= 0.4; return j.tick > 0; });

    // 判断是否 Miss 过多
    if (misses >= 8) {
      gameState = 'gameover';
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('retro_drums_best', bestScore);
      }
      return;
    }

    // 判断关卡是否完成（全部音符处理完毕 + 超过最后音符时间）
    const lastBeat = cfg.beats;
    const lastTime = lastBeat * beatDur * 1000;
    const allDone = notes.every(n => n.hit || n.missed);
    if (allDone && elapsed > lastTime + 500) {
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('retro_drums_best', bestScore);
      }
      if (level + 1 < LEVELS.length) {
        gameState = 'clear';
        clearTick = 60;
      } else {
        gameState = 'gameover';
      }
    }
  }

  function draw() {
    cx.fillStyle = '#0a0a0f';
    cx.fillRect(0, 0, 256, 240);

    // Header
    cx.fillStyle = 'rgba(0,0,0,0.6)';
    cx.fillRect(0, 0, 256, 18);
    cx.fillStyle = '#ffd600';
    cx.font = 'bold 8px monospace';
    cx.textAlign = 'left';
    cx.textBaseline = 'top';
    cx.fillText(`LV${level + 1}`, 4, 4);
    cx.fillStyle = '#ffffff';
    cx.textAlign = 'center';
    cx.fillText(`SCORE: ${score}`, 128, 4);
    cx.fillStyle = combo >= 10 ? '#ffd600' : '#aaa';
    cx.textAlign = 'right';
    cx.fillText(`COMBO: ${combo}`, 252, 4);

    // 轨道背景
    for (let i = 0; i < LANE_COUNT; i++) {
      const x = LANE_X[i];
      cx.fillStyle = '#111118';
      cx.fillRect(x, 18, LANE_W, 240 - 18);
      // 轨道分隔线
      cx.fillStyle = '#222230';
      cx.fillRect(x + LANE_W - 1, 18, 1, 240 - 18);
    }

    // 判定线
    cx.fillStyle = '#ffffff44';
    cx.fillRect(4, JUDGE_Y - 1, 252, 2);
    cx.fillStyle = '#ffffff88';
    cx.fillRect(4, JUDGE_Y, 252, 1);

    // 按键闪光
    keyFlash.forEach(f => {
      cx.fillStyle = f.color;
      cx.fillRect(LANE_X[f.lane], JUDGE_Y - 8, LANE_W, 20);
    });

    // 音符
    activeNotes.forEach(n => {
      if (n.hit || n.y < 0) return;
      const x = LANE_X[n.lane] + LANE_W / 2;
      const y = n.y;
      // 外圈
      cx.beginPath();
      cx.arc(x, y, NOTE_R, 0, Math.PI * 2);
      cx.fillStyle = LANE_COLORS[n.lane];
      cx.fill();
      // 内圈高光
      cx.beginPath();
      cx.arc(x - 3, y - 3, NOTE_R / 3, 0, Math.PI * 2);
      cx.fillStyle = 'rgba(255,255,255,0.5)';
      cx.fill();
    });

    // Miss 计数
    for (let i = 0; i < 8; i++) {
      const filled = i < misses;
      cx.fillStyle = filled ? '#ff4444' : '#333';
      cx.fillRect(4 + i * 10, 20, 8, 4);
    }

    // 按键标签
    KEYS.forEach((k, i) => {
      const x = LANE_X[i] + LANE_W / 2;
      cx.fillStyle = keyDown[k] ? LANE_COLORS[i] : '#555';
      cx.font = 'bold 9px monospace';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(k.toUpperCase(), x, 228);
    });

    // 判定文字
    judgements.forEach(j => {
      const alpha = Math.min(1, j.tick / 20);
      cx.globalAlpha = alpha;
      cx.fillStyle = j.color;
      cx.font = 'bold 8px monospace';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(j.text, j.x, j.y);
      cx.globalAlpha = 1;
    });

    // CLEAR 提示
    if (gameState === 'clear') {
      cx.fillStyle = 'rgba(0,0,0,0.7)';
      cx.fillRect(60, 90, 136, 40);
      cx.fillStyle = '#ffd600';
      cx.font = 'bold 16px monospace';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText('CLEAR!', 128, 110);
    }

    // 游戏结束
    if (gameState === 'gameover') {
      cx.fillStyle = 'rgba(0,0,0,0.82)';
      cx.fillRect(40, 70, 176, 80);
      cx.fillStyle = level + 1 >= LEVELS.length ? '#ffd600' : '#ff4444';
      cx.font = 'bold 14px monospace';
      cx.textAlign = 'center';
      cx.textBaseline = 'middle';
      cx.fillText(level + 1 >= LEVELS.length ? 'COMPLETE!' : 'GAME OVER', 128, 95);
      cx.fillStyle = '#fff';
      cx.font = '8px monospace';
      cx.fillText(`SCORE: ${score}`, 128, 112);
      cx.fillStyle = '#aaa';
      cx.fillText(`BEST: ${bestScore}`, 128, 124);
      cx.fillStyle = '#ffd600';
      cx.fillText(i18n('SPACE=重新开始', 'SPACE=Restart'), 128, 138);
    }

    drawHint(cx, 256, 240, CTRL);
  }

  function loop() {
    update();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start(canvas) {
    cv = canvas;
    cx = cv.getContext('2d');
    init();

    keyH = e => {
      const k = e.key.toLowerCase();
      if (gameState === 'gameover' && e.key === ' ') {
        init();
        return;
      }
      if (KEYS.includes(k) && !keyDown[k]) {
        initAudio();
        keyDown[k] = true;
        tryHit(KEYS.indexOf(k));
      }
    };
    const keyUpH = e => {
      const k = e.key.toLowerCase();
      if (KEYS.includes(k)) keyDown[k] = false;
    };
    const clickH = () => initAudio();

    document.addEventListener('keydown', keyH);
    document.addEventListener('keyup', keyUpH);
    cv.addEventListener('click', clickH);

    // 保存清理引用
    keyH._up = keyUpH;
    keyH._click = clickH;

    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(rafId);
    document.removeEventListener('keydown', keyH);
    if (keyH && keyH._up) document.removeEventListener('keyup', keyH._up);
    if (cv && keyH && keyH._click) cv.removeEventListener('click', keyH._click);
  }

  return { start, stop };
})();
