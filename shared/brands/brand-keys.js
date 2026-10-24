// Companion key artwork shared by the app plugins (Claude, ChatGPT, …).
// Each brand has its own palette ("App" dark look and a Light look); all brands share one original icon set.
// Token names are historical: `clay` is the brand accent, `clayLight` its lighter tint.
// No logos are reproduced. Every icon has its own seamless 6-second animation (phase 0..1).
// No SVG filters (Stream Deck's renderer ignores them); labels never move.

export const CLAUDE_TOKENS = {
	bgTop: "#2C2B28", bgBottom: "#1A1917", edge: "#3D3B36",
	ink: "#F3EFE6", muted: "#8F8A80", faint: "#4A4741",
	clay: "#D97757", clayLight: "#EDA788", surface: "#2A2926", cut: "#1A1917",
	serif: "Georgia, 'Times New Roman', 'DejaVu Serif', serif",
};

// Key labels: Segoe UI Bold, the same family as Windows Daily Toolkit (title case on Claude Dark/Light).
export const LABEL_FONT = "'Segoe UI', 'DejaVu Sans', Arial, sans-serif";

// Mutable palette used while one key renders (renders are synchronous, so this is safe).
const T = { ...CLAUDE_TOKENS };
const TAU = Math.PI * 2;
const f = (n) => (Math.round(n * 100) / 100).toString();
const wave = (p) => (1 - Math.cos(p * TAU)) / 2; // 0 → 1 → 0
const sline = (c = T.ink, w = 5.5) => `stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const line = (c = T.ink, w = 5.5) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

function sparkle(cx, cy, r, color, opacity) {
	const k = r * 0.28;
	return `<path d="M${f(cx)} ${f(cy - r)}Q${f(cx + k)} ${f(cy - k)} ${f(cx + r)} ${f(cy)}Q${f(cx + k)} ${f(cy + k)} ${f(cx)} ${f(cy + r)}Q${f(cx - k)} ${f(cy + k)} ${f(cx - r)} ${f(cy)}Q${f(cx - k)} ${f(cy - k)} ${f(cx)} ${f(cy - r)}Z" fill="${color}" opacity="${f(opacity)}"/>`;
}

function magnifier(cx, cy, r, inner = "") {
	return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${T.ink}" fill-opacity=".06" ${sline()}/>` + inner +
		`<path d="M${f(cx + r * 0.72)} ${f(cy + r * 0.72)}L${f(cx + r * 1.45)} ${f(cy + r * 1.45)}" ${line(T.ink, 7)}/>`;
}

function gear(cx, cy, rot) {
	let teeth = "";
	for (let i = 0; i < 8; i++) teeth += `<rect x="${f(cx - 5.5)}" y="${f(cy - 33)}" width="11" height="12" rx="3" fill="${T.ink}" transform="rotate(${i * 45} ${cx} ${cy})"/>`;
	return `<g transform="rotate(${f(rot)} ${cx} ${cy})">${teeth}<circle cx="${cx}" cy="${cy}" r="24" ${line()}/></g>`;
}

/** Icon artwork per glyph, drawn around (72, 56). */
export const ART = {
	back: (p) => {
		const dx = -7 * wave(p);
		return `<g transform="translate(${f(dx)} 0)"><path d="M100 56H48M68 36L48 56l20 20" ${line(T.ink, 6.5)}/></g>` +
			[0, 1, 2].map((i) => `<circle cx="${f(108 - i * 9 + dx * 0.4)}" cy="56" r="3" fill="${T.clay}" opacity="${f(Math.max(0, wave(p) - i * 0.25))}"/>`).join("");
	},
	newchat: (p) => {
		const s = 1 + 0.14 * wave(p), r = 90 * p;
		return `<path d="M40 26h64a10 10 0 0 1 10 10v34a10 10 0 0 1-10 10H70L52 94V80H40a10 10 0 0 1-10-10V36a10 10 0 0 1 10-10z" fill="${T.ink}" fill-opacity=".06" ${sline()}/>` +
			`<g transform="translate(72 53) scale(${f(s)})"><path d="M0 -13V13M-13 0H13" ${line(T.clay, 6.5)}/></g>` +
			sparkle(112, 22, 7, T.clayLight, wave((p + 0.3) % 1)) + sparkle(122, 38, 4, T.clay, wave((p + 0.65) % 1));
	},
	usage: (p) => {
		const v = 0.22 + 0.6 * wave(p), R = 36, L = Math.PI * R, a = Math.PI * (1 - v);
		const nx = 72 + (R - 9) * Math.cos(a), ny = 76 - (R - 9) * Math.sin(a);
		let ticks = "";
		for (let i = 0; i <= 4; i++) { const t = Math.PI * (1 - i / 4); ticks += `<path d="M${f(72 + 44 * Math.cos(t))} ${f(76 - 44 * Math.sin(t))}L${f(72 + 49 * Math.cos(t))} ${f(76 - 49 * Math.sin(t))}" ${line(T.muted, 3)}/>`; }
		return ticks + `<path d="M36 76A36 36 0 0 1 108 76" ${line(T.faint, 9)}/>` +
			`<path d="M36 76A36 36 0 0 1 108 76" fill="none" stroke="${T.clay}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${f(L * v)} ${f(L)}"/>` +
			`<path d="M72 76L${f(nx)} ${f(ny)}" ${line(T.ink, 5)}/><circle cx="72" cy="76" r="6" fill="${T.ink}"/>` +
			`<path d="M50 92h44" ${line(T.muted, 3)}/>`;
	},
	search: (p) => {
		const x = 58 + 18 * Math.sin(p * TAU);
		return `<path d="M30 32h52M30 48h70M30 64h40M30 80h58" ${line(T.faint, 5)}/>` +
			`<rect x="${f(x - 16)}" y="${f(44)}" width="32" height="8" rx="4" fill="${T.clay}" opacity=".85"/>` +
			magnifier(x, 48, 17) ;
	},
	find: (p) => {
		const sweep = (p * 1.25) % 1, x = 32 + sweep * 64, o = Math.sin(Math.min(1, sweep) * Math.PI);
		return `<rect x="26" y="22" width="92" height="68" rx="10" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 4.5)}/>` +
			`<rect x="${f(x - 4)}" y="45" width="26" height="12" rx="3" fill="${T.clay}" opacity="${f(0.25 + 0.75 * o)}"/>` +
			`<path d="M38 38h56M38 51h68M38 64h44M38 77h60" ${line(T.muted, 4)}/>`;
	},
	sidebar: (p) => {
		const w = 20 + 12 * wave(p);
		return `<rect x="26" y="24" width="92" height="66" rx="10" fill="${T.ink}" fill-opacity=".05" ${sline()}/>` +
			`<path d="M36 24h${f(w)}v66H36a10 10 0 0 1-10-10V34a10 10 0 0 1 10-10z" fill="${T.clay}" opacity=".9"/>` +
			`<path d="M${f(30 + w)} 38h${f(76 - w)}M${f(30 + w)} 52h${f(56 - w)}M${f(30 + w)} 66h${f(66 - w)}" ${line(T.muted, 4)}/>`;
	},
	settings: (p) => gear(72, 56, p * 45) + `<circle cx="72" cy="56" r="8" fill="${T.clay}"/>`,
	shortcuts: (p) => {
		const lit = Math.floor(p * 9) % 9; let keys = "";
		for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
			const i = r * 5 + c, on = i === lit;
			keys += `<rect x="${32 + c * 17}" y="${38 + r * 16}" width="12" height="10" rx="2.5" fill="${on ? T.clay : T.muted}" opacity="${on ? 1 : 0.7}"/>`;
		}
		return `<rect x="22" y="26" width="100" height="62" rx="10" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 4.5)}/>` + keys +
			`<rect x="46" y="72" width="52" height="8" rx="3" fill="${lit === 9 ? T.clay : T.muted}" opacity=".7"/>`;
	},
	zoomin: (p) => {
		const s = 1 + 0.1 * wave(p);
		return `<g transform="translate(64 50) scale(${f(s)}) translate(-64 -50)">${magnifier(64, 50, 25, `<path d="M64 39v22M53 50h22" ${line(T.clay, 6)}/>`)}</g>`;
	},
	zoomout: (p) => {
		const s = 1 - 0.1 * wave(p);
		return `<g transform="translate(64 50) scale(${f(s)}) translate(-64 -50)">${magnifier(64, 50, 25, `<path d="M53 50h22" ${line(T.clay, 6)}/>`)}</g>`;
	},
	resetzoom: (p) => {
		const d = 6 * wave(p);
		const c = (x, y, sx, sy) => `<path d="M${f(x)} ${f(y + 14 * sy)}V${f(y)}H${f(x + 14 * sx)}" ${line(T.ink, 5.5)}/>`;
		return c(30 + d, 22 + d, 1, 1) + c(114 - d, 22 + d, -1, 1) + c(30 + d, 90 - d, 1, -1) + c(114 - d, 90 - d, -1, -1) +
			`<text x="72" y="65" text-anchor="middle" font-family="${T.serif}" font-size="24" font-weight="700" fill="${T.clay}">1:1</text>`;
	},
	copy: (p) => {
		const d = 7 * wave(p);
		return `<rect x="30" y="20" width="54" height="64" rx="8" fill="none" stroke="${T.muted}" stroke-width="4.5"/>` +
			`<g transform="translate(${f(d)} ${f(d * 0.6)})"><rect x="52" y="34" width="56" height="64" rx="8" fill="${T.surface}" ${sline()}/>` +
			`<path d="M63 52h34M63 64h34M63 76h22" ${line(T.clay, 4.5)}/></g>`;
	},
	paste: (p) => {
		const drop = -14 * (1 - wave(p)), o = 0.35 + 0.65 * wave(p);
		return `<rect x="34" y="26" width="76" height="72" rx="10" fill="${T.ink}" fill-opacity=".05" ${sline()}/>` +
			`<rect x="54" y="18" width="36" height="16" rx="5" fill="${T.clay}"/>` +
			`<g transform="translate(0 ${f(drop)})" opacity="${f(o)}"><path d="M48 54h48M48 68h48M48 82h30" ${line(T.muted, 4.5)}/></g>`;
	},
	undo: (p) => {
		const r = -22 * wave(p);
		return `<g transform="rotate(${f(r)} 76 60)"><path d="M48 46h38a20 20 0 0 1 0 40H58" ${line(T.ink, 6)}/><path d="M60 32L46 46l14 14" ${line(T.ink, 6)}/></g>` +
			`<circle cx="${f(58)}" cy="86" r="4" fill="${T.clay}" transform="rotate(${f(r)} 76 60)"/>`;
	},
	redo: (p) => {
		const r = 22 * wave(p);
		return `<g transform="rotate(${f(r)} 68 60)"><path d="M96 46H58a20 20 0 0 0 0 40h28" ${line(T.ink, 6)}/><path d="M84 32l14 14-14 14" ${line(T.ink, 6)}/></g>` +
			`<circle cx="86" cy="86" r="4" fill="${T.clay}" transform="rotate(${f(r)} 68 60)"/>`;
	},
	focus: (p) => {
		const d = 5 * wave(p);
		return `<rect x="38" y="32" width="68" height="48" rx="7" fill="${T.ink}" fill-opacity=".06" ${sline(T.ink, 4.5)}/><path d="M38 44h68" ${line(T.muted, 3)}/>` +
			[[24, 20, 1, 1], [120, 20, -1, 1], [24, 92, 1, -1], [120, 92, -1, -1]].map(([x, y, sx, sy]) =>
				`<path d="M${f(x - d * sx)} ${f(y + 12 * sy - d * sy)}V${f(y - d * sy)}H${f(x + 12 * sx - d * sx)}" ${line(T.clay, 5)}/>`).join("");
	},
	shortcut: (p) => {
		const press = Math.max(0, Math.sin(p * TAU * 2)) ** 6 * 4;
		return `<rect x="36" y="${f(26 + press)}" width="72" height="62" rx="12" fill="${T.surface}" ${sline(T.ink, 5)}/>` +
			`<path d="M36 ${f(76 + press)}h72" stroke="${T.faint}" stroke-width="3"/>` +
			`<text x="72" y="${f(66 + press)}" text-anchor="middle" font-family="${T.serif}" font-size="30" font-weight="700" fill="${T.clay}">K</text>`;
	},
	projects: (p) => {
		const lift = -8 * wave(p);
		return `<rect x="46" y="${f(26 + lift)}" width="52" height="34" rx="5" fill="${T.clayLight}" opacity=".9"/>` +
			`<rect x="52" y="${f(32 + lift * 0.5)}" width="52" height="34" rx="5" fill="${T.clay}"/>` +
			`<path d="M26 46a8 8 0 0 1 8-8h20l8 8h48a8 8 0 0 1 8 8v30a8 8 0 0 1-8 8H34a8 8 0 0 1-8-8z" fill="${T.surface}" ${sline()}/>`;
	},
	recents: (p) => {
		const a = p * 360;
		return `<circle cx="72" cy="56" r="33" fill="${T.ink}" fill-opacity=".05" ${sline()}/>` +
			`<path d="M72 56V36" ${line(T.ink, 5)} transform="rotate(${f(a / 12)} 72 56)"/>` +
			`<path d="M72 56h20" ${line(T.clay, 5)} transform="rotate(${f(a)} 72 56)"/><circle cx="72" cy="56" r="4.5" fill="${T.ink}"/>`;
	},
	code: (p) => {
		const on = (p * 4) % 1 < 0.55;
		return `<path d="M54 34L30 56l24 22M90 34l24 22-24 22" ${line(T.ink, 6.5)}/>` +
			`<rect x="69" y="40" width="6" height="32" rx="2" fill="${T.clay}" opacity="${on ? 1 : 0.15}"/>`;
	},
	cowork: (p) => {
		const step = Math.floor(p * 4) % 4;
		return [0, 1, 2].map((i) => {
			const y = 32 + i * 22, done = i < step;
			return `<rect x="32" y="${y - 8}" width="16" height="16" rx="4" fill="${done ? T.clay : "none"}" stroke="${done ? T.clay : T.muted}" stroke-width="3.5"/>` +
				(done ? `<path d="M36 ${y}l3.5 3.5L45 ${y - 4}" ${line(T.cut, 3)}/>` : "") +
				`<path d="M58 ${y}h${i === 1 ? 38 : 52}" ${line(done ? T.muted : T.ink, 5)}/>`;
		}).join("");
	},
	incognito: (p) => {
		const blink = ((p * 3) % 1) > 0.92 ? 0.15 : 1;
		return `<path d="M40 92V54a32 32 0 0 1 64 0v38l-10.7-8-10.6 8-10.7-8-10.7 8-10.6-8z" fill="${T.ink}" fill-opacity=".06" ${sline()}/>` +
			`<ellipse cx="60" cy="56" rx="5" ry="${f(7 * blink)}" fill="${T.clay}"/><ellipse cx="84" cy="56" rx="5" ry="${f(7 * blink)}" fill="${T.clay}"/>`;
	},
	stop: (p) => `<rect x="40" y="24" width="64" height="64" rx="16" fill="none" stroke="${T.ink}" stroke-width="5.5"/>` +
		`<rect x="54" y="38" width="36" height="36" rx="8" fill="${T.clay}" opacity="${f(0.55 + 0.45 * wave(p))}"/>`,
};
ART.fullscreen = (p) => {
	const d = 6 * wave(p);
	return `<rect x="48" y="38" width="48" height="36" rx="6" fill="${T.clay}" opacity=".85"/>` +
		[[30, 20, 1, 1], [114, 20, -1, 1], [30, 92, 1, -1], [114, 92, -1, -1]].map(([x, y, sx, sy]) =>
			`<path d="M${f(x - sx * d)} ${f(y + 16 * sy - sy * d)}V${f(y - sy * d)}H${f(x + 16 * sx - sx * d)}" ${line(T.ink, 6)}/>`).join("");
};

