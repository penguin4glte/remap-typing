// 文字 → 物理キーの逆引き表を全レイヤーから構築（純粋ロジック）
// 戻り値: { charMap: {文字:{i,shift,layer}}, shiftKeyIdx: [キー番号], layerKeyIdx: {レイヤー:キー番号} }
import { KC } from './keycodes.js';

export function computeCharMap(keys, keymap, layerCount){
  const charMap={}, shiftKeyIdx=[], layerKeyIdx={};
  keys.forEach((k,i)=>{ // レイヤー0からShiftキーとレイヤー移動キーを収集
    const code=keymap[0]?.[k.row]?.[k.col] ?? 0;
    if(code===0xe1||code===0xe5) shiftKeyIdx.push(i);
    if(code>=0x2000&&code<=0x3fff&&((code>>8)&0x02)) shiftKeyIdx.push(i);  // Shiftのモッドタップ
    let ln=-1;
    if(code>=0x5220&&code<=0x523f) ln=code-0x5220;         // MO(n)
    else if(code>=0x52c0&&code<=0x52df) ln=code-0x52c0;    // TT(n)
    else if(code>=0x5280&&code<=0x529f) ln=code-0x5280;    // OSL(n)
    else if(code>=0x4000&&code<=0x4fff) ln=(code>>8)&0xf;  // LT(n)
    if(ln>0 && ln<layerCount && !(ln in layerKeyIdx)) layerKeyIdx[ln]=i;
  });
  const put=(ch,i,shift,layer)=>{ if(ch!=null && !(ch in charMap)) charMap[ch]={i,shift,layer}; };
  const layersToScan=[0,...Object.keys(layerKeyIdx).map(Number)];
  const isShiftOnly=code=>code>=0x0100&&code<=0x1fff&&(((code>>8)&0x0f)===0x02);
  for(const L of layersToScan){ // 優先度1: 素の文字（レイヤー0を最優先）
    keys.forEach((k,i)=>{
      const code=keymap[L]?.[k.row]?.[k.col] ?? 0;
      const b=KC[code];
      if(b&&b.ch!=null) put(b.ch,i,false,L);
      if(code===0x28) put('\n',i,false,L);
      if(L===0&&code>=0x2000&&code<=0x4fff){ // MT/LTのタップ側
        const t=KC[code&0xff]; if(t&&t.ch!=null) put(t.ch,i,false,0);
        if((code&0xff)===0x28) put('\n',i,false,0);
      }
    });
  }
  for(const L of layersToScan){ // 優先度2: Shift済み専用キー（LSFT(kc)割り当て。例: "{" 専用キー）
    keys.forEach((k,i)=>{
      const code=keymap[L]?.[k.row]?.[k.col] ?? 0;
      if(isShiftOnly(code)){ const t=KC[code&0xff]; if(t&&t.sh!=null) put(t.sh,i,false,L); }
    });
  }
  for(const L of layersToScan){ // 優先度3: Shift+ベースキーの組み合わせ（フォールバック）
    keys.forEach((k,i)=>{
      const code=keymap[L]?.[k.row]?.[k.col] ?? 0;
      const b=KC[code];
      if(b&&b.sh!=null&&b.sh!==b.ch) put(b.sh,i,true,L);
      if(L===0&&code>=0x2000&&code<=0x4fff){ const t=KC[code&0xff]; if(t&&t.sh!=null&&t.sh!==t.ch) put(t.sh,i,true,0); }
    });
  }
  return {charMap, shiftKeyIdx, layerKeyIdx};
}
