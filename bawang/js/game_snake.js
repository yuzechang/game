/* ===== 贪吃蛇 ===== 方向键 / SPACE 重开 | 关卡：每10分升一级 */
GAME_MODULES.snake = (() => {
  const COLS = 16, ROWS = 15, CELL = 16;
  const CTRL = i18n(
    ['操作说明','↑↓←→ 改变方向','SPACE 重开  吃食物升级加速','关卡越高障碍越多'],
    ['Controls','↑↓←→ Change direction','SPACE Restart  Eat to level up','Higher level = more obstacles']
  );

  // 每关配置：[速度ms, 障碍数]
  const LEVEL_CFG = [
    [200,0],[160,2],[130,4],[105,6],[85,8]
  ];

  let cv, cx, snake, dir, nextDir, food, obstacles, score, level, speed, lastTs, rafId, dead, started, keyH;

  function rand(n) { return Math.floor(Math.random() * n); }

  function spawnFood() {
    let p;
    do { p={x:rand(COLS),y:rand(ROWS)}; }
    while (snake.some(s=>s.x===p.x&&s.y===p.y) || obstacles.some(o=>o.x===p.x&&o.y===p.y));
    food = p;
  }

  function buildObstacles(n) {
    const obs = [];
    while (obs.length < n) {
      const p = {x:rand(COLS), y:rand(ROWS)};
      const safe = Math.abs(p.x-8)<=2 && Math.abs(p.y-7)<=2;
      if (!safe && !obs.some(o=>o.x===p.x&&o.y===p.y)) obs.push(p);
    }
    return obs;
  }

  function draw() {
    cx.fillStyle = '#0d1117';
    cx.fillRect(0,0,256,240);
    cx.fillStyle = '#1a2030';
    for (let x=0;x<COLS;x++) for (let y=0;y<ROWS;y++) cx.fillRect(x*CELL+7,y*CELL+7,2,2);

    obstacles.forEach(o => {
      cx.fillStyle='#4a5568'; cx.fillRect(o.x*CELL+1,o.y*CELL+1,CELL-2,CELL-2);
      cx.fillStyle='#718096'; cx.fillRect(o.x*CELL+3,o.y*CELL+3,CELL-6,CELL-6);
    });

    cx.fillStyle='#ff3c3c'; cx.fillRect(food.x*CELL+2,food.y*CELL+2,CELL-4,CELL-4);
    snake.forEach((seg,i)=>{
      cx.fillStyle = i===0?'#00e64d':'#009933';
      cx.fillRect(seg.x*CELL+1,seg.y*CELL+1,CELL-2,CELL-2);
      if(i===0){
        cx.fillStyle='#000';
        cx.fillRect(seg.x*CELL+(dir.x>=0?10:3),seg.y*CELL+(dir.y>=0?3:10),2,2);
      }
    });

    cx.fillStyle='rgba(0,0,0,0.6)'; cx.fillRect(0,0,256,13);
    cx.fillStyle='#fff'; cx.font='8px monospace'; cx.textAlign='left';
    cx.fillText(`Lv${level} SCORE:${score}  HI:${Math.max(score,+localStorage.snakeHi||0)}`,4,10);

    if(!started){
      cx.fillStyle='rgba(0,0,0,0.82)'; cx.fillRect(0,0,256,240);
      cx.fillStyle='#00e64d'; cx.font='bold 20px monospace'; cx.textAlign='center';
      cx.fillText('SNAKE',128,90);
      cx.fillStyle='#aaa'; cx.font='8px monospace';
      cx.fillText(`Best: ${+localStorage.snakeHi||0}`,128,108);
      cx.fillStyle='#ffd600'; cx.font='9px monospace';
      cx.fillText(i18n('按方向键开始','Press arrow to start'),128,125);
      drawHint(cx,256,240,CTRL);
      cx.textAlign='left';
      return;
    }

    if(dead){
      cx.fillStyle='rgba(0,0,0,0.78)'; cx.fillRect(48,88,160,64);
      cx.fillStyle='#ff3c3c'; cx.font='bold 14px monospace'; cx.textAlign='center';
      cx.fillText('GAME OVER',128,112);
      cx.fillStyle='#ccc'; cx.font='8px monospace';
      cx.fillText(`SCORE: ${score}`,128,128);
      cx.fillText(i18n('[SPACE] 重开','[SPACE] Restart'),128,143);
      cx.textAlign='left';
    }
  }

  function step(ts){
    if(dead){ draw(); return; }
    if(ts-lastTs>=speed){
      lastTs=ts; dir=nextDir;
      const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
      if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS||
         snake.some(s=>s.x===head.x&&s.y===head.y)||
         obstacles.some(o=>o.x===head.x&&o.y===head.y)){
        dead=true; localStorage.snakeHi=Math.max(score,+localStorage.snakeHi||0);
        draw(); return;
      }
      snake.unshift(head);
      if(head.x===food.x&&head.y===food.y){
        score+=10;
        const newLv=Math.min(5,Math.floor(score/50)+1);
        if(newLv>level){ level=newLv; speed=LEVEL_CFG[level-1][0]; obstacles=buildObstacles(LEVEL_CFG[level-1][1]); }
        spawnFood();
      } else { snake.pop(); }
    }
    draw();
    rafId=requestAnimationFrame(step);
  }

  function onKey(e){
    const m={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
    if(m[e.key]){
      const d=m[e.key];
      if(!started){ started=true; nextDir=dir=d; lastTs=0; rafId=requestAnimationFrame(step); }
      if(d.x!==-dir.x||d.y!==-dir.y) nextDir=d;
      e.preventDefault();
    }
    if(e.key===' '){ if(dead) restart(); e.preventDefault(); }
  }

  function restart(){
    snake=[{x:8,y:7},{x:7,y:7},{x:6,y:7}];
    dir=nextDir={x:1,y:0}; score=0; level=1;
    speed=LEVEL_CFG[0][0]; obstacles=buildObstacles(LEVEL_CFG[0][1]);
    dead=false; started=false; lastTs=0;
    spawnFood();
    if(rafId) cancelAnimationFrame(rafId);
    draw();
  }

  return {
    start(_cv,_cx){ cv=_cv; cx=_cx; document.removeEventListener('keydown',keyH); keyH=onKey; document.addEventListener('keydown',keyH); restart(); },
    stop(){ if(rafId){cancelAnimationFrame(rafId);rafId=null;} document.removeEventListener('keydown',keyH); }
  };
})();
