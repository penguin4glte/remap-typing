// 練習テキスト生成（純粋ロジック）
import { KC } from './keycodes.js';

const WORDS=('the and for are but not you all can had her was one our out day get has him his how man new now old see two way who did its let put say she too use that with have this will your from they know want been good much some time very when come here just like long make many over such take than them well were work year about after again could first found great house large learn never other place point right small sound still study think under water where world write people before should because through between remap keyboard layer typing practice matrix firmware switch keycap').split(' ');

export function pickWords(n){
  const out=[];
  for(let i=0;i<n;i++) out.push(WORDS[Math.floor(Math.random()*WORDS.length)]);
  return out.join(' ');
}

function homeRowChars(keys, keymap){
  // レイアウト3段目（y≈2）のキーから、キーマップ上の文字を拾う
  const chs=[];
  keys.forEach(k=>{
    if(k.y>=1.9&&k.y<3){
      const b=KC[keymap[0]?.[k.row]?.[k.col]??0];
      if(b&&b.ch&&/^[a-z;,.\/'-]$/.test(b.ch)) chs.push(b.ch);
    }
  });
  return chs.length>=5?chs:'asdfghjkl;'.split('');
}

export function genHome(keys, keymap){
  const chs=homeRowChars(keys, keymap), out=[];
  for(let g=0; g<14; g++){
    let s='';
    const len=3+Math.floor(Math.random()*3);
    for(let j=0;j<len;j++) s+=chs[Math.floor(Math.random()*chs.length)];
    out.push(s);
  }
  return out.join(' ');
}

export function genSymbols(charMap){
  const pool=Object.keys(charMap).filter(c=>/^[0-9!-\/:-@\[-`{-~]$/.test(c));
  if(!pool.length) return pickWords(12);
  const out=[];
  for(let g=0; g<14; g++){
    let s='';
    const len=3+Math.floor(Math.random()*3);
    for(let j=0;j<len;j++) s+=pool[Math.floor(Math.random()*pool.length)];
    out.push(s);
  }
  return out.join(' ');
}
