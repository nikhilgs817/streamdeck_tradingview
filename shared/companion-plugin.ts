import { mkdirSync, writeFileSync } from "node:fs";
import streamDeck, { action, type KeyDownEvent, type KeyUpEvent, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";
import { DailyAction, REGISTRY, globals, type Appearance } from "./base.js";
import { PRESET_ICONS, setAppDesign } from "./icons.js";
import { connectCompanion, type CompanionConnection } from "./companion-routing.js";
import { controlApp } from "./app-control.js";
import { shortcutToSendKeys } from "./shortcuts.js";
import type { AppSelector } from "./companion-specs.js";
import { TradingInput } from "./trading-input.js";
import { ps } from "./ps.js";
import { readClaude, readCodex, setUsageLog, untilText, type UsageReading, type UsageSource, type UsageWindow } from "./usage.js";
import { meterKeySvg } from "./brands/brand-keys.js";
import { THEMES, svgDataUri } from "./icons.js";
export type CompanionCommand = { id: string; name: string; glyph: string; theme: string; description: string; shortcut?: string; allowEnter?: boolean; menu?: string[][]; choices?: { names: string[]; options: string[] }[]; operation?: "back" | "focus" | "url" | "page" | "applink"; url?: string; link?: string; page?: number; trading?: "submit" | "bracket" | "panel"; setup?: string; executionNote?: string; hidden?: boolean; holdMs?: number; requiresBinding?: boolean; last?: boolean; waitMs?: number; meter?: { source: UsageSource; window: UsageWindow } };
export type CompanionConfig = { uuid: string; name: string; profile: string; selector: AppSelector; commands: CompanionCommand[]; design?: Record<string, unknown>; linkScheme?: string; fastKeys?: boolean; trading?: boolean };

/** Turns "Ctrl+Shift+O" / "Ctrl+Shift+; Up" / "Win+H" into verified host steps. */
export function shortcutSteps(shortcut: string): { k?: string; win?: number; w?: number }[] | undefined {
	const steps: { k?: string; win?: number; w?: number }[] = [];
	for (const chord of shortcut.trim().split(/\s+/).filter(Boolean)) {
		const win = /^win\+([a-z0-9])$/i.exec(chord);
		if (win) steps.push({ win: win[1].toUpperCase().charCodeAt(0) });
		else { const k = shortcutToSendKeys(chord); if (!k) return undefined; steps.push({ k }); }
		steps.push({ w: 60 });
	}
	return steps.length && steps.length <= 16 ? steps : undefined;
}
type KeySettings = Appearance & { shortcut?: string; destination?: string };

/** Latest usage reading per source, refreshed every 60 s while a meter key is visible. */
const readings = new Map<UsageSource, UsageReading>();
const meterKeys = new Map<string, { source: UsageSource; repaint: () => Promise<void> }>();
let meterTimer: NodeJS.Timeout | undefined;
let lastUsageSummary = "";
async function refreshUsage(source: UsageSource): Promise<void> {
	if (source === "codex") readings.set(source, readCodex());
	else {
		const blob = typeof globals.claudeUsageKey === "string" ? globals.claudeUsageKey : "";
		let key: string | undefined;
		if (blob) { const r = await ps.run("secret-unprotect", [blob, "claude-usage"]); if (r.status === "ok") key = r.message; }
		if (!blob) streamDeck.logger.info("claude usage: no session key saved yet");
		else if (!key) streamDeck.logger.warn("claude usage: saved key could not be decrypted on this PC");
		const lines: string[] = [];
		setUsageLog((l) => lines.push(l));
		const reading = await readClaude(key);
		const summary = `claude usage: ${reading.ok ? "ok " + JSON.stringify(Object.fromEntries(Object.entries(reading.windows).map(([k, w]) => [k, w?.pct]))) : reading.reason + " - " + reading.message}`;
		// Log details only when the outcome changes, so the 60 s refresh does not flood the log.
		if (summary !== lastUsageSummary) { for (const l of lines) streamDeck.logger.info(l); streamDeck.logger.info(summary); lastUsageSummary = summary; }
		readings.set(source, reading);
		key = undefined;
	}
	for (const k of meterKeys.values()) if (k.source === source) await k.repaint().catch(() => undefined);
}
function watchMeters(): void {
	if (meterKeys.size && !meterTimer) meterTimer = setInterval(() => { for (const s of new Set([...meterKeys.values()].map((k) => k.source))) void refreshUsage(s); }, 60_000).unref();
	else if (!meterKeys.size && meterTimer) { clearInterval(meterTimer); meterTimer = undefined; }
}

export async function bootCompanion(config: CompanionConfig): Promise<void> {
	setAppDesign(config.design);
	streamDeck.logger.setLevel("info");
	const log = streamDeck.logger.createScope("companion");
	const trading = new TradingInput(config.selector);
	if (config.commands.some(c => c.trading)) trading.warm();
	let bridge: CompanionConnection | undefined;
	const visible = new Map<string, number>();
	const localShow = async (device: string) => { await streamDeck.profiles.switchToProfile(device, config.profile, 0); };
	const localBack = async (device: string) => { await streamDeck.profiles.switchToProfile(device); streamDeck.logger.info(`back on ${device}`); };
	const show = async (device: string) => { if (bridge?.connected) await bridge.request("show", device); else await localShow(device); };
	// Devices where Windows Daily Toolkit handed the deck to this plugin. If the user opened these keys some other way
	// (picked the profile in Stream Deck, a native Switch Profile key…), Back must not wait for the Toolkit: it simply
	// returns to the previous profile.
	const viaToolkit = new Set<string>();
	// Stream Deck's "previous profile" is overwritten by every switch the plugin makes, including page changes inside
	// this profile. Leave to the previous profile first, then open the page, so Back still returns to the main keys.
	const showPage = async (device: string, page: number) => {
		await localBack(device);
		await new Promise((r) => setTimeout(r, 60));
		await streamDeck.profiles.switchToProfile(device, config.profile, page);
		streamDeck.logger.info(`page ${page} on ${device}`);
	};
	const back = async (device: string) => {
		if (bridge?.connected && viaToolkit.has(device)) { try { await bridge.request("back", device); return; } catch { /* fall back below */ } }
		viaToolkit.delete(device);
		await localBack(device);
	};
	for (const definition of config.commands) {
		PRESET_ICONS["comp-" + definition.id] = { glyph: definition.glyph, theme: definition.theme, label: definition.name, style: config.design ? "app" : "vivid" };
		@action({ UUID: config.uuid + "." + definition.id })
		class AppKey extends DailyAction<KeySettings> {
			protected readonly kind = "comp-" + definition.id;
			#held = new Set<string>();
			#busy = new Set<string>();
			#pending = new Map<string, ReturnType<typeof setTimeout>>();
			#release(id: string): void { this.#held.delete(id); clearTimeout(this.#pending.get(id)); this.#pending.delete(id); }
			override onWillDisappear(ev: WillDisappearEvent<KeySettings>): void { this.#release(ev.action.id); meterKeys.delete(ev.action.id); watchMeters(); super.onWillDisappear(ev); }
			override async onWillAppear(ev: WillAppearEvent<KeySettings>): Promise<void> {
				await super.onWillAppear(ev);
				const m = definition.meter;
				if (m) {
					meterKeys.set(ev.action.id, { source: m.source, repaint: async () => this.paint(ev.action, await ev.action.getSettings()) });
					watchMeters();
					if (!readings.has(m.source) || Date.now() - readings.get(m.source)!.at > 30_000) void refreshUsage(m.source);
				}
			}
			override imageNow(s: KeySettings): { image: string } {
				const m = definition.meter;
				if (!m || (typeof s.iconImage === "string" && s.iconImage.startsWith("data:image/"))) return super.imageNow(s);
				const look = this.look(s), motion = this.motion(s), r = readings.get(m.source), w = r?.ok ? r.windows[m.window] : undefined;
				const style = look.style === "real" ? "app" : look.style;
				return { image: svgDataUri(meterKeySvg({ brand: (config.design?.id as string) || "claude", style, colours: (THEMES as Record<string, string[]>)[look.theme], pct: w?.pct, caption: m.window === "5h" ? "5-HOUR" : "WEEKLY", until: w ? untilText(w.resetsAt) : "", state: !r ? "loading" : r.ok ? (w ? "ok" : "nodata") : r.reason, label: look.label, phase: motion?.phase ?? 0, animate: !!motion })) };
			}
			override async onKeyUp(ev: KeyUpEvent<KeySettings>): Promise<void> { this.#release(ev.action.id); }
			protected override dynamicLabel(settings: KeySettings): string | undefined {
				return ((definition.trading === "submit" || definition.requiresBinding) && !settings.shortcut?.trim()) || (definition.operation === "url" && !definition.url && !settings.destination?.trim()) ? definition.name + " · SETUP" : undefined;
			}
			override async onKeyDown(ev: KeyDownEvent<KeySettings>): Promise<void> {
				try {
					if (definition.meter) {
						await refreshUsage(definition.meter.source);
						const r = readings.get(definition.meter.source);
						if (r && !r.ok) await this.feedback(ev.action, { status: "miss", message: r.message }); else await ev.action.showOk();
						return;
					}
					if (definition.operation === "back") { await back(ev.action.device.id); return; }
					if (definition.operation === "page") { await showPage(ev.action.device.id, definition.page || 0); return; }
					if (definition.operation === "applink") {
						// Fixed in-app links from the plugin's own config (never from key settings), e.g. claude://claude.ai/new
						const link = definition.link || "";
						if (!config.linkScheme || !link.startsWith(config.linkScheme)) { await this.feedback(ev.action, { status: "miss", message: "This app link is not available" }); return; }
						const opened = await ps.run("url", [link]);
						if (opened.status !== "ok" || !definition.menu) { await this.feedback(ev.action, opened, false); return; }
						// Then press an on-screen button the app exposes (for example the incognito toggle on a new chat).
						await new Promise((r) => setTimeout(r, definition.waitMs || 1500));
						await this.feedback(ev.action, await controlApp({ selector: config.selector, menu: definition.menu, last: definition.last }), false); return;
					}
					if (definition.operation === "url") {
						const url = ev.payload.settings.destination?.trim() || definition.url;
						if (!url || !/^https?:\/\//i.test(url)) { await this.feedback(ev.action, {status:"miss", message:"Enter the full http:// or https:// page URL"}); return; }
						await this.feedback(ev.action, await ps.run("url", [url]), false); return;
					}
					if (definition.trading) {
						if (this.#held.has(ev.action.id)) return;
						this.#held.add(ev.action.id);
						const binding = ev.payload.settings.shortcut?.trim();
						if (binding) {
							if (definition.holdMs) {
								this.#pending.set(ev.action.id, setTimeout(async () => {
									this.#pending.delete(ev.action.id);
									if (!this.#held.has(ev.action.id)) return;
									try { const current = await ev.action.getSettings(); if (!this.#held.has(ev.action.id) || current.shortcut?.trim() !== binding) return; await this.feedback(ev.action, await trading.send(binding), false); } catch { await this.feedback(ev.action, {status:"err",message:"Trading action unavailable"}); }
								}, definition.holdMs)); return;
							}
							await this.feedback(ev.action, await trading.send(binding), false); return;
						}
						if (definition.trading === "submit" || definition.requiresBinding) { await this.feedback(ev.action, { status: "miss", message: "Match this key to a supported action in your broker settings" }); return; }
					}
					const shortcut = ev.payload.settings.shortcut?.trim() || definition.shortcut;
					if (definition.operation === "focus" && !shortcut && (config.linkScheme || config.fastKeys)) {
						await this.feedback(ev.action, await ps.run("appkeys", [config.selector.names.join("|"), config.selector.path || "", "[]"], 8000), false); return;
					}
					// Trading apps: generic keys may only send one chord and never Enter, so they cannot bypass the trading safeguards.
					if (config.trading && shortcut && !definition.trading && !(definition.allowEnter && !ev.payload.settings.shortcut?.trim()) && (shortcut.trim().split(/\s+/).length > 1 || /(^|\+)(enter|return)$/i.test(shortcut.trim()))) {
						await this.feedback(ev.action, { status: "miss", message: "In trading apps this key sends one shortcut without Enter. Use the Buy/Sell keys for orders." }); return;
					}
					if (shortcut && !definition.menu && (config.linkScheme || config.fastKeys)) {
						// Fast path: the warm host verifies the app is in front before every step and never steals input elsewhere.
						const steps = shortcutSteps(shortcut);
						if (!steps) { await this.feedback(ev.action, { status: "miss", message: "Use a shortcut such as Ctrl+Shift+O" }); return; }
						if (this.#busy.has(ev.action.id)) return;
						this.#busy.add(ev.action.id);
						try { await this.feedback(ev.action, await ps.run("appkeys", [config.selector.names.join("|"), config.selector.path || "", JSON.stringify(steps)], 8000), false); }
						finally { this.#busy.delete(ev.action.id); }
						return;
					}
					const keys = shortcut ? shortcutToSendKeys(shortcut) : undefined;
					if (shortcut && !keys) { await this.feedback(ev.action, { status: "miss", message: "Use a shortcut such as Ctrl+Shift+N" }); return; }
					if (!keys && !definition.menu && definition.operation !== "focus") { await this.feedback(ev.action, { status: "miss", message: "Set this key's shortcut in settings" }); return; }
					const result = await controlApp({ selector: config.selector, ...(keys ? { keys, chords: shortcut!.split(/\s+/).map((chord) => shortcutToSendKeys(chord)!) } : definition.menu ? { menu: definition.menu, choices: definition.choices, last: definition.last } : {}) });
					await this.feedback(ev.action, result, false);
				} catch { await this.feedback(ev.action, { status: "err", message: "App controls are unavailable" }); }
			}
		}
		streamDeck.actions.registerAction(new AppKey());
	}
	streamDeck.actions.onWillAppear((ev) => { const d = ev.action.device.id; visible.set(d, (visible.get(d) || 0) + 1); bridge?.setVisible(d, true); });
	streamDeck.actions.onWillDisappear((ev) => {
		const d = ev.action.device.id; visible.set(d, Math.max(0, (visible.get(d) || 1) - 1));
		setTimeout(() => { if (!visible.get(d)) bridge?.setVisible(d, false); }, 300);
	});
	streamDeck.settings.onDidReceiveGlobalSettings((ev) => { Object.assign(globals, ev.settings); bridge?.update(); });
	streamDeck.ui.onSendToPlugin<{ event?: string; settings?: KeySettings }>(async (ev) => {
		if (streamDeck.ui.action?.id !== ev.action.id) return;
		if (ev.payload?.event === "meterSaveKey" || ev.payload?.event === "meterClearKey") {
			const value = (ev.payload as { value?: string }).value?.trim();
			let message = "Session key removed.";
			if (ev.payload.event === "meterSaveKey") {
				if (!value || value.length > 4096) { await streamDeck.ui.sendToPropertyInspector({ event: "meterStatus", message: "That doesn't look like a session key." }); return; }
				const r = await ps.run("secret-protect", [value, "claude-usage"]);
				if (r.status !== "ok") { await streamDeck.ui.sendToPropertyInspector({ event: "meterStatus", message: "The key could not be encrypted on this PC." }); return; }
				globals.claudeUsageKey = r.message; message = "Saved (encrypted). Reading usage…";
			} else delete globals.claudeUsageKey;
			await streamDeck.settings.setGlobalSettings({ ...globals } as never);
			await streamDeck.ui.sendToPropertyInspector({ event: "meterStatus", message });
			await refreshUsage("claude");
			const r = readings.get("claude");
			if (ev.payload.event === "meterSaveKey") await streamDeck.ui.sendToPropertyInspector({ event: "meterStatus", message: r?.ok ? "Connected. Usage updates every minute." : r?.message || "" });
			return;
		}
		if (ev.payload?.event === "companionShow") { await show(ev.action.device.id); return; }
		if (ev.payload?.event === "companionBack") { await back(ev.action.device.id); return; }
		if (ev.payload?.event === "getIcon" || ev.payload?.event === "refreshIcon") {
			const instance = REGISTRY.get(ev.action.manifestId); if (!instance) return;
			const settings = ev.payload.settings || await ev.action.getSettings();
			const rendered = await instance.imageFinal(settings);
			await streamDeck.ui.sendToPropertyInspector({ event: "icon", ...rendered, token: JSON.stringify(settings) });
		}
	});
	await streamDeck.connect();
	try { Object.assign(globals, await streamDeck.settings.getGlobalSettings()); } catch { log.warn("Using default focus settings"); }
	bridge = connectCompanion({ uuid: config.uuid, enabled: () => globals.autoFollow !== false, invoke: async (command, device) => { if (command === "show") { await localShow(device); viaToolkit.add(device); } else { viaToolkit.delete(device); await localBack(device); } } });
	for (const [device, count] of visible) bridge.setVisible(device, count > 0);

// A fresh receipt lets the installer verify this connected SDK process without reading settings.
try {
    mkdirSync(new URL("../logs/", import.meta.url), { recursive: true });
    writeFileSync(new URL("../logs/installer-ready.json", import.meta.url), JSON.stringify({ pid: process.pid, readyAt: new Date().toISOString() }), "utf8");
} catch { log.warn("Installer startup receipt could not be written"); }
}