// ── More icons for the top-20 Claude features ──
Object.assign(ART, {
	main: (p) => ART.back(p),
	more: (p) => {
		const dx = 7 * wave(p);
		return [0, 1, 2].map((i) => `<circle cx="${34 + i * 16}" cy="56" r="5" fill="${i === Math.floor(p * 3) % 3 ? T.clay : T.muted}"/>`).join("") +
			`<g transform="translate(${f(dx)} 0)"><path d="M84 56h26M98 42l14 14-14 14" ${line(T.ink, 6.5)}/></g>`;
	},
	artifacts: (p) => `<rect x="26" y="24" width="92" height="66" rx="10" fill="${T.ink}" fill-opacity=".05" ${sline()}/><path d="M26 38h92" ${line(T.muted, 3)}/>` +
		`<g transform="rotate(${f(p * 90)} 56 66)"><rect x="46" y="56" width="20" height="20" rx="3" fill="${T.clay}"/></g>` +
		`<circle cx="92" cy="${f(66 - 5 * wave(p))}" r="11" fill="none" stroke="${T.ink}" stroke-width="4.5"/>`,
	copyresponse: (p) => {
		const d = 9 * wave(p);
		return `<path d="M30 24h56a8 8 0 0 1 8 8v28a8 8 0 0 1-8 8H50L36 80V68h-6a8 8 0 0 1-8-8V32a8 8 0 0 1 8-8z" fill="${T.ink}" fill-opacity=".06" ${sline(T.ink, 5)}/>` +
			`<path d="M36 40h40M36 52h28" ${line(T.muted, 4)}/>` +
			`<g transform="translate(${f(d * 0.6)} ${f(d * 0.5)})"><rect x="78" y="52" width="36" height="42" rx="6" fill="${T.surface}" ${sline(T.clay, 4.5)}/><path d="M86 66h20M86 77h14" ${line(T.clay, 4)}/></g>`;
	},
	connectors: (p) => {
		const gap = 6 + 6 * wave(p);
		return `<g transform="translate(${f(-gap / 2)} 0)"><path d="M28 56h18" ${line(T.ink, 6)}/><rect x="44" y="38" width="22" height="36" rx="6" fill="${T.surface}" ${sline(T.ink, 5)}/><path d="M66 46h10M66 66h10" ${line(T.ink, 5)}/></g>` +
			`<g transform="translate(${f(gap / 2)} 0)"><rect x="80" y="38" width="22" height="36" rx="6" fill="${T.clay}"/><path d="M102 56h16" ${line(T.clay, 6)}/></g>` +
			sparkle(78, 56, 7, T.clayLight, 1 - wave(p));
	},
	editlast: (p) => {
		const L = 64, drawn = L * (0.15 + 0.85 * ((p * 1.15) % 1));
		const x = 36 + Math.min(L, drawn);
		return `<path d="M36 88h64" ${line(T.faint, 5)}/><path d="M36 88h${f(L)}" fill="none" stroke="${T.clay}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${f(Math.min(L, drawn))} 200"/>` +
			`<g transform="translate(${f(x - 36)} 0)"><path d="M30 80l5-16 36-36 12 12-36 36z" fill="${T.surface}" ${sline(T.ink, 5)}/><path d="M64 34l12 12" ${line(T.ink, 4)}/></g>`;
	},
	focusinput: (p) => {
		const on = (p * 4) % 1 < 0.55;
		return `<rect x="20" y="40" width="104" height="34" rx="17" fill="${T.ink}" fill-opacity=".06" ${sline(T.ink, 5)}/>` +
			`<rect x="38" y="47" width="5" height="20" rx="2" fill="${T.clay}" opacity="${on ? 1 : 0.1}"/>` +
			`<circle cx="106" cy="57" r="9" fill="${T.clay}"/><path d="M106 62v-9M102 56l4-4 4 4" ${line(T.cut, 2.5)}/>`;
	},
	newwindow: (p) => {
		const d = 5 * wave(p);
		return `<rect x="22" y="38" width="62" height="48" rx="7" fill="none" stroke="${T.muted}" stroke-width="4.5"/>` +
			`<g transform="translate(${f(d)} ${f(-d)})"><rect x="46" y="24" width="68" height="50" rx="7" fill="${T.surface}" ${sline(T.ink, 5)}/><path d="M46 36h68" ${line(T.muted, 3)}/>` +
			`<path d="M80 44v20M70 54h20" ${line(T.clay, 5.5)}/></g>`;
	},
});
ART.dictate = (p) => {
	const ring = (k) => { const q = (p * 2 + k) % 1; return `<circle cx="72" cy="48" r="${f(26 + q * 18)}" fill="none" stroke="${T.clay}" stroke-width="3" opacity="${f((1 - q) * 0.9)}"/>`; };
	return ring(0) + ring(0.5) +
		`<rect x="60" y="22" width="24" height="42" rx="12" fill="${T.ink}"/><path d="M50 54a22 22 0 0 0 44 0M72 76v12M60 88h24" ${line(T.ink, 5)}/>`;
};

