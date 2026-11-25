// Windows Toolkit feature artwork — approved designs (Nov 2026). Original generic glyphs; no brand logos.
// Each glyph draws in the 144×144 key box from white shapes; the key renderer recolours them per look.
// P = animation phase (detail runs twice per 12 s loop), D = live data for keys that show readings.
const W = "#fff", T = Math.PI * 2, f = (n) => n.toFixed(2);
const R = 'stroke-linecap="round" stroke-linejoin="round"';
const st = (c, w) => `fill="none" stroke="${c}" stroke-width="${w}" ${R}`, soft = (o) => `fill="${W}" fill-opacity="${o}"`;
const wave = (p) => (1 - Math.cos(p * T)) / 2;
let P = 0, D = {}, uid = 0;
const screen=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" ${soft(.14)} stroke="${W}" stroke-width="5"/>`;
const stand=`<path d="M72 92v10M54 106h36" ${st(W,5)}/>`;
const sunRays=(cx,cy,r1,len,n=8,rot=0)=>Array.from({length:n},(_,i)=>{const a=i/n*T+rot;return `<path d="M${f(cx+r1*Math.cos(a))} ${f(cy+r1*Math.sin(a))}L${f(cx+(r1+len)*Math.cos(a))} ${f(cy+(r1+len)*Math.sin(a))}" ${st(W,6)}/>`}).join('');
const txt=(x,y,t,sz,ink,w=900)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="${sz}" font-weight="${w}" fill="${ink}">${t}</text>`;
const ring=(v,ink,unit='%')=>{const r=36,C=2*Math.PI*r,col=v>=85?'#FF4D5E':v>=60?'#F5A524':W;return `<circle cx="72" cy="60" r="${r}" fill="none" stroke="${W}" stroke-opacity=".18" stroke-width="10"/><circle cx="72" cy="60" r="${r}" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${f(C*v/100)} ${f(C)}" transform="rotate(-90 72 60)"/>`+txt(72,70,Math.round(v)+`<tspan font-size="14">${unit}</tspan>`,28,W)};
const spark=(seed,ink,val,unit)=>{const pts=[];for(let i=0;i<=12;i++){const x=20+i*8.67;pts.push(`${f(x)} ${f(96-18*Math.abs(Math.sin(i*.9+seed+P*T)))}`)}return `<path d="M20 98L${pts.join('L')}L124 98Z" fill="${W}" fill-opacity=".22"/><path d="M${pts.join('L')}" ${st(W,4)}/>`+txt(72,44,val,30,W)+txt(72,62,unit,13,W,700)};
const live=P=>(Math.sin(P*T)+1)/2;
const pwr=(k)=>`<path d="M52 36a32 32 0 1 0 40 0" ${st(W,8)}/><path d="M72 ${f(22+4*k)}v34" ${st(W,8)}/>`;
const pad=`<path d="M40 44h64a22 22 0 0 1 22 22v4a18 18 0 0 1-32 12l-6-8H56l-6 8a18 18 0 0 1-32-12v-4a22 22 0 0 1 22-22Z" fill="${W}"/>`;
// Original twin-stick controller: symmetric sticks low in the middle, centre pad, light strip. No console-brand shapes or symbols.
const twin=(ink,o=1)=>`<path d="M44 40h56c14 0 22 10 26 26l6 22c3 12-10 20-18 10l-10-12H40L30 98c-8 10-21 2-18-10l6-22c4-16 12-26 26-26Z" fill="${W}" fill-opacity="${o}"/><rect x="56" y="44" width="32" height="18" rx="5" fill="${ink}" opacity=".25"/>`;
const sticks=(ink,dx=0,dy=0)=>`<circle cx="${f(54+dx)}" cy="${f(76+dy)}" r="8" fill="${ink}"/><circle cx="${f(90-dx)}" cy="${f(76+dy)}" r="8" fill="${ink}"/>`;
const dpad=ink=>`<path d="M34 52v14M27 59h14" ${st(ink,5)}/>`;
const face=(ink,on)=>[[110,52],[118,60],[110,68],[102,60]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i===on?5.5:4}" fill="${ink}" opacity="${i===on?1:.6}"/>`).join('');
const moon=(x,y,r)=>`<path d="M${x+r*.35} ${y-r}a${r} ${r} 0 1 0 ${r*.65} ${r*1.45}A${r*.83} ${r*.83} 0 0 1 ${x+r*.35} ${y-r}Z" fill="${W}"/>`;
export const FX = {
	dispset:ink=>screen(20,22,104,68)+stand+`<g transform="rotate(${f(P*360)} 72 56)"><circle cx="72" cy="56" r="13" fill="${W}"/>${Array.from({length:8},(_,i)=>`<rect x="68" y="34" width="8" height="10" rx="2" fill="${W}" transform="rotate(${i*45} 72 56)"/>`).join('')}<circle cx="72" cy="56" r="5" fill="${ink}"/></g>`,
	nightlight:ink=>`<path d="M84 26a36 36 0 1 0 24 52A30 30 0 0 1 84 26Z" fill="${W}"/>`+[[36,34,0],[30,64,.33],[50,20,.66]].map(([x,y,k])=>`<circle cx="${x}" cy="${y}" r="${f(2+3*wave(P+k))}" fill="${W}" opacity="${f(.3+.7*wave(P+k))}"/>`).join('')+`<path d="M30 ${f(100-4*wave(P))}h84" ${st(W,4)} opacity=".5"/>`,
	hdr:ink=>`<rect x="18" y="32" width="108" height="56" rx="12" fill="${W}"/><text x="72" y="75" text-anchor="middle" font-family="Segoe UI, Arial" font-size="38" font-weight="900" fill="${ink}">HDR</text><rect x="${f(20+90*P)}" y="34" width="12" height="52" fill="${W}" opacity=".55" transform="skewX(-12)"/>`,
	brightup:ink=>`<circle cx="72" cy="60" r="18" fill="${W}"/>`+sunRays(72,60,26,6+10*wave(P),8,P*T/4),
	brightdown:ink=>`<circle cx="72" cy="60" r="18" ${soft(.55)} stroke="${W}" stroke-width="5"/>`+sunRays(72,60,26,14-9*wave(P),8,0).replace(/stroke-width="6"/g,'stroke-width="5" opacity=".7"'),
	project:ink=>{const d=10*wave(P);return screen(16,30,50,38)+screen(78,30,50,38)+`<rect x="${f(22+d)}" y="36" width="${f(38-d)}" height="26" rx="3" fill="${W}"/><rect x="${f(84)}" y="36" width="${f(38-d)}" height="26" rx="3" fill="${W}" opacity="${f(.35+.65*wave(P))}"/><path d="M56 88h32M80 82l8 6-8 6" ${st(W,5)}/>`},
	nextmon:ink=>{const x=26+46*Math.min(1,wave(P)*1.3);return screen(10,30,58,46)+screen(76,30,58,46)+`<rect x="${f(x-6)}" y="40" width="${32}" height="24" rx="4" fill="${W}"/><path d="M36 88h72" ${st(W,4)} opacity=".5"/>`},
	snap:ink=>`<rect x="18" y="24" width="108" height="72" rx="10" ${soft(.12)} stroke="${W}" stroke-width="5"/><rect x="24" y="30" width="${f(44+4*wave(P))}" height="60" rx="5" fill="${W}"/><rect x="${f(76+4*wave(P))}" y="30" width="44" height="60" rx="5" ${soft(.45)}/>`,
	ontop:ink=>`<rect x="20" y="44" width="70" height="50" rx="7" ${soft(.35)}/><rect x="40" y="30" width="80" height="54" rx="7" fill="${W}"/><g transform="translate(0 ${f(-6*wave(P))})"><path d="M98 14l14 14-6 2-10 10 2 10-6 2-22-22 2-6 10 2 10-10z" fill="${ink}" stroke="${W}" stroke-width="4" stroke-linejoin="round"/></g>`,
	vdesk:ink=>{const s=-52*wave(P),cid="vdc"+(++uid).toString(36);return `<clipPath id="${cid}"><rect x="16" y="20" width="112" height="72"/></clipPath><g clip-path="url(#${cid})"><g transform="translate(${f(s)} 0)">`+screen(26,26,92,60)+screen(130,26,92,60)+`<rect x="40" y="40" width="36" height="24" rx="4" fill="${W}"/><rect x="144" y="40" width="50" height="32" rx="4" ${soft(.6)}/></g></g><circle cx="62" cy="102" r="4" fill="${W}" opacity="${f(1-.6*wave(P))}"/><circle cx="82" cy="102" r="4" fill="${W}" opacity="${f(.4+.6*wave(P))}"/>`},
	taskview:ink=>[0,1,2,3].map(i=>{const r=2*Math.sin((P+i*.25)*T);return `<rect x="${24+(i%2)*50}" y="${f(24+Math.floor(i/2)*38-r)}" width="44" height="32" rx="6" ${i==0?`fill="${W}"`:soft(.4)}/>`}).join(''),
	cliphist:ink=>`<rect x="40" y="20" width="64" height="84" rx="10" ${soft(.35)}/><rect x="32" y="${f(28+0)}" width="64" height="80" rx="10" fill="${W}"/><rect x="50" y="22" width="28" height="14" rx="5" fill="${ink}" stroke="${W}" stroke-width="4"/>`+[0,1,2].map(i=>`<path d="M44 ${54+i*14}h${f(24+16*wave(P+i*.2))}" ${st(ink,6)}/>`).join(''),
	emoji:ink=>`<circle cx="72" cy="60" r="40" fill="${W}"/><circle cx="58" cy="${f(50-2*wave(P))}" r="5" fill="${ink}"/><circle cx="86" cy="${f(50-2*wave(P))}" r="5" fill="${ink}"/><path d="M52 ${70}q20 ${f(14+8*wave(P))} 40 0" ${st(ink,6)}/>`,
	lock:ink=>`<path d="M50 54V${f(42-8*wave(P))}a22 22 0 0 1 44 0V54" ${st(W,8)}/><rect x="36" y="52" width="72" height="52" rx="10" fill="${W}"/><circle cx="72" cy="74" r="7" fill="${ink}"/><path d="M72 78v12" ${st(ink,6)}/>`,
	sleepmon:ink=>screen(18,24,108,68)+stand+`<path d="M78 36a20 20 0 1 0 14 30A16 16 0 0 1 78 36Z" fill="${W}"/>`+['z','z','Z'].map((z,i)=>{const k=(P+i/3)%1;return `<text x="${f(96+i*6)}" y="${f(56-k*24)}" font-family="Segoe UI" font-size="${10+i*3}" font-weight="900" fill="${W}" opacity="${f(1-k)}">${z}</text>`}).join(''),
	mute:ink=>`<path d="M24 50h16l22-18v60L40 74H24Z" fill="${W}" stroke="${W}" stroke-width="4" stroke-linejoin="round"/>`+(D.muted===false?["M74 48a20 20 0 0 1 0 28","M84 38a34 34 0 0 1 0 48"].map((d,i)=>`<path d="${d}" ${st(W,6)} opacity="${f(.3+.7*wave(P+i*.3))}"/>`).join(""):`<g transform="rotate(${f(8*Math.sin(P*T))} 100 62)"><path d="M86 48l28 28M114 48l-28 28" ${st(W,8)}/></g>`),
	miclive:ink=>`<rect x="56" y="18" width="32" height="54" rx="16" fill="${W}"/><path d="M44 58a28 28 0 0 0 56 0M72 86v14M58 102h28" ${st(W,6)}/>`+[0,1].map(i=>`<path d="M${f(30-i*8)} ${42}a${f(18+i*10)} ${f(18+i*10)} 0 0 0 0 ${f(30)}" ${st(W,4)} opacity="${f(wave(P+i*.3))}" transform="translate(${-i*2} ${-i*5}) "/>`).join(''),
	micmuted:ink=>`<rect x="56" y="18" width="32" height="54" rx="16" ${soft(.5)}/><path d="M44 58a28 28 0 0 0 56 0M72 86v14M58 102h28" ${st(W,6)} opacity=".6"/><path d="M36 ${f(24)}l72 72" ${st(W,9)}/>`,
	ptt:ink=>{const k=wave(P);return `<rect x="58" y="16" width="28" height="44" rx="14" fill="${W}"/><path d="M48 50a24 24 0 0 0 48 0M72 74v8" ${st(W,5)}/><rect x="34" y="${f(86+4*k)}" width="76" height="${f(20-4*k)}" rx="8" fill="${W}"/><path d="M72 ${f(70)}v${f(-6*k)}" ${st(ink,3)}/>`},
	spkswitch:ink=>{const k=wave(P);return `<g opacity="${f(1-k)}"><path d="M30 48h14l18-14v52L44 72H30Z" fill="${W}"/><path d="M72 46a20 20 0 0 1 0 30" ${st(W,6)}/></g><g opacity="${f(k)}"><path d="M30 70a42 42 0 0 1 84 0" ${st(W,8)}/><rect x="24" y="66" width="20" height="34" rx="8" fill="${W}"/><rect x="100" y="66" width="20" height="34" rx="8" fill="${W}"/></g><path d="M96 26l14 10-14 10M110 36H84" ${st(W,5)}/>`},
	micswitch:ink=>{const k=wave(P);return `<g transform="translate(${f(-14+0)} 0)"><rect x="44" y="24" width="24" height="42" rx="12" fill="${W}" opacity="${f(1-.6*k)}"/></g><rect x="76" y="34" width="24" height="42" rx="12" fill="${W}" opacity="${f(.4+.6*k)}"/><path d="M30 90h84" ${st(W,4)} opacity=".5"/><circle cx="${f(42+60*k)}" cy="90" r="6" fill="${W}"/>`},
	appvol:ink=>`<rect x="22" y="24" width="40" height="40" rx="10" fill="${W}"/><path d="M34 50V38l14-3v13" ${st(ink,4)}/><circle cx="34" cy="51" r="4" fill="${ink}"/><circle cx="48" cy="48" r="4" fill="${ink}"/>`+[0,1,2].map(i=>{const h=10+26*wave(P+i*.22);return `<rect x="${78+i*14}" y="${f(96-h)}" width="9" height="${f(h)}" rx="4" fill="${W}"/>`}).join('')+`<path d="M22 96h40" ${st(W,4)} opacity=".5"/>`,
	playpause:ink=>{const k=wave(P);return `<circle cx="72" cy="60" r="40" ${soft(.16)} stroke="${W}" stroke-width="5"/><g opacity="${f(1-k)}"><path d="M62 42v36l30-18z" fill="${W}"/></g><g opacity="${f(k)}"><rect x="58" y="42" width="10" height="36" rx="3" fill="${W}"/><rect x="76" y="42" width="10" height="36" rx="3" fill="${W}"/></g>`},
	next:ink=>{const d=6*wave(P);return `<g transform="translate(${f(d)} 0)"><path d="M30 38v44l32-22zM62 38v44l32-22z" fill="${W}"/></g><rect x="${f(98+d)}" y="38" width="10" height="44" rx="3" fill="${W}"/>`},
	prev:ink=>{const d=-6*wave(P);return `<rect x="${f(36+d)}" y="38" width="10" height="44" rx="3" fill="${W}"/><g transform="translate(${f(d)} 0)"><path d="M114 38v44L82 60zM82 38v44L50 60z" fill="${W}"/></g>`},
	miclevel:ink=>`<rect x="20" y="24" width="22" height="38" rx="11" fill="${W}"/><path d="M14 54a17 17 0 0 0 34 0M31 72v10" ${st(W,4)}/>`+Array.from({length:8},(_,i)=>{const base=D.level==null?.5+.5*Math.sin(i):Math.min(1,D.level/60);const lvl=6+56*base*(.55+.45*Math.abs(Math.sin(P*T*2+i*.7)));return `<rect x="${56+i*9}" y="${f(92-Math.max(6,lvl))}" width="6" height="${f(Math.max(6,lvl))}" rx="3" fill="${W}" opacity="${i>5?.9:.75}"/>`}).join(''),
	soundboard:ink=>`<rect x="20" y="26" width="104" height="70" rx="12" ${soft(.14)} stroke="${W}" stroke-width="5"/>`+[0,1,2,3,4,5].map(i=>{const on=Math.floor(P*6)%6===i;return `<rect x="${32+(i%3)*28}" y="${36+Math.floor(i/3)*28}" width="22" height="22" rx="5" fill="${W}" opacity="${on?1:.4}"/>`}).join(''),
	mixer:ink=>[0,1,2,3].map(i=>{const y=34+48*wave(P+i*.18);return `<path d="M${36+i*24} 24v72" ${st(W,4)} opacity=".45"/><rect x="${27+i*24}" y="${f(y-8)}" width="18" height="16" rx="5" fill="${W}"/>`}).join(''),
	cpu:ink=>ring(D.v??0,ink),
	ram:ink=>ring(D.v??0,ink),
	gpu:ink=>ring(D.v??0,ink),
	diskio:ink=>spark(1,ink,D.text??'–',D.unit??'MB/s'),
	diskfree:ink=>`<rect x="26" y="30" width="92" height="56" rx="10" ${soft(.14)} stroke="${W}" stroke-width="5"/><rect x="34" y="70" width="${f(76*Math.max(.04,D.frac??.5))}" height="8" rx="4" fill="${W}"/><circle cx="104" cy="44" r="4" fill="${W}" opacity="${f(.3+.7*live(P))}"/>`+txt(66,58,(D.text??'–')+'<tspan font-size="12">'+(D.unit??'GB')+'</tspan>',20,W),
	netdown:ink=>spark(2,ink,D.text??'–',(D.unit??'Mb/s')+' ↓'),
	netup:ink=>spark(4,ink,D.text??'–',(D.unit??'Mb/s')+' ↑'),
	ping:ink=>{const k=(P*1)%1;return `<circle cx="44" cy="62" r="7" fill="${W}"/>`+[0,1,2].map(i=>{const q=(k+i/3)%1;return `<circle cx="44" cy="62" r="${f(9+q*24)}" ${st(W,4)} opacity="${f(1-q)}"/>`}).join('')+txt(94,54,D.text??'–',D.text&&D.text.length>3?20:30,W)+txt(94,72,'ms',13,W,700)},
	wifi:ink=>[0,1,2].map(i=>`<path d="M${f(72-14-i*13)} ${f(74-i*0)}a${14+i*13} ${14+i*13} 0 0 1 ${2*(14+i*13)} 0" ${st(W,7)} opacity="${f((D.pct??100)>=[0,40,70][i]?1:.25)}"/>`).join('')+`<circle cx="72" cy="74" r="7" fill="${W}"/>`+txt(72,100,D.pct==null?'–':D.pct+'%',18,W),
	battery:ink=>{const v=Math.max(.04,(D.pct??50)/100);return `<rect x="22" y="36" width="92" height="46" rx="9" ${soft(.14)} stroke="${W}" stroke-width="5"/><rect x="114" y="50" width="8" height="18" rx="3" fill="${W}"/><rect x="30" y="44" width="${f(76*v)}" height="30" rx="5" fill="${W}" opacity=".9"/><path d="M${f(64)} 46l-8 14h10l-6 12" ${st(ink,4)} opacity="${f(D.charging?live(P):0)}"/>`+txt(72,104,D.pct==null?'–':D.pct+'%',16,W)},
	uptime:ink=>`<circle cx="72" cy="54" r="34" ${soft(.14)} stroke="${W}" stroke-width="5"/><path d="M72 54V34" ${st(W,5)}/><path d="M72 54l${f(18*Math.sin(P*T))} ${f(-18*Math.cos(P*T))}" ${st(W,5)}/>`+txt(72,108,D.text??'',16,W),
	topapp:ink=>`<rect x="22" y="24" width="100" height="74" rx="10" ${soft(.14)} stroke="${W}" stroke-width="5"/>`+txt(72,52,String(D.name??'–').slice(0,9),18,W,800)+`<rect x="34" y="62" width="76" height="10" rx="5" fill="${W}" fill-opacity=".2"/><rect x="34" y="62" width="${f(76*Math.max(.03,(D.pct??0)/100))}" height="10" rx="5" fill="${W}"/>`+txt(72,90,(D.pct??0)+'% CPU',13,W,700),
	procs:ink=>[0,1,2,3,4,5].map(i=>{const on=(Math.floor(P*6)+i)%3===0;return `<rect x="${28+(i%3)*30}" y="${30+Math.floor(i/3)*30}" width="24" height="24" rx="6" fill="${W}" opacity="${on?1:.35}"/>`}).join('')+txt(72,104,String(D.n??''),18,W),
	taskmgr:ink=>`<rect x="20" y="24" width="104" height="72" rx="10" ${soft(.14)} stroke="${W}" stroke-width="5"/><path d="M28 72l14 0 8-${f(10+14*live(P))} 10 26 10-38 8 20 10-6h12" ${st(W,5)}/>`,
	resmon:ink=>[0,1,2,3].map(i=>{const h=14+40*live(P+i*.21);return `<rect x="${28+i*23}" y="${f(96-h)}" width="16" height="${f(h)}" rx="4" fill="${W}" opacity="${.55+i*.15}"/>`}).join('')+`<path d="M22 98h100" ${st(W,4)} opacity=".5"/>`,
	sleep:ink=>`<path d="M84 26a36 36 0 1 0 24 52A30 30 0 0 1 84 26Z" fill="${W}"/>`+['z','z','Z'].map((z,i)=>{const k=(P+i/3)%1;return `<text x="${f(96+i*8)}" y="${f(48-k*26)}" font-family="Segoe UI" font-size="${12+i*4}" font-weight="900" fill="${W}" opacity="${f(1-k)}">${z}</text>`}).join(''),
	restart:ink=>`<g transform="rotate(${f(P*360)} 72 60)"><path d="M104 60a32 32 0 1 1-10-23" ${st(W,8)}/><path d="M98 22v18H80" ${st(W,8)}/></g>`,
	shutdown:ink=>pwr(wave(P))+`<circle cx="72" cy="60" r="${f(44+4*wave(P))}" ${st(W,3)} opacity="${f(.2+.3*wave(P))}"/>`,
	signout:ink=>`<path d="M60 26H34a8 8 0 0 0-8 8v52a8 8 0 0 0 8 8h26" ${st(W,7)}/><g transform="translate(${f(8*wave(P))} 0)"><path d="M58 60h50M92 44l16 16-16 16" ${st(W,8)}/></g>`,
	powerplan:ink=>{const a=-120+240*wave(P);return `<path d="M30 84a42 42 0 0 1 84 0" ${st(W,8)} opacity=".35"/><path d="M30 84a42 42 0 0 1 ${f(42-42*Math.cos(a*Math.PI/360+Math.PI/2))} 0" ${st(W,8)}/><g transform="rotate(${f(a/2)} 72 84)"><path d="M72 84V50" ${st(W,6)}/></g><circle cx="72" cy="84" r="8" fill="${W}"/><path d="M66 22l-8 14h10l-6 12" ${st(W,4)}/>`+txt(98,104,'',12,W)},
	service:ink=>`<g transform="rotate(${f(P*180)} 56 56)"><circle cx="56" cy="56" r="20" ${st(W,8)}/>${Array.from({length:6},(_,i)=>`<rect x="52" y="26" width="8" height="10" rx="2" fill="${W}" transform="rotate(${i*60} 56 56)"/>`).join('')}</g><g transform="rotate(${f(-P*240)} 94 84)"><circle cx="94" cy="84" r="12" ${st(W,6)}/>${Array.from({length:6},(_,i)=>`<rect x="91" y="66" width="6" height="7" rx="2" fill="${W}" transform="rotate(${i*60} 94 84)"/>`).join('')}</g>`,
	emptybin:ink=>`<path d="M36 36h72M60 36v-8h24v8" ${st(W,6)}/><path d="M42 44l6 56h48l6-56Z" fill="${W}"/>`+[0,1,2].map(i=>{const k=(P+i/3)%1;return `<rect x="${60+i*10}" y="${f(20+k*40)}" width="6" height="8" rx="2" fill="${W}" opacity="${f(1-k)}" transform="rotate(${i*25} ${63+i*10} 30)"/>`}).join(''),
	wifiradio:ink=>[0,1,2].map(i=>`<path d="M${f(72-14-i*13)} 74a${14+i*13} ${14+i*13} 0 0 1 ${2*(14+i*13)} 0" ${st(W,7)} opacity="${f(i<=Math.floor(P*3)%3?1:.3)}"/>`).join('')+`<circle cx="72" cy="80" r="7" fill="${W}"/>`,
	bluetooth:ink=>`<path d="M54 40l36 34-18 16V30l18 16-36 34" ${st(W,7)}/>`+[0,1].map(i=>`<path d="M${f(100+i*10)} ${f(44)}a${f(14+i*8)} ${f(14+i*8)} 0 0 1 0 ${f(28)}" ${st(W,4)} opacity="${f(wave(P+i*.3))}"/>`).join(''),
	airplane:ink=>`<g transform="translate(${f(-10+20*P)} ${f(6-12*P)}) rotate(-35 72 60)"><path d="M72 18c5 0 7 6 7 12v20l34 18v8l-34-8v18l10 8v6l-17-5-17 5v-6l10-8V68l-34 8v-8l34-18V30c0-6 2-12 7-12z" fill="${W}"/></g>`,
	dnd:ink=>`<circle cx="72" cy="60" r="40" fill="${W}"/><rect x="${f(46+2*wave(P))}" y="54" width="${f(52-4*wave(P))}" height="12" rx="6" fill="${ink}"/>`,
	holding:ink=>{const C=2*Math.PI*48,k=Math.min(1,(P%1)*1.6);return pwr(0)+`<circle cx="72" cy="60" r="48" ${st(W,6)} opacity=".25"/><circle cx="72" cy="60" r="48" ${st(W,6)} stroke-dasharray="${f(C*k)} ${f(C)}" transform="rotate(-90 72 60)"/>`+(k>=1?txt(72,114,'',1,W):'')},
	hibernate:ink=>`<rect x="26" y="40" width="80" height="44" rx="8" ${soft(.14)} stroke="${W}" stroke-width="5"/><rect x="106" y="54" width="8" height="16" rx="3" fill="${W}"/><rect x="34" y="48" width="${f(64*(1-wave(P)*.7))}" height="28" rx="4" fill="${W}"/>`+moon(60,26,10),
	forceclose:ink=>`<rect x="20" y="30" width="80" height="60" rx="10" ${soft(.14)} stroke="${W}" stroke-width="5"/><path d="M20 46h80" ${st(W,4)}/><g transform="translate(0 ${f(-6*wave(P))})"><circle cx="100" cy="82" r="22" fill="${W}"/><path d="M92 74l16 16M108 74L92 90" ${st(ink,6)}/></g><path d="M40 66l8 8M48 66l-8 8M66 66l8 8M74 66l-8 8" ${st(W,4)}/>`,
	closeapp:ink=>{const k=wave(P);return `<rect x="18" y="26" width="108" height="70" rx="10" ${soft(.14)} stroke="${W}" stroke-width="5"/><path d="M18 44h108" ${st(W,4)}/><rect x="100" y="28" width="24" height="16" rx="3" fill="${W}" opacity="${f(.4+.6*k)}"/><path d="M107 31l10 10M117 31l-10 10" ${st(ink,3)}/><path d="M${f(80+14*k)} ${f(80-38*k)}l0 22 6-6 6 11 4-2-6-11 8 0Z" fill="${W}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>`},
	timer:ink=>{const C=2*Math.PI*38,k=D.frac??0;return `<circle cx="72" cy="58" r="38" ${st(W,8)} opacity=".25"/><circle cx="72" cy="58" r="38" ${st(W,8)} stroke-dasharray="${f(C*(1-k))} ${f(C)}" transform="rotate(-90 72 58)"/>`+txt(72,68,D.text??'05:00',D.text&&D.text.length>5?18:24,W)},
	stopwatch:ink=>`<circle cx="72" cy="64" r="36" ${soft(.14)} stroke="${W}" stroke-width="6"/><path d="M64 20h16M72 20v8M100 34l6-6" ${st(W,6)}/><g transform="rotate(${f(P*360)} 72 64)"><path d="M72 64V38" ${st(W,6)}/></g><circle cx="72" cy="64" r="5" fill="${W}"/>`,
	pomodoro:ink=>{const C=2*Math.PI*30;return `<path d="M72 26c-4-8-12-10-18-8 8 2 12 6 14 10" fill="${W}"/><path d="M76 28c6-6 14-6 18-2-6 0-10 2-14 6" fill="${W}"/><circle cx="72" cy="66" r="38" fill="${W}"/><circle cx="72" cy="66" r="26" fill="none" stroke="${ink}" stroke-opacity=".3" stroke-width="6"/><circle cx="72" cy="66" r="26" fill="none" stroke="${ink}" stroke-width="6" stroke-dasharray="${f(2*Math.PI*26*(1-(D.frac??0)))} 400" transform="rotate(-90 72 66)" stroke-linecap="round"/>`+txt(72,72,D.text??'25',D.text&&D.text.length>3?13:18,ink)},
	clock:ink=>{const now=new Date(),hh=now.getHours(),mm=String(now.getMinutes()).padStart(2,'0');const t=D.time??`${hh%12||12}:${mm}`,d=D.date??now.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});return txt(72,62,t,String(t).length>5?30:38,W)+txt(72,84,d,13,W,700)+`<circle cx="${f(96)}" cy="40" r="3" fill="${W}" opacity="${f(P<.5?1:.2)}"/>`},
	worldclock:ink=>`<circle cx="72" cy="54" r="36" ${soft(.14)} stroke="${W}" stroke-width="5"/><ellipse cx="72" cy="54" rx="${f(12+10*wave(P))}" ry="36" ${st(W,4)}/><path d="M36 54h72" ${st(W,4)}/>`+txt(72,108,D.text??'',14,W,800),
	runcmd:ink=>{const st0=D.state||'idle';return `<rect x="18" y="24" width="108" height="72" rx="10" ${soft(.14)} stroke="${W}" stroke-width="5"/><path d="M32 44l12 10-12 10" ${st(W,6)}/>`+(st0==='ok'?`<circle cx="98" cy="70" r="14" fill="${W}"/><path d="M91 70l5 5 10-10" ${st(ink,5)}/>`:st0==='fail'?`<circle cx="98" cy="70" r="14" fill="#FF4D5E"/><path d="M92 64l12 12M104 64l-12 12" ${st('#fff',4)}/>`:`<path d="M52 64h${f(st0==='running'?16+22*((P*3)%1):10)}" ${st(W,6)} opacity="${st0==='running'?1:f(P%.5<.25?1:.2)}"/>`)},
	terminal:ink=>`<rect x="18" y="24" width="108" height="72" rx="10" fill="${W}"/><path d="M18 40h108" ${st(ink,3)}/><path d="M32 54l12 10-12 10" ${st(ink,6)}/><rect x="52" y="70" width="18" height="6" rx="2" fill="${ink}" opacity="${f(P%.5<.25?1:.15)}"/>`,
	snippet:ink=>`<rect x="22" y="26" width="100" height="68" rx="10" ${soft(.14)} stroke="${W}" stroke-width="5"/>`+[0,1,2].map(i=>`<path d="M34 ${46+i*16}h${f(Math.max(0,Math.min(70,(P*3-i)*70)))}" ${st(W,6)}/>`).join('')+`<path d="M${f(34+70*Math.min(1,(P*3)%1))} ${46+16*Math.min(2,Math.floor(P*3))-8}v16" ${st(W,3)}/>`,
	macro:ink=>['Ctrl','K','S'].map((t,i)=>{const on=Math.floor(P*3)===i;return `<rect x="${[18,74,104][i]}" y="${on?42:38}" width="${i?26:50}" height="36" rx="7" fill="${W}" opacity="${on?1:.5}"/>`+txt([43,87,117][i],on?66:62,t,i?16:14,ink)}).join(''),
	workspace:ink=>[0,1,2,3].map(i=>{const k=Math.min(1,Math.max(0,P*4-i));return `<rect x="${24+(i%2)*50}" y="${24+Math.floor(i/2)*38}" width="44" height="32" rx="6" fill="${W}" opacity="${f(.2+.8*k)}" transform="translate(0 ${f(8*(1-k))})"/>`}).join(''),
	healthcheck:ink=>{const down=D.up===false,x=14+116*P,cid="hc"+(++uid).toString(36);const line=down?`<path d="M14 62h116" ${st(W,6)} opacity=".45"/>`:`<path d="M14 62h30l8-20l12 40l10-32l7 12h49" ${st(W,6)}/><clipPath id="${cid}"><rect x="${f(x-26)}" y="20" width="26" height="80"/></clipPath><path d="M14 62h30l8-20l12 40l10-32l7 12h49" ${st(W,9)} opacity=".35" clip-path="url(#${cid})"/><circle cx="${f(x)}" cy="62" r="4" fill="${W}" opacity="${f(.4+.6*wave(P))}"/>`;return `<rect x="14" y="24" width="116" height="76" rx="12" ${soft(.1)}/>`+line+txt(72,106,down?(D.code?String(D.code)+' DOWN':'DOWN'):D.code?`${D.code} · ${D.ms}ms`:'',15,W)},
	portcheck:ink=>{const k=wave(P);return `<rect x="${f(18+12*k)}" y="44" width="40" height="32" rx="6" fill="${W}"/><path d="M${f(58+12*k)} 52h10M${f(58+12*k)} 68h10" ${st(W,6)}/><rect x="84" y="40" width="40" height="40" rx="8" ${soft(.2)} stroke="${W}" stroke-width="5"/><circle cx="104" cy="60" r="${f(5+3*k)}" fill="${W}" opacity="${f(D.up===false?.15:.3+.7*k)}"/>`+txt(72,104,(D.port?':'+D.port:'')+(D.up===false?' DOWN':D.up?' UP':''),14,W)},
	guid:ink=>txt(72,50,'{ id }',26,W)+`<rect x="22" y="64" width="100" height="22" rx="6" ${soft(.2)}/>`+txt(72,80,'7f3a-…'+['c1','9e','4b'][Math.floor(P*3)],13,W,800),
	timestamp:ink=>`<rect x="24" y="28" width="96" height="66" rx="10" ${soft(.14)} stroke="${W}" stroke-width="5"/><path d="M24 44h96M46 22v12M98 22v12" ${st(W,5)}/>`+txt(72,74,String(1793000000+Math.floor(P*12)).slice(-6),18,W),
	cliptools:ink=>`<rect x="34" y="20" width="64" height="84" rx="10" fill="${W}"/><rect x="50" y="14" width="32" height="14" rx="5" fill="${ink}" stroke="${W}" stroke-width="4"/>`+txt(66,66,['{ }','B64','Aa'][Math.floor(P*3)],20,ink)+`<g transform="rotate(${f(P*360)} 104 84)"><circle cx="104" cy="84" r="12" fill="${ink}" stroke="${W}" stroke-width="4"/></g>`,
	textcase:ink=>txt(72,70,['Aa','AA','aa'][Math.floor(P*3)],44,W)+`<path d="M34 86h${f(76*wave(P))}" ${st(W,5)}/>`,
	clip30:ink=>`<path d="M100 60a32 32 0 1 1-10-23" ${st(W,7)}/><g transform="rotate(${f(-90*wave(P))} 72 60)"><path d="M94 22v18H76" ${st(W,7)}/></g>`+txt(72,70,'30s',24,W),
	recidle:ink=>`<circle cx="72" cy="60" r="40" ${soft(.14)} stroke="${W}" stroke-width="5"/><circle cx="72" cy="60" r="${f(18+4*wave(P))}" fill="${W}"/>`,
	recon:ink=>`<rect x="16" y="34" width="112" height="52" rx="26" fill="${W}"/><circle cx="42" cy="60" r="10" fill="${ink}" opacity="${f(P%.5<.25?1:.25)}"/>`+txt(84,68,D.text??'REC',20,ink),
	gameshot:ink=>`<path d="M22 42h20l8-12h44l8 12h20v54H22Z" fill="${W}"/><circle cx="72" cy="68" r="${f(18+3*wave(P))}" fill="${ink}"/><path d="M72 58v20M62 68h20" ${st(W,4)}/><circle cx="108" cy="${f(30)}" r="${f(3+3*wave(P))}" fill="${W}" opacity="${f(wave(P))}"/>`,
	perf:ink=>{const a=-60+120*wave(P);return `<rect x="20" y="24" width="104" height="72" rx="10" ${soft(.14)} stroke="${W}" stroke-width="5"/><path d="M40 82a32 32 0 0 1 64 0" ${st(W,7)}/><g transform="rotate(${f(a)} 72 82)"><path d="M72 82V56" ${st(W,6)}/></g><circle cx="72" cy="82" r="6" fill="${W}"/>`},
	mktopen:ink=>{const C=2*Math.PI*38,k=D.frac??0;return `<circle cx="72" cy="58" r="38" ${st(W,7)} opacity=".22"/><circle cx="72" cy="58" r="38" ${st(W,7)} stroke-dasharray="${f(C*k)} ${f(C)}" transform="rotate(-90 72 58)"/>`+txt(72,52,'OPEN',13,W,800)+txt(72,74,D.text??'',22,W)+`<circle cx="72" cy="20" r="${f(3+2*wave(P))}" fill="${W}"/>`},
	mktpre:ink=>`<circle cx="72" cy="58" r="38" ${st(W,7)} opacity=".22" stroke-dasharray="6 8"/>`+txt(72,52,String(D.state??'closed').toUpperCase().slice(0,6),13,W,800)+txt(72,74,D.text??'',22,W)+`<path d="M44 96h${f(56*wave(P))}" ${st(W,4)}/>`,
	bell:ink=>`<g transform="rotate(${f(14*Math.sin(P*T*3))} 72 24)"><path d="M48 76V54a24 24 0 0 1 48 0v22l8 8H40z" fill="${W}"/><path d="M64 92a8 8 0 0 0 16 0" ${st(W,5)}/></g>`+[0,1].map(i=>`<path d="M${i?112:32} 40q${i?8:-8} 14 0 28" ${st(W,4)} opacity="${f(wave(P+i*.5))}"/>`).join(''),
	journal:ink=>`<rect x="30" y="20" width="72" height="84" rx="8" fill="${W}"/><path d="M30 20v84" ${st(ink,6)}/>`+[0,1,2].map(i=>`<path d="M46 ${44+i*16}h${f(Math.max(0,Math.min(40,(P*3-i)*40)))}" ${st(ink,5)}/>`).join('')+`<g transform="translate(${f(30*((P*3)%1))} ${f(16*Math.min(2,Math.floor(P*3)))})"><path d="M92 34l14-14 8 8-14 14-10 2z" fill="${W}" stroke="${ink}" stroke-width="3"/></g>`,
	toscreen:ink=>{const x=74-52*wave(P);return `<rect x="14" y="30" width="54" height="40" rx="7" ${soft(.14)} stroke="${W}" stroke-width="5"/><rect x="76" y="30" width="54" height="40" rx="7" ${soft(.14)} stroke="${W}" stroke-width="5"/><rect x="${f(x+6)}" y="38" width="28" height="22" rx="4" fill="${W}"/>`+txt(41,92,String(D.from??1),18,W)+txt(103,92,String(D.n??2),18,W)},
	gamebar:ink=>{const on=Math.floor(P*8)%4,t=5*Math.sin(P*T);return `<g transform="rotate(${f(t)} 72 70)">`+twin(ink)+dpad(ink)+face(ink,on)+sticks(ink,3*Math.cos(P*T*2),3*Math.sin(P*T*2))+`<rect x="${f(56+26*wave(P))}" y="44" width="6" height="18" rx="3" fill="${ink}" opacity=".7"/></g>`+[0,1,2].map(i=>{const k=Math.min(1,Math.max(0,(P*4-i)));return `<rect x="${32+i*28}" y="${f(12+6*(1-k))}" width="22" height="14" rx="4" fill="${W}" opacity="${f(k*.9)}"/>`}).join('')},
	gamemode:ink=>twin(ink)+dpad(ink)+face(ink,-1)+sticks(ink)+`<path d="M76 46l-8 8h8l-6 8" ${st(ink,3)}/>`+[0,1,2].map(i=>{const k=(P*2+i/3)%1;return `<path d="M${46+i*26} 100q${f(-4+8*k)} ${f(8+10*k)} 0 ${f(14+10*k)}" ${st(W,5)} opacity="${f(1-k)}"/>`}).join(''),
	micmute:ink=>D.muted?FX.micmuted(ink):FX.miclive(ink),
	record:ink=>D.on?FX.recon(ink):FX.recidle(ink),
	market:ink=>D.state==='open'?FX.mktopen(ink):FX.mktpre(ink),
	// Pivot monitor: the panel spins 90° on its stand to portrait, rests, then spins back (twice per 12 s loop).
	rotate: (ink) => {
		const ease = (t) => { t = Math.min(1, Math.max(0, t)); const s = 1.4; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
		const k = P < .5 ? ease((P - .1) / .28) : 1 - ease((P - .6) / .28);
		const turning = P < .5 ? (P > .08 && P < .42) : (P > .58 && P < .92);
		const t = P < .5 ? Math.min(1, Math.max(0, (P - .1) / .28)) : Math.min(1, Math.max(0, (P - .6) / .28));
		const a = 90 * k, cid = "rot" + (++uid).toString(36);
		const panel = `<rect x="-42" y="-27" width="84" height="54" rx="7"/>`;
		// Desktop inside the panel: wallpaper hill, a window and a taskbar, so the turn reads as a real screen.
		const desk = `<clipPath id="${cid}">${panel}</clipPath><g clip-path="url(#${cid})">` +
			`<rect x="-42" y="-27" width="84" height="54" ${soft(.16)}/>` +
			`<path d="M-42 14q16-16 30-6t28-6q14-4 26 4v21h-84Z" ${soft(.3)}/>` +
			`<circle cx="24" cy="-12" r="6" ${soft(.55)}/>` +
			`<rect x="-30" y="-17" width="38" height="24" rx="3" fill="${ink}" stroke="${W}" stroke-width="2.5"/><path d="M-30 -10h38" ${st(W, 2)}/>` +
			`<rect x="-42" y="19" width="84" height="8" ${soft(.85)}/>` + [-8, 0, 8].map((x) => `<rect x="${x - 2.5}" y="21" width="5" height="4" rx="1" fill="${ink}"/>`).join("") +
			`<rect x="${f(-70 + 140 * t)}" y="-40" width="14" height="80" fill="${W}" opacity="${turning ? .22 : 0}" transform="rotate(20)"/></g>` +
			`<rect x="-42" y="-27" width="84" height="54" rx="7" fill="none" stroke="${W}" stroke-width="5"/>`;
		// Arc arrow follows the spin: clockwise to portrait, back the other way.
		const r = 58, cw = P < .5, start = cw ? -40 : 50, sweep = cw ? 90 * t : -90 * t;
		const pt = (deg) => [72 + r * Math.cos(deg * Math.PI / 180), 56 + r * Math.sin(deg * Math.PI / 180)];
		const [x0, y0] = pt(start), [x1, y1] = pt(start + sweep), head = start + sweep, dir = cw ? 1 : -1;
		const arc = turning && t > .02 ? `<g opacity="${f(Math.sin(Math.PI * t) * .95)}"><path d="M${f(x0)} ${f(y0)}A${r} ${r} 0 0 ${cw ? 1 : 0} ${f(x1)} ${f(y1)}" ${st(W, 5)}/>` +
			`<path d="M-7 -6L0 0L-7 6" ${st(W, 5)} transform="translate(${f(x1)} ${f(y1)}) rotate(${f(head + 90 * dir)}) scale(${dir} 1)"/></g>` : "";
		return `<path d="M72 84v18M54 106h36" ${st(W, 6)}/><circle cx="72" cy="56" r="5" fill="${W}"/>` +
			`<g transform="translate(72 56) rotate(${f(a)})">${desk}</g>` + arc;
	},
	nextpage: () =>
		`<rect x="34" y="22" width="76" height="76" rx="8" ${soft(.14)} stroke="${W}" stroke-width="6"/>` +
		`<path d="M61 39l20 21-20 21" ${st(W, 7)} transform="translate(${f(9 * wave(P))} 0)"/>`,
};

