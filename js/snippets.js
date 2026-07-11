// OSSコードの取得・コメント除去・練習用断片の切り出し（純粋ロジック + fetch）

export const CODE_SOURCES=[
  {label:'QMK Firmware (C)',url:'https://raw.githubusercontent.com/qmk/qmk_firmware/0.22.14/quantum/quantum.c'},
  {label:'React (JavaScript)',url:'https://raw.githubusercontent.com/facebook/react/v18.2.0/packages/react/src/ReactHooks.js'},
  {label:'lodash (JavaScript)',url:'https://raw.githubusercontent.com/lodash/lodash/4.17.21/lodash.js'},
  {label:'Redux (TypeScript)',url:'https://raw.githubusercontent.com/reduxjs/redux/v5.0.1/src/createStore.ts'},
  {label:'Flask (Python)',url:'https://raw.githubusercontent.com/pallets/flask/2.3.2/src/flask/app.py'},
  {label:'requests (Python)',url:'https://raw.githubusercontent.com/psf/requests/v2.31.0/requests/api.py'},
  {label:'Go 標準ライブラリ (Go)',url:'https://raw.githubusercontent.com/golang/go/go1.21.0/src/fmt/print.go'},
  {label:'serde (Rust)',url:'https://raw.githubusercontent.com/serde-rs/serde/v1.0.188/serde/src/lib.rs'},
  {label:'Linuxカーネル (C)',url:'https://raw.githubusercontent.com/torvalds/linux/v6.1/kernel/sys.c'},
];

export const BUILTIN_CODE=`function debounce(fn, wait) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  };
}`;

const codeCache={};

export function toRawUrl(u){
  return u.replace(/^https?:\/\/github\.com\/([^\/]+\/[^\/]+)\/blob\//,'https://raw.githubusercontent.com/$1/');
}

export async function fetchCode(url){
  if(codeCache[url]) return codeCache[url];
  const res=await fetch(url);
  if(!res.ok) throw new Error('HTTP '+res.status);
  const text=await res.text();
  codeCache[url]=text;
  return text;
}

// コメントを除去（文字列リテラル内のコメント風文字列は保護）
export function stripComments(text,ext){
  const lines=text.split('\n');
  const out=[];
  if(ext==='py'){
    let inDoc=null;
    for(let l of lines){
      if(inDoc){ const e=l.indexOf(inDoc); if(e<0) continue; l=l.slice(e+3); inDoc=null; }
      const t=l.trimStart();
      const m=t.match(/^("""|''')/);
      if(m){
        const rest=t.slice(3);
        if(rest.indexOf(m[1])<0){ inDoc=m[1]; continue; }
        l='';
      }else{
        let q=null,cut=-1;
        for(let i=0;i<l.length;i++){
          const c=l[i];
          if(q){ if(c==='\\'){i++;continue;} if(c===q)q=null; continue; }
          if(c==='"'||c==="'"){ q=c; continue; }
          if(c==='#'){ cut=i; break; }
        }
        if(cut>=0) l=l.slice(0,cut);
      }
      out.push(l.replace(/\s+$/,''));
    }
  }else{ // C / JS / TS / Go / Rust など: // と /* */
    let inBlock=false;
    for(const l of lines){
      let res='',i=0,q=null;
      while(i<l.length){
        const c=l[i];
        if(inBlock){ if(c==='*'&&l[i+1]==='/'){ inBlock=false; i+=2; }else i++; continue; }
        if(q){ res+=c; if(c==='\\'){ res+=l[i+1]??''; i+=2; continue; } if(c===q) q=null; i++; continue; }
        if(c==='"'||c==="'"||c==='`'){ q=c; res+=c; i++; continue; }
        if(c==='/'&&l[i+1]==='/') break;
        if(c==='/'&&l[i+1]==='*'){ inBlock=true; i+=2; continue; }
        res+=c; i++;
      }
      out.push(res.replace(/\s+$/,''));
    }
  }
  return out.join('\n').replace(/\n{3,}/g,'\n\n');
}

// 練習に適した断片を切り出す。charMapで全文字打てる断片を優先し、なければASCIIのみで妥協
export function extractSnippet(text, charMap){
  const lines=text.split('\n').map(l=>l.replace(/\t/g,'  ').replace(/\s+$/,''));
  const lineOk=l=>l.length<=100&&!/[^\x20-\x7e]/.test(l);
  const typeable=[], asciiOnly=[];        // 候補ウィンドウを全列挙してから選ぶ
  for(let s=0;s<lines.length;s+=4){
    if(!lineOk(lines[s])||!lines[s].trim()) continue;
    const win=[];
    for(let i=s;i<lines.length&&win.length<10;i++){
      if(!lineOk(lines[i])) break;
      win.push(lines[i]);
      const joined=win.join('\n').replace(/\n{3,}/g,'\n\n').replace(/^\n+|\n+$/g,'');
      if(joined.length>340) break;
      if(joined.length>=80){
        asciiOnly.push(joined);
        if(![...joined].some(c=>c!=='\n'&&!(c in charMap))) typeable.push(joined);
      }
    }
  }
  const pool=typeable.length?typeable:asciiOnly;
  if(!pool.length) return null;
  return {text:pool[Math.floor(Math.random()*pool.length)], partial:!typeable.length};
}