// ── More icons (ChatGPT and other apps) ──
const bubble = (x, y, w, h, extra = "") => `<path d="M${x + 10} ${y}h${w - 20}a10 10 0 0 1 10 10v${h - 20}a10 10 0 0 1-10 10H${x + 34}L${x + 18} ${y + h + 13}V${y + h}h-8a10 10 0 0 1-10-10V${y + 10}a10 10 0 0 1 10-10z" ${extra}/>`;
Object.assign(ART, {
	temporary: (p) => `${bubble(30, 24, 84, 58, `fill="none" stroke="${T.ink}" stroke-width="5" stroke-dasharray="10 7" stroke-dashoffset="${f(-p * 34)}" stroke-linecap="round" stroke-linejoin="round"`)}` +
		`<circle cx="72" cy="53" r="15" fill="none" stroke="${T.clay}" stroke-width="4.5"/><path d="M72 45v8l6 4" ${line(T.clay, 4)} transform="rotate(${f(p * 360)} 72 53)"/>`,
	quickchat: (p) => `${bubble(30, 24, 84, 58, `fill="${T.ink}" fill-opacity=".06" ${sline()}`)}` +
		`<path d="M76 34L60 58h12l-4 18 18-26H74l2-16z" fill="${T.clay}" opacity="${f(0.6 + 0.4 * wave(p))}" transform="translate(0 ${f(-2 * wave(p))})"/>`,
	models: (p) => {
		const d = 4 * wave(p);
		const layer = (y, o, c) => `<path d="M72 ${y}l40 16-40 16-40-16z" fill="${c}" fill-opacity="${o}" ${sline(T.ink, 4.5)}/>`;
		return layer(62 + d, 0.05, T.ink) + layer(48, 0.05, T.ink) + `<path d="M72 ${f(34 - d)}l40 16-40 16-40-16z" fill="${T.clay}" ${sline(T.clay, 4.5)}/>`;
	},
	previous: (p) => `<path d="M58 30L32 56l26 26" ${line(T.ink, 6.5)} transform="translate(${f(-5 * wave(p))} 0)"/>` +
		`<rect x="68" y="34" width="44" height="12" rx="6" fill="${T.clay}"/><rect x="68" y="52" width="44" height="8" rx="4" fill="${T.muted}"/><rect x="68" y="66" width="30" height="8" rx="4" fill="${T.muted}"/>`,
	next: (p) => `<path d="M86 30l26 26-26 26" ${line(T.ink, 6.5)} transform="translate(${f(5 * wave(p))} 0)"/>` +
		`<rect x="32" y="34" width="44" height="12" rx="6" fill="${T.clay}"/><rect x="32" y="52" width="44" height="8" rx="4" fill="${T.muted}"/><rect x="32" y="66" width="30" height="8" rx="4" fill="${T.muted}"/>`,
	chatmode: (p) => `${bubble(28, 26, 88, 56, `fill="${T.ink}" fill-opacity=".06" ${sline()}`)}` +
		[0, 1, 2].map((i) => `<circle cx="${54 + i * 18}" cy="54" r="5.5" fill="${T.clay}" opacity="${f(0.35 + 0.65 * wave((p * 2 + i * 0.18) % 1))}"/>`).join(""),
	workmode: (p) => `<rect x="24" y="40" width="96" height="56" rx="9" fill="${T.ink}" fill-opacity=".06" ${sline()}/><path d="M56 40v-8a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v8M24 62h96" ${line()}/>` +
		`<rect x="64" y="${f(56 - 3 * wave(p))}" width="16" height="14" rx="3" fill="${T.clay}"/>`,
	codexmode: (p) => {
		const on = (p * 4) % 1 < 0.55;
		return `<rect x="20" y="26" width="104" height="66" rx="10" fill="${T.ink}" fill-opacity=".05" ${sline()}/>` +
			`<path d="M38 46l14 12-14 12" ${line(T.clay, 6)}/><rect x="60" y="66" width="24" height="6" rx="3" fill="${T.ink}" opacity="${on ? 1 : 0.15}"/>`;
	},
	archive: (p) => {
		const d = -10 * wave(p);
		return `<rect x="44" y="${f(30 + d)}" width="56" height="22" rx="4" fill="${T.clay}"/>` +
			`<rect x="26" y="40" width="92" height="18" rx="5" fill="${T.surface}" ${sline()}/><path d="M32 58v26a8 8 0 0 0 8 8h64a8 8 0 0 0 8-8V58M60 72h24" ${line()}/>`;
	},
	pin: (p) => {
		const r = -8 + 16 * wave(p);
		return `<g transform="rotate(${f(r)} 72 92)"><path d="M58 28h28l-4 22 12 12H50l12-12z" fill="${T.clay}" ${sline(T.clay, 5)}/><path d="M72 62v30" ${line(T.ink, 6)}/></g>`;
	},
	rename: (p) => {
		const n = 1 + Math.floor(p * 4) % 4;
		return `<rect x="22" y="40" width="100" height="36" rx="8" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 4.5)}/>` +
			[0, 1, 2, 3].slice(0, n).map((i) => `<rect x="${34 + i * 16}" y="52" width="11" height="12" rx="2" fill="${T.muted}"/>`).join("") +
			`<rect x="${34 + n * 16}" y="48" width="4" height="20" rx="2" fill="${T.clay}"/>`;
	},
	copylink: (p) => {
		const d = 4 * wave(p);
		return `<g transform="translate(-6 6) rotate(-35 72 56)"><rect x="${f(26 - d)}" y="42" width="48" height="28" rx="14" fill="none" stroke="${T.ink}" stroke-width="6"/><rect x="${f(70 + d)}" y="42" width="48" height="28" rx="14" fill="none" stroke="${T.clay}" stroke-width="6"/><path d="M60 56h24" ${line(T.ink, 6)}/></g>`;
	},
	skills: (p) => `<path d="M40 40h18a8 8 0 1 1 16 0h18v18a8 8 0 1 0 0 16v18H74a8 8 0 1 0-16 0H40z" fill="${T.ink}" fill-opacity=".06" ${sline()}/>` +
		sparkle(66, 66, 11 + 3 * wave(p), T.clay, 1) + sparkle(108, 30, 6, T.clayLight, wave((p + 0.5) % 1)),
	scheduled: (p) => `<rect x="26" y="30" width="92" height="66" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline()}/><path d="M26 46h92M48 22v14M96 22v14" ${line()}/>` +
		`<circle cx="72" cy="70" r="15" fill="${T.surface}" ${sline(T.clay, 4.5)}/><path d="M72 62v8" ${line(T.clay, 4)} transform="rotate(${f(p * 360)} 72 70)"/>`,
	fullview: (p) => {
		const d = 6 * wave(p);
		return `<rect x="${f(46 - d)}" y="${f(36 - d * 0.7)}" width="${f(52 + 2 * d)}" height="${f(40 + 1.4 * d)}" rx="6" fill="${T.clay}" opacity=".85"/>` +
			`<rect x="24" y="24" width="96" height="64" rx="9" fill="none" ${sline(T.ink, 5)}/>`;
	},
	navback: (p) => `<path d="M64 34L42 56l22 22" ${line(T.ink, 6.5)} transform="translate(${f(-5 * wave(p))} 0)"/><path d="M92 34L70 56l22 22" ${line(T.clay, 6.5)} opacity=".8" transform="translate(${f(-3 * wave(p))} 0)"/>`,
	navforward: (p) => `<path d="M52 34l22 22-22 22" ${line(T.clay, 6.5)} opacity=".8" transform="translate(${f(3 * wave(p))} 0)"/><path d="M80 34l22 22-22 22" ${line(T.ink, 6.5)} transform="translate(${f(5 * wave(p))} 0)"/>`,
	commands: (p) => `<rect x="22" y="26" width="100" height="62" rx="10" fill="${T.ink}" fill-opacity=".05" ${sline()}/>` +
		`<path d="M36 44l9 7-9 7" ${line(T.clay, 5)}/><path d="M54 51h${f(30 + 20 * wave(p))}" ${line(T.ink, 5)}/><path d="M36 72h56" ${line(T.muted, 4)}/>`,
});

