// KLE（keyboard-layout-editor）形式のパースとレイアウトオプション適用（純粋ロジック）

export function parseKLE(rows){
  const keys=[]; let y=0, r=0, rx=0, ry=0;
  for(const row of rows){
    if(!Array.isArray(row)) continue;
    let x=rx, w=1, h=1, dec=false;
    for(const it of row){
      if(typeof it==='object' && it!==null){
        if(it.r!==undefined) r=it.r;
        if(it.rx!==undefined){ rx=it.rx; x=rx; }
        if(it.ry!==undefined){ ry=it.ry; y=ry; }
        if(it.x) x+=it.x;
        if(it.y) y+=it.y;
        if(it.w) w=it.w;
        if(it.h) h=it.h;
        if(it.d) dec=true;
      }else{
        const parts=String(it).split('\n');
        const mm=(parts[0]||'').split(',').map(n=>parseInt(n,10));
        const op=parts[3]?parts[3].split(',').map(n=>parseInt(n,10)):null;
        if(!dec && mm.length===2 && !isNaN(mm[0]) && !isNaN(mm[1]))
          keys.push({x,y,w,h,r,rx,ry,row:mm[0],col:mm[1],opt:op});
        else if(op)
          // マトリクス割り当てのないオプション付きキー＝位置合わせ用スペーサー。
          // 描画はしないが、オプション群のバウンディングボックス計算には必要（例: Keyball61のLeft）
          keys.push({x,y,w,h,r,rx,ry,row:-1,col:-1,opt:op,ghost:true});
        x+=w; w=1; h=1; dec=false;
      }
    }
    y+=1;
  }
  return keys;
}

// レイアウトオプション（例: トラックボール左右など）の選択を適用。
// 選択したオプションのキー群は、オプション0の位置（バウンディングボックス左上）へ平行移動する（VIAと同じ挙動）
export function applyLayout(allKeys, sel){
  const groups={};
  allKeys.forEach(k=>{
    if(k.opt&&k.opt.length>=2){ const [g,o]=k.opt; (groups[g]??={}); (groups[g][o]??=[]).push(k); }
  });
  const out=[];
  for(const k of allKeys){
    if(k.ghost) continue;                    // スペーサーは位置合わせ専用。描画しない
    if(!k.opt||k.opt.length<2){ out.push(k); continue; }
    const [g,o]=k.opt;
    if((sel[g]??0)!==o) continue;
    if(o===0){ out.push(k); continue; }
    const base=groups[g][0], own=groups[g][o];  // bboxはスペーサー込みで計算する
    if(!base||!base.length){ out.push(k); continue; }
    const dx=Math.min(...base.map(b=>b.x))-Math.min(...own.map(b=>b.x));
    const dy=Math.min(...base.map(b=>b.y))-Math.min(...own.map(b=>b.y));
    out.push({...k, x:k.x+dx, y:k.y+dy, rx:k.rx+dx, ry:k.ry+dy});
  }
  return out;
}
