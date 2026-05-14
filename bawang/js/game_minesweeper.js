/* ===== 扫雷 ===== 左键揭格 右键插旗 | 三档难度 */
GAME_MODULES.minesweeper = (() => {
  const CTRL = i18n(
    ['操作说明','左键 揭开格子  右键 插/拔旗','笑脸按钮 重置  N=切换难度'],
    ['Controls','Left=Reveal  Right=Flag/Unflag','Smiley=Reset  N=Difficulty']
  );
  const NUM_COLORS=['','#2563eb','#16a34a','#dc2626','#1e40af','#b91c1c','#0e7490','#111','#6b7280'];
  const DIFFS=[
    {cols:9,rows:9,mines:10,cell:24,gx:20,gy:32,label:i18n('简单','Easy')},
    {cols:12,rows:9,mines:18,cell:20,gx:4,gy:28,label:i18n('中等','Med')},
    {cols:14,rows:10,mines:30,cell:17,gx:3,gy:26,label:i18n('困难','Hard')},
  ];
  let cv,cx,d,board,revealed,flagged,mineCount,timer,started,over,won,rafId,mouseH,ctxH,keyH,lastSec;

  function init(di){
    d=DIFFS[di||0];
    board=Array.from({length:d.rows},()=>new Array(d.cols).fill(0));
    revealed=Array.from({length:d.rows},()=>new Array(d.cols).fill(false));
    flagged=Array.from({length:d.rows},()=>new Array(d.cols).fill(false));
    mineCount=d.mines; timer=0; started=false; over=false; won=false; lastSec=0;
  }
  function placeMines(sr,sc){
    let placed=0;
    while(placed<d.mines){
      const r=Math.floor(Math.random()*d.rows),c=Math.floor(Math.random()*d.cols);
      if(board[r][c]===-1) continue;
      if(Math.abs(r-sr)<=1&&Math.abs(c-sc)<=1) continue;
      board[r][c]=-1; placed++;
    }
    for(let r=0;r<d.rows;r++) for(let c=0;c<d.cols;c++){
      if(board[r][c]===-1) continue;
      let cnt=0;
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
        const nr=r+dr,nc=c+dc;
        if(nr>=0&&nr<d.rows&&nc>=0&&nc<d.cols&&board[nr][nc]===-1) cnt++;
      }
      board[r][c]=cnt;
    }
  }
  function reveal(r,c){
    if(r<0||r>=d.rows||c<0||c>=d.cols||revealed[r][c]||flagged[r][c]) return;
    revealed[r][c]=true;
    if(board[r][c]===0) for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) reveal(r+dr,c+dc);
  }
  function checkWin(){for(let r=0;r<d.rows;r++) for(let c=0;c<d.cols;c++) if(board[r][c]!==-1&&!revealed[r][c]) return false; return true;}
  function getCell(px,py){
    const c=Math.floor((px-d.gx)/d.cell),r=Math.floor((py-d.gy)/d.cell);
    if(r<0||r>=d.rows||c<0||c>=d.cols) return null; return {r,c};
  }

  function draw3D(x,y,w,h,light,shadow){
    cx.strokeStyle=light; cx.lineWidth=1.5;
    cx.beginPath(); cx.moveTo(x,y+h); cx.lineTo(x,y); cx.lineTo(x+w,y); cx.stroke();
    cx.strokeStyle=shadow;
    cx.beginPath(); cx.moveTo(x+w,y); cx.lineTo(x+w,y+h); cx.lineTo(x,y+h); cx.stroke();
  }
  function drawLCD(val,x,y){
    cx.fillStyle='#200'; cx.fillRect(x,y,39,16);
    cx.fillStyle='#f00'; cx.font='bold 14px monospace';
    cx.textAlign='right'; cx.textBaseline='middle';
    cx.fillText(String(Math.max(0,val)).padStart(3,'0'),x+36,y+8);
  }

  function draw(ts){
    if(!cv) return;
    if(started&&!over&&!won){
      const sec=Math.floor((ts-lastSec)/1000);
      if(sec>0){timer+=sec;lastSec=ts;if(timer>999)timer=999;}
    }
    cx.fillStyle='#c0c0c0'; cx.fillRect(0,0,256,240);
    // Header
    cx.fillStyle='#bdbdbd'; cx.fillRect(2,2,252,24); draw3D(2,2,252,24,'#fff','#808080');
    drawLCD(mineCount,6,4); drawLCD(Math.min(timer,999),256-45,4);
    // 难度标签
    cx.fillStyle='#444'; cx.font='7px monospace'; cx.textAlign='left'; cx.textBaseline='middle';
    cx.fillText(d.label,52,14);
    // 笑脸
    const fx=Math.floor(256/2)-9,fy=4;
    cx.fillStyle='#c0c0c0'; cx.fillRect(fx,fy,18,18); draw3D(fx,fy,18,18,'#fff','#808080');
    cx.font='13px serif'; cx.textAlign='center'; cx.textBaseline='middle';
    cx.fillText(over?'😵':(won?'😎':'🙂'),fx+9,fy+9);
    // 棋盘
    draw3D(d.gx-2,d.gy-2,d.cols*d.cell+4,d.rows*d.cell+4,'#808080','#fff');
    for(let r=0;r<d.rows;r++) for(let c=0;c<d.cols;c++){
      const x=d.gx+c*d.cell,y=d.gy+r*d.cell;
      if(revealed[r][c]){
        cx.fillStyle='#c0c0c0'; cx.fillRect(x,y,d.cell,d.cell);
        cx.strokeStyle='#808080'; cx.lineWidth=0.5; cx.strokeRect(x,y,d.cell,d.cell);
        if(board[r][c]===-1){
          cx.fillStyle=over?'#f00':'#c0c0c0'; cx.fillRect(x,y,d.cell,d.cell);
          cx.font='12px serif'; cx.textAlign='center'; cx.textBaseline='middle';
          cx.fillText('💣',x+d.cell/2,y+d.cell/2);
        } else if(board[r][c]>0){
          cx.fillStyle=NUM_COLORS[board[r][c]];
          cx.font=`bold ${d.cell<20?9:11}px monospace`;
          cx.textAlign='center'; cx.textBaseline='middle';
          cx.fillText(board[r][c],x+d.cell/2,y+d.cell/2);
        }
      } else {
        cx.fillStyle='#c0c0c0'; cx.fillRect(x,y,d.cell,d.cell); draw3D(x,y,d.cell,d.cell,'#fff','#808080');
        if(flagged[r][c]){cx.font='11px serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('🚩',x+d.cell/2,y+d.cell/2);}
        if(over&&board[r][c]===-1&&!flagged[r][c]){cx.font='12px serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('💣',x+d.cell/2,y+d.cell/2);}
      }
    }
    if(!over&&!won) drawHint(cx,256,240,CTRL);
    rafId=requestAnimationFrame(draw);
  }

  function onClick(e){
    const rect=cv.getBoundingClientRect();
    const px=(e.clientX-rect.left)*(256/rect.width),py=(e.clientY-rect.top)*(240/rect.height);
    // 笑脸重置
    if(px>=Math.floor(256/2)-9&&px<=Math.floor(256/2)+9&&py>=4&&py<=22){init(DIFFS.indexOf(d));return;}
    if(over||won) return;
    const cell=getCell(px,py); if(!cell) return;
    const {r,c}=cell;
    if(revealed[r][c]||flagged[r][c]) return;
    if(!started){started=true;lastSec=performance.now();placeMines(r,c);}
    if(board[r][c]===-1){revealed[r][c]=true;over=true;for(let i=0;i<d.rows;i++) for(let j=0;j<d.cols;j++) if(board[i][j]===-1) revealed[i][j]=true;return;}
    reveal(r,c); if(checkWin()){won=true;mineCount=0;}
  }
  function onContext(e){
    e.preventDefault();
    if(over||won) return;
    const rect=cv.getBoundingClientRect();
    const px=(e.clientX-rect.left)*(256/rect.width),py=(e.clientY-rect.top)*(240/rect.height);
    const cell=getCell(px,py); if(!cell) return;
    const {r,c}=cell;
    if(revealed[r][c]) return;
    if(!flagged[r][c]&&mineCount>0){flagged[r][c]=true;mineCount--;}
    else if(flagged[r][c]){flagged[r][c]=false;mineCount++;}
  }

  return {
    start(_cv,_cx){
      cv=_cv; cx=_cx;
      init(0);
      cv.addEventListener('click',mouseH=onClick);
      cv.addEventListener('contextmenu',ctxH=onContext);
      document.addEventListener('keydown',keyH=e=>{
        if(e.key==='n'||e.key==='N'){
          const idx=(DIFFS.indexOf(d)+1)%DIFFS.length;
          init(idx);
        }
      });
      rafId=requestAnimationFrame(draw);
    },
    stop(){
      if(rafId){cancelAnimationFrame(rafId);rafId=null;}
      if(cv){cv.removeEventListener('click',mouseH);cv.removeEventListener('contextmenu',ctxH);}
      document.removeEventListener('keydown',keyH);
      cv=null;
    }
  };
})();