// ── Developer icons (VS Code) ──
Object.assign(ART, {
	quickopen: (p) => `<path d="M38 20h34l22 22v52a8 8 0 0 1-8 8H38a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8z" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/><path d="M72 20v22h22" ${line(T.muted, 4)}/>` +
		`<g transform="translate(${f(-4 * wave(p))} ${f(-3 * wave(p))})"><circle cx="90" cy="78" r="14" fill="${T.surface}" ${sline(T.clay, 5.5)}/><path d="M100 88l13 13" ${line(T.clay, 7)}/></g>`,
	explorer: (p) => {
		const o = (i) => f(0.45 + 0.55 * wave((p * 1.5 + i * 0.22) % 1));
		return `<rect x="22" y="20" width="30" height="18" rx="4" fill="${T.clay}"/><path d="M36 38v52M36 56h20M36 90h20" ${line(T.muted, 4.5)}/>` +
			`<rect x="60" y="46" width="58" height="20" rx="5" fill="${T.ink}" fill-opacity="${o(0)}"/><rect x="60" y="80" width="58" height="20" rx="5" fill="${T.ink}" fill-opacity="${o(1)}"/>`;
	},
	branch: (p) => {
		const t = (p * 1.4) % 1;
		return `<path d="M44 38v44M98 50c0 22-54 12-54 30" ${line(T.muted, 5.5)}/>` +
			`<circle cx="${f(44 + (98 - 44) * 0)}" cy="${f(38 + 44 * t)}" r="4" fill="${T.clay}" opacity="${f(Math.sin(t * Math.PI))}"/>` +
			`<circle cx="44" cy="28" r="10" fill="${T.surface}" ${sline(T.ink, 5.5)}/><circle cx="44" cy="92" r="10" fill="${T.surface}" ${sline(T.ink, 5.5)}/><circle cx="98" cy="40" r="10" fill="${T.clay}" ${sline(T.clay, 5.5)}/>`;
	},
	commit: (p) => `<path d="M16 56h34M94 56h34" ${line(T.muted, 5.5)}/><circle cx="72" cy="56" r="${f(19 + 2 * wave(p))}" fill="${T.surface}" ${sline(T.ink, 6)}/><circle cx="72" cy="56" r="${f(5 + 3 * wave(p))}" fill="${T.clay}"/>`,
	push: (p) => `<path d="M38 24h68" ${line(T.clay, 6)}/><g transform="translate(0 ${f(-8 * wave(p))})"><path d="M72 94V44M52 62l20-20 20 20" ${line(T.ink, 7)}/></g>`,
	pull: (p) => `<path d="M38 92h68" ${line(T.clay, 6)}/><g transform="translate(0 ${f(8 * wave(p))})"><path d="M72 22v50M52 54l20 20 20-20" ${line(T.ink, 7)}/></g>`,
	terminal: (p) => {
		const on = (p * 4) % 1 < 0.55;
		return `<rect x="18" y="24" width="108" height="68" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/><path d="M18 40h108" ${line(T.faint, 4)}/>` +
			`<path d="M36 56l13 10-13 10" ${line(T.clay, 6)}/><rect x="58" y="72" width="26" height="6" rx="3" fill="${T.ink}" opacity="${on ? 1 : 0.15}"/>`;
	},
	newterm: (p) => `<rect x="14" y="32" width="92" height="64" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/><path d="M30 54l12 10-12 10" ${line(T.clay, 5.5)}/><path d="M50 80h22" ${line(T.ink, 5.5)}/>` +
		`<g transform="translate(108 34) scale(${f(1 + 0.12 * wave(p))}) translate(-108 -34)"><circle cx="108" cy="34" r="18" fill="${T.clay}"/><path d="M108 25v18M99 34h18" ${line(T.cut, 5)}/></g>`,
	play: (p) => `<circle cx="72" cy="56" r="${f(36 + 4 * wave(p))}" fill="none" stroke="${T.clay}" stroke-width="3" opacity="${f(0.5 - 0.4 * wave(p))}"/>` +
		`<path d="M58 34L96 56 58 78z" fill="${T.clay}" ${sline(T.clay, 6)}/>`,
	bug: (p) => {
		// Modern "run and debug": outlined play shape with a breakpoint badge that pulses and a bug glyph inside it.
		const r = 15 + 2.5 * wave(p);
		return `<path d="M36 26c0-5 5.5-8 9.8-5.5l48 29.5c4 2.5 4 8.5 0 11L45.8 90.5C41.5 93 36 90 36 85z" fill="${T.ink}" fill-opacity=".06" ${sline(T.ink, 5.5)}/>` +
			`<circle cx="98" cy="80" r="${f(r + 6)}" fill="${T.clay}" opacity="${f(0.18 * (1 - wave(p)) + 0.05)}"/>` +
			`<circle cx="98" cy="80" r="${f(r)}" fill="${T.clay}"/>` +
			`<ellipse cx="98" cy="83" rx="5.5" ry="7" fill="${T.cut}"/><circle cx="98" cy="73.5" r="3.4" fill="${T.cut}"/>` +
			`<path d="M91 80h-5M105 80h5M91.5 87l-4 3M104.5 87l4 3M92 75l-3-3M104 75l3-3" ${line(T.cut, 2.2)}/>`;
	},
	format: (p) => {
		const x = [64, 98, 54, 80];
		return x.map((w, i) => `<path d="M22 ${32 + i * 18}h${f(w - (i % 2 ? 10 : 0) * wave(p))}" ${line(i === 1 ? T.clay : T.ink, 5.5)}/>`).join("") +
			sparkle(110, 72, 12, T.clay, 0.5 + 0.5 * wave(p));
	},
	save: (p) => `<path d="M28 20h66l22 22v52a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8z" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/>` +
		`<path d="M44 20v24h38V20" ${line(T.ink, 5)}/><rect x="42" y="64" width="60" height="32" rx="5" fill="${T.clay}" opacity="${f(0.55 + 0.45 * wave(p))}"/>`,
	split: (p) => {
		const x = 72 + 6 * Math.sin(p * TAU);
		return `<rect x="18" y="24" width="108" height="68" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/><path d="M${f(x)} 26v64" ${line(T.clay, 5)}/>` +
			`<path d="M30 44h${f(x - 42)}M30 58h${f(x - 52)}M${f(x + 12)} 44h${f(114 - x - 12)}M${f(x + 12)} 58h${f(114 - x - 22)}" ${line(T.muted, 4)}/>`;
	},
	comment: (p) => `<path d="M30 40h40M30 56h52M30 72h34" ${line(T.muted, 5)}/>` +
		`<g opacity="${f(0.5 + 0.5 * wave(p))}"><path d="M86 84l12-44M104 84l12-44" ${line(T.clay, 7)}/></g>`,
	definition: (p) => `<circle cx="72" cy="56" r="34" fill="none" ${sline(T.muted, 4.5)}/><circle cx="72" cy="56" r="${f(18 + 3 * wave(p))}" fill="none" ${sline(T.ink, 5.5)}/><circle cx="72" cy="56" r="7" fill="${T.clay}"/>` +
		`<path d="M72 12v14M72 86v14M28 56h14M102 56h14" ${line(T.ink, 5)}/>`,
	rename: (p) => {
		const n = 1 + Math.floor(p * 4) % 4;
		return `<rect x="22" y="38" width="100" height="36" rx="7" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 4.5)}/>` +
			[0, 1, 2, 3].slice(0, n).map((i) => `<rect x="${34 + i * 16}" y="50" width="11" height="12" rx="2" fill="${T.muted}"/>`).join("") +
			`<rect x="${34 + n * 16}" y="46" width="4" height="20" rx="2" fill="${T.clay}"/><path d="M92 86h18" ${line(T.clay, 4)}/>`;
	},
	problems: (p) => `<path d="M72 22L120 98H24z" fill="${T.clay}" fill-opacity="${f(0.12 + 0.18 * wave(p))}" ${sline(T.clay, 6.5)}/><path d="M72 48v24" ${line(T.ink, 7)}/><circle cx="72" cy="85" r="4.5" fill="${T.ink}"/>`,
	zen: (p) => `<path d="M86 20A40 40 0 1 0 118 82 32 32 0 0 1 86 20z" fill="${T.ink}" fill-opacity=".06" ${sline(T.ink, 5.5)}/>` + sparkle(104, 36, 6, T.clay, wave(p)) + sparkle(116, 58, 4, T.clayLight, wave((p + 0.5) % 1)),
	closeeditor: (p) => {
		const s = 1 - 0.18 * wave(p);
		return `<rect x="18" y="24" width="108" height="68" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/><path d="M18 40h108" ${line(T.faint, 4)}/>` +
			`<g transform="translate(72 66) scale(${f(s)}) translate(-72 -66)"><path d="M60 54l24 24M84 54L60 78" ${line(T.clay, 6.5)}/></g>`;
	},
	command: (p) => ART.commands(p),
	project: (p) => `<path d="M20 38a8 8 0 0 1 8-8h22l10 10h56a8 8 0 0 1 8 8v42a8 8 0 0 1-8 8H28a8 8 0 0 1-8-8z" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/>` +
		`<path d="M60 56l-12 12 12 12M84 56l12 12-12 12" ${line(T.clay, 6)}/>` + `<path d="M76 54l-8 28" ${line(T.ink, 4)} opacity="${f(0.4 + 0.6 * wave(p))}"/>`,
	copilot: (p) => {
		// Modern AI chat: soft filled bubble, sparkle, and "typing" dots that ripple.
		const dots = [0, 1, 2].map((i) => { const q = wave((p * 2 + i * 0.15) % 1); return `<circle cx="${60 + i * 12}" cy="${f(70 - 4 * q)}" r="3.6" fill="${T.ink}" opacity="${f(0.4 + 0.6 * q)}"/>`; }).join("");
		return `<path d="M44 22h56a16 16 0 0 1 16 16v30a16 16 0 0 1-16 16H72L54 98V84H44a16 16 0 0 1-16-16V38a16 16 0 0 1 16-16z" fill="${T.clay}" fill-opacity=".16" ${sline(T.clay, 5)}/>` +
			sparkle(72, 46, 12 + 2 * wave(p), T.clay, 1) + sparkle(93, 33, 5, T.clayLight, wave((p + 0.5) % 1)) + dots;
	},
	quickfix: (p) => `<path d="M72 22a24 24 0 0 0-14 43v9h28v-9a24 24 0 0 0-14-43z" fill="${T.clay}" fill-opacity="${f(0.3 + 0.6 * wave(p))}" ${sline(T.clay, 5)}/>` +
		`<path d="M60 84h24M64 94h16" ${line(T.ink, 5)}/>` + [0, 1, 2].map((i) => { const a = -150 + i * 60; return `<path d="M${f(72 + 32 * Math.cos(a * Math.PI / 180))} ${f(46 + 32 * Math.sin(a * Math.PI / 180))}L${f(72 + 40 * Math.cos(a * Math.PI / 180))} ${f(46 + 40 * Math.sin(a * Math.PI / 180))}" ${line(T.clay, 4)} opacity="${f(wave(p))}"/>`; }).join(""),
	panel: (p) => {
		const h = 18 + 12 * wave(p);
		return `<rect x="18" y="24" width="108" height="68" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/>` +
			`<path d="M20 ${f(90 - h)}h104v${f(h - 8)}a8 8 0 0 1-8 8H28a8 8 0 0 1-8-8z" fill="${T.clay}" opacity=".85"/>`;
	},
	extensions: (p) => {
		const d = 6 * wave(p);
		return `<rect x="26" y="50" width="30" height="30" rx="4" fill="none" ${sline(T.ink, 5)}/><rect x="56" y="50" width="30" height="30" rx="4" fill="none" ${sline(T.ink, 5)}/><rect x="26" y="80" width="30" height="16" rx="4" fill="none" ${sline(T.ink, 5)}/>` +
			`<rect x="${f(72 + d)}" y="${f(24 - d)}" width="28" height="28" rx="4" fill="${T.clay}" transform="rotate(${f(-8 * wave(p))} ${f(86 + d)} ${f(38 - d)})"/>`;
	},
});

// ── Send ──
ART.send = (p) => {
	const t = (p * 1.25) % 1, y = 56 - 14 * Math.min(1, t * 1.6), o = t < 0.62 ? 1 : Math.max(0, 1 - (t - 0.62) * 3.5);
	return `<rect x="34" y="18" width="76" height="76" rx="22" fill="${T.clay}"/>` +
		`<g transform="translate(0 ${f(y - 56)})" opacity="${f(o)}"><path d="M72 76V38M54 54l18-18 18 18" ${line(T.cut, 7.5)}/></g>` +
		`<path d="M72 ${f(84 - 4 * wave(p))}h0" ${line(T.cut, 4)} opacity=".5"/>`;
};

