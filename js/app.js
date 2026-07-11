// アプリ本体: 状態・DOM描画・定義インポート・練習エンジン・イベント配線
import { KC, kcLabel, kcSub, hex, hex4 } from './keycodes.js';
import { parseKLE, applyLayout } from './kle.js';
import { computeCharMap } from './charmap.js';
import { pickWords, genHome, genSymbols } from './textgen.js';
import { CODE_SOURCES, BUILTIN_CODE, toRawUrl, fetchCode, stripComments, extractSnippet } from './snippets.js';
import { VIA_FILTER, isViaDevice, getProtocolVersion, getLayerCount, readKeymapRaw } from './via.js';
import { DEF_REGISTRY } from './registry.js';
import { DEMO_DEF, DEMO_KEYMAP } from './demo.js';

/* ============================== 状態 ============================== */
let device=null, def=null, keys=[], keymap=[], layerCount=0, curLayer=0;
let keyEls=[], charMap={}, shiftKeyIdx=[], layerKeyIdx={};
const $=id=>document.getElementById(id);
const statusEl=$('status');
function status(msg,isErr){ statusEl.innerHTML=msg; statusEl.classList.toggle('err',!!isErr); }
function esc(s){ return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function buildCharMap(){
  ({charMap, shiftKeyIdx, layerKeyIdx}=computeCharMap(keys, keymap, layerCount));
}

/* ============================== 接続 / キーマップ読み取り ============================== */
function updateConnUI(){
  $('btnConnect').classList.toggle('hidden',!!device);
  $('btnDisconnect').classList.toggle('hidden',!device);
}
async function connect(){
  if(!navigator.hid){ status('このブラウザはWebHID非対応です。Chrome / Edge で開いてください。',true); return; }
  try{
    const ds=await navigator.hid.requestDevice({filters:[VIA_FILTER]});
    const dev=ds.find(isViaDevice);
    if(!dev){ status('デバイスが選択されませんでした。',true); return; }
    try{ localStorage.removeItem('remapTyping.noauto'); }catch(e){}
    await attach(dev);
  }catch(e){ status('接続エラー: '+e.message,true); }
}
async function disconnect(){
  if(!device) return;
  const name=device.productName;
  try{ await device.close(); }catch(e){}
  device=null;
  try{ localStorage.setItem('remapTyping.noauto','1'); }catch(e){}  // 手動解除後は自動再接続しない
  updateConnUI();
  status(`<b>${esc(name)}</b> の接続を解除しました。読み込み済みのキーマップはそのまま使えます（練習も可能）。`);
}
function defGuide(dev){
  const q=encodeURIComponent((dev.productName||'')+' via.json');
  return `定義JSONを読み込んでください（VID ${hex4(dev.vendorId)} / PID ${hex4(dev.productId)}）。`+
    `入手先: <a href="https://remap-keys.app/catalog" target="_blank" rel="noopener">Remapカタログ</a> / `+
    `<a href="https://github.com/search?q=${q}&type=code" target="_blank" rel="noopener">GitHub検索</a>`;
}
async function attach(dev){
  if(!dev.opened) await dev.open();
  device=dev;
  updateConnUI();
  const proto=await getProtocolVersion(dev);
  layerCount=await getLayerCount(dev);
  // 定義がない、またはVID/PIDが接続機と食い違う場合はレジストリから自動取得
  const mismatch=def&&def.vendorId!=null&&(def.vendorId!==dev.vendorId||def.productId!==dev.productId);
  if(!def||mismatch){
    const hit=DEF_REGISTRY.find(r=>r.vid===dev.vendorId&&r.pid===dev.productId);
    if(hit){
      try{
        const res=await fetch(hit.url);
        if(res.ok){
          const j=await res.json();
          setDefinition(j);
          try{ localStorage.setItem('remapTyping.def', JSON.stringify(j)); }catch(e){}
          status(`接続: <b>${esc(dev.productName)}</b> — 定義 <b>${esc(def.name)}</b> を自動取得しました`);
        }
      }catch(e){}
    }
  }
  if(def&&!(def.vendorId!=null&&(def.vendorId!==dev.vendorId||def.productId!==dev.productId))){
    status(`接続: <b>${esc(dev.productName)}</b> (VIA protocol v${proto} / ${layerCount}レイヤー)`);
    await readKeymap();
  }else if(def){
    status(`接続: <b>${esc(dev.productName)}</b> — 読み込み済みの定義 <b>${esc(def.name)}</b> はこのキーボード用ではない可能性があります。`+defGuide(dev),true);
    await readKeymap();
  }else{
    status(`接続: <b>${esc(dev.productName)}</b> (VIA protocol v${proto} / ${layerCount}レイヤー) — `+defGuide(dev));
  }
}
async function readKeymap(){
  status('キーマップ読み取り中…');
  try{
    keymap=await readKeymapRaw(device, layerCount, def.matrix.rows, def.matrix.cols);
  }catch(e){
    status('キーマップ読み取り失敗: '+esc(e.message),true);
    return;
  }
  status(`接続: <b>${esc(device.productName)}</b> / 定義: <b>${esc(def.name)}</b> — キーマップ読み取り完了`);
  onKeymapReady();
}

/* ============================== 定義JSON ============================== */
function setDefinition(json){
  if(!json.matrix || !json.layouts || !json.layouts.keymap) throw new Error('VIA定義JSONの形式ではありません（matrix / layouts.keymap が必要）');
  const num=v=>v==null?null:(typeof v==='number'?v:parseInt(v,16));
  def={name:json.name||'キーボード', matrix:{rows:+json.matrix.rows, cols:+json.matrix.cols},
       vendorId:num(json.vendorId), productId:num(json.productId),
       labels:json.layouts.labels||[], allKeys:parseKLE(json.layouts.keymap), sel:{}};
  $('importBar').classList.add('hidden');
  $('btnChangeDef').classList.remove('hidden');
  try{ const s=localStorage.getItem('remapTyping.layout.'+def.name); if(s) def.sel=JSON.parse(s)||{}; }catch(e){}
  keys=applyLayout(def.allKeys, def.sel);
  renderLayoutOpts();
}
function loadDef(json){
  setDefinition(json);
  try{ localStorage.setItem('remapTyping.def', JSON.stringify(json)); }catch(e){}
  if(device){ readKeymap(); }
  else{
    keymap=[]; layerCount=0;
    status(`定義: <b>${esc(def.name)}</b> を読み込みました — キーボードを接続するとキーマップを表示します`);
    renderBoard(); renderTabs();
  }
}
function renderLayoutOpts(){
  const box=$('layoutOpts'); box.innerHTML='';
  const groups={};
  (def?.allKeys||[]).forEach(k=>{
    if(k.opt&&k.opt.length>=2){ const [g,o]=k.opt; (groups[g]??=new Set()).add(o); }
  });
  const gids=Object.keys(groups).map(Number).filter(g=>groups[g].size>1).sort((a,b)=>a-b);
  box.classList.toggle('hidden',!gids.length);
  gids.forEach(g=>{
    const lab=def.labels?.[g];
    const name=Array.isArray(lab)?lab[0]:(typeof lab==='string'?lab:'レイアウト '+g);
    const optNames=Array.isArray(lab)?lab.slice(1):null;
    const wrap=document.createElement('label');
    wrap.appendChild(document.createTextNode(name));
    const sel=document.createElement('select');
    // 選択肢はラベル定義を優先（キーを持たないオプション、例: Keyballの"Dual"も選べるように）
    const optIds=optNames?optNames.map((_,i)=>i):[...groups[g]].sort((a,b)=>a-b);
    optIds.forEach(o=>{
      const opt=document.createElement('option');
      opt.value=o;
      opt.textContent=optNames?.[o] ?? (typeof lab==='string'?(o===0?'オフ':'オン'):'オプション '+o);
      sel.appendChild(opt);
    });
    if(!optIds.includes(def.sel[g]??0)) def.sel[g]=optIds[0];
    sel.value=String(def.sel[g]??0);
    sel.addEventListener('change',()=>{
      def.sel[g]=+sel.value;
      try{ localStorage.setItem('remapTyping.layout.'+def.name, JSON.stringify(def.sel)); }catch(e){}
      keys=applyLayout(def.allKeys, def.sel);
      renderBoard();
      if(keymap.length){ buildCharMap(); if(practice.active) highlightNext(); }
    });
    wrap.appendChild(sel);
    box.appendChild(wrap);
  });
}
function resetDefinition(){
  try{
    localStorage.removeItem('remapTyping.def');
    for(let i=localStorage.length-1;i>=0;i--){        // レイアウトオプションの選択も削除
      const k=localStorage.key(i);
      if(k&&k.indexOf('remapTyping.layout.')===0) localStorage.removeItem(k);
    }
  }catch(e){}
  if(practice.active) stopPractice(false);
  def=null; keys=[]; keymap=[]; layerCount=0; curLayer=0; charMap={};
  $('btnStart').disabled=true;
  $('layoutOpts').classList.add('hidden');
  $('layerTabs').innerHTML='';
  $('board').innerHTML='<div class="board-empty">キーボードを接続し、対応する <code>VIA定義JSON</code> を読み込むとキーマップがここに表示されます。まずは「デモ」で試すこともできます。</div>';
  $('board').style.width=''; $('board').style.height='';
  $('importBar').classList.remove('hidden');
  $('btnChangeDef').classList.add('hidden');
  $('target').innerHTML='<span class="idle">キーマップを読み込むと練習を開始できます。押すべきキーが上のキーボードにハイライトされます。</span>';
  status('保存済みの定義とレイアウト設定を削除しました。'+(device?'接続中のキーボードが対応機種なら、いったん解除して接続し直すと自動取得できます。':''));
}

/* ============================== 描画 ============================== */
const U=52;
function renderBoard(){
  const board=$('board');
  board.innerHTML=''; keyEls=[];
  if(!keys.length){ board.style.width=''; board.style.height=''; return; }
  let maxX=0,maxY=0;
  for(const k of keys){ maxX=Math.max(maxX,k.x+k.w); maxY=Math.max(maxY,k.y+k.h); }
  board.style.width=(maxX*U+4)+'px'; board.style.height=(maxY*U+8)+'px';
  keys.forEach(k=>{
    const el=document.createElement('div');
    el.className='key';
    el.style.left=(k.x*U+2)+'px'; el.style.top=(k.y*U+2)+'px';
    el.style.width=(k.w*U-6)+'px'; el.style.height=(k.h*U-8)+'px';
    if(k.r){ el.style.transformOrigin=((k.rx-k.x)*U)+'px '+((k.ry-k.y)*U)+'px'; el.style.transform='rotate('+k.r+'deg)'; }
    el.innerHTML='<span class="main"></span><span class="sub"></span>';
    board.appendChild(el);
    keyEls.push(el);
  });
  paintLayer();
}
function renderTabs(){
  const tabs=$('layerTabs'); tabs.innerHTML='';
  for(let i=0;i<layerCount;i++){
    const b=document.createElement('button');
    b.textContent='Layer '+i;
    b.className=i===curLayer?'active':'';
    b.addEventListener('click',()=>{curLayer=i; renderTabs(); paintLayer();});
    tabs.appendChild(b);
  }
}
function paintLayer(){
  keys.forEach((k,i)=>{
    const code=keymap[curLayer]?.[k.row]?.[k.col];
    const el=keyEls[i];
    el.querySelector('.main').textContent = code===undefined ? k.row+','+k.col : kcLabel(code);
    el.querySelector('.sub').textContent = code===undefined ? '' : kcSub(code);
    el.title = code===undefined ? '' : hex(code)+' (matrix '+k.row+','+k.col+')';
    // 文字を出力するキー=アルファ色、それ以外（モディファイア・レイヤーキー等）とスペースはモッド色
    const b=code!==undefined?KC[code]:null;
    el.classList.toggle('mod', code===undefined || !(b&&b.ch!=null) || code===0x2c);
  });
}
function onKeymapReady(){
  curLayer=0;
  renderBoard(); renderTabs(); buildCharMap();
  $('btnStart').disabled=false;
  if(!practice.active){
    $('target').innerHTML='<span class="idle">準備OK。モードを選んで「スタート」を押してください。</span>';
  }
}

/* ============================== 練習エンジン ============================== */
const practice={active:false,target:'',pos:0,miss:0,start:0,timer:null};
async function getCodeText(){
  const sel=$('codeSource').value;
  const url=sel==='url'?toRawUrl($('codeUrl').value.trim()):sel;
  if(!url){ $('hint').textContent='GitHubのファイルURLを入力してください。'; return null; }
  $('hint').textContent='コードを取得中…';
  try{
    const ext=(url.split(/[?#]/)[0].split('.').pop()||'').toLowerCase();
    const text=stripComments(await fetchCode(url), ext);
    const snip=extractSnippet(text, charMap);
    if(snip){
      if(snip.partial) status('注: この断片には現在のキーマップから見つからない文字が含まれます（ハイライトなしでも判定はされます）');
      return snip.text;
    }
    $('hint').textContent='このファイルから練習に適した断片を切り出せませんでした。別のソースを試してください。';
    return null;
  }catch(e){
    $('hint').textContent='取得に失敗しました（'+e.message+'）。オフラインの場合はビルトインの断片で練習します。';
    return BUILTIN_CODE;
  }
}
async function startPractice(){
  const mode=$('mode').value;
  let text='';
  if(mode==='words') text=pickWords(16);
  else if(mode==='home') text=genHome(keys, keymap);
  else if(mode==='symbols') text=genSymbols(charMap);
  else if(mode==='code'){
    $('btnStart').disabled=true;
    text=await getCodeText();
    $('btnStart').disabled=false;
    if(!text) return;
  }
  else{
    text=$('customText').value.replace(/[^\S\n]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
    if(!text){ $('hint').textContent='カスタムテキストを入力してください。'; return; }
  }
  $('target').classList.toggle('code',mode==='code'||/\n/.test(text));
  practice.active=true; practice.target=text; practice.pos=0; practice.miss=0; practice.start=0;
  if(document.activeElement&&document.activeElement.blur) document.activeElement.blur();
  $('resultBox').classList.add('hidden');
  $('btnStart').classList.add('hidden'); $('btnStop').classList.remove('hidden');
  curLayer=0; renderTabs(); paintLayer();
  renderTarget(); highlightNext(); updateStats();
  if(practice.timer) clearInterval(practice.timer);
  practice.timer=setInterval(updateStats,250);
}
function stopPractice(finished){
  practice.active=false;
  if(practice.timer){ clearInterval(practice.timer); practice.timer=null; }
  $('btnStart').classList.remove('hidden'); $('btnStop').classList.add('hidden');
  clearHighlights();
  if(finished){
    const sec=(performance.now()-practice.start)/1000;
    const wpm=Math.round(practice.target.length/5/(sec/60));
    const acc=Math.round(practice.target.length/(practice.target.length+practice.miss)*1000)/10;
    const rb=$('resultBox');
    rb.classList.remove('hidden');
    rb.innerHTML=`<span class="big">${wpm} WPM</span>`+
      `<span>正確率 <b>${acc}%</b> ・ ${sec.toFixed(1)}秒 ・ ミス ${practice.miss}回</span>`;
    $('target').innerHTML='<span class="idle">おつかれさまでした。「スタート」でもう一度。</span>';
    $('hint').textContent='';
  }
}
function renderTarget(){
  const t=$('target');
  t.innerHTML='';
  practice.target.split('').forEach((c,i)=>{
    const s=document.createElement('span');
    s.textContent=c==='\n'?'⏎\n':c;
    if(i<practice.pos) s.className='done';
    else if(i===practice.pos) s.className='cur';
    t.appendChild(s);
  });
}
function advance(){
  const t=$('target'), spans=t.children;
  spans[practice.pos].className='done';
  practice.pos++;
  const prev=practice.target[practice.pos-1];
  if(prev==='\n'||prev===' '){  // 行頭インデントは自動スキップ、連続スペースはスペース1回でまとめて通過
    while(practice.pos<practice.target.length && practice.target[practice.pos]===' '){
      spans[practice.pos].className='done';
      practice.pos++;
    }
  }
  if(practice.pos>=practice.target.length){ updateStats(); stopPractice(true); return; }
  spans[practice.pos].className='cur';
  spans[practice.pos].scrollIntoView({block:'nearest'});
  highlightNext();
}
function clearHighlights(){
  keyEls.forEach(el=>el.classList.remove('hl-next','hl-shift'));
  $('hint').textContent='';
}
function highlightNext(){
  clearHighlights();
  const ch=practice.target[practice.pos];
  const m=charMap[ch];
  if(!m){ $('hint').innerHTML=`次の文字 <b>${esc(ch==='\n'?'Enter':ch)}</b> はキーマップに見つかりません（そのまま入力すれば判定はされます）`; return; }
  if(curLayer!==m.layer){ curLayer=m.layer; renderTabs(); paintLayer(); }  // 対象レイヤーの表示に切替
  keyEls[m.i].classList.add('hl-next');
  const parts=[];
  if(m.layer>0){
    const lk=layerKeyIdx[m.layer];
    if(lk!=null&&lk!==m.i){ keyEls[lk].classList.add('hl-shift'); parts.push(kcLabel(keymap[0][keys[lk].row][keys[lk].col])); }
  }
  parts.push(ch==='\n'?'Enter':(kcLabel(keymap[m.layer][keys[m.i].row][keys[m.i].col])||'Space'));
  if(m.shift){
    shiftKeyIdx.forEach(i=>{ if(i!==m.i) keyEls[i].classList.add('hl-shift'); });
    parts.push('Shift');
  }
  $('hint').innerHTML='次のキー: '+parts.map(p=>`<b>${esc(p)}</b>`).join(' + ');
}
function flashKey(ch,ok){
  const m=charMap[ch]; if(!m) return;
  const el=keyEls[m.i], cls=ok?'flash-ok':'flash-bad';
  el.classList.add(cls);
  setTimeout(()=>el.classList.remove(cls),140);
}
function updateStats(){
  const sec=practice.start?(performance.now()-practice.start)/1000:0;
  const wpm=sec>1?Math.round(practice.pos/5/(sec/60)):0;
  const total=practice.pos+practice.miss;
  const acc=total?Math.round(practice.pos/total*1000)/10:100;
  $('stWpm').textContent=wpm;
  $('stAcc').innerHTML=acc+'<span class="u">%</span>';
  $('stTime').innerHTML=sec.toFixed(1)+'<span class="u">s</span>';
  $('stMiss').textContent=practice.miss;
}
window.addEventListener('keydown',e=>{
  if(!practice.active) return;
  const tag=e.target.tagName;
  if(tag==='TEXTAREA'||tag==='INPUT'||tag==='SELECT') return;
  if(e.key==='Escape'){ stopPractice(false); return; }
  if(e.ctrlKey||e.metaKey||e.altKey) return;
  const key=e.key==='Enter'?'\n':e.key;
  if(key.length!==1) { if(e.key==='Tab') e.preventDefault(); return; }
  e.preventDefault();
  if(!practice.start){ practice.start=performance.now(); }
  const expected=practice.target[practice.pos];
  if(key===expected){
    flashKey(key,true);
    advance();
  }else{
    practice.miss++;
    flashKey(key,false);
    const cur=$('target').children[practice.pos];
    if(cur){ cur.classList.add('miss'); setTimeout(()=>cur.classList.remove('miss'),200); }
  }
  updateStats();
});

/* ============================== デモ ============================== */
function loadDemo(){
  if(device){ try{ device.close(); }catch(e){} }
  device=null;
  updateConnUI();
  def={name:DEMO_DEF.name,matrix:DEMO_DEF.matrix,labels:[],allKeys:parseKLE(DEMO_DEF.layouts.keymap),sel:{}};
  keys=applyLayout(def.allKeys,def.sel); renderLayoutOpts();
  $('importBar').classList.add('hidden');
  $('btnChangeDef').classList.remove('hidden');
  keymap=DEMO_KEYMAP; layerCount=2;
  status('デモモード: <b>Demo 60% (ANSI)</b> — 実機なしでUIと練習を試せます');
  onKeymapReady();
}

/* ============================== 定義インポート: URL / D&D / 貼り付け ============================== */
async function importDefFromUrl(){
  const u=$('defUrl').value.trim();
  if(!u){ status('via.json のURLを入力してください',true); return; }
  status('定義を取得中…');
  try{
    const res=await fetch(toRawUrl(u));
    if(!res.ok) throw new Error('HTTP '+res.status);
    loadDef(await res.json());
    $('defUrl').value='';
  }catch(e){
    status('取得失敗: '+esc(e.message)+' — github.com のファイルページURL、または raw.githubusercontent.com のURLを貼ってください',true);
  }
}
window.addEventListener('dragover',e=>{
  if(e.dataTransfer&&[...e.dataTransfer.types].includes('Files')){
    e.preventDefault();
    document.body.classList.add('dragging');
  }
});
window.addEventListener('dragleave',e=>{ if(!e.relatedTarget) document.body.classList.remove('dragging'); });
window.addEventListener('drop',async e=>{
  e.preventDefault();
  document.body.classList.remove('dragging');
  const f=[...(e.dataTransfer?.files||[])].find(f=>/\.json$/i.test(f.name)||(f.type||'').includes('json'));
  if(!f){ status('JSONファイルをドロップしてください',true); return; }
  try{ loadDef(JSON.parse(await f.text())); }
  catch(err){ status('定義JSONの読み込みに失敗: '+esc(err.message),true); }
});
window.addEventListener('paste',e=>{
  const tag=e.target.tagName;
  if(tag==='TEXTAREA'||tag==='INPUT') return;
  const t=e.clipboardData?.getData('text');
  if(!t) return;
  let j; try{ j=JSON.parse(t); }catch(err){ return; }  // JSON以外の貼り付けは無視
  try{ loadDef(j); }
  catch(err){ status('貼り付けたJSONの読み込みに失敗: '+esc(err.message),true); }
});

/* ============================== イベント配線 ============================== */
$('btnConnect').addEventListener('click',connect);
$('btnDisconnect').addEventListener('click',disconnect);
$('btnDemo').addEventListener('click',loadDemo);
$('btnDef').addEventListener('click',()=>$('fileDef').click());
$('fileDef').addEventListener('change',async e=>{
  const f=e.target.files[0]; if(!f) return;
  try{ loadDef(JSON.parse(await f.text())); }
  catch(err){ status('定義JSONの読み込みに失敗: '+esc(err.message),true); }
  e.target.value='';
});
$('btnStart').addEventListener('click',startPractice);
$('btnStop').addEventListener('click',()=>stopPractice(false));
$('btnDefUrl').addEventListener('click',importDefFromUrl);
$('defUrl').addEventListener('keydown',e=>{ if(e.key==='Enter') importDefFromUrl(); });
$('btnChangeDef').addEventListener('click',()=>{
  $('importBar').classList.toggle('hidden');
});
$('btnResetDef').addEventListener('click',resetDefinition);
$('mode').addEventListener('change',()=>{
  const m=$('mode').value;
  $('customText').classList.toggle('hidden',m!=='custom');
  $('codeSource').classList.toggle('hidden',m!=='code');
  $('codeUrl').classList.toggle('hidden',m!=='code'||$('codeSource').value!=='url');
});
(()=>{ // OSSコードのソース一覧
  const sel=$('codeSource');
  CODE_SOURCES.forEach(s=>{
    const o=document.createElement('option');
    o.value=s.url; o.textContent=s.label;
    sel.appendChild(o);
  });
  const o=document.createElement('option');
  o.value='url'; o.textContent='GitHub URLを指定…';
  sel.appendChild(o);
  sel.addEventListener('change',()=>{
    $('codeUrl').classList.toggle('hidden',sel.value!=='url');
  });
})();
// 前回の定義を復元 / 許可済みデバイスへ自動再接続
(async()=>{
  try{
    const saved=localStorage.getItem('remapTyping.def');
    if(saved){
      setDefinition(JSON.parse(saved));
      status(`前回の定義 <b>${esc(def.name)}</b> を復元しました — キーボードを接続してください`);
      renderBoard();
    }
  }catch(e){}
  try{
    if(navigator.hid){
      let noauto=false;
      try{ noauto=localStorage.getItem('remapTyping.noauto')==='1'; }catch(e){}
      if(!noauto){
        const ds=await navigator.hid.getDevices();
        const dev=ds.find(isViaDevice);
        if(dev) await attach(dev);
      }
      navigator.hid.addEventListener('disconnect',ev=>{
        if(ev.device===device){ device=null; updateConnUI(); status('キーボードが切断されました。',true); }
      });
    }
  }catch(e){}
})();
