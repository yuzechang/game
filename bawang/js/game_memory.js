/* ===== 记忆配对 ===== 点击翻牌 | 关卡：每通关扩大格子 */
GAME_MODULES.memory = (() => {
  const CTRL = i18n(
    ['操作说明','点击翻牌，找到相同图案','通关后自动升关（网格变大）','SPACE 重开当前关'],
    ['Controls','Click to flip, find pairs','Clear board to advance level','SPACE Restart current level']
  );

  // 每关配置：[列数, 行数]
  const LEVEL_CFG = [[3,4],[4,4],[4,5],[5,6]];
  const SYMBOLS = ['★','♦','♣','♠','♥','●','▲','■','✿','✦','♪','♘','⬟','⚡','☂','☯'];
  const COLORS  = ['#e74c3c','#2980b9','#27ae60','#f39c12','#8e44ad','#16a085','#d35400','#c0392b',
                   '#1abc9c','#f39c12','#3498db','#9b59b6','#e67e22','#2ecc71','#e91e63','#00bcd4'];

  const HEADER=22;
  let cv, cx, cols, rows, cw, ch, cards, flipped, matchedPairs, moves, blocking, clickH, keyH, level;

  function initLevel(lv){
    level=Math.min(lv, LEVEL_CFG.length-1);
    cols=LEVEL_CFG[level][0]; rows=LEVEL_CFG[level][1];
    const GAP=4;
    cw=Math.floor((256-GAP*(cols+1))/cols);
    ch=Math.floor((240-HEADER-GAP*(rows+1))/rows);
    const pairs=cols*rows/2;
    const vals=[...Array(pairs).keys()].flatMap(i=>[i,i]);
    for(let i=vals.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[vals[i],vals[j]]=[vals[j],vals[i]];}
    cards=vals.map((val,i)=>({val,i,flipped:false,matched:false}));
    flipped=[]; matchedPairs=0; moves=0; blocking=false;
  }

  function cardX(c){ const GAP=4; return GAP+c*(cw+GAP); }
  function cardY(r){ const GAP=4; return HEADER+GAP+r*(ch+GAP); }

  function draw(){
    cx.fillStyle='#1a2035'; cx.fillRect(0,0,256,240);
    cx.fillStyle='#ffd600'; cx.font='bold 8px monospace'; cx.textAlign='left';
    cx.fillText(`Lv${level+1}  ${i18n('步数','Moves')}:${moves}  ${i18n('配对','Pairs')}:${matchedPairs}/${cols*rows/2}`,4,13);

    const pairs=cols*rows/2;
    cards.forEach(({val,flipped:fp,matched,i})=>{
      const c=i%cols, r=Math.floor(i/cols);
      const x=cardX(c), y=cardY(r);
      const fs=Math.min(cw,ch)*0.4;
      if(matched){
        cx.fillStyle='#27ae60'; cx.fillRect(x,y,cw,ch);
        cx.fillStyle='rgba(255,255,255,0.3)'; cx.fillRect(x,y,cw,2);
      } else if(fp){
        cx.fillStyle=COLORS[val%COLORS.length]; cx.fillRect(x,y,cw,ch);
        cx.fillStyle='rgba(255,255,255,0.25)'; cx.fillRect(x,y,cw,2);
      } else {
        cx.fillStyle='#2c3e6a'; cx.fillRect(x,y,cw,ch);
        cx.fillStyle='rgba(255,255,255,0.07)'; cx.fillRect(x,y,cw,2);
      }
      if(fp||matched){
        cx.fillStyle='#fff'; cx.font=`${fs}px sans-serif`;
        cx.textAlign='center'; cx.textBaseline='middle';
        cx.fillText(SYMBOLS[val%SYMBOLS.length],x+cw/2,y+ch/2);
        cx.textAlign='left'; cx.textBaseline='alphabetic';
      }
    });

    if(matchedPairs===cols*rows/2){
      cx.fillStyle='rgba(0,0,0,0.82)'; cx.fillRect(30,80,196,80);
      cx.fillStyle='#2ecc71'; cx.font='bold 14px monospace'; cx.textAlign='center';
      cx.fillText(level<LEVEL_CFG.length-1?i18n('通关! 升级!','Clear! Level Up!'):i18n('全部通关!','All Clear!'),128,110);
      cx.fillStyle='#aaa'; cx.font='8px monospace';
      cx.fillText(`${i18n('步数','Moves')}: ${moves}`,128,126);
      cx.fillText(level<LEVEL_CFG.length-1?i18n('[SPACE] 继续','[SPACE] Next Level'):i18n('[SPACE] 重玩','[SPACE] Replay'),128,143);
      cx.textAlign='left';
    } else {
      drawHint(cx,256,240,CTRL);
    }
  }

  function handleClick(e){
    if(blocking||matchedPairs===cols*rows/2) return;
    const rect=cv.getBoundingClientRect();
    const sx=(e.clientX-rect.left)*(256/rect.width);
    const sy=(e.clientY-rect.top)*(240/rect.height);
    for(let i=0;i<cards.length;i++){
      const c=i%cols, r=Math.floor(i/cols);
      const x=cardX(c),y=cardY(r);
      if(sx>=x&&sx<x+cw&&sy>=y&&sy<y+ch){
        const card=cards[i];
        if(card.matched||card.flipped||flipped.length>=2) return;
        card.flipped=true; flipped.push(i);
        if(flipped.length===2){
          moves++;
          const [a,b]=flipped;
          if(cards[a].val===cards[b].val){
            cards[a].matched=cards[b].matched=true; flipped=[]; matchedPairs++;
          } else {
            blocking=true;
            setTimeout(()=>{ cards[a].flipped=cards[b].flipped=false; flipped=[]; blocking=false; draw(); },900);
          }
        }
        draw(); break;
      }
    }
  }

  return {
    start(_cv,_cx){
      cv=_cv; cx=_cx;
      if(clickH) cv.removeEventListener('click',clickH);
      clickH=handleClick; cv.addEventListener('click',clickH);
      document.removeEventListener('keydown',keyH);
      keyH=e=>{
        if(e.key===' '){
          if(matchedPairs===cols*rows/2){
            triggerDonateOnGameClear();
            initLevel(matchedPairs===cols*rows/2&&level<LEVEL_CFG.length-1?level+1:0);
          } else initLevel(level);
          draw();
        }
      };
      document.addEventListener('keydown',keyH);
      initLevel(0); draw();
    },
    stop(){
      if(clickH){cv.removeEventListener('click',clickH);clickH=null;}
      document.removeEventListener('keydown',keyH);
    }
  };
})();