// ── Trading icons (thinkorswim, Fidelity Trader+) ──
const BUY = "#2ECC71", SELL = "#FF4D5E";
Object.assign(ART, {
	buy: (p) => {
		const y = -6 * wave(p);
		return `<rect x="26" y="22" width="92" height="70" rx="14" fill="${BUY}" fill-opacity=".14" ${sline(BUY, 4)}/>` +
			`<path d="M36 78l20-18 14 10 30-30" ${line(BUY, 6)} stroke-dasharray="${f(40 + 70 * wave(p))} 200"/>` +
			`<g transform="translate(0 ${f(y)})"><path d="M90 34h16v16" ${line(BUY, 6)}/></g>` +
			`<circle cx="44" cy="38" r="9" fill="${BUY}"/><path d="M44 33v10M39 38h10" ${line(T.cut, 3)}/>`;
	},
	sell: (p) => {
		const y = 6 * wave(p);
		return `<rect x="26" y="22" width="92" height="70" rx="14" fill="${SELL}" fill-opacity=".14" ${sline(SELL, 4)}/>` +
			`<path d="M36 38l20 18 14-10 30 30" ${line(SELL, 6)} stroke-dasharray="${f(40 + 70 * wave(p))} 200"/>` +
			`<g transform="translate(0 ${f(y)})"><path d="M90 76h16V60" ${line(SELL, 6)}/></g>` +
			`<circle cx="44" cy="78" r="9" fill="${SELL}"/><path d="M39 78h10" ${line(T.cut, 3)}/>`;
	},
	otoco: (p) => {
		const d = 4 * wave(p);
		return `<rect x="46" y="16" width="52" height="24" rx="7" fill="${T.clay}"/><path d="M60 28h24" ${line(T.cut, 4)}/>` +
			`<path d="M72 40v14M40 70V54h64v16" ${line(T.muted, 4.5)}/>` +
			`<rect x="16" y="${f(70 - d)}" width="50" height="26" rx="7" fill="${BUY}" fill-opacity=".2" ${sline(BUY, 4)}/><path d="M32 ${f(87 - d)}l9-8 9 8" ${line(BUY, 4)}/>` +
			`<rect x="78" y="${f(70 + d)}" width="50" height="26" rx="7" fill="${SELL}" fill-opacity=".2" ${sline(SELL, 4)}/><path d="M94 ${f(79 + d)}l9 8 9-8" ${line(SELL, 4)}/>`;
	},
	positions: (p) => `<rect x="24" y="38" width="96" height="58" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/><path d="M56 38v-8a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v8" ${line(T.ink, 5)}/>` +
		[0, 1, 2].map((i) => `<rect x="${40 + i * 24}" y="${f(84 - (10 + i * 8) * (0.6 + 0.4 * wave((p + i * 0.2) % 1)))}" width="14" height="${f((10 + i * 8) * (0.6 + 0.4 * wave((p + i * 0.2) % 1)))}" rx="3" fill="${i === 2 ? BUY : T.clay}"/>`).join(""),
	orders: (p) => {
		const hl = Math.floor(p * 3) % 3;
		return `<rect x="26" y="20" width="92" height="76" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/>` +
			[0, 1, 2].map((i) => `<rect x="34" y="${32 + i * 20}" width="76" height="14" rx="4" fill="${i === hl ? T.clay : "none"}" fill-opacity=".25"/><circle cx="44" cy="${39 + i * 20}" r="4" fill="${i === 1 ? SELL : BUY}"/><path d="M54 ${39 + i * 20}h${i === 2 ? 30 : 46}" ${line(T.ink, 4)}/>`).join("");
	},
	ladder: (p) => {
		const r = Math.floor(p * 6) % 6;
		return `<rect x="34" y="16" width="76" height="84" rx="8" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 4.5)}/>` +
			[0, 1, 2, 3, 4, 5].map((i) => `<rect x="40" y="${22 + i * 13}" width="64" height="10" rx="2" fill="${i < 3 ? SELL : BUY}" opacity="${i === r ? 0.9 : 0.25}"/>`).join("") +
			`<path d="M72 22v74" ${line(T.cut, 2)}/>`;
	},
	candles: (p) => {
		const c = (x, top, bot, o, cl, col, k) => { const s = 1 + 0.18 * Math.sin((p + k) * TAU); const mid = (o + cl) / 2, h = Math.abs(cl - o) * s;
			return `<path d="M${x} ${top}V${bot}" ${line(col, 3.5)}/><rect x="${x - 8}" y="${f(mid - h / 2)}" width="16" height="${f(h)}" rx="3" fill="${col}"/>`; };
		return `<path d="M20 98h104" ${line(T.faint, 3)}/>` + c(36, 50, 92, 60, 84, SELL, 0) + c(60, 36, 86, 46, 74, BUY, 0.25) + c(84, 28, 70, 36, 58, SELL, 0.5) + c(108, 14, 60, 22, 48, BUY, 0.75);
	},
	leveltwo: (p) => [0, 1, 2, 3].map((i) => { const w = 18 + i * 10 + 8 * wave((p + i * 0.15) % 1); return `<rect x="${f(70 - w)}" y="${24 + i * 18}" width="${f(w)}" height="12" rx="3" fill="${BUY}" opacity=".85"/><rect x="74" y="${24 + i * 18}" width="${f(w * 0.9)}" height="12" rx="3" fill="${SELL}" opacity=".85"/>`; }).join("") + `<path d="M72 18v78" ${line(T.ink, 2.5)}/>`,
	timesales: (p) => {
		const off = (p * 3 % 1) * 16;
		let rows = "";
		for (let i = -1; i < 5; i++) { const y = 26 + i * 16 + off; if (y < 22 || y > 92) continue; rows += `<circle cx="38" cy="${f(y + 4)}" r="4" fill="${(i + 10) % 3 ? BUY : SELL}"/><path d="M50 ${f(y + 4)}h${(i + 10) % 2 ? 54 : 40}" ${line(T.ink, 4)}/>`; }
		return `<rect x="24" y="18" width="96" height="80" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 4.5)}/>` + rows;
	},
	watchlist: (p) => `<rect x="24" y="22" width="96" height="72" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 4.5)}/>` +
		[0, 1, 2].map((i) => `<path d="M36 ${42 + i * 18}h40" ${line(T.muted, 4)}/><path d="M86 ${42 + i * 18}h${f(14 + 8 * wave((p + i * 0.3) % 1))}" ${line(i === 1 ? SELL : BUY, 4.5)}/>`).join("") +
		sparkle(112, 22, 8, T.clay, wave(p)),
	hotkeys: (p) => ART.shortcuts(p),
	chartsettings: (p) => `<path d="M22 92h60M22 92V30" ${line(T.muted, 4)}/><path d="M28 80l14-16 12 8 18-22" ${line(T.clay, 5)}/>` +
		`<g transform="rotate(${f(p * 45)} 98 70)">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="94" y="46" width="8" height="10" rx="2" fill="${T.ink}" transform="rotate(${i * 45} 98 70)"/>`).join("")}<circle cx="98" cy="70" r="16" fill="${T.surface}" ${sline(T.ink, 5)}/></g><circle cx="98" cy="70" r="5" fill="${T.clay}"/>`,
	timeframe: (p) => {
		const tf = ["1m", "2m", "5m", "D"][Math.floor(p * 4) % 4];
		return `<circle cx="72" cy="52" r="32" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/><path d="M72 52V32" ${line(T.muted, 4)} transform="rotate(${f(p * 360)} 72 52)"/>` +
			`<rect x="52" y="76" width="40" height="22" rx="11" fill="${T.clay}"/><text x="72" y="92" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="800" fill="${T.cut}">${tf}</text>`;
	},
	scan: (p) => `<circle cx="72" cy="56" r="38" fill="${T.ink}" fill-opacity=".04" ${sline(T.muted, 3.5)}/><circle cx="72" cy="56" r="24" fill="none" ${sline(T.faint, 3)}/>` +
		`<path d="M72 56L${f(72 + 38 * Math.cos(p * TAU))} ${f(56 + 38 * Math.sin(p * TAU))}" ${line(T.clay, 4.5)}/>` +
		`<circle cx="92" cy="40" r="5" fill="${BUY}" opacity="${f(wave(p))}"/><circle cx="54" cy="70" r="5" fill="${BUY}" opacity="${f(wave((p + 0.5) % 1))}"/>`,
	riskcheck: (p) => `<path d="M72 16l38 14v26c0 24-16 38-38 46-22-8-38-22-38-46V30z" fill="${T.clay}" fill-opacity=".14" ${sline(T.ink, 5)}/>` +
		`<path d="M56 56l12 12 22-24" ${line(T.clay, 6.5)} stroke-dasharray="${f(20 + 40 * wave(p))} 100"/>`,
	tradeplan: (p) => `<path d="M38 22h68v76H38z" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/><rect x="56" y="14" width="32" height="14" rx="5" fill="${T.clay}"/>` +
		[0, 1, 2].map((i) => `<path d="M48 ${46 + i * 16}l5 5 9-9" ${line(i < 1 + Math.floor(p * 3) % 3 ? BUY : T.faint, 3.5)}/><path d="M68 ${48 + i * 16}h28" ${line(T.muted, 4)}/>`).join(""),
	journal: (p) => `<path d="M30 24h56a10 10 0 0 1 10 10v64H40a10 10 0 0 1-10-10z" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/><path d="M30 88a10 10 0 0 1 10-10h56" ${line(T.ink, 5)}/>` +
		`<path d="M44 40h36M44 52h${f(12 + 24 * wave(p))}" ${line(T.clay, 4.5)}/><path d="M104 30l12 12-26 26H78V56z" fill="${T.clay}" opacity=".9"/>`,
	partial: (p) => {
		const a = 120 * (0.6 + 0.4 * wave(p)), r = 30, x = 72 + r * Math.sin(a * Math.PI / 180), y = 50 - r * Math.cos(a * Math.PI / 180);
		return `<circle cx="72" cy="50" r="${r}" fill="${T.ink}" fill-opacity=".08" ${sline(T.ink, 4.5)}/>` +
			`<path d="M72 50V${50 - r}A${r} ${r} 0 0 1 ${f(x)} ${f(y)}z" fill="${T.clay}"/><text x="72" y="100" text-anchor="middle" font-family="Segoe UI, Arial" font-size="14" font-weight="800" fill="${T.ink}">1/3</text>`;
	},
	breakeven: (p) => `<path d="M20 60h104" ${line(T.muted, 3.5)} stroke-dasharray="6 6"/><text x="28" y="52" font-family="Segoe UI, Arial" font-size="14" font-weight="800" fill="${T.muted}">B/E</text>` +
		`<path d="M30 ${f(92 - 32 * wave(p))}h84" ${line(SELL, 5)}/><path d="M100 ${f(80 - 32 * wave(p))}v-12M94 ${f(74 - 32 * wave(p))}l6-6 6 6" ${line(T.clay, 4)}/>`,
	trail: (p) => {
		const px = 30 + 80 * ((p * 1.0) % 1);
		return `<path d="M22 88l18-14 14 6 18-22 16 8 22-30" ${line(BUY, 5)}/>` +
			`<path d="M22 100l18-14 14 6 18-22 16 8 22-30" ${line(SELL, 3.5)} stroke-dasharray="7 6" opacity=".9"/>` +
			`<circle cx="${f(px)}" cy="${f(96 - (px - 22) * 0.55)}" r="4" fill="${T.clay}"/>`;
	},
	flatten: (p) => `<path d="M24 ${f(56 - 26 * (1 - wave(p)))}Q48 ${f(56 + 26 * (1 - wave(p)))} 72 56T120 56" ${line(T.muted, 4)}/><path d="M22 56h100" ${line(SELL, 6)} opacity="${f(0.4 + 0.6 * wave(p))}"/>` +
		`<circle cx="72" cy="56" r="13" fill="${SELL}"/><path d="M66 50l12 12M78 50L66 62" ${line(T.cut, 3.5)}/>`,
	cancelall: (p) => `<rect x="26" y="20" width="92" height="76" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/>` +
		[0, 1, 2].map((i) => `<path d="M38 ${40 + i * 18}h50" ${line(T.muted, 4)}/>`).join("") +
		`<g transform="translate(98 74) rotate(${f(90 * wave(p))})"><circle r="16" fill="${SELL}"/><path d="M-6-6L6 6M6-6L-6 6" ${line(T.cut, 4)}/></g>`,
	tradepage: (p) => `<path d="M80 14L44 64h22l-6 38 40-54H78z" fill="${T.clay}" opacity="${f(0.6 + 0.4 * wave(p))}" ${sline(T.clay, 3)}/>`,
	planpage: (p) => `<path d="M24 32l30-10 36 10 30-10v66l-30 10-36-10-30 10z" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 4.5)}/><path d="M54 22v66M90 32v66" ${line(T.muted, 3.5)}/>` +
		`<circle cx="${f(40 + 50 * wave(p))}" cy="${f(64 - 18 * wave(p))}" r="6" fill="${T.clay}"/>`,
	managepage: (p) => [0, 1, 2].map((i) => { const k = 0.2 + 0.6 * wave((p + i * 0.25) % 1); return `<path d="M${40 + i * 32} 24v66" ${line(T.muted, 4)}/><rect x="${30 + i * 32}" y="${f(24 + 56 * k)}" width="20" height="12" rx="4" fill="${i === 1 ? T.clay : T.ink}"/>`; }).join(""),
	nextfield: (p) => `<rect x="22" y="38" width="62" height="36" rx="8" fill="none" ${sline(T.muted, 4)}/><path d="M${f(88 + 6 * wave(p))} 56h26M${f(104 + 6 * wave(p))} 44l12 12-12 12" ${line(T.clay, 5.5)}/>`,
	previousfield: (p) => `<rect x="60" y="38" width="62" height="36" rx="8" fill="none" ${sline(T.muted, 4)}/><path d="M${f(56 - 6 * wave(p))} 56H30M${f(40 - 6 * wave(p))} 44L28 56l12 12" ${line(T.clay, 5.5)}/>`,
	escape: (p) => `<rect x="28" y="28" width="88" height="56" rx="12" fill="${T.surface}" ${sline(T.ink, 5)}/><text x="72" y="64" text-anchor="middle" font-family="Segoe UI, Arial" font-size="22" font-weight="800" fill="${T.clay}" opacity="${f(0.6 + 0.4 * wave(p))}">Esc</text>`,
	pageup: (p) => `<path d="M40 88h64" ${line(T.muted, 4)}/><path d="M72 ${f(76 - 8 * wave(p))}V30M56 46l16-16 16 16M56 62l16-16 16 16" ${line(T.clay, 5.5)}/>`,
	pagedown: (p) => `<path d="M40 24h64" ${line(T.muted, 4)}/><path d="M72 ${f(36 + 8 * wave(p))}v46M56 66l16 16 16-16M56 50l16 16 16-16" ${line(T.clay, 5.5)}/>`,
	balances: (p) => `<rect x="22" y="30" width="100" height="64" rx="10" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/><path d="M22 48h100" ${line(T.muted, 4)}/>` +
		`<text x="72" y="82" text-anchor="middle" font-family="Segoe UI, Arial" font-size="24" font-weight="800" fill="${T.clay}">$</text>` + sparkle(110, 30, 7, BUY, wave(p)),
	news: (p) => `<rect x="24" y="24" width="96" height="70" rx="9" fill="${T.ink}" fill-opacity=".05" ${sline(T.ink, 5)}/><rect x="34" y="34" width="34" height="26" rx="4" fill="${T.clay}" opacity="${f(0.6 + 0.4 * wave(p))}"/>` +
		`<path d="M76 38h34M76 50h28M34 72h76M34 84h56" ${line(T.muted, 4)}/>`,
	alerts: (p) => `<g transform="rotate(${f(12 * Math.sin(p * TAU * 2))} 72 26)"><path d="M48 80V56a24 24 0 0 1 48 0v24l8 8H40z" fill="${T.ink}" fill-opacity=".06" ${sline(T.ink, 5)}/><path d="M64 96a8 8 0 0 0 16 0" ${line(T.ink, 5)}/></g><circle cx="98" cy="34" r="9" fill="${T.clay}"/>`,
	layouts: (p) => {
		const w = 34 + 10 * Math.sin(p * TAU);
		return `<rect x="20" y="24" width="104" height="70" rx="8" fill="none" ${sline(T.ink, 5)}/><rect x="26" y="30" width="${f(w)}" height="58" rx="4" fill="${T.clay}" opacity=".85"/>` +
			`<rect x="${f(32 + w)}" y="30" width="${f(86 - w)}" height="26" rx="4" fill="${T.muted}" opacity=".6"/><rect x="${f(32 + w)}" y="62" width="${f(86 - w)}" height="26" rx="4" fill="${T.muted}" opacity=".4"/>`;
	},
	tools: (p) => `<g transform="rotate(${f(-10 + 20 * wave(p))} 72 56)"><path d="M86 22a18 18 0 0 0-22 24L28 82l12 12 36-36a18 18 0 0 0 24-22l-10 10-10-4-4-10z" fill="${T.ink}" fill-opacity=".08" ${sline(T.ink, 5)}/></g><circle cx="100" cy="88" r="7" fill="${T.clay}"/>`,
	ticket: (p) => `<path d="M28 26h88v20a10 10 0 0 0 0 20v20H28V66a10 10 0 0 0 0-20z" fill="${T.ink}" fill-opacity=".06" ${sline(T.ink, 5)}/>` +
		`<path d="M48 46h30M48 66h${f(20 + 20 * wave(p))}" ${line(T.clay, 5)}/><path d="M96 34v44" ${line(T.muted, 3)} stroke-dasharray="4 5"/>`,
});

// ── Styles ──
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a, b, t) => "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, "0")).join("");
/** Brand palettes: `app` = native dark look, `light` = native light look, `colours` = default colour theme. */
export const BRANDS = {
	tradingview: {
		app: { bgTop: "#1E222D", bgBottom: "#131722", edge: "#2A2E39", ink: "#D1D4DC", muted: "#787B86", faint: "#363A45", clay: "#2962FF", clayLight: "#5B8CFF", surface: "#1E222D", cut: "#131722" },
		light: { bgTop: "#FFFFFF", bgBottom: "#F0F3FA", edge: "#E0E3EB", ink: "#131722", muted: "#787B86", faint: "#E0E3EB", clay: "#2962FF", clayLight: "#5B8CFF", surface: "#FFFFFF", cut: "#FFFFFF" },
		colours: ["#3D7BFF", "#1E3FCC", "#0A1A66"],
	},
	claude: {
		app: { ...CLAUDE_TOKENS },
		light: { bgTop: "#FBF9F4", bgBottom: "#ECE7DA", edge: "#D8D0BF", ink: "#3A362E", muted: "#A0988A", faint: "#DED7C8", clay: "#C96442", clayLight: "#E38A64", surface: "#FFFFFF", cut: "#FFFFFF" },
		colours: ["#F0A07C", "#C8582F", "#5C2414"],
	},
	vscode: {
		app: { bgTop: "#252526", bgBottom: "#161616", edge: "#333333", ink: "#E6E6E6", muted: "#8A8A8A", faint: "#3C3C3C", clay: "#3794FF", clayLight: "#7FB9FF", surface: "#1F1F1F", cut: "#161616" },
		light: { bgTop: "#FFFFFF", bgBottom: "#EEF2F7", edge: "#D4D9E0", ink: "#1F2328", muted: "#8C959F", faint: "#DDE3EA", clay: "#005FB8", clayLight: "#3B8EEA", surface: "#FFFFFF", cut: "#FFFFFF" },
		colours: ["#4DA3FF", "#0B5CAD", "#06315E"],
	},
	thinkorswim: {
		app: { bgTop: "#1F2124", bgBottom: "#0B0C0D", edge: "#34383C", ink: "#E2E6EA", muted: "#7C848C", faint: "#33373B", clay: "#1FC7B6", clayLight: "#7EE6DA", surface: "#17191B", cut: "#0B0C0D" },
		light: { bgTop: "#FFFFFF", bgBottom: "#ECEFF2", edge: "#D3D8DD", ink: "#1C2126", muted: "#8A939C", faint: "#DDE2E7", clay: "#0E9C8E", clayLight: "#3CC7B8", surface: "#FFFFFF", cut: "#FFFFFF" },
		colours: ["#2BE0C9", "#0E8C80", "#063D38"],
	},
	fidelitytrader: {
		app: { bgTop: "#1C2119", bgBottom: "#0A0C09", edge: "#323B2C", ink: "#EEF3E8", muted: "#86917C", faint: "#323A2C", clay: "#8DC63F", clayLight: "#BDE38A", surface: "#151913", cut: "#0A0C09" },
		light: { bgTop: "#FFFFFF", bgBottom: "#EEF2EA", edge: "#D3DACB", ink: "#1D2418", muted: "#89937E", faint: "#DEE4D7", clay: "#5E9A1C", clayLight: "#8DC63F", surface: "#FFFFFF", cut: "#FFFFFF" },
		colours: ["#A6E05A", "#4E8A16", "#203A08"],
	},
	chatgpt: {
		app: { bgTop: "#262626", bgBottom: "#0E0E0E", edge: "#3A3A3A", ink: "#F2F2F2", muted: "#8C8C8C", faint: "#3C3C3C", clay: "#10A37F", clayLight: "#5FD3AE", surface: "#1C1C1C", cut: "#0E0E0E" },
		light: { bgTop: "#FFFFFF", bgBottom: "#EDEDED", edge: "#D6D6D6", ink: "#0D0D0D", muted: "#9A9A9A", faint: "#E0E0E0", clay: "#0E8F6F", clayLight: "#3CC79B", surface: "#FFFFFF", cut: "#FFFFFF" },
		colours: ["#2BD69A", "#0E8A65", "#053A2B"],
	},
};


// TradingView chart tools (TradingView blue #2962FF, bull #089981, bear #F23645).
const TV_UP = "#089981", TV_DN = "#F23645", TV_BLUE = "#2962FF";
const grid = () => `<path d="M22 40h100M22 64h100M22 88h100" stroke="${T.faint}" stroke-width="1.6" stroke-dasharray="3 5"/>`;
const handle = (x, y) => `<circle cx="${f(x)}" cy="${f(y)}" r="6.5" fill="${T.cut}" stroke="${T.clay}" stroke-width="3.5"/>`;
const interval = (txt) => (p) => {
	const k = wave(p);
	return `<rect x="24" y="24" width="96" height="70" rx="14" fill="${T.clay}" fill-opacity="${f(0.1 + 0.14 * k)}" ${sline(T.clay, 4)}/>` +
		`<path d="M30 86h${f(84 * p)}" ${line(T.clay, 4)} opacity=".8"/>` +
		`<text x="72" y="${txt.length > 2 ? 72 : 75}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="${txt.length > 2 ? 32 : 38}" font-weight="800" fill="${T.ink}">${txt}</text>`;
};
Object.assign(ART, {
	pagetrade: (p) => `<path d="M20 98h104" ${line(T.faint, 3)}/>` + [[40, 44, 86, 58, 78, TV_DN, 0], [72, 30, 80, 40, 68, TV_UP, 0.33], [104, 18, 66, 26, 52, TV_UP, 0.66]].map(([x, t, b, o, c, col, k]) => { const s = 1 + 0.2 * Math.sin((p + k) * TAU), m = (o + c) / 2, h = (c - o) * s; return `<path d="M${x} ${t}V${b}" ${line(col, 3.5)}/><rect x="${x - 9}" y="${f(m - h / 2)}" width="18" height="${f(h)}" rx="3" fill="${col}"/>`; }).join(""),
	pagedraw: (p) => { const t = wave(p), x = 34 + 60 * t, y = 88 - 50 * t; return grid() + `<path d="M28 92L${f(x)} ${f(y)}" ${line(T.clay, 4.5)}/><g transform="translate(${f(x)} ${f(y)}) rotate(45)"><rect x="-6" y="-38" width="12" height="32" rx="2" fill="${T.ink}"/><path d="M-6 -6L0 4 6 -6z" fill="${T.clay}"/></g>`; },
	pagetime: (p) => `<circle cx="72" cy="60" r="34" fill="${T.clay}" fill-opacity=".12" ${sline(T.ink, 5)}/><path d="M72 60V40" ${line(T.ink, 5)}/><path d="M72 60l${f(22 * Math.sin(p * TAU))} ${f(-22 * Math.cos(p * TAU))}" ${line(T.clay, 5)}/><circle cx="72" cy="60" r="4.5" fill="${T.clay}"/>`,
	tvbuy: (p) => {
		const k = wave(p);
		return `<rect x="22" y="24" width="100" height="66" rx="12" fill="${TV_BLUE}" fill-opacity="${f(0.75 + 0.25 * k)}"/>` +
			`<path d="M40 74l18-16 12 9 26-26" ${line("#fff", 5.5)} stroke-dasharray="${f(30 + 60 * k)} 200"/><path d="M84 41h12v12" ${line("#fff", 5.5)}/>` +
			`<circle cx="${f(30 + 84 * p)}" cy="24" r="3" fill="#fff" opacity="${f(1 - k)}"/>`;
	},
	tvsell: (p) => {
		const k = wave(p);
		return `<rect x="22" y="24" width="100" height="66" rx="12" fill="${TV_DN}" fill-opacity="${f(0.75 + 0.25 * k)}"/>` +
			`<path d="M40 40l18 16 12-9 26 26" ${line("#fff", 5.5)} stroke-dasharray="${f(30 + 60 * k)} 200"/><path d="M84 73h12V61" ${line("#fff", 5.5)}/>` +
			`<circle cx="${f(30 + 84 * p)}" cy="90" r="3" fill="#fff" opacity="${f(1 - k)}"/>`;
	},
	trendline: (p) => {
		const t = 0.25 + 0.75 * wave(p), x2 = 32 + 80 * t, y2 = 86 - 56 * t;
		return grid() + `<path d="M32 86L${f(x2)} ${f(y2)}" ${line(T.clay, 5)}/>` + handle(32, 86) + handle(x2, y2);
	},
	hline: (p) => {
		const y = 64 + 16 * Math.sin(p * TAU);
		return grid() + `<path d="M20 ${f(y)}h104" ${line(T.clay, 5)}/><rect x="96" y="${f(y - 9)}" width="28" height="18" rx="4" fill="${T.clay}"/>` + handle(48, y);
	},
	vline: (p) => {
		const x = 72 + 26 * Math.sin(p * TAU);
		return grid() + `<path d="M${f(x)} 22v76" ${line(T.clay, 5)}/>` + handle(x, 60);
	},
	crossline: (p) => {
		const x = 72 + 18 * Math.sin(p * TAU), y = 60 + 14 * Math.cos(p * TAU);
		return grid() + `<path d="M${f(x)} 22v76M20 ${f(y)}h104" ${line(T.clay, 4.5)}/>` + handle(x, y);
	},
	fib: (p) => {
		const lv = [[0, T.muted], [0.236, TV_DN], [0.382, "#FF9800"], [0.5, TV_UP], [0.618, "#00BCD4"], [1, T.muted]];
		const sweep = 20 + 104 * Math.min(1, wave(p) * 1.4);
		return lv.map(([v, c]) => { const y = 26 + v * 68; return `<path d="M24 ${f(y)}H${f(sweep)}" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`; }).join("") +
			`<path d="M24 94L120 26" stroke="${T.ink}" stroke-width="2.5" stroke-dasharray="5 5" opacity=".7"/>`;
	},
	snapshot: (p) => {
		const flash = Math.max(0, 1 - Math.abs(p - 0.5) * 6);
		return `<path d="M24 44h20l8-12h40l8 12h20v48H24z" fill="${T.ink}" fill-opacity=".06" ${sline(T.ink, 5)}/><circle cx="72" cy="66" r="16" fill="none" ${sline(T.clay, 5)}/>` +
			`<circle cx="72" cy="66" r="${f(5 + 9 * flash)}" fill="${T.clay}" opacity="${f(0.4 + 0.6 * flash)}"/>` + sparkle(110, 30, 7 + 6 * flash, T.clay, 0.3 + 0.7 * flash);
	},
	indicators: (p) => {
		const pts = []; for (let i = 0; i <= 20; i++) { const x = 22 + i * 5; pts.push(`${x} ${f(60 + 18 * Math.sin(i / 3 + p * TAU))}`); }
		return grid() + `<path d="M${pts.join("L")}" ${line(T.clay, 5)}/><text x="104" y="104" font-family="Segoe UI, Arial" font-size="30" font-weight="800" fill="${T.muted}">ƒ</text>`;
	},
	logscale: (p) => {
		const k = wave(p);
		return `<path d="M30 22v74h90" ${line(T.muted, 4)}/><path d="M34 ${f(92 - 4 * k)}C58 ${f(90 - 6 * k)} 80 ${f(72 - 20 * k)} 114 ${f(30 + 20 * k)}" ${line(T.clay, 5)}/>` +
			`<rect x="80" y="74" width="34" height="20" rx="5" fill="${T.clay}"/><text x="97" y="89" text-anchor="middle" font-family="Segoe UI, Arial" font-size="14" font-weight="800" fill="${T.cut}">LOG</text>`;
	},
	percentscale: (p) => `<path d="M30 22v74h90" ${line(T.muted, 4)}/><text x="76" y="${f(72 - 6 * Math.sin(p * TAU))}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="48" font-weight="800" fill="${T.clay}">%</text>`,
	invert: (p) => {
		const r = 180 * wave(p);
		return `<g transform="rotate(${f(r)} 72 60)"><path d="M28 84l22-20 16 10 30-34" ${line(T.clay, 5.5)}/><path d="M86 40h12v12" ${line(T.clay, 5.5)}/></g><path d="M22 60h100" stroke="${T.faint}" stroke-width="2" stroke-dasharray="4 4"/>`;
	},
	gotodate: (p) => `<rect x="26" y="28" width="92" height="66" rx="10" fill="${T.ink}" fill-opacity=".06" ${sline(T.ink, 5)}/><path d="M26 46h92M48 20v14M96 20v14" ${line(T.ink, 5)}/>` +
		`<rect x="${f(38 + 48 * wave(p))}" y="56" width="22" height="22" rx="5" fill="${T.clay}"/>`,
	textnote: (p) => `<path d="M34 24h56l20 20v54H34z" fill="${T.ink}" fill-opacity=".06" ${sline(T.ink, 5)}/><path d="M48 54h44M48 68h${f(14 + 30 * wave(p))}" ${line(T.clay, 5)}/><path d="M48 82h24" ${line(T.muted, 5)}/>`,
	maximize: (p) => { const d = 6 * wave(p); return `<rect x="34" y="30" width="76" height="56" rx="8" fill="${T.clay}" fill-opacity=".14"/><path d="M${f(30 - d)} ${f(44 - d)}V${f(26 - d)}h${f(18)}M${f(114 + d)} ${f(44 - d)}V${f(26 - d)}h-18M${f(30 - d)} ${f(72 + d)}v${f(18)}h18M${f(114 + d)} ${f(72 + d)}v18h-18" ${line(T.clay, 5.5)}/>`; },
	resetchart: (p) => `<g transform="rotate(${f(-360 * p)} 72 60)"><path d="M100 60a28 28 0 1 1-8-20" ${line(T.clay, 5.5)}/><path d="M94 26v16H78" ${line(T.clay, 5.5)}/></g>` + `<path d="M58 66l8-8 8 6 10-12" ${line(T.ink, 4)}/>`,
	addwatch: (p) => { const k = wave(p); return `<path d="M64 26l9 19 21 3-15 15 4 21-19-10-19 10 4-21-15-15 21-3z" fill="${T.clay}" fill-opacity="${f(0.2 + 0.6 * k)}" ${sline(T.clay, 4.5)}/><circle cx="104" cy="82" r="14" fill="${T.clay}"/><path d="M104 75v14M97 82h14" ${line(T.cut, 4)}/>`; },
	savelayout: (p) => { const y = 34 + 20 * wave(p); return `<rect x="30" y="24" width="84" height="74" rx="10" fill="none" ${sline(T.ink, 5)}/><rect x="44" y="24" width="56" height="22" fill="${T.faint}"/><path d="M72 ${f(y - 14)}V${f(y + 10)}M62 ${f(y)}l10 10 10-10" ${line(T.clay, 5)}/><rect x="44" y="70" width="56" height="20" rx="4" fill="${T.clay}" opacity=".85"/>`; },
	barleft: (p) => { const dx = -10 * wave(p); return `<g transform="translate(${f(dx)} 0)"><path d="M70 40v40M94 34v36M118 44v34" ${line(T.muted, 4)}/><rect x="62" y="48" width="16" height="24" rx="3" fill="${TV_UP}"/><rect x="86" y="42" width="16" height="20" rx="3" fill="${TV_DN}"/></g><path d="M48 60H22m12-12L22 60l12 12" ${line(T.clay, 6)}/>`; },
	barright: (p) => { const dx = 10 * wave(p); return `<g transform="translate(${f(dx)} 0)"><path d="M28 40v40M52 34v36M76 44v34" ${line(T.muted, 4)}/><rect x="20" y="48" width="16" height="24" rx="3" fill="${TV_UP}"/><rect x="44" y="42" width="16" height="20" rx="3" fill="${TV_DN}"/></g><path d="M96 60h26m-12-12l12 12-12 12" ${line(T.clay, 6)}/>`; },
	replay: (p) => `<path d="M24 92h96" ${line(T.faint, 3)}/><path d="M36 30v62" ${line(T.clay, 4)}/><path d="M${f(52)} 40l${f(26 + 6 * wave(p))} 20-${f(26 + 6 * wave(p))} 20z" fill="${T.clay}"/><path d="M90 40l26 20-26 20z" fill="${T.clay}" opacity=".5"/>`,
	pine: (p) => `<path d="M72 18l${f(-22)} 30h12l-18 24h14l-20 26h64l-20-26h14l-18-24h12z" fill="${TV_UP}" fill-opacity="${f(0.25 + 0.45 * wave(p))}" ${sline(TV_UP, 4)}/><path d="M72 98v8" ${line(T.ink, 5)}/>`,
	tvlogo: (p) => `<rect x="22" y="38" width="38" height="14" fill="${T.ink}"/><rect x="36" y="38" width="14" height="48" fill="${T.ink}"/><circle cx="74" cy="${f(46 - 3 * wave(p))}" r="9" fill="${T.clay}"/><path d="M86 38h20L88 86H70z" fill="${T.ink}"/>`,
	i1: interval("1m"), i2: interval("2m"), i5: interval("5m"), i15: interval("15m"), i1h: interval("1h"), i4h: interval("4h"), iD: interval("D"), iW: interval("W"),
});

