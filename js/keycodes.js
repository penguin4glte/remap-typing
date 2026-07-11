// QMKキーコード表とラベル/文字変換（純粋ロジック・DOM非依存）

export const KC = {};
"abcdefghijklmnopqrstuvwxyz".split('').forEach((c,i)=>KC[0x04+i]={label:c.toUpperCase(),ch:c,sh:c.toUpperCase()});
[['1','!'],['2','@'],['3','#'],['4','$'],['5','%'],['6','^'],['7','&'],['8','*'],['9','('],['0',')']]
  .forEach((d,i)=>KC[0x1e+i]={label:d[0],ch:d[0],sh:d[1],sub:d[1]});
const PUNCT = {0x2d:['-','_'],0x2e:['=','+'],0x2f:['[','{'],0x30:[']','}'],0x31:['\\','|'],0x32:['#','~'],
  0x33:[';',':'],0x34:["'",'"'],0x35:['`','~'],0x36:[',','<'],0x37:['.','>'],0x38:['/','?'],0x64:['\\','|']};
for(const [code,p] of Object.entries(PUNCT)) KC[code]={label:p[0],ch:p[0],sh:p[1],sub:p[1]};
KC[0x2c]={label:'',ch:' ',sh:' '};
const NAMED = {0x28:'Enter',0x29:'Esc',0x2a:'Bksp',0x2b:'Tab',0x39:'Caps',
  0x46:'PrtSc',0x47:'ScrLk',0x48:'Pause',0x49:'Ins',0x4a:'Home',0x4b:'PgUp',0x4c:'Del',0x4d:'End',0x4e:'PgDn',
  0x4f:'→',0x50:'←',0x51:'↓',0x52:'↑',0x53:'NumLk',0x65:'App',0x66:'Power',
  0x85:'KP,',0x87:'ろ',0x88:'かな',0x89:'¥',0x8a:'変換',0x8b:'無変換',0x90:'かな',0x91:'英数',
  0xe0:'LCtl',0xe1:'LSft',0xe2:'LAlt',0xe3:'LGui',0xe4:'RCtl',0xe5:'RSft',0xe6:'RAlt',0xe7:'RGui'};
for(const [code,l] of Object.entries(NAMED)) KC[code]={label:l};
for(let i=0;i<12;i++) KC[0x3a+i]={label:'F'+(i+1)};
for(let i=0;i<12;i++) KC[0x68+i]={label:'F'+(i+13)};
const KP={0x54:'/',0x55:'*',0x56:'-',0x57:'+',0x58:'Ent',0x63:'.'};
for(const [code,l] of Object.entries(KP)) KC[code]={label:'KP'+l};
for(let i=0;i<9;i++) KC[0x59+i]={label:'KP'+(i+1)};
KC[0x62]={label:'KP0'};

export function modStr(mods){
  const r = mods & 0x10;
  let s = '';
  if(mods&0x01) s+='C'; if(mods&0x02) s+='S'; if(mods&0x04) s+='A'; if(mods&0x08) s+='G';
  return (r?'R':'')+s;
}
function baseLabel(code){ return KC[code] ? (KC[code].label || 'Spc') : hex(code); }
export function hex(c){ return '0x'+c.toString(16).toUpperCase().padStart(4,'0'); }
export function hex4(n){ return '0x'+(n??0).toString(16).toUpperCase().padStart(4,'0'); }
export function kcLabel(code){
  if(code===0x0000) return '';
  if(code===0x0001) return '▽';
  if(KC[code]) return code===0x2c ? 'Space' : KC[code].label;
  if(code>=0x0100&&code<=0x1fff){
    const mods=(code>>8)&0x1f, base=code&0xff;
    // Shiftのみ + シフト文字を持つベースキー → 出力される文字そのものをラベルにする（例: LSFT(KC_LBRC) → "{"）
    if((mods&0x0f)===0x02&&KC[base]&&KC[base].sh!=null&&KC[base].sh!==KC[base].ch) return KC[base].sh;
    return modStr(mods)+'('+baseLabel(base)+')';
  }
  if(code>=0x2000&&code<=0x3fff) return modStr((code>>8)&0x1f)+'_T '+baseLabel(code&0xff);
  if(code>=0x4000&&code<=0x4fff) return 'LT'+((code>>8)&0xf)+' '+baseLabel(code&0xff);
  if(code>=0x5000&&code<=0x50ff) return 'LM'+((code>>4)&0xf);
  if(code>=0x5200&&code<=0x521f) return 'TO('+(code-0x5200)+')';
  if(code>=0x5220&&code<=0x523f) return 'MO('+(code-0x5220)+')';
  if(code>=0x5240&&code<=0x525f) return 'DF('+(code-0x5240)+')';
  if(code>=0x5260&&code<=0x527f) return 'TG('+(code-0x5260)+')';
  if(code>=0x5280&&code<=0x529f) return 'OSL('+(code-0x5280)+')';
  if(code>=0x52a0&&code<=0x52bf) return 'OSM';
  if(code>=0x52c0&&code<=0x52df) return 'TT('+(code-0x52c0)+')';
  if(code===0x7c00) return 'BOOT';
  return hex(code);
}
export function kcSub(code){ return KC[code] && KC[code].sub ? KC[code].sub : ''; }
