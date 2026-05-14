/* ===== 打砖块 ===== 鼠标/←→ 控制 | SPACE 发球 | 关卡：球速加快+砖块增多 */
GAME_MODULES.breakout = (() => {
  const PH=6, PY=228, BALL_R=4, BPX=4, BPY=22;
  const CTRL = i18n(
    ['操作说明','鼠标 / ←→ 移动挡板','SPACE 发球 / 重开','关卡越高球越快砖越多'],
    ['Controls','Mouse / ←→ Move paddle','SPACE Launch / Restart','More levels = faster & more bricks']
  );
  // 每关：[砖块列数, 砖块行数, 球速, 挡板宽]
  const LEVEL_CFG=[
    {bc:8,br:4,spd:3.5,pw:52},
    {bc:8,br:5,spd:4.0,pw:46},
    {bc:9,br:5,spd:4.5,pw:40},
    {bc:9,br:6,spd:5.0,pw:34},
    {bc:10,br:6,spd:5.8,pw:28}
  ];
  const BCOLORS=['#e74c3c','#e67e22','#f1c40f','#2ecc71','#3498db','#9b59b6'];

  let cv,cx,paddle,ball,bricks,score,lives,over,launched,keyH,keyHUp,mousH,rafId,keys,level,PW,cfg;

  function mkBricks(){
    const c=cfg,b=[];
    const BW=Math.floor((256-2*BPX-c.bc*2)/(c.bc))-1;
    for(let r=0;r<c.br;r++) for(let col=0;col<c.bc;col++)
      b.push({x:BPX+col*(BW+2),y:BPY+r*(9+3),alive:true,row:r,w:BW});
    return b;
  }

  function draw(){
    cx.fillStyle='#0a0a1a'; cx.fillRect(0,0,256,240);
    cx.fillStyle='#fff'; cx.font='8px monospace'; cx.textAlign='left';
    cx.fillText(`Lv${level+1}  SCR:${score}`,4,10);
    cx.fillText(`${'♥'.repeat(lives)}`,200,10);

    bricks.forEach(b=>{
      if(!b.alive) return;
      cx.fillStyle=BCOLORS[b.row%BCOLORS.length]; cx.fillRect(b.x,b.y,b.w,9);
      cx.fillStyle='rgba(255,255,255,0.3)'; cx.fillRect(b.x,b.y,b.w,2);
    });

    cx.fillStyle='#4fa3e8'; cx.fillRect(paddle.x,PY,PW,PH);
    cx.fillStyle='rgba(255,255,255,0.35)'; cx.fillRect(paddle.x,PY,PW,2);
    cx.fillStyle='#fff'; cx.beginPath(); cx.arc(ball.x,ball.y,BALL_R,0,Math.PI*2); cx.fill();

    if(!launched){
      cx.fillStyle='rgba(255,255,255,0.6)'; cx.font='7px monospace'; cx.textAlign='center';
      cx.fillText(i18n('[SPACE] 发球','[SPACE] Launch'),128,212); cx.textAlign='left';
    }
    if(over){
      const allDead=bricks.every(b=>!b.alive);
      cx.fillStyle='rgba(0,0,0,0.82)'; cx.fillRect(40,88,176,64); cx.textAlign='center';
      cx.fillStyle=allDead?'#2ecc71':'#e74c3c'; cx.font='bold 13px monospace';
      cx.fillText(allDead?(level<LEVEL_CFG.length-1?i18n('通关! 升级!','Level Up!'):i18n('全通关!','All Clear!')):i18n('游戏结束','Game Over'),128,114);
      cx.fillStyle='#aaa'; cx.font='8px monospace';
      cx.fillText(`SCORE: ${score}`,128,130);
      cx.fillText(i18n('[SPACE] 继续','[SPACE] Continue'),128,146); cx.textAlign='left';
    } else {
      drawHint(cx,256,240,CTRL);
    }
  }

  function loop(){
    if(over){draw();return;}
    if(keys.ArrowLeft)  paddle.x=Math.max(0,paddle.x-5);
    if(keys.ArrowRight) paddle.x=Math.min(256-PW,paddle.x+5);

    if(launched){
      ball.x+=ball.dx; ball.y+=ball.dy;
      if(ball.x-BALL_R<=0){ball.x=BALL_R;ball.dx=Math.abs(ball.dx);}
      if(ball.x+BALL_R>=256){ball.x=256-BALL_R;ball.dx=-Math.abs(ball.dx);}
      if(ball.y-BALL_R<=14){ball.y=14+BALL_R;ball.dy=Math.abs(ball.dy);}
      if(ball.y+BALL_R>=PY&&ball.y-BALL_R<=PY+PH&&ball.x>=paddle.x-BALL_R&&ball.x<=paddle.x+PW+BALL_R&&ball.dy>0){
        ball.dy=-Math.abs(ball.dy);
        const rel=(ball.x-paddle.x)/PW-0.5;
        ball.dx=rel*7+(ball.dx>0?0.5:-0.5);
        ball.dx=Math.max(-6,Math.min(6,ball.dx));
      }
      if(ball.y>248){
        lives--;
        if(lives<=0){over=true;} else {resetBall();}
      }
      let alive=false;
      bricks.forEach(b=>{
        if(!b.alive) return;
        alive=true;
        if(ball.x+BALL_R>b.x&&ball.x-BALL_R<b.x+b.w&&ball.y+BALL_R>b.y&&ball.y-BALL_R<b.y+9){
          b.alive=false; score+=(cfg.br-b.row)*10*(level+1);
          const overlapX=Math.min(Math.abs(ball.x-b.x),Math.abs(ball.x-(b.x+b.w)));
          const overlapY=Math.min(Math.abs(ball.y-b.y),Math.abs(ball.y-(b.y+9)));
          if(overlapX<overlapY) ball.dx=-ball.dx; else ball.dy=-ball.dy;
        }
      });
      if(!alive) over=true;
    } else { ball.x=paddle.x+PW/2; }

    draw(); rafId=requestAnimationFrame(loop);
  }

  function resetBall(){
    launched=false; const sp=cfg.spd;
    ball={x:paddle.x+PW/2,y:PY-BALL_R-2,dx:sp*0.85,dy:-sp};
  }

  function startLevel(lv){
    level=lv; cfg=LEVEL_CFG[Math.min(lv,LEVEL_CFG.length-1)]; PW=cfg.pw;
    paddle={x:(256-PW)/2}; bricks=mkBricks(); over=false;
    resetBall();
    if(rafId) cancelAnimationFrame(rafId);
    rafId=requestAnimationFrame(loop);
  }

  function restart(){ lives=3; score=0; startLevel(0); }

  return {
    start(_cv,_cx){
      cv=_cv; cx=_cx; keys={};
      document.removeEventListener('keydown',keyH); document.removeEventListener('keyup',keyHUp);
      keyH=e=>{
        keys[e.key]=true;
        if(e.key===' '){
          if(over){
            const allDead=bricks.every(b=>!b.alive);
            if(allDead&&level<LEVEL_CFG.length-1) startLevel(level+1);
            else if(allDead) restart();
            else if(lives>0) startLevel(level);
            else restart();
          } else if(!launched) launched=true;
          e.preventDefault();
        }
        if(e.key==='ArrowLeft'||e.key==='ArrowRight') e.preventDefault();
      };
      keyHUp=e=>{keys[e.key]=false;};
      document.addEventListener('keydown',keyH); document.addEventListener('keyup',keyHUp);
      if(mousH) cv.removeEventListener('mousemove',mousH);
      mousH=e=>{
        const rect=cv.getBoundingClientRect();
        const mx=(e.clientX-rect.left)*(256/rect.width);
        paddle.x=Math.max(0,Math.min(256-PW,mx-PW/2));
        if(!launched) ball.x=paddle.x+PW/2;
      };
      cv.addEventListener('mousemove',mousH);
      lives=3; score=0; startLevel(0);
    },
    stop(){
      if(rafId){cancelAnimationFrame(rafId);rafId=null;}
      document.removeEventListener('keydown',keyH); document.removeEventListener('keyup',keyHUp);
      if(mousH){cv.removeEventListener('mousemove',mousH);mousH=null;}
    }
  };
})();