/** Palettes for every look. `colours` = [start, end, ink] of the chosen colour theme (Colourful/Vivid/Pro). */
function palette(style, colours, brand) {
	const b = BRANDS[brand] || BRANDS.claude;
	const [c1, c2, c3] = colours && colours.length >= 3 ? colours : b.colours;
	switch (style) {
		case "light": return { ...b.light, glow: b.light.clay, font: "app" };
		case "vivid": return { bgTop: c1, bgBottom: c2, edge: mix(c1, "#ffffff", 0.35), ink: "#FFFFFF", muted: mix(c2, "#ffffff", 0.62), faint: mix(c2, "#ffffff", 0.3), clay: c3, clayLight: mix(c3, "#ffffff", 0.35), surface: mix(c2, "#000000", 0.12), cut: c2, glow: "#ffffff", font: "sans" };
		case "neon": return { bgTop: "#2A2E40", bgBottom: "#0B0D14", edge: mix(c1, "#0B0D14", 0.55), ink: c1, muted: mix(c1, "#0B0D14", 0.45), faint: mix(c1, "#0B0D14", 0.75), clay: mix(c2, "#ffffff", 0.2), clayLight: mix(c1, "#ffffff", 0.55), surface: "#1A1C26", cut: "#0B0D14", glow: c1, font: "sans" };
		case "pro": return { bgTop: "#2B3040", bgBottom: "#0E1016", edge: "#2E3445", ink: "#E8EDF6", muted: "#7F8899", faint: "#3A4152", clay: c1, clayLight: mix(c1, "#ffffff", 0.4), surface: "#1C2130", cut: "#0E1016", glow: c1, bar: [c1, c2], font: "sans" };
		default: return { ...b.app, glow: b.app.clay, font: "app" };
	}
}

