// デモモード用の60% ANSI定義とキーマップ（実機なしでUIと練習を試すため）

export const DEMO_DEF={name:'Demo 60% (ANSI)',matrix:{rows:5,cols:14},layouts:{keymap:[
  ["0,0","0,1","0,2","0,3","0,4","0,5","0,6","0,7","0,8","0,9","0,10","0,11","0,12",{w:2},"0,13"],
  [{w:1.5},"1,0","1,1","1,2","1,3","1,4","1,5","1,6","1,7","1,8","1,9","1,10","1,11","1,12",{w:1.5},"1,13"],
  [{w:1.75},"2,0","2,1","2,2","2,3","2,4","2,5","2,6","2,7","2,8","2,9","2,10","2,11",{w:2.25},"2,12"],
  [{w:2.25},"3,0","3,1","3,2","3,3","3,4","3,5","3,6","3,7","3,8","3,9","3,10",{w:2.75},"3,11"],
  [{w:1.25},"4,0",{w:1.25},"4,1",{w:1.25},"4,2",{w:6.25},"4,3",{w:1.25},"4,4",{w:1.25},"4,5",{w:1.25},"4,6",{w:1.25},"4,7"]
]}};

const NAME2KC={ESC:0x29,GRV:0x35,MINS:0x2d,EQL:0x2e,BSPC:0x2a,TAB:0x2b,LBRC:0x2f,RBRC:0x30,BSLS:0x31,
  CAPS:0x39,SCLN:0x33,QUOT:0x34,ENT:0x28,LSFT:0xe1,COMM:0x36,DOT:0x37,SLSH:0x38,RSFT:0xe5,
  LCTL:0xe0,LGUI:0xe3,LALT:0xe2,SPC:0x2c,RALT:0xe6,MO1:0x5221,APP:0x65,RCTL:0xe4,
  DEL:0x4c,INS:0x49,HOME:0x4a,PGUP:0x4b,END:0x4d,PGDN:0x4e,UP:0x52,DOWN:0x51,LEFT:0x50,RGHT:0x4f,
  PSCR:0x46,X:0x00,T:0x01};
"abcdefghijklmnopqrstuvwxyz".split('').forEach((c,i)=>NAME2KC[c.toUpperCase()+'_']=0x04+i);
"1234567890".split('').forEach((c,i)=>NAME2KC['N'+c]=c==='0'?0x27:0x1e+i);
for(let i=1;i<=12;i++) NAME2KC['F'+i]=0x3a+i-1;

function L(str,cols){
  const a=str.trim().split(/\s+/).map(t=>{ const v=NAME2KC[t]; if(v===undefined) throw new Error('demo kc: '+t); return v; });
  while(a.length<cols) a.push(0);
  return a;
}

export const DEMO_KEYMAP=[
  [
    L('GRV N1 N2 N3 N4 N5 N6 N7 N8 N9 N0 MINS EQL BSPC',14),
    L('TAB Q_ W_ E_ R_ T_ Y_ U_ I_ O_ P_ LBRC RBRC BSLS',14),
    L('CAPS A_ S_ D_ F_ G_ H_ J_ K_ L_ SCLN QUOT ENT',14),
    L('LSFT Z_ X_ C_ V_ B_ N_ M_ COMM DOT SLSH RSFT',14),
    L('LCTL LGUI LALT SPC RALT MO1 APP RCTL',14)
  ],
  [
    L('ESC F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 DEL',14),
    L('T T UP T T T T T INS HOME PGUP T T PSCR',14),
    L('T LEFT DOWN RGHT T T T T DEL END PGDN T T',14),
    L('T T T T T T T T T T T T',14),
    L('T T T T T T T T',14)
  ]
];
