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

/** claude.ai usage for the account behind `sessionKey`. */
export async function readClaude(sessionKey: string | undefined): Promise<UsageReading> {
	const at = Date.now();
	if (!sessionKey) return { ok: false, at, reason: "setup", message: "Paste your claude.ai session key in the key settings" };
	const headers = { cookie: `sessionKey=${sessionKey}`, accept: "application/json", "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36", "anthropic-client-platform": "web_claude_ai" };
	const get = async (url: string) => { const r = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) }); return r; };
	try {
		if (!claudeOrg || claudeOrg.key !== sessionKey) {
			const r = await get(`${CLAUDE}/organizations`);
			if (r.status === 401 || r.status === 403) return { ok: false, at, reason: r.status === 401 ? "signin" : "blocked", message: r.status === 401 ? "Session key expired; paste a new one" : "claude.ai refused the request" };
			const orgs = (await r.json()) as { uuid?: string; capabilities?: string[] }[];
			const org = orgs.find((o) => o.capabilities?.includes("chat")) || orgs[0];
			if (!org?.uuid) return { ok: false, at, reason: "error", message: "No Claude organization found" };
			claudeOrg = { key: sessionKey, id: org.uuid };
		}
		const r = await get(`${CLAUDE}/organizations/${claudeOrg.id}/usage`);
		if (r.status === 401) { claudeOrg = undefined; return { ok: false, at, reason: "signin", message: "Session key expired; paste a new one" }; }
		if (!r.ok) return { ok: false, at, reason: r.status === 403 ? "blocked" : "error", message: `claude.ai answered ${r.status}` };
		const body = (await r.json()) as Record<string, { utilization?: number; resets_at?: string } | null>;
		const win = (v: { utilization?: number; resets_at?: string } | null | undefined): WindowReading | undefined => {
			if (!v || typeof v.utilization !== "number") return undefined;
			const resetsAt = v.resets_at ? Date.parse(v.resets_at) : undefined;
			return { pct: Math.max(0, Math.min(100, v.utilization)), resetsAt: resetsAt && resetsAt > at ? resetsAt : undefined };
		};
		const windows: Partial<Record<UsageWindow, WindowReading>> = {};
		const five = win(body.five_hour), week = win(body.seven_day);
		if (five) windows["5h"] = five;
		if (week) windows["7d"] = week;
		return Object.keys(windows).length ? { ok: true, at, windows } : { ok: false, at, reason: "nodata", message: "claude.ai returned no usage windows" };
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
