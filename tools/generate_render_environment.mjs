import { mkdir, writeFile } from 'node:fs/promises';
const width=512,height=256,rows=[];
const sun=[-.48,.78,.4],length=Math.hypot(...sun);for(let i=0;i<3;i++)sun[i]/=length;
for(let y=0;y<height;y++){
  const channels=Array.from({length:4},()=>[]);
  for(let x=0;x<width;x++){
    const theta=(y+.5)/height*Math.PI,phi=(x+.5)/width*Math.PI*2-Math.PI;
    const direction=[Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi)];
    const elevation=Math.max(0,direction[1]),haze=Math.exp(-elevation*6);
    const glow=Math.pow(Math.max(0,direction.reduce((v,d,i)=>v+d*sun[i],0)),96)*2;
    const disk=direction.reduce((v,d,i)=>v+d*sun[i],0)>.99965?24:0;
    const rgb=direction[1]>0?[.36+haze*.62+glow+disk,.60+haze*.43+glow*.9+disk*.92,.93+haze*.18+glow*.7+disk*.76]:[.18,.21,.16];
    const exponent=Math.ceil(Math.log2(Math.max(...rgb))),factor=256/2**exponent;
    for(let c=0;c<3;c++)channels[c].push(Math.max(0,Math.min(255,Math.floor(rgb[c]*factor))));
    channels[3].push(exponent+128);
  }
  rows.push(Buffer.from([2,2,width>>8,width&255]));
  for(const channel of channels)for(let start=0;start<width;start+=128){const chunk=channel.slice(start,start+128);rows.push(Buffer.from([chunk.length]),Buffer.from(chunk));}
}
await mkdir('public/assets/environments',{recursive:true});
await writeFile('public/assets/environments/lohas-afternoon.hdr',Buffer.concat([Buffer.from(`#?RADIANCE\n# Original procedural afternoon sky for Lohas Rush\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`),...rows]));
console.log('Generated original 512 x 256 Radiance HDR environment.');
