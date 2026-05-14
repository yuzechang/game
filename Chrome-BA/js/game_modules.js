/* HTML5 游戏模块注册表 + 国际化工具 */
const GAME_MODULES = {};

/* 根据浏览器语言决定语言，默认英文 */
var RETRO_LANG = (navigator.language || '').startsWith('zh') ? 'zh' : 'en';
function setLang(lang) { RETRO_LANG = lang; try { localStorage.setItem('retrofc_lang', lang); } catch(e) {} }
function getStoredLang() { try { return localStorage.getItem('retrofc_lang'); } catch(e) { return null; } }

/**
 * 国际化文本：RETRO_LANG==='zh' 返回 zh，否则返回 en
 * 参数可为字符串或字符串数组
 */
function i18n(zh, en) { return RETRO_LANG === 'zh' ? zh : en; }

/**
 * 在 Canvas 底部绘制半透明操作说明栏
 * @param {CanvasRenderingContext2D} cx
 * @param {number} w  canvas 宽
 * @param {number} h  canvas 高
 * @param {string[]} lines  第0行为标题(黄色)，其余为内容(灰色)
 */
function drawHint(cx, w, h, lines) {
  const lh = 11, pad = 4;
  const bh = lines.length * lh + pad * 2;
  cx.save();
  cx.fillStyle = 'rgba(0,0,0,0.72)';
  cx.fillRect(0, h - bh, w, bh);
  lines.forEach((ln, i) => {
    cx.font = i === 0 ? 'bold 8px monospace' : '8px monospace';
    cx.fillStyle = i === 0 ? '#ffd600' : '#bbb';
    cx.textAlign = 'left';
    cx.textBaseline = 'top';
    cx.fillText(ln, pad + 2, h - bh + pad + i * lh);
  });
  cx.restore();
}