/** Animated art for a feature glyph. The whole icon bobs and pulses once per loop; details run twice. */
export function fxArt(glyph, ink, phase = 0, data = {}, moving = true) {
	const p0 = ((phase % 1) + 1) % 1;
	P = moving ? (p0 * 2) % 1 : 0; D = data || {};
	let art = FX[glyph](ink);
	P = 0; D = {};
	if (data && data.off) art = `<g opacity=".38">${art}</g><path d="M30 104L114 20" ${st(W, 8)}/>`;
	if (data && data.hold > 0) {
		const C = 2 * Math.PI * 50;
		art += `<circle cx="72" cy="60" r="50" ${st(W, 6)} opacity=".25"/><circle cx="72" cy="60" r="50" ${st("#FF4D5E", 7)} stroke-dasharray="${f(C * Math.min(1, data.hold))} ${f(C)}" transform="rotate(-90 72 60)"/>`;
	}
	if (!moving) return art;
	const bob = -5 * Math.sin(p0 * T * 2), sc = 1 + .07 * wave(p0 * 2);
	return `<g transform="translate(72 60) scale(${f(sc)}) translate(-72 -60) translate(0 ${f(bob)})">${art}</g>`;
}
export const hasFx = (glyph) => Object.prototype.hasOwnProperty.call(FX, glyph);
