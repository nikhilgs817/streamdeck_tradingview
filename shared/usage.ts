// Usage meters for the 5-hour and weekly limit windows.
//  • codex  — read locally from the ChatGPT/Codex app's session logs (%USERPROFILE%\.codex\sessions): no sign-in needed.
//  • claude — read from claude.ai's usage endpoint with the user's own session key (stored DPAPI-encrypted, never logged).
import { existsSync, openSync, readSync, closeSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type UsageSource = "codex" | "claude";
export type UsageWindow = "5h" | "7d";
export type WindowReading = { pct: number; resetsAt?: number };
export type UsageReading = { ok: true; at: number; windows: Partial<Record<UsageWindow, WindowReading>> } | { ok: false; at: number; reason: "setup" | "signin" | "blocked" | "nodata" | "error"; message: string };

const MAX_TAIL = 512 * 1024;

function tail(path: string): string {
	const size = statSync(path).size, start = Math.max(0, size - MAX_TAIL), fd = openSync(path, "r");
	try { const buf = Buffer.alloc(size - start); readSync(fd, buf, 0, buf.length, start); return buf.toString("utf8"); } finally { closeSync(fd); }
}

function findRateLimits(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== "object") return undefined;
	const obj = value as Record<string, unknown>;
	if (obj.rate_limits && typeof obj.rate_limits === "object") return obj.rate_limits as Record<string, unknown>;
	for (const v of Object.values(obj)) { const hit = findRateLimits(v); if (hit) return hit; }
	return undefined;
}

/** Newest rate-limit snapshot written by the Codex/ChatGPT app. */
export function readCodex(home = process.env.DAILYOPS_CODEX_HOME || join(homedir(), ".codex")): UsageReading {
	const at = Date.now(), root = join(home, "sessions");
	if (!existsSync(root)) return { ok: false, at, reason: "nodata", message: "No ChatGPT/Codex usage found on this PC yet" };
	const files: { path: string; mtime: number }[] = [];
	const desc = (dir: string) => readdirSync(dir).sort().reverse();
	try {
		for (const y of desc(root)) for (const m of desc(join(root, y))) for (const d of desc(join(root, y, m))) {
			for (const f of readdirSync(join(root, y, m, d))) if (f.endsWith(".jsonl")) { const p = join(root, y, m, d, f); files.push({ path: p, mtime: statSync(p).mtimeMs }); }
			if (files.length >= 40) break;
		}
	} catch { /* unreadable folders are skipped */ }
	files.sort((a, b) => b.mtime - a.mtime);
	for (const file of files.slice(0, 12)) {
		let text = ""; try { text = tail(file.path); } catch { continue; }
		const lines = text.split("\n");
		for (let i = lines.length - 1; i >= 0; i--) {
			if (!lines[i].includes('"rate_limits"')) continue;
			let rl: Record<string, unknown> | undefined; try { rl = findRateLimits(JSON.parse(lines[i])); } catch { continue; }
			if (!rl) continue;
			const windows: Partial<Record<UsageWindow, WindowReading>> = {};
			for (const key of ["primary", "secondary"]) {
				const w = rl[key] as { used_percent?: number; window_minutes?: number; resets_at?: number } | undefined;
				if (!w || typeof w.used_percent !== "number") continue;
				const win: UsageWindow = (w.window_minutes ?? 0) >= 1440 ? "7d" : "5h";
				const resetsAt = typeof w.resets_at === "number" ? w.resets_at * 1000 : undefined;
				// A window that has already reset shows 0 % until the app records new usage.
				windows[win] = { pct: resetsAt && resetsAt < at ? 0 : Math.max(0, Math.min(100, w.used_percent)), resetsAt: resetsAt && resetsAt > at ? resetsAt : undefined };
			}
			if (Object.keys(windows).length) return { ok: true, at, windows };
		}
	}
	return { ok: false, at, reason: "nodata", message: "Use ChatGPT/Codex once so the app records your limits" };
}

const CLAUDE = "https://claude.ai/api";
let claudeOrg: { key: string; id: string } | undefined;
/** Optional diagnostics sink (never receives the session key). */
export let usageLog: (line: string) => void = () => undefined;
export function setUsageLog(fn: (line: string) => void): void { usageLog = fn; }

type Period = { utilization?: number; percent?: number; resets_at?: string | null; reset_at?: string | null } | null | undefined;
const RANK = ["claude_max", "claude_pro", "claude_team", "chat"];
const rankOf = (caps: unknown) => { const c = Array.isArray(caps) ? caps : []; const i = RANK.findIndex((k) => c.includes(k)); return i < 0 ? RANK.length : i; };

/** Parse claude.ai's usage body: top-level five_hour / seven_day first, then the newer `limits[]` entries. */
export function parseClaudeUsage(body: Record<string, unknown>, at = Date.now()): Partial<Record<UsageWindow, WindowReading>> {
	const limits = Array.isArray(body.limits) ? (body.limits as Record<string, unknown>[]) : [];
	const pick = (top: string, kinds: string[]): WindowReading | undefined => {
		let v = body[top] as Period, pct: number | undefined;
		if (v && typeof v.utilization === "number" && Number.isFinite(v.utilization)) pct = v.utilization;
		else {
			const hit = limits.find((l) => l && kinds.includes(String(l.kind))) as Period;
			if (hit && typeof hit.percent === "number" && Number.isFinite(hit.percent)) { pct = hit.percent; v = hit; }
			else if (hit && typeof hit.utilization === "number") { pct = hit.utilization; v = hit; }
		}
		// A window the account has not used yet is reported as null: that is 0 %, not missing data.
		if (pct === undefined) return top in body && body[top] === null ? { pct: 0 } : undefined;
		const raw = v?.resets_at ?? v?.reset_at, resetsAt = raw ? Date.parse(raw) : undefined;
		return { pct: Math.max(0, Math.min(100, pct)), resetsAt: resetsAt && resetsAt > at ? resetsAt : undefined };
	};
	const windows: Partial<Record<UsageWindow, WindowReading>> = {};
	const five = pick("five_hour", ["session", "five_hour"]), week = pick("seven_day", ["weekly_all", "weekly", "seven_day"]);
	if (five) windows["5h"] = five;
	if (week) windows["7d"] = week;
	return windows;
}

