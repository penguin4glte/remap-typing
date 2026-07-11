// 接続だけで定義を自動取得できる既知キーボード（VID/PID → 定義JSONのURL）
// 追加するときは、via.json内のvendorId/productIdと一致していることを確認すること

export const DEF_REGISTRY=[
  {vid:0x5957,pid:0x0100,url:'https://raw.githubusercontent.com/Yowkees/keyball/main/qmk_firmware/keyboards/keyball/keyball61/via.json'},
  {vid:0x5957,pid:0x0200,url:'https://raw.githubusercontent.com/Yowkees/keyball/main/qmk_firmware/keyboards/keyball/keyball39/via.json'},
  {vid:0x5957,pid:0x0300,url:'https://raw.githubusercontent.com/Yowkees/keyball/main/qmk_firmware/keyboards/keyball/one47/via.json'},
  {vid:0x5957,pid:0x0400,url:'https://raw.githubusercontent.com/Yowkees/keyball/main/qmk_firmware/keyboards/keyball/keyball44/via.json'},
  {vid:0x4653,pid:0x0001,url:'https://raw.githubusercontent.com/the-via/keyboards/master/v3/crkbd/crkbd.json'},
  {vid:0x04d8,pid:0xeb2d,url:'https://raw.githubusercontent.com/the-via/keyboards/master/v3/lily58/lily58.json'},
];
