// WebHID経由のVIA/Rawプロトコル（DOM非依存。deviceを引数に取る）

export const VIA_FILTER={usagePage:0xFF60,usage:0x61};

export function isViaDevice(d){
  return d.collections.some(c=>c.usagePage===0xFF60&&c.usage===0x61);
}

export function viaCmd(device, bytes){
  return new Promise((res,rej)=>{
    const buf=new Uint8Array(32); buf.set(bytes);
    const to=setTimeout(()=>{device.removeEventListener('inputreport',h); rej(new Error('応答タイムアウト'));},1500);
    const h=e=>{clearTimeout(to); device.removeEventListener('inputreport',h);
      res(new Uint8Array(e.data.buffer,e.data.byteOffset,e.data.byteLength));};
    device.addEventListener('inputreport',h);
    device.sendReport(0,buf).catch(err=>{clearTimeout(to);device.removeEventListener('inputreport',h);rej(err);});
  });
}

export async function getProtocolVersion(device){
  const r=await viaCmd(device,[0x01]);           // get_protocol_version
  return (r[1]<<8)|r[2];
}

export async function getLayerCount(device){
  const r=await viaCmd(device,[0x11]);           // dynamic_keymap_get_layer_count
  return r[1]||4;
}

// EEPROM上のキーマップを [layer][row][col] の3次元配列で読み出す
export async function readKeymapRaw(device, layerCount, rows, cols){
  const total=layerCount*rows*cols*2;
  const raw=new Uint8Array(total);
  try{
    for(let off=0; off<total; off+=28){          // dynamic_keymap_get_buffer
      const size=Math.min(28,total-off);
      const r=await viaCmd(device,[0x12,(off>>8)&0xff,off&0xff,size]);
      raw.set(r.subarray(4,4+size),off);
    }
  }catch(e){                                     // 旧FW向けフォールバック: 1キーずつ読む
    for(let l=0;l<layerCount;l++)for(let rr=0;rr<rows;rr++)for(let cc=0;cc<cols;cc++){
      const r=await viaCmd(device,[0x04,l,rr,cc]);
      const off=((l*rows+rr)*cols+cc)*2;
      raw[off]=r[4]; raw[off+1]=r[5];
    }
  }
  const keymap=[];
  for(let l=0;l<layerCount;l++){
    const lay=[];
    for(let rr=0;rr<rows;rr++){
      const rowArr=[];
      for(let cc=0;cc<cols;cc++){
        const off=((l*rows+rr)*cols+cc)*2;
        rowArr.push((raw[off]<<8)|raw[off+1]);
      }
      lay.push(rowArr);
    }
    keymap.push(lay);
  }
  return keymap;
}
