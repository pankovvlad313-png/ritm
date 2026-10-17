const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.desktop');
fs.mkdirSync(path.join(out,'web'),{recursive:true});
for(const file of ['index.html','app.js','planner.js','style.css','tour-model.js','tour.js','tour.css','updater-ui.js','config.js','features.js','features.css','calendar-ui.js']){
  let content=fs.readFileSync(path.join(root,file),'utf8');
  if(file==='style.css')content=content.replace(/^@import[^;]+;\s*/,'');
  fs.writeFileSync(path.join(out,'web',file),content);
}
function crc(bytes){let c=0xffffffff;for(const byte of bytes){c^=byte;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function chunk(type,data){const label=Buffer.from(type),length=Buffer.alloc(4),sum=Buffer.alloc(4);length.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([label,data])));return Buffer.concat([length,label,data,sum]);}
const n=256,raw=Buffer.alloc((n*4+1)*n);
for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const offset=y*(n*4+1)+1+x*4,cx=Math.max(40,Math.min(215,x)),cy=Math.max(40,Math.min(215,y));
  const rounded=(x-cx)**2+(y-cy)**2<=40**2;
  const bar=(x>=63&&x<=89&&y>=133&&y<=194)||(x>=115&&x<=141&&y>=78&&y<=194)||(x>=167&&x<=193&&y>=108&&y<=194);
  raw[offset]=bar?255:116;raw[offset+1]=bar?255:101;raw[offset+2]=bar?255:185;raw[offset+3]=rounded?255:0;
}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(n,0);ihdr.writeUInt32BE(n,4);ihdr[8]=8;ihdr[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
fs.writeFileSync(path.join(out,'icon.png'),png);
const images=[16,32,48].map(size=>{
  const stride=Math.ceil(size/32)*4,pixels=Buffer.alloc(size*size*4),mask=Buffer.alloc(stride*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const source=Math.floor(y*256/size)*(256*4+1)+1+Math.floor(x*256/size)*4,target=((size-1-y)*size+x)*4;
    pixels[target]=raw[source+2];pixels[target+1]=raw[source+1];pixels[target+2]=raw[source];pixels[target+3]=raw[source+3];
    if(!raw[source+3])mask[(size-1-y)*stride+(x>>3)]|=1<<(7-(x%8));
  }
  const header=Buffer.alloc(40);header.writeUInt32LE(40);header.writeInt32LE(size,4);header.writeInt32LE(size*2,8);header.writeUInt16LE(1,12);header.writeUInt16LE(32,14);header.writeUInt32LE(pixels.length+mask.length,20);
  return {size,data:Buffer.concat([header,pixels,mask])};
});
images.push({size:256,data:png});
const ico=Buffer.alloc(6+16*images.length);ico.writeUInt16LE(1,2);ico.writeUInt16LE(images.length,4);let offset=ico.length;
images.forEach(({size,data},i)=>{const pos=6+i*16;ico[pos]=size%256;ico[pos+1]=size%256;ico.writeUInt16LE(1,pos+4);ico.writeUInt16LE(32,pos+6);ico.writeUInt32LE(data.length,pos+8);ico.writeUInt32LE(offset,pos+12);offset+=data.length;});
fs.writeFileSync(path.join(out,'icon.ico'),Buffer.concat([ico,...images.map(i=>i.data)]));
console.log('Desktop assets ready; no external fonts or network dependencies.');