/** claude.ai usage for the account behind `sessionKey`. */
export async function readClaude(sessionKey: string | undefined): Promise<UsageReading> {
	const at = Date.now();
	if (!sessionKey) return { ok: false, at, reason: "setup", message: "Paste your claude.ai session key in the key settings" };
	const headers = {
		cookie: `sessionKey=${sessionKey}`, accept: "application/json", "content-type": "application/json",
		"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
		"anthropic-client-platform": "web_claude_ai", "anthropic-client-version": "1.0.0",
		origin: "https://claude.ai", referer: "https://claude.ai/settings/usage", "sec-fetch-dest": "empty", "sec-fetch-mode": "cors", "sec-fetch-site": "same-origin",
	};
	const get = async (url: string) => { const r = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) }); const text = await r.text().catch(() => ""); return { status: r.status, ok: r.ok, text }; };
	const invalid = (r: { status: number; text: string }) => r.status === 401 || r.text.includes("account_session_invalid");
	const challenge = (r: { text: string }) => /<html|cf-chl|challenge-platform|Just a moment/i.test(r.text.slice(0, 2000));
	try {
		const tryOrg = async (id: string) => {
			const r = await get(`${CLAUDE}/organizations/${id}/usage`);
			usageLog(`claude usage: org ${id.slice(0, 8)} -> HTTP ${r.status}`);
			if (!r.ok) return { r };
			let body: Record<string, unknown>; try { body = JSON.parse(r.text); } catch { return { r }; }
			const windows = parseClaudeUsage(body, at);
			usageLog(`claude usage: keys [${Object.keys(body).join(",")}] 5h=${windows["5h"]?.pct ?? "-"} 7d=${windows["7d"]?.pct ?? "-"}`);
			return { r, windows };
		};
		if (claudeOrg?.key === sessionKey) {
			const hit = await tryOrg(claudeOrg.id);
			if (hit.windows && Object.keys(hit.windows).length) return { ok: true, at, windows: hit.windows };
			if (invalid(hit.r)) { claudeOrg = undefined; return { ok: false, at, reason: "signin", message: "Session key expired; paste a new one" }; }
			claudeOrg = undefined;
		}
		const r = await get(`${CLAUDE}/organizations`);
		usageLog(`claude usage: organizations -> HTTP ${r.status}`);
		if (invalid(r) || (r.status === 403 && !challenge(r))) return { ok: false, at, reason: "signin", message: "Session key is invalid or expired; paste a new one" };
		if (challenge(r) || r.status === 403) return { ok: false, at, reason: "blocked", message: "claude.ai blocked the request (Cloudflare check)" };
		if (r.status === 429) return { ok: false, at, reason: "error", message: "claude.ai rate limit; trying again shortly" };
		if (!r.ok) return { ok: false, at, reason: "error", message: `claude.ai answered ${r.status}` };
		let orgs: { uuid?: string; capabilities?: string[] }[] = [];
		try { orgs = JSON.parse(r.text); } catch { /* handled below */ }
		const ranked = (Array.isArray(orgs) ? orgs : []).filter((o) => o && typeof o.uuid === "string").map((o, i) => ({ o, i })).sort((a, b) => rankOf(a.o.capabilities) - rankOf(b.o.capabilities) || a.i - b.i).map((x) => x.o);
		usageLog(`claude usage: ${ranked.length} organization(s), capabilities ${ranked.map((o) => (o.capabilities || []).filter((c) => RANK.includes(c)).join("+") || "none").join(" | ")}`);
		if (!ranked.length) return { ok: false, at, reason: "error", message: "No Claude organization found" };
		let last: { status: number; ok: boolean; text: string } | undefined;
		for (const org of ranked) {
			const hit = await tryOrg(org.uuid!);
			last = hit.r;
			if (hit.windows && Object.keys(hit.windows).length) { claudeOrg = { key: sessionKey, id: org.uuid! }; return { ok: true, at, windows: hit.windows }; }
			if (invalid(hit.r)) return { ok: false, at, reason: "signin", message: "Session key expired; paste a new one" };
		}
		return { ok: false, at, reason: last && challenge(last) ? "blocked" : "nodata", message: last && !last.ok ? `claude.ai answered ${last.status}` : "claude.ai returned no usage windows" };
	} catch (e) {
		return { ok: false, at, reason: "error", message: (e as Error).name === "TimeoutError" ? "claude.ai did not answer" : "Usage could not be read" };
	}
}

/** "2h 14m", "3d 4h", "12m" */
export function untilText(resetsAt: number | undefined, now = Date.now()): string {
	if (!resetsAt) return "";
	const m = Math.max(0, Math.round((resetsAt - now) / 60000)), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
	return d ? `${d}d ${h}h` : h ? `${h}h ${mm}m` : `${mm}m`;
}
