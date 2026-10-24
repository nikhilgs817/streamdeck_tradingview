// Native SVG design tokens shared by runtime, inspector and release artwork.
export let APP_DESIGN = null;
export function setAppDesign(design) { APP_DESIGN = design || null; }
const OUTLINE={
 back:'<path d="M86 30L54 62l32 32M56 62h62"/>',
 search:'<circle cx="63" cy="54" r="28"/><path d="M84 75l28 28"/>',
 gear:'<path d="M61 20h22l4 14 13 8 14-3 11 19-10 11v15L103 95l-14-3-12 8-4 14H51l-4-14-13-8-14 3L9 76l10-11V50l12-11 14 3 12-8z" transform="translate(10 -6) scale(.9)"/><circle cx="72" cy="62" r="17"/>',
 keyboard:'<rect x="22" y="33" width="100" height="59" rx="8"/><path d="M36 47h5m12 0h5m12 0h5m12 0h5m12 0h5M36 61h5m12 0h5m12 0h5m12 0h5m12 0h5M45 77h54"/>',
 copy:'<rect x="45" y="39" width="59" height="65" rx="5"/><path d="M86 32V22H26v66h11"/>',
 paste:'<path d="M52 30H31v76h82V30H92"/><rect x="51" y="19" width="42" height="23" rx="5"/><path d="M46 61h52M46 77h40M46 91h28"/>',
 grid:'<rect x="27" y="24" width="34" height="34" rx="4"/><rect x="83" y="24" width="34" height="34" rx="4"/><rect x="27" y="78" width="34" height="34" rx="4"/><rect x="83" y="78" width="34" height="34" rx="4"/>',
 sparkchat:'<path d="M27 29h90v61H60l-25 19V90h-8z"/><path d="M72 43v33M56 59h32"/>',
 chats:'<path d="M26 31h68v50H52l-19 15V81h-7zM99 48h19v49h-7v15l-20-15H61v-8"/>',
 palette:'<rect x="24" y="26" width="96" height="76" rx="6"/><path d="M39 43l10 9-10 9M60 61h30M39 80h63"/>',
 sidebar:'<rect x="24" y="24" width="96" height="80" rx="6"/><path d="M57 24v80M35 41h11M35 55h11M35 69h11"/>',
 briefcase:'<rect x="25" y="38" width="94" height="64" rx="6"/><path d="M54 38V24h36v14M25 65q47 20 94 0M66 69h12v13H66z"/>',
 doc:'<path d="M37 21h49l22 22v66H37zM86 21v23h22M51 61h43M51 78h43M51 94h28"/>',
 chart:'<path d="M25 22v80h96M38 80l23-26 17 12 35-39"/>',
 tradeorders:'<rect x="28" y="23" width="88" height="83" rx="6"/><path d="M41 42h9m12 0h38M41 63h9m12 0h38M41 84h9m12 0h25"/>',
 tradebracket:'<rect x="51" y="20" width="42" height="25" rx="5"/><path d="M72 45v18M37 78V63h70v15"/><rect x="17" y="78" width="43" height="27" rx="5"/><rect x="85" y="78" width="43" height="27" rx="5"/>',
};
const escapeText = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function appKeySvg({glyph,theme,label,motion},draw) {
 const d=APP_DESIGN||{id:'chatgpt',background:'#151515',surface:'#202020',ink:'#f4f4f4',accent:'#a8d9c6',border:'#414141',radius:16};
 const phase=motion?((motion.phase%1)+1)%1:0,pulse=(1-Math.cos(phase*Math.PI*2))/2;
 const isBuy=glyph==='tradebuy',isSell=glyph==='tradesell';
 const accent=isBuy?'#37c582':isSell?'#ff6470':d.accent;
 const unconfigured=String(label||'').includes(' · SETUP');
 const text=escapeText(String(label||'').replace(' · SETUP','').toUpperCase().slice(0,14));
 const labelSize=Math.min(15,Math.floor(128/Math.max(1,text.length*.61)));
 const id='app'+d.id+Math.round(phase*10000)+glyph.replace(/[^a-z]/gi,'');
 let base=`<rect width="144" height="144" fill="${d.background}"/><rect x="5" y="5" width="134" height="134" rx="${d.radius}" fill="${d.surface}" stroke="${d.border}" stroke-width="1.5"/>`;
 if(d.id==='claude') {
  base+=`<circle cx="72" cy="57" r="${(39+pulse*3).toFixed(2)}" fill="none" stroke="${accent}" stroke-opacity="${(.08+pulse*.10).toFixed(3)}" stroke-width="1.5"/>`;
  base+=`<path d="M33 108h78" stroke="${d.border}" stroke-width="1"/>`;
 } else if(d.id==='chatgpt') {
  base+=`<rect x="51" y="104" width="42" height="3" rx="1.5" fill="${accent}" opacity="${(.3+pulse*.45).toFixed(3)}"/>`;
  if(motion)base+=`<circle cx="${(72+39*Math.cos(phase*Math.PI*2)).toFixed(2)}" cy="${(58+39*Math.sin(phase*Math.PI*2)).toFixed(2)}" r="2" fill="${accent}" opacity=".55"/>`;
 } else if(d.id==='vscode') {
  base+=`<path d="M5 31h134M5 111h134" stroke="${d.border}"/><rect x="6" y="6" width="3" height="132" fill="${accent}"/><path d="M17 19h19M43 19h10" stroke="${d.ink}" opacity=".25" stroke-width="2"/>`;
  if(motion)base+=`<rect x="${(18+phase*102).toFixed(2)}" y="108" width="5" height="2" fill="${accent}" opacity="${Math.sin(phase*Math.PI).toFixed(3)}"/>`;
 } else if(d.id==='thinkorswim') {
  base+=`<path d="M13 34h118M13 62h118M13 90h118M41 22v77M73 22v77M105 22v77" stroke="${d.border}" opacity=".28"/><rect x="6" y="6" width="132" height="4" fill="${accent}"/><circle cx="124" cy="21" r="2.5" fill="${accent}" opacity="${(.4+pulse*.6).toFixed(3)}"/>`;
 } else if(d.id==='fidelitytrader') {
  base+=`<path d="M12 14h120" stroke="${accent}" stroke-width="3"/><path d="M26 107h92" stroke="${accent}" stroke-opacity=".25"/>`;
  if(motion)base+=`<path d="M${(27+phase*75).toFixed(2)} 107h15" stroke="${accent}" stroke-width="2" stroke-opacity="${Math.sin(phase*Math.PI).toFixed(3)}"/>`;
 }
 const ink=(isBuy||isSell)?accent:d.ink;
 let art=OUTLINE[glyph]?`<g fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">${OUTLINE[glyph]}</g>`:draw(d.surface).replace(/#fff\b/gi,ink);
 if(d.id==='claude'&&glyph==='sparkchat')art=`<g stroke="${d.accent}" stroke-width="5" stroke-linecap="round">${Array.from({length:12},(_,i)=>`<path d="M72 29v24" transform="rotate(${i*30} 72 62)"/>`).join('')}</g>`;
 // App defaults use lighter outlined strokes, flatter shapes and restrained movement.
 const move=motion?Math.sin(phase*Math.PI*2)*(d.id==='claude'?1.2:.75):0;
 if(isBuy||isSell)base+=`<rect x="15" y="31" width="114" height="67" rx="${d.radius}" fill="${accent}" fill-opacity=".08"/>`;
 base+=`<g transform="translate(72 ${(58+move).toFixed(2)}) scale(.76) translate(-72 -62)">${art}</g>`;
 if(unconfigured)base+='<rect x="46" y="94" width="52" height="15" rx="4" fill="#f7c86d"/><text x="72" y="105" text-anchor="middle" font-family="Segoe UI,Arial" font-size="10" font-weight="700" fill="#232323">SETUP</text>';
 if(text)base+=`<text x="72" y="128" text-anchor="middle" font-family="${d.id==='claude'?'Georgia, serif':'Segoe UI, Arial, sans-serif'}" font-size="${labelSize}" font-weight="${d.id==='claude'?500:600}" letter-spacing="${d.id==='vscode'?'.4':'.8'}" fill="${ink}">${text}</text>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><g data-app-design="${escapeText(d.id)}">${base}</g></svg>`;
}
