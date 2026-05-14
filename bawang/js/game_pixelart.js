/* ===== 像素画板 ===== 点击/拖动涂色 E=橡皮 F=填充 C=清空 S=保存 */
GAME_MODULES.pixelart = (() => {
  const W = 16, H = 14;
  const CELL = 14, GAP = 1;
  const GX = 4, GY = 20;
  const BG_COLOR = '#1a1a2e';

  const PALETTE = [
    '#000000','#ffffff','#ff0000','#ff7f00','#ffff00','#00cc00',
    '#0000ff','#8800cc','#ff00ff','#00ffff','#884400','#ffaaaa',
    '#aaffaa','#aaaaff','#888888','#eeeeee'
  ];
  const PAL_Y = 220;
  const PAL_SIZE = 10, PAL_GAP = 2;

  const CTRL = i18n(
    ['操作', '点击/拖动涂色  E=橡皮', 'F=填充  C=清空  S=保存PNG'],
    ['Controls', 'Click/Drag=Paint  E=Erase', 'F=Fill  C=Clear  S=Save PNG']
  );

  let cv, cx;
  let pixels = Array(H).fill(null).map(() => Array(W).fill(''));
  let curColor = '#ff0000';
  let curTool = 'pencil'; // 'pencil' | 'eraser' | 'fill'
  let painting = false;
  let dirty = false;
  let mouseH, mouseUpH, mouseLeaveH, mouseMoveH, keyH;

  function fill(r0, c0, targetCol, replaceCol) {
    if (targetCol === replaceCol) return;
    const stack = [[r0, c0]];
    while (stack.length) {
      const [r, c] = stack.pop();
      if (r < 0 || r >= H || c < 0 || c >= W) continue;
      if (pixels[r][c] !== targetCol) continue;
      pixels[r][c] = replaceCol;
      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }
  }

  function getCell(px, py) {
    const col = Math.floor((px - GX) / (CELL + GAP));
    const row = Math.floor((py - GY) / (CELL + GAP));
    if (col < 0 || col >= W || row < 0 || row >= H) return null;
    return { row, col };
  }

  function applyTool(row, col) {
    if (curTool === 'pencil') {
      pixels[row][col] = curColor;
      dirty = true;
    } else if (curTool === 'eraser') {
      pixels[row][col] = '';
      dirty = true;
    } else if (curTool === 'fill') {
      const target = pixels[row][col];
      const replace = curTool === 'eraser' ? '' : curColor;
      fill(row, col, target, replace);
      dirty = true;
    }
  }

  function saveAsPNG() {
    const scale = 4;
    const tmp = document.createElement('canvas');
    tmp.width = W * scale;
    tmp.height = H * scale;
    const tc = tmp.getContext('2d');
    tc.fillStyle = BG_COLOR;
    tc.fillRect(0, 0, tmp.width, tmp.height);
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const col = pixels[r][c];
        if (col) {
          tc.fillStyle = col;
          tc.fillRect(c * scale, r * scale, scale, scale);
        }
      }
    }
    tmp.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pixel_art.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function draw() {
    if (!dirty) return;
    dirty = false;

    cx.fillStyle = '#0d0d1a';
    cx.fillRect(0, 0, 256, 240);

    // Header
    cx.fillStyle = 'rgba(0,0,0,0.7)';
    cx.fillRect(0, 0, 256, GY);

    cx.fillStyle = '#ffffff';
    cx.font = 'bold 9px monospace';
    cx.textAlign = 'left';
    cx.textBaseline = 'top';
    cx.fillText('PIXEL ART', 4, 3);

    // 工具名
    const toolName = { pencil: i18n('铅笔','Pencil'), eraser: i18n('橡皮','Eraser'), fill: i18n('填充','Fill') }[curTool];
    cx.fillStyle = '#ffd600';
    cx.font = '7px monospace';
    cx.fillText(toolName, 70, 5);

    // 当前颜色色块
    cx.fillStyle = curColor;
    cx.fillRect(120, 4, 10, 10);
    cx.strokeStyle = '#fff';
    cx.lineWidth = 1;
    cx.strokeRect(120, 4, 10, 10);

    // 画板背景
    cx.fillStyle = BG_COLOR;
    cx.fillRect(GX - 1, GY - 1, W * (CELL + GAP) + 1, H * (CELL + GAP) + 1);

    // 画格子
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const x = GX + c * (CELL + GAP);
        const y = GY + r * (CELL + GAP);
        const col = pixels[r][c];
        if (col) {
          cx.fillStyle = col;
          cx.fillRect(x, y, CELL, CELL);
        } else {
          // 棋盘格背景表示透明
          cx.fillStyle = (r + c) % 2 === 0 ? '#1f1f3a' : '#16162c';
          cx.fillRect(x, y, CELL, CELL);
        }
      }
    }

    // 调色板
    cx.fillStyle = 'rgba(0,0,0,0.5)';
    cx.fillRect(0, PAL_Y - 3, 256, 20);

    PALETTE.forEach((col, i) => {
      const x = GX + i * (PAL_SIZE + PAL_GAP);
      cx.fillStyle = col;
      cx.fillRect(x, PAL_Y, PAL_SIZE, PAL_SIZE);
      // 选中高亮
      if (col === curColor) {
        cx.strokeStyle = '#ffffff';
        cx.lineWidth = 1.5;
        cx.strokeRect(x - 1, PAL_Y - 1, PAL_SIZE + 2, PAL_SIZE + 2);
      }
    });

    drawHint(cx, 256, 240, CTRL);
  }

  function start(canvas) {
    cv = canvas;
    cx = cv.getContext('2d');
    dirty = true;
    draw();

    mouseH = e => {
      const rect = cv.getBoundingClientRect();
      const scaleX = 256 / rect.width;
      const scaleY = 240 / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      // 点击调色板
      if (py >= PAL_Y && py <= PAL_Y + PAL_SIZE) {
        const i = Math.floor((px - GX) / (PAL_SIZE + PAL_GAP));
        if (i >= 0 && i < PALETTE.length) {
          curColor = PALETTE[i];
          if (curTool === 'eraser') curTool = 'pencil';
          dirty = true;
          draw();
          return;
        }
      }

      // 点击画板
      const cell = getCell(px, py);
      if (cell) {
        painting = true;
        applyTool(cell.row, cell.col);
        draw();
      }
    };

    mouseMoveH = e => {
      if (!painting) return;
      const rect = cv.getBoundingClientRect();
      const scaleX = 256 / rect.width;
      const scaleY = 240 / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      const cell = getCell(px, py);
      if (cell) {
        if (curTool === 'fill') return; // 拖动时不触发 fill
        applyTool(cell.row, cell.col);
        draw();
      }
    };

    mouseUpH = () => { painting = false; };
    mouseLeaveH = () => { painting = false; };

    keyH = e => {
      switch (e.key.toLowerCase()) {
        case 'e': curTool = 'eraser'; dirty = true; draw(); break;
        case 'f': curTool = 'fill';   dirty = true; draw(); break;
        case 'p': curTool = 'pencil'; dirty = true; draw(); break;
        case 'c':
          pixels = Array(H).fill(null).map(() => Array(W).fill(''));
          dirty = true; draw(); break;
        case 's': saveAsPNG(); break;
      }
    };

    cv.addEventListener('mousedown', mouseH);
    cv.addEventListener('mousemove', mouseMoveH);
    cv.addEventListener('mouseup', mouseUpH);
    cv.addEventListener('mouseleave', mouseLeaveH);
    document.addEventListener('keydown', keyH);
  }

  function stop() {
    if (cv) {
      cv.removeEventListener('mousedown', mouseH);
      cv.removeEventListener('mousemove', mouseMoveH);
      cv.removeEventListener('mouseup', mouseUpH);
      cv.removeEventListener('mouseleave', mouseLeaveH);
    }
    document.removeEventListener('keydown', keyH);
  }

  return { start, stop };
})();
