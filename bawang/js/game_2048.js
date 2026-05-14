/* ===== 2048 ===== 方向键 / SPACE 重开 | 关卡：达成目标后升至更大网格 */
GAME_MODULES.g2048 = (() => {
  const CTRL = i18n(
    ['操作说明','↑↓←→ 合并数字','达成目标值升级（网格变大）','SPACE 重开'],
    ['Controls','↑↓←→ Merge tiles','Reach target to advance level','SPACE Restart']
  );

  // 每关配置：[网格大小, 胜利目标]
  const LEVEL_CFG = [{n:4,goal:512},{n:4,goal:2048},{n:5,goal:4096},{n:5,goal:8192}];
  const TILE_BG = {0:'#cdc1b4',2:'#eee4da',4:'#ede0c8',8:'#f2b179',16:'#f59563',32:'#f67c5f',64:'#f65e3b',128:'#edcf72',256:'#edcc61',512:'#edc850',1024:'#edc53f',2048:'#edc22e',4096:'#ff5252',8192:'#ff1744'};
  const TILE_FG = {2:'#776e65',4:'#776e65'};
  const HEADER=22;

  let cv, cx, board, score, best, over, won, keyH, level, N, CELL, BX, BW, GAP;

  function setupLayout(){
    const cfg=LEVEL_CFG[level]; N=cfg.n;
    GAP=4; CELL=Math.floor((240-HEADER-GAP*(N+1))/N);
    BW=N*CELL+GAP*(N+1); BX=Math.floor((256-BW)/2);
  }

  function cellX(c){ return BX+GAP+c*(CELL+GAP); }
  function cellY(r){ return HEADER+GAP+r*(CELL+GAP); }

  function newBoard(){
    const b=Array.from({length:N},()=>Array(N).fill(0));
    addTile(b); addTile(b); return b;
  }
  function addTile(b){
    const empty=[]; b.forEach((row,r)=>row.forEach((v,c)=>{if(!v)empty.push({r,c});}));
    if(!empty.length) return;
    const {r,c}=empty[Math.floor(Math.random()*empty.length)];
    b[r][c]=Math.random()<0.9?2:4;
  }
  function slide(row){
    const goal=LEVEL_CFG[level].goal;
    let arr=row.filter(Boolean),merged=false;
    for(let i=0;i<arr.length-1;i++){
      if(!merged&&arr[i]===arr[i+1]){
        arr[i]*=2; score+=arr[i];
        if(arr[i]>=goal) won=true;
        arr.splice(i+1,1); merged=true;
      } else { merged=false; }
    }
    while(arr.length<N) arr.push(0);
    return arr;
  }
  function move(dir){
    const old=board.map(r=>[...r]);
    if(dir==='left')  board=board.map(r=>slide(r));
    if(dir==='right') board=board.map(r=>slide([...r].reverse()).reverse());
    if(dir==='up'||dir==='down'){
      for(let c=0;c<N;c++){
        const col=board.map(r=>r[c]);
        const slid=dir==='up'?slide(col):slide([...col].reverse()).reverse();
        slid.forEach((v,r)=>board[r][c]=v);
      }
    }
    const moved=board.some((r,ri)=>r.some((v,ci)=>v!==old[ri][ci]));
    if(moved) addTile(board);
    if(!board.flat().includes(0)){
      let ok=false;
      for(let r=0;r<N;r++) for(let c=0;c<N;c++){
        if(c<N-1&&board[r][c]===board[r][c+1]) ok=true;
        if(r<N-1&&board[r][c]===board[r+1][c]) ok=true;
      }
      if(!ok) over=true;
    }
    best=Math.max(best,score); localStorage.g2048Best=best; draw();
  }

  function draw(){
    cx.fillStyle='#faf8ef'; cx.fillRect(0,0,256,240);
    cx.fillStyle='#776e65'; cx.font='bold 12px monospace'; cx.textAlign='left';
    cx.fillText(`Lv${level+1}·${LEVEL_CFG[level].goal}`,BX,14);
    cx.font='7px monospace';
    cx.fillText(`SCR:${score}`,BX+70,10); cx.fillText(`BEST:${best}`,BX+70,19);
    cx.fillStyle='#bbada0'; cx.fillRect(BX,HEADER,BW,BW);
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      const v=board[r][c],x=cellX(c),y=cellY(r);
      cx.fillStyle=TILE_BG[v]||'#3c3a32'; cx.fillRect(x,y,CELL,CELL);
      if(v){
        const fs=v>=10000?7:v>=1000?9:v>=100?11:13;
        cx.fillStyle=TILE_FG[v]||'#f9f6f2'; cx.font=`bold ${fs}px monospace`;
        cx.textAlign='center'; cx.textBaseline='middle';
        cx.fillText(String(v),x+CELL/2,y+CELL/2);
      }
    }
    cx.textAlign='left'; cx.textBaseline='alphabetic';
    if(over||won){
      cx.fillStyle='rgba(238,228,218,0.9)'; cx.fillRect(BX,HEADER,BW,BW);
      cx.textAlign='center';
      if(won){
        cx.fillStyle='#f67c5f'; cx.font='bold 14px monospace';
        cx.fillText(level<LEVEL_CFG.length-1?i18n('过关!升级!','Level Up!'):i18n('全部通关!','All Clear!'),BX+BW/2,HEADER+BW/2-14);
        cx.fillStyle='#aaa'; cx.font='8px monospace';
        cx.fillText(i18n('[SPACE] 下一关','[SPACE] Next Level'),BX+BW/2,HEADER+BW/2+4);
      } else {
        cx.fillStyle='#776e65'; cx.font='bold 13px monospace';
        cx.fillText('GAME OVER',BX+BW/2,HEADER+BW/2-14);
      }
      cx.fillStyle='#aaa'; cx.font='8px monospace';
      cx.fillText(`SCORE: ${score}`,BX+BW/2,HEADER+BW/2+18);
      if(!won) cx.fillText(i18n('[SPACE] 重开','[SPACE] Restart'),BX+BW/2,HEADER+BW/2+30);
      cx.textAlign='left';
    } else {
      drawHint(cx,256,240,CTRL);
    }
  }

  function restart(lv){
    level=lv||0; setupLayout();
    board=newBoard(); score=0; over=false; won=false;
    best=+localStorage.g2048Best||0; draw();
  }

  return {
    start(_cv,_cx){
      cv=_cv; cx=_cx; best=+localStorage.g2048Best||0;
      document.removeEventListener('keydown',keyH);
      keyH=e=>{
        const dirs={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};
        if(dirs[e.key]&&!over&&!won){move(dirs[e.key]);e.preventDefault();}
        if(e.key===' '){
          if(won){
            triggerDonateOnGameClear();
            restart(level<LEVEL_CFG.length-1?level+1:0);
          } else if(over) restart(level);
          e.preventDefault();
        }
      };
      document.addEventListener('keydown',keyH);
      restart(0);
    },
    stop(){ document.removeEventListener('keydown',keyH); }
  };
})();