let uid = 0;
/**
 * Full 144×144 key. `phase` 0..1 drives the icon animation; labels stay still.
 * style: "app" (Claude Dark, default) · "light" (Claude Light) · "neon" (Colourful) · "vivid" · "pro".
 */
export function brandKeySvg({ brand = "claude", glyph, label = "", phase = 0, setup = false, animate = true, style = "app", colours }) {
	const p = animate ? ((phase % 1) + 1) % 1 : 0;
	const pal = palette(style, colours, brand);
	Object.assign(T, pal);
	const u = "cl" + (++uid).toString(36);
	const draw = ART[glyph] || ART.newchat;
	const serif = pal.font === "app"; // native looks: title-case Segoe UI Bold with the accent rule
	const raw = String(label).slice(0, 14);
	const text = esc(serif ? raw : raw.toUpperCase());
	const fs = serif ? (raw.length > 11 ? 16.5 : raw.length > 8 ? 18.5 : 21) : Math.min(19, Math.floor(130 / Math.max(1, raw.length * 0.64)) + 1);
	// Livelier motion: icon details run two loops per 6 s cycle, the icon bobs, the glow breathes and an accent light travels round the frame.
	const p2 = (p * 2) % 1;
	const glowOp = (style === "vivid" ? 0.14 : style === "neon" ? 0.2 : 0.1) + (animate ? 0.22 * wave(p2) : 0);
	let body = `<defs><linearGradient id="${u}b" x1="0" y1="0" x2="${style === "vivid" ? 1 : 0}" y2="1"><stop offset="0" stop-color="${pal.bgTop}"/><stop offset="1" stop-color="${pal.bgBottom}"/></linearGradient>` +
		`<radialGradient id="${u}g" cx=".5" cy=".38" r=".55"><stop offset="0" stop-color="${pal.glow}" stop-opacity="${f(glowOp)}"/><stop offset="1" stop-color="${pal.glow}" stop-opacity="0"/></radialGradient>` +
		(pal.bar ? `<linearGradient id="${u}r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${pal.bar[0]}"/><stop offset="1" stop-color="${pal.bar[1]}"/></linearGradient>` : "") + `</defs>` +
		`<rect width="144" height="144" fill="url(#${u}b)"/><rect width="144" height="144" fill="url(#${u}g)"/>`;
	if (style === "vivid") body += `<circle cx="128" cy="12" r="50" fill="#fff" opacity=".10"/><circle cx="10" cy="140" r="44" fill="#000" opacity=".10"/>`;
	body += `<rect x="1.5" y="1.5" width="141" height="141" rx="14" fill="none" stroke="${pal.edge}" stroke-width="2"/>`;
	if (pal.bar) body += `<rect width="144" height="6" fill="url(#${u}r)"/>`;
	// Travelling sheen on the frame for the colour looks.
	if (animate) body += `<rect x="2.5" y="2.5" width="139" height="139" rx="13" fill="none" stroke="${style === "app" || style === "light" ? pal.clay : "#fff"}" stroke-width="2.4" stroke-opacity="${style === "app" || style === "light" ? 0.85 : 0.5}" stroke-linecap="round" stroke-dasharray="46 510" stroke-dashoffset="${f(-p * 556)}"/>`;
	const bob = animate ? -4 * Math.sin(p2 * TAU) : 0, grow = animate ? 1 + 0.05 * wave(p2) : 1;
	body += `<g data-glyph="${esc(glyph)}" transform="translate(72 ${f(56 + bob)}) scale(${f(grow)}) translate(-72 -56)">${draw(p2)}</g>`;
	if (setup) body += `<rect x="46" y="92" width="52" height="15" rx="7.5" fill="${pal.clay}"/><text x="72" y="103" text-anchor="middle" font-family="Segoe UI, Arial" font-size="9.5" font-weight="700" letter-spacing="1" fill="${pal.cut}">SETUP</text>`;
	if (text) body += (serif ? `<path d="M${f(72 - (10 + 12 * (animate ? wave(p2) : 0.5)))} 110h${f(2 * (10 + 12 * (animate ? wave(p2) : 0.5)))}" stroke="${pal.clay}" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>` +
		`<text x="72" y="132" text-anchor="middle" font-family="${LABEL_FONT}" font-size="${fs}" font-weight="800" fill="${pal.ink}" stroke="${pal.ink}" stroke-width=".55" stroke-linejoin="round">${text}</text>` :
		`<text x="72" y="132.5" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="800" letter-spacing="${raw.length > 9 ? 0.3 : 1}" fill="#000" opacity=".35">${text}</text>` +
		`<text x="72" y="131" text-anchor="middle" font-family="Segoe UI, Arial, Helvetica, sans-serif" font-size="${fs}" font-weight="800" letter-spacing="${raw.length > 9 ? 0.3 : 1}" fill="${style === "neon" ? "#ffffff" : pal.ink}" stroke="${style === "neon" ? "#ffffff" : pal.ink}" stroke-width=".5" stroke-linejoin="round">${text}</text>`);
	Object.assign(T, CLAUDE_TOKENS);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><g data-app-design="${esc(brand)}" data-style="${style}">${body}</g></svg>`;
}

export const claudeKeySvg = (o) => brandKeySvg({ ...o, brand: "claude" });

/** Monochrome action-list icon (white on transparent). */
export function brandMonoSvg(glyph, size) {
	Object.assign(T, { ink: "#FFFFFF", muted: "#FFFFFF", faint: "#9A9A9A", clay: "#FFFFFF", clayLight: "#FFFFFF", surface: "#2D2D2D", cut: "#2D2D2D" });
	const art = (ART[glyph] || ART.newchat)(0);
	Object.assign(T, CLAUDE_TOKENS);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="14 0 116 116">${art}</svg>`;
}

