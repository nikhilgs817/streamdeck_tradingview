import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {keySvg,setAppDesign} from '../shared/icons.js';
const config=JSON.parse(readFileSync('companion.config.json'));setAppDesign(config.design);
// Glass is the default look of the app plugins; pass --style app (or vivid, neon…) to draw another one.
const style=(process.argv.find(a=>a.startsWith('--style='))||'--style=glass').slice(8);
const pages=config.pages||[{name:'Controls',layout:config.layout}];
const esc=(s)=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
const inner=(svg)=>svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
mkdirSync('test-output/preview',{recursive:true});mkdirSync('docs/images',{recursive:true});
for(const [p,page] of pages.entries())for(let frame=0;frame<(p?1:72);frame++){
 let body=`<rect width="790" height="520" rx="24" fill="#0B0D14"/><text x="28" y="35" font-family="Segoe UI" font-size="21" font-weight="600" fill="#E8EDF6">${esc(config.app)} · ${esc(page.name||'Controls')}</text>`;
 for(const [position,id] of Object.entries(page.layout)){
  const command=config.commands.find(c=>c.id===id),[col,row]=position.split(',').map(Number),x=28+col*150,y=60+row*150;
  const svg=keySvg({glyph:command.glyph,theme:command.theme,label:command.name,style,motion:{kind:'comp-'+id,phase:p?.18:frame/72}});
  body+=`<g transform="translate(${x} ${y}) scale(${134/144})"><clipPath id="p${col}_${row}"><rect width="144" height="144" rx="16"/></clipPath><g clip-path="url(#p${col}_${row})">${inner(svg)}</g></g>`;
 }
 const bytes=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="790" height="520">${body}</svg>`,{font:{loadSystemFonts:true}}).render().asPng();
 if(!p)writeFileSync(join('test-output/preview',`frame-${String(frame).padStart(3,'0')}.png`),bytes);
 if(p||frame===13)writeFileSync(`docs/images/${p?'page-'+p:'deck'}.png`,bytes);
}
// Every look side by side (docs/images/styles.png).
const looks=[['glass','Glass (default)'],['app',config.design.styleName||config.app+' Dark'],['light',(config.design.styleName||config.app+' Dark').replace(/Dark$/,'Light')],['vivid','Vivid'],['neon','Neon'],['mono','Mono'],['pro','Pro']].filter(([s])=>s!=='light'||config.design.light);
const keys=config.commands.filter(c=>!c.hidden&&c.operation!=='back').slice(0,7),S=110,G=10,L=170,W=L+keys.length*(S+G)+G,H=looks.length*(S+G)+G;
let body=`<rect width="${W}" height="${H}" rx="18" fill="#0B0D14"/>`;
looks.forEach(([st,name],r)=>{
 body+=`<text x="20" y="${G+r*(S+G)+S/2+6}" fill="#E8EDF6" font-size="16" font-weight="600" font-family="Segoe UI, Arial, sans-serif">${esc(name)}</text>`;
 keys.forEach((k,c)=>{body+=`<g transform="translate(${L+G+c*(S+G)} ${G+r*(S+G)}) scale(${S/144})"><clipPath id="k${r}_${c}"><rect width="144" height="144" rx="16"/></clipPath><g clip-path="url(#k${r}_${c})">${inner(keySvg({glyph:k.glyph,theme:k.theme,label:k.name,style:st,motion:{kind:'comp-'+k.id,phase:.18}}))}</g></g>`;});
});
writeFileSync('docs/images/styles.png',new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}">${body}</svg>`,{font:{loadSystemFonts:true}}).render().asPng());
console.log(`Rendered ${config.app} pages in the ${style} look, 72 animation frames and the styles gallery`);
