import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {keySvg,setAppDesign} from '../shared/icons.js';
const config=JSON.parse(readFileSync('companion.config.json'));setAppDesign(config.design);
const pages=config.pages||[{name:'Controls',layout:config.layout}];
mkdirSync('test-output/preview',{recursive:true});mkdirSync('docs/images',{recursive:true});
for(const [p,page] of pages.entries())for(let frame=0;frame<(p?1:72);frame++){
 let body=`<rect width="790" height="520" rx="24" fill="${config.design.background}"/><text x="28" y="35" font-family="Segoe UI" font-size="21" font-weight="600" fill="${config.design.ink}">${config.app.replaceAll('&','&amp;')} · ${page.name||'Controls'}</text>`;
 for(const [position,id] of Object.entries(page.layout)){
  const command=config.commands.find(c=>c.id===id),[col,row]=position.split(',').map(Number),x=28+col*150,y=60+row*150;
  const svg=keySvg({glyph:command.glyph,theme:command.theme,label:command.name,style:'app',motion:{kind:'comp-'+id,phase:frame/72}});
  body+=`<g transform="translate(${x} ${y}) scale(${134/144})">${svg}</g>`;
 }
 const bytes=new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="790" height="520">${body}</svg>`).render().asPng();
 if(!p)writeFileSync(join('test-output/preview',`frame-${String(frame).padStart(3,'0')}.png`),bytes);
 if(!frame)writeFileSync(`docs/images/${p?'page-'+p:'deck'}.png`,bytes);
}
console.log('Rendered app-themed workflow pages and 72 animation frames for '+config.app);