export const claudeMonoSvg = brandMonoSvg;
export const hasArt = (glyph) => Object.prototype.hasOwnProperty.call(ART, glyph);
export const hasClaudeArt = hasArt;

/**
 * Usage meter key: big percentage inside a ring that fills with the used share of the window.
 * state: "ok" | "setup" | "signin" | "blocked" | "nodata" | "error" | "loading".
 */
export function meterKeySvg({ brand = "claude", style = "app", colours, pct, caption = "5-HOUR", until = "", state = "ok", label = "", phase = 0, animate = true }) {
	const p = animate ? ((phase % 1) + 1) % 1 : 0, p2 = (p * 2) % 1;
	const pal = palette(style, colours, brand);
	const u = "mt" + (++uid).toString(36);
	const ok = state === "ok" && typeof pct === "number";
	const v = ok ? Math.max(0, Math.min(100, pct)) : 0;
	const col = !ok ? pal.muted : v >= 85 ? "#FF4D5E" : v >= 60 ? "#F5A524" : pal.clay;
	const R = 38, C = 2 * Math.PI * R, cx = 72, cy = 56;
	const msg = { setup: "SETUP", signin: "SIGN IN", blocked: "BLOCKED", nodata: "NO DATA", error: "ERROR", loading: "…" }[state] || "";
	const text = esc(String(label).slice(0, 14));
	const fs = text.length > 11 ? 16.5 : text.length > 8 ? 18.5 : 21;
	const glow = animate ? 0.12 + 0.2 * wave(p2) : 0.12;
	let body = `<defs><linearGradient id="${u}b" x1="0" y1="0" x2="${style === "vivid" ? 1 : 0}" y2="1"><stop offset="0" stop-color="${pal.bgTop}"/><stop offset="1" stop-color="${pal.bgBottom}"/></linearGradient>` +
		`<radialGradient id="${u}g" cx=".5" cy=".4" r=".55"><stop offset="0" stop-color="${col}" stop-opacity="${f(glow)}"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs>` +
		`<rect width="144" height="144" fill="url(#${u}b)"/><rect width="144" height="144" fill="url(#${u}g)"/>` +
		`<rect x="1.5" y="1.5" width="141" height="141" rx="14" fill="none" stroke="${pal.edge}" stroke-width="2"/>`;
	if (pal.bar) body += `<rect width="144" height="6" fill="${pal.bar[0]}"/>`;
	body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${pal.faint}" stroke-width="9"/>`;
	if (ok && v > 0) body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${f(C * v / 100)} ${f(C)}" transform="rotate(-90 ${cx} ${cy})"/>`;
	// A bright dot travels round the ring so the key always looks alive.
	if (animate) { const a = p * 2 * Math.PI - Math.PI / 2; body += `<circle cx="${f(cx + R * Math.cos(a))}" cy="${f(cy + R * Math.sin(a))}" r="3.2" fill="${pal.ink}" opacity=".85"/>`; }
	body += `<text x="${cx}" y="${ok ? 58 : 58}" text-anchor="middle" font-family="${LABEL_FONT}" font-size="${ok ? (v >= 100 ? 26 : 30) : 15}" font-weight="800" fill="${ok ? pal.ink : col}" stroke="${ok ? pal.ink : col}" stroke-width=".5">${ok ? Math.round(v) + "%" : msg}</text>`;
	body += `<text x="${cx}" y="76" text-anchor="middle" font-family="${LABEL_FONT}" font-size="11" font-weight="700" letter-spacing="1" fill="${pal.muted}">${esc(ok && until ? until : caption)}</text>`;
	if (text) body += `<path d="M60 110h24" stroke="${col}" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>` +
		`<text x="72" y="132" text-anchor="middle" font-family="${LABEL_FONT}" font-size="${fs}" font-weight="800" fill="${style === "neon" ? "#ffffff" : pal.ink}" stroke="${style === "neon" ? "#ffffff" : pal.ink}" stroke-width=".55" stroke-linejoin="round">${text}</text>`;
	Object.assign(T, CLAUDE_TOKENS);
	return `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><g data-app-design="${esc(brand)}" data-meter="${esc(state)}">${body}</g></svg>`;
}

ART.meter = (p) => `<circle cx="72" cy="56" r="34" fill="none" stroke="${T.faint}" stroke-width="8"/><circle cx="72" cy="56" r="34" fill="none" stroke="${T.clay}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${f(214 * (0.3 + 0.4 * wave(p)))} 214" transform="rotate(-90 72 56)"/><text x="72" y="64" text-anchor="middle" font-family="Segoe UI, Arial" font-size="22" font-weight="800" fill="${T.ink}">%</text>`;
