/* Windows Toolkit — settings panel (property inspector). Plain JS, no external dependencies. */
(function () {
	"use strict";

	// Shared by every plugin in the suite. kind = the action's last UUID segment; VS Code keys are "vsc-*".
	const PLUGIN_PREFIXES = { "com.windowstoolkit.vscode.": "vsc-", "com.windowstoolkit.devops.": "dev-", "com.windowstoolkit.core.": "" };
	const APP_KINDS = ["app"];

	// Keys that have a "real" icon (app / site / folder icon from Windows or the web).
	const REAL_CAPABLE = APP_KINDS.concat(["website", "downloads", "folder", "vsc-project"]);
	let realIcon = { token: "", image: "", real: false, loading: false };
	let iconTimer = null;

	const LAUNCH_KINDS = APP_KINDS.concat(["downloads", "folder", "website", "vsc-project"]);
	const FOLDER_KINDS = ["folder", "downloads", "vsc-project"];
	/** Windows Toolkit keys that hand the deck over to a companion plugin's keys (VS Code key, or any app key set to VS Code). */
	const VSCODE_RE = /visual studio code|\bvs ?code\b|vscodium|\bcode( - insiders)?\.exe\b|Microsoft\.VisualStudioCode/i;
	const MONITOR_KINDS = ["monitorcontrol"];
	/** Keys that pick one physical monitor (Monitor Control, Rotate Display). */
	const SCREEN_KINDS = ["monitorcontrol", "rotate"];
	let motionTimer = null;
	let screenList = null; // [{ key, name, on, num, primary }]

	/** Which companion's keys this key switches to (or "" for none). */
	function handoffName() {
		if (!APP_KINDS.includes(kind)) return "";
		const chosen = [settings.appName, settings.appId, settings.target].filter(Boolean).join(" ");
		if (chosen) {
			if (VSCODE_RE.test(chosen)) return "VS Code";
			for (const [pattern, name] of [[/chatgpt|OpenAI\.(ChatGPT|Codex)/i, "ChatGPT"], [/\bclaude\b/i, "Claude"], [/thinkorswim/i, "thinkorswim"], [/tradingview/i, "TradingView"], [/Fidelity Trader\+|68D72461-B3DB-4FE2-AE47-50EF0FD7254F/i, "Fidelity Trader+"]]) if (pattern.test(chosen)) return name;
		}
		return "";
	}
	let globalSettings = {};

	let ws = null;
	let piUuid = "";
	let actionUuid = "";
	let kind = "";
	let settings = {};
	let apps = []; // [{ n: name, id: AppID }]
	let pendingConnect = null;
	let domReady = false;
	let credentialDirty = false;
	let passwordDirty = false;
	let credentialPending = null;
	let credentialTimer = null;
	let passwordTimer = null;

	const $ = (id) => document.getElementById(id);
	const I = () => window.WinToolkitIcons;

	/* ------------------------------------------------------------ Stream Deck connection */

	window.connectElgatoStreamDeckSocket = function (port, uuid, registerEvent, info, actionInfo) {
		pendingConnect = { port, uuid, registerEvent, actionInfo };
		if (domReady) connect();
	};

	document.addEventListener("DOMContentLoaded", () => {
		domReady = true;
		if (pendingConnect) connect();
	});

	function connect() {
		const { port, uuid, registerEvent, actionInfo } = pendingConnect;
		pendingConnect = null;
		piUuid = uuid;
		const ai = typeof actionInfo === "string" ? JSON.parse(actionInfo) : actionInfo;
		actionUuid = ai.action;
		kind = actionUuid;
		for (const [prefix, tag] of Object.entries(PLUGIN_PREFIXES)) {
			if (actionUuid.startsWith(prefix)) { kind = tag + actionUuid.slice(prefix.length); break; }
		}
		settings = (ai.payload && ai.payload.settings) || {};
		if (window.WinToolkitCompanion && actionUuid.startsWith(window.WinToolkitCompanion.uuid + ".")) kind = "comp-" + actionUuid.slice(window.WinToolkitCompanion.uuid.length + 1);

		ws = new WebSocket("ws://127.0.0.1:" + port);
		ws.onopen = () => {
			ws.send(JSON.stringify({ event: registerEvent, uuid: piUuid }));
			if (APP_KINDS.includes(kind)) requestApps();
			if (SCREEN_KINDS.includes(kind)) sendToPlugin({ event: "getScreens" });
			ws.send(JSON.stringify({ event: "getGlobalSettings", context: piUuid }));
		};
		ws.onmessage = (e) => {
			let m;
			try { m = JSON.parse(e.data); } catch { return; }
			if (m.event === "didReceiveSettings" && m.payload) {
				settings = m.payload.settings || {};
				fill();
			} else if (m.event === "didReceiveGlobalSettings" && m.payload) {
				globalSettings = m.payload.settings || {};
				$("monitorOrder").value = globalSettings.monitorOrder === "left" || globalSettings.monitorOrder === "primary" ? globalSettings.monitorOrder : "windows";
				{ const el = $("companionMeterSaved"); if (el) { const at = globalSettings.claudeUsageKeySavedAt ? new Date(globalSettings.claudeUsageKeySavedAt) : null; el.textContent = globalSettings.claudeUsageKey ? "Session key saved" + (at && !isNaN(at) ? " on " + at.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "") + ". If the key shows SIGN IN, press it to open claude.ai and paste a new one." : "No session key saved yet. Press the key to open claude.ai, then paste the sessionKey here."; } }
				$("autoFollow").checked = globalSettings.autoFollow !== false;
				$("companionFollow").checked = globalSettings.autoFollow !== false;
				$("returnOnClose").checked = globalSettings.returnOnClose !== false;
				$("followWindowsMotion").checked = globalSettings.followWindowsMotion !== false;
				if (LAUNCH_KINDS.includes(kind)) requestMonitors();
				fillLook();
			} else if (m.event === "sendToPropertyInspector" && m.payload) {
				onPluginMessage(m.payload);
			}
		};
		build();
		fill();
	}

	function save() {
		if (ws && ws.readyState === 1) ws.send(JSON.stringify({ event: "setSettings", context: piUuid, payload: settings }));
		renderLook();
	}

	function sendToPlugin(payload) {
		if (ws && ws.readyState === 1) ws.send(JSON.stringify({ event: "sendToPlugin", action: actionUuid, context: piUuid, payload }));
	}

	function set(key, value) {
		if (value === "" || value === undefined || value === null) delete settings[key];
		else settings[key] = value;
	}

	/* ------------------------------------------------------------ credentials */

	function credentialStatus(message, error = false) {
		$("credentialStatus").textContent = message;
		$("credentialStatus").className = "hint pad" + (error ? " err" : "");
	}
	function credentialBinding() { return settings.appId ? "appid:" + settings.appId : settings.target?.trim() ? "target:" + settings.target.trim() : ""; }
	function forgetCredentials() {
		credentialPending = null; clearTimeout(credentialTimer); credentialBusy(false);
		for (const key of ["credentialUsername", "credentialPassword", "credentialAutofill", "credentialApp"]) delete settings[key];
		credentialDirty = passwordDirty = false; hidePassword();
		credentialStatus("App changed. Enter credentials for this app if needed.");
	}
	function credentialBusy(busy) {
		for (const id of ["credentialUsername", "credentialPassword", "credentialAutofill", "saveCredentials", "clearCredentials", "passwordEye"]) $(id).disabled = busy;
	}
	function hidePassword() {
		clearTimeout(passwordTimer);
		$("credentialPassword").type = "password";
		if (!passwordDirty) $("credentialPassword").value = "";
		$("passwordEye").setAttribute("aria-pressed", "false");
		$("passwordEye").setAttribute("aria-label", "Show password");
		$("passwordEye").title = "Show password";
		$("passwordEyeSlash").setAttribute("hidden", "");
	}
	function showPassword() {
		$("credentialPassword").type = "text";
		$("passwordEye").setAttribute("aria-pressed", "true");
		$("passwordEye").setAttribute("aria-label", "Hide password");
		$("passwordEye").title = "Hide password";
		$("passwordEyeSlash").removeAttribute("hidden");
		clearTimeout(passwordTimer);
		passwordTimer = setTimeout(hidePassword, 20000);
	}
	function requestCredentials(op) {
		if (credentialPending || !ws || ws.readyState !== 1) return;
		if (!credentialBinding()) { credentialStatus("Choose an app before saving credentials.", true); return; }
		credentialPending = { requestId: piUuid + ":" + Date.now() + ":" + Math.random(), op, username: $("credentialUsername").value, autofill: $("credentialAutofill").checked, binding: credentialBinding() };
		credentialBusy(true);
		credentialStatus(op === "reveal" ? "Opening saved password…" : "Encrypting password…");
		sendToPlugin({ event: op === "reveal" ? "revealPassword" : "protectPassword", requestId: credentialPending.requestId, binding: credentialPending.binding, ...(op === "protect" ? { password: $("credentialPassword").value } : {}) });
		credentialTimer = setTimeout(() => { credentialPending = null; credentialBusy(false); credentialStatus("Could not reach password protection. Your saved credentials were not changed.", true); }, 15000);
	}
	function receiveCredentials(p) {
		if (!credentialPending || p.requestId !== credentialPending.requestId) return;
		const pending = credentialPending;
		credentialPending = null;
		clearTimeout(credentialTimer);
		credentialBusy(false);
		if (pending.binding !== credentialBinding()) { hidePassword(); credentialStatus("App changed. Save credentials for this app again.", true); return; }
		if (!p.ok) { hidePassword(); credentialStatus(p.error || "Could not open password protection.", true); return; }
		if (pending.op === "protect") {
			if (typeof p.protectedPassword !== "string" || !/^dpapi:v1:[A-Za-z0-9+/]+=*$/.test(p.protectedPassword)) { credentialStatus("Password protection failed. Nothing was saved.", true); return; }
			set("credentialPassword", p.protectedPassword);
			set("credentialUsername", pending.username);
			set("credentialApp", pending.binding);
			settings.credentialAutofill = pending.autofill;
			credentialDirty = passwordDirty = false;
			hidePassword(); save(); fill();
			credentialStatus("Saved. Password encrypted for your Windows user account.");
		} else if (typeof p.password === "string" && !document.hidden && document.hasFocus()) {
			$("credentialPassword").value = p.password;
			showPassword();
			credentialStatus("Password is visible. It hides after 20 seconds or when you leave this window.");
		}
	}
	function buildCredentials() {
		$("credentialUsername").addEventListener("input", () => { credentialDirty = true; credentialStatus("Unsaved changes. Choose Save credentials."); });
		$("credentialPassword").addEventListener("input", () => { credentialDirty = passwordDirty = true; credentialStatus("Unsaved changes. Choose Save credentials."); });
		$("credentialAutofill").addEventListener("change", () => { settings.credentialAutofill = $("credentialAutofill").checked; save(); });
		$("saveCredentials").addEventListener("click", () => {
			if (!credentialBinding()) { credentialStatus("Choose an app before saving credentials.", true); return; }
			if (passwordDirty && $("credentialPassword").value) { requestCredentials("protect"); return; }
			if (passwordDirty) set("credentialPassword");
			set("credentialUsername", $("credentialUsername").value);
			settings.credentialAutofill = $("credentialAutofill").checked;
			credentialDirty = passwordDirty = false;
			hidePassword(); save(); fill();
			credentialStatus(settings.credentialPassword ? "Saved. Password encrypted for your Windows user account." : "Username saved. No password stored.");
		});
		$("clearCredentials").addEventListener("click", () => {
			for (const key of ["credentialUsername", "credentialPassword", "credentialAutofill", "credentialApp"]) delete settings[key];
			credentialDirty = passwordDirty = false;
			hidePassword(); save(); fill(); credentialStatus("Saved credentials cleared.");
		});
		$("passwordEye").addEventListener("click", () => {
			if ($("credentialPassword").type === "text") { hidePassword(); return; }
			if (passwordDirty && $("credentialPassword").value) showPassword();
			else if (settings.credentialPassword) requestCredentials("reveal");
		});
		window.addEventListener("blur", () => {
			hidePassword();
			if (credentialPending?.op === "reveal") { credentialPending = null; clearTimeout(credentialTimer); credentialBusy(false); }
		});
		window.addEventListener("pagehide", () => { $("credentialPassword").value = ""; hidePassword(); });
	}

	/* ------------------------------------------------------------ apps */

	function requestApps() {
		$("appStatus").className = "hint";
		$("appStatus").textContent = "Loading installed apps…";
		sendToPlugin({ event: "getApps" });
	}

	function requestMonitors() {
		sendToPlugin({ event: "getMonitors", order: $("monitorOrder").value });
	}

	function renderMonitors(p) {
		const box = $("monitorList");
		box.innerHTML = "";
		if (!p.ok || !Array.isArray(p.list) || !p.list.length) {
			box.innerHTML = '<span class="hint">Couldn\'t detect monitors.</span>';
			return;
		}
		const maxW = Math.max.apply(null, p.list.map((m) => m.w));
		for (const m of p.list) {
			const d = document.createElement("div");
			d.className = "mon" + (m.primary ? " primary" : "");
			const w = Math.round(40 + (m.w / maxW) * 44);
			d.style.width = w + "px";
			d.style.height = Math.round(w * (m.h / m.w)) + "px";
			d.title = m.w + "×" + m.h + (m.primary ? " (main display)" : "");
			d.innerHTML = "<b>" + m.n + "</b>" + m.w + "×" + m.h;
			box.appendChild(d);
		}
	}

	function onPluginMessage(p) {
		if (p.event === "credentials") { receiveCredentials(p); return; }
		if (p.event === "secretStatus") { const el = $("ffs-" + p.key); if (el) { el.textContent = p.message || ""; el.className = "hint pad" + (p.error ? " err" : ""); } return; }
		if (p.event === "meterStatus") { const el = $("companionMeterStatus"); if (el) el.textContent = p.message || ""; return; }
		if (p.event === "autofillResult" && kind === "app") { credentialStatus(p.message || "Autofill finished.", !p.ok); return; }
		if (p.event === "screens") {
			screenList = Array.isArray(p.list) ? p.list : [];
			renderScreens();
			renderLook();
			return;
		}
		if (p.event === "monitors") {
			renderMonitors(p);
			return;
		}
		if (p.event === "icon") {
			if (MONITOR_KINDS.includes(kind)) return;
			if (p.token === JSON.stringify(settings)) {
				realIcon = { token: p.token, image: p.image || "", sourceImage: p.sourceImage || "", real: !!p.real, loading: false };
				renderLook();
			}
			return;
		}
		if (p.event !== "apps") return;
		apps = Array.isArray(p.apps) ? p.apps.filter((a) => a && a.n && a.id) : [];
		const dl = $("appList");
		dl.innerHTML = "";
		const seen = new Set();
		for (const a of apps) {
			if (seen.has(a.n)) continue;
			seen.add(a.n);
			const o = document.createElement("option");
			o.value = a.n;
			dl.appendChild(o);
		}
		const st = $("appStatus");
		if (p.ok) {
			st.className = "hint";
			st.textContent = apps.length + " apps found. Type to search.";
		} else {
			st.className = "hint err";
			st.textContent = "Couldn't read the app list (" + (p.error || "unknown error") + "). Use Advanced to enter a path.";
		}
	}

	function chooseApp(name) {
		const hit = apps.find((a) => a.n === name) || apps.find((a) => a.n.toLowerCase() === name.toLowerCase());
		if (!hit) return false;
		if (settings.appId !== hit.id) forgetCredentials();
		set("appId", hit.id);
		set("appName", hit.n);
		save();
		fill();
		return true;
	}

	/* ------------------------------------------------------------ build UI */

	function build() {
		const show = (id, on) => ($(id).hidden = !on);
		const companion = window.WinToolkitCompanion;
		const definition = companion?.commands?.find((c) => "comp-" + c.id === kind);
		show("sec-companion", !!definition);
		if (definition) {
			const fixed = ["back", "focus", "url", "page", "applink"].includes(definition.operation);
			$("companionTitle").textContent = companion.name;
			$("companionDescription").textContent = definition.description;
			$("companionSetup").hidden = !definition.setup;
			$("companionSetup").textContent = definition.setup || "";
			$("companionExecution").hidden = !definition.trading;
			$("companionExecution").textContent = definition.executionNote || (definition.trading === "submit" ? (definition.holdMs ? "HOLD 1 SECOND · Release early to cancel. Uses the configured broker action once." : "IMMEDIATE ACTION · Uses the broker's configured hotkey and order defaults. Nothing is queued or repeated on hold.") : definition.trading === "bracket" ? "EDITABLE BRACKET · Opens setup only. Entry, target and stop are edited in the app." : "POSITIONS / TRADING PANEL");
			$("companionShortcutRow").hidden = fixed;
			$("companionShortcutHint").hidden = fixed;
			$("companionDestinationRow").hidden = definition.operation !== "url";
			$("companionDestination").placeholder = definition.url || "Enter your trading desk page URL";
			$("companionDestination").addEventListener("change", () => { set("destination", $("companionDestination").value.trim()); save(); });
			$("companionShortcut").placeholder = definition.trading === "submit" ? (definition.suggest ? "Type " + definition.suggest + " (app default)" : "Enter the matching broker hotkey") : definition.shortcut || "Use the built-in control";
			if (definition.trading) $("companionShortcutHint").textContent = definition.trading === "submit" ? "Required: one configured trading hotkey, e.g. Ctrl+Alt+B or F8. Broker settings determine whether it submits. The trading app must already be in front." : "Optional app hotkey override. Bracket shortcuts must open an editor; panel shortcuts must open the named panel. One chord only.";
			$("companionBack").hidden = definition.id !== "back";
			$("companionFollowRow").hidden = definition.id !== "back";
			$("companionFollow").addEventListener("change", () => { globalSettings.autoFollow = $("companionFollow").checked; if (ws && ws.readyState === 1) ws.send(JSON.stringify({event:"setGlobalSettings",context:piUuid,payload:globalSettings})); });
			const meter = definition.meter;
			$("companionMeterRow").hidden = !(meter && meter.source === "claude");
			if (meter) { $("companionShortcutRow").hidden = true; $("companionShortcutHint").hidden = true; }
			$("companionMeterSave").addEventListener("click", () => {
				const v = $("companionMeterKey").value.trim();
				$("companionMeterKey").value = "";
				if (!v) { $("companionMeterStatus").textContent = "Paste the sessionKey value first."; return; }
				$("companionMeterStatus").textContent = "Saving…";
				sendToPlugin({ event: "meterSaveKey", value: v });
			});
			$("companionMeterClear").addEventListener("click", () => { $("companionMeterStatus").textContent = "Removing…"; sendToPlugin({ event: "meterClearKey" }); });
			$("companionShow").addEventListener("click", () => sendToPlugin({event:"companionShow"}));
			$("companionBack").addEventListener("click", () => sendToPlugin({event:"companionBack"}));
			let shortcutTimer;
			$("companionShortcut").addEventListener("input", () => { clearTimeout(shortcutTimer); shortcutTimer = setTimeout(() => { set("shortcut", $("companionShortcut").value.trim()); save(); }, 350); });
		}
		buildFeature(show);
		const isApp = APP_KINDS.includes(kind);
		show("sec-app", isApp);
		show("sec-credentials", kind === "app");
		if (kind === "app") buildCredentials();
		show("sec-folder", FOLDER_KINDS.includes(kind));
		show("folderNameRow", kind === "folder" || kind === "downloads");
		$("folderNameLabel").addEventListener("change", () => { settings.folderNameLabel = $("folderNameLabel").checked; save(); fill(); });
		show("sec-handoff", !!handoffName());
		show("sec-shot", kind === "screenshot");
		show("sec-desktop", kind === "showdesktop");
		show("motionRow", true);
		$("motionStyle").addEventListener("change", () => {
			const v = $("motionStyle").value;
			if (v === "still") { settings.animate = false; delete settings.motionStyle; }
			else { delete settings.animate; set("motionStyle", v === "loop" ? undefined : v); }
			lookChanged();
		});
		$("animSpeed").addEventListener("change", () => { set("animSpeed", $("animSpeed").value); lookChanged(); });
		$("labelCase").addEventListener("change", () => { set("labelCase", $("labelCase").value === "auto" ? undefined : $("labelCase").value); lookChanged(); });
		$("glow").addEventListener("change", () => { set("glow", $("glow").value === "normal" ? undefined : $("glow").value); lookChanged(); });
		$("pressFx").addEventListener("change", () => { set("pressFx", $("pressFx").checked ? undefined : false); lookChanged(); });
		$("useColours").addEventListener("click", () => { settings.iconColours = [$("colour1").value, $("colour2").value]; set("iconImage"); save(); fill(); });
		$("clearColours").addEventListener("click", () => { set("iconColours"); save(); fill(); });
		$("lookToAll").addEventListener("click", () => {
			const d = { at: Date.now() };
			for (const k of LOOK_FIELDS) { const v = lookValue(k); if (v !== undefined && !(k === "iconStyle" && v === "real")) d[k] = v; }
			globalSettings.lookDefaults = d;
			settings.lookAt = d.at;
			saveGlobalSettings();
			save();
			$("lookToAllHint").textContent = "Done. Every key of this plugin now uses this look. Change any key afterwards to give it its own.";
		});
		$("followWindowsMotion").addEventListener("change", () => { globalSettings.followWindowsMotion = $("followWindowsMotion").checked; saveGlobalSettings(); });
		show("sec-screen", SCREEN_KINDS.includes(kind));
		$("sleep").closest(".row").hidden = $("monitorOnOffHint").hidden = !MONITOR_KINDS.includes(kind);
		show("sec-apps", kind === "appsfolder");
		show("sec-websites", kind === "websitefolder");
		$("openWebsites").addEventListener("click", () => sendToPlugin({ event: "openWebsites" }));
		$("returnMain").addEventListener("click", () => sendToPlugin({ event: "returnMain" }));
		show("sec-navback", kind === "back");
		const monitorKey = SCREEN_KINDS.includes(kind);
		// Only Monitor Control keeps its meaningful red/green colours; every key gets Label, Picture and Animation.
		show("styleRow", !MONITOR_KINDS.includes(kind));
		show("pictureRow", true);
		show("artPickers", !MONITOR_KINDS.includes(kind));
		if (kind === "screenshot") {
			$("shotHold").addEventListener("change", () => { set("holdSeconds", $("shotHold").value); save(); fill(); });
			let st;
			$("shotFolder").addEventListener("input", () => { clearTimeout(st); st = setTimeout(() => { set("shotFolder", $("shotFolder").value.trim()); save(); }, 350); });
			$("shotSave").addEventListener("change", () => { settings.shotSave = $("shotSave").checked; save(); });
			$("shotClipboard").addEventListener("change", () => { settings.shotClipboard = $("shotClipboard").checked; save(); });
		}
		if (monitorKey) {
			$("screenPick").addEventListener("change", () => {
				const v = $("screenPick").value;
				const hit = (screenList || []).find((x) => x.key === v);
				set("screenKey", v);
				set("screenName", hit ? hit.name : "");
				set("screenNumber", hit && hit.num ? hit.num : undefined);
				save();
				fill();
			});
			$("screenRefresh").addEventListener("click", () => { $("screenStatus").textContent = "Looking for screens…"; sendToPlugin({ event: "getScreens" }); });
			$("sleep").addEventListener("change", () => { settings.sleep = $("sleep").checked; save(); });
		}
		show("sec-shortcut", kind === "vsc-shortcut");
		show("sec-command", kind === "vsc-command");
		show("sec-back", kind === "vsc-back");
		show("sec-vscinfo", kind.startsWith("vsc-") && !["vsc-shortcut", "vsc-command", "vsc-back", "vsc-project"].includes(kind));
		if (handoffName()) $("handoffName").textContent = handoffName();
		if (kind === "vsc-project") { $("folderTitle").textContent = "Project"; $("folderPath").placeholder = "C:\\Users\\you\\source\\my-project"; }
		const saveGlobal = () => { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ event: "setGlobalSettings", context: piUuid, payload: globalSettings })); };
		$("autoFollow").addEventListener("change", () => { globalSettings.autoFollow = $("autoFollow").checked; saveGlobal(); });
		$("returnOnClose").addEventListener("change", () => { globalSettings.returnOnClose = $("returnOnClose").checked; saveGlobal(); });
		$("showKeys").addEventListener("change", () => { settings.showKeys = $("showKeys").checked; save(); });
		show("sec-website", kind === "website");
		show("sec-volume", kind === "volup" || kind === "voldown");
		show("sec-display", kind === "displayon" || kind === "displayoff");
		show("sec-keys", kind === "copy" || kind === "paste");
		show("sec-monitor", LAUNCH_KINDS.includes(kind));
		$("gestures").addEventListener("change", () => { settings.gestures = $("gestures").checked; save(); fill(); });
		$("holdSeconds").addEventListener("change", () => { set("holdSeconds", $("holdSeconds").value); save(); fill(); });
		$("monitorOrder").addEventListener("change", () => {
			globalSettings.monitorOrder = $("monitorOrder").value;
			if (ws && ws.readyState === 1) ws.send(JSON.stringify({ event: "setGlobalSettings", context: piUuid, payload: globalSettings }));
			requestMonitors();
		});

		if (kind === "copy") $("keysHint").textContent = "Sends Ctrl+C to whichever window is active.";
		if (kind === "paste") $("keysHint").textContent = "Sends Ctrl+V to whichever window is active.";

		const mode = $("mode");
		const modes =
			kind === "displayon"
				? [["extend", "Extend desktop (default)"], ["clone", "Duplicate screens"]]
				: [["internal", "PC screen only (default)"], ["external", "Second screen only"]];
		mode.innerHTML = modes.map(([v, t]) => '<option value="' + v + '">' + t + "</option>").join("");

		// App picker
		const search = $("appSearch");
		search.addEventListener("change", () => {
			const v = search.value.trim();
			if (!v) return;
			if (!chooseApp(v)) {
				$("appStatus").className = "hint err";
				$("appStatus").textContent = '"' + v + '" isn\'t in the list. Pick a suggestion, or use Advanced.';
			}
		});
		search.addEventListener("input", () => {
			// Selecting a datalist suggestion fires "input" with the exact name.
			const v = search.value;
			if (apps.some((a) => a.n === v)) chooseApp(v);
		});
		$("appRefresh").addEventListener("click", requestApps);
		$("appClear").addEventListener("click", () => {
			if (kind === "app") forgetCredentials();
			set("appId");
			set("appName");
			search.value = "";
			save();
			fill();
		});

		// Plain fields (id === settings key)
		const text = ["target", "args", "folderPath", "url", "iconLabel", "shortcut", "command"];
		for (const id of text) {
			let t;
			$(id).addEventListener("input", () => {
				clearTimeout(t);
				t = setTimeout(() => {
					const oldBinding = credentialBinding();
					set(id, $(id).value.trim());
					if (id === "target" && settings.target) { set("appId"); set("appName"); fill(); }
					if (kind === "app" && oldBinding !== credentialBinding()) { forgetCredentials(); fill(); }
					save();
				}, 350);
			});
		}
		for (const id of ["browser", "step", "mode"]) {
			$(id).addEventListener("change", () => { set(id, $(id).value); save(); });
		}
		$("repeat").addEventListener("change", () => { settings.repeat = $("repeat").checked; save(); });
		$("hideLabel").addEventListener("change", () => { set("hideLabel", $("hideLabel").checked || undefined); save(); });

		// Look
		const realCapable = REAL_CAPABLE.includes(kind);
		$("styleReal").hidden = !realCapable;
				$("styleReal").textContent = kind === "folder" || kind === "downloads" ? "Folder icon" : kind === "website" ? "Site icon" : "App icon";
		show("styleApp", !!window.WinToolkitDesign);
		show("styleLight", !!(window.WinToolkitDesign && window.WinToolkitDesign.light));
		if (window.WinToolkitDesign && window.WinToolkitDesign.styleName) $("styleApp").textContent = window.WinToolkitDesign.styleName;
		for (const b of document.querySelectorAll("#styleSeg button")) {
			b.addEventListener("click", () => {
				set("iconStyle", b.dataset.style);
				set("iconImage");
				settings.lookAt = Date.now();
				save();
				fill();
			});
		}
		$("refreshIcon").addEventListener("click", () => {
			realIcon = { token: "", image: "", real: false, loading: true };
			renderLook();
			sendToPlugin({ event: "refreshIcon", settings });
		});
		$("resetLook").addEventListener("click", () => {
			for (const k of ["iconStyle", "iconGlyph", "iconTheme", "iconLabel", "hideLabel", "iconImage", "iconColours", "lookAt"].concat(LOOK_FIELDS)) delete settings[k];
			save();
			fill();
		});
		$("pickImage").addEventListener("click", () => $("imageFile").click());
		$("removeImage").addEventListener("click", () => { set("iconImage"); save(); fill(); });
		$("imageFile").addEventListener("change", onImageFile);
		buildPickers();
	}

	function buildPickers() {
		const lib = I();
		const preset = lib.PRESET_ICONS[kind] || lib.PRESET_ICONS.app;
		const themes = $("themes");
		themes.innerHTML = "";
		for (const [name, c] of Object.entries(lib.THEMES)) {
			const b = document.createElement("button");
			b.className = "swatch";
			b.title = name;
			b.dataset.theme = name;
			b.style.background = "linear-gradient(135deg," + c[0] + "," + c[1] + ")";
			b.addEventListener("click", () => {
				set("iconTheme", name);
				set("iconColours");
				set("iconImage");
				save();
				fill();
			});
			themes.appendChild(b);
		}
		const glyphs = $("glyphs");
		glyphs.innerHTML = "";
		const list = [preset.glyph].concat(lib.PICKABLE.filter((g) => g !== preset.glyph));
		for (const g of list) {
			const b = document.createElement("button");
			b.className = "glyph";
			b.title = g;
			b.dataset.glyph = g;
			b.addEventListener("click", () => {
				set("iconGlyph", g);
				if (currentStyle() === "real") { set("iconStyle", defaultStyle()); settings.lookAt = Date.now(); }
				set("iconImage");
				save();
				fill();
			});
			glyphs.appendChild(b);
		}
	}

	/* ------------------------------------------------------------ Windows Toolkit feature keys */

	function featureDef() { return (window.WinToolkitFeatures?.features || []).find((f) => f.id === kind); }
	function buildFeature(show) {
		const def = featureDef();
		show("sec-feature", !!def);
		if (!def) return;
		$("featureTitle").textContent = def.name;
		$("featureTip").textContent = def.tip + (def.hold ? " A tap only shows a warning, so it can't fire by accident." : "");
		const box = $("featureFields");
		box.textContent = "";
		for (const field of def.fields || []) {
			const row = document.createElement("div");
			row.className = "row";
			const label = document.createElement("label");
			label.textContent = field.label;
			const id = "ff-" + field.key;
			label.htmlFor = id;
			let input;
			if (field.type === "secret") {
				// Tokens never go into key settings: the plugin encrypts them for this Windows account (DPAPI) and keeps them per server.
				input = document.createElement("input"); input.type = "password"; input.id = id; input.className = "grow"; input.autocomplete = "off";
				input.placeholder = field.placeholder || "Paste a token";
				const saveBtn = document.createElement("button"); saveBtn.type = "button"; saveBtn.textContent = "Save";
				const clearBtn = document.createElement("button"); clearBtn.type = "button"; clearBtn.textContent = "Clear";
				const status = document.createElement("div"); status.id = "ffs-" + field.key; status.className = "hint pad";
				saveBtn.addEventListener("click", () => { const v = input.value.trim(); if (!v) { status.textContent = "Paste the token first."; return; } status.textContent = "Encrypting…"; sendToPlugin({ event: "secretSave", key: field.key, value: v, settings }); input.value = ""; });
				clearBtn.addEventListener("click", () => { status.textContent = "Removing…"; sendToPlugin({ event: "secretClear", key: field.key, settings }); });
				row.appendChild(label); row.appendChild(input); row.appendChild(saveBtn); row.appendChild(clearBtn);
				box.appendChild(row); box.appendChild(status);
				if (field.hint) { const hint = document.createElement("div"); hint.className = "hint pad"; hint.textContent = field.hint; box.appendChild(hint); }
				sendToPlugin({ event: "secretInfo", key: field.key, settings });
				continue;
			}
			if (field.type === "select") {
				input = document.createElement("select");
				for (const [value, text] of field.options) { const o = document.createElement("option"); o.value = value; o.textContent = text; input.appendChild(o); }
			} else if (field.type === "textarea") {
				input = document.createElement("textarea"); input.rows = 4;
			} else if (field.type === "check") {
				input = document.createElement("input"); input.type = "checkbox";
			} else {
				input = document.createElement("input");
				input.type = field.type === "number" ? "number" : "text";
				if (field.min !== undefined) input.min = field.min;
				if (field.max !== undefined) input.max = field.max;
			}
			input.id = id;
			input.className = field.type === "check" ? "" : "grow";
			if (field.placeholder) input.placeholder = field.placeholder;
			else if (field.def !== undefined && field.type !== "check" && field.type !== "select") input.placeholder = String(field.def);
			let timer;
			const commit = () => {
				const value = field.type === "check" ? input.checked : field.type === "number" ? (input.value === "" ? "" : Number(input.value)) : input.value.trim() === "" ? "" : input.value;
				set(field.key, value); save();
				// A new server address may have a different saved token: ask the plugin again.
				for (const f of def.fields || []) if (f.type === "secret") sendToPlugin({ event: "secretInfo", key: f.key, settings });
			};
			input.addEventListener(field.type === "select" || field.type === "check" ? "change" : "input", () => { clearTimeout(timer); timer = setTimeout(commit, field.type === "select" || field.type === "check" ? 0 : 400); });
			row.appendChild(label); row.appendChild(input);
			box.appendChild(row);
			if (field.hint || field.type === "file" || field.type === "folder") {
				const hint = document.createElement("div");
				hint.className = "hint pad";
				hint.textContent = field.hint || (field.type === "folder" ? "Paste the full folder path (in File Explorer: click the address bar, copy). %USERPROFILE% works." : "Paste the full file path (Shift + right-click the file › Copy as path).");
				box.appendChild(hint);
			}
		}
	}
	function fillFeature() {
		const def = featureDef();
		if (!def) return;
		for (const field of def.fields || []) {
			const el = $("ff-" + field.key);
			if (!el || document.activeElement === el || field.type === "secret") continue;
			const v = settings[field.key];
			if (field.type === "check") el.checked = v === undefined ? field.def === true : v === true;
			else el.value = v === undefined || v === null ? (field.type === "select" && field.def !== undefined ? String(field.def) : "") : String(v);
		}
	}

	/* ------------------------------------------------------------ fill from settings */

	function fill() {
		if (!domReady || !kind) return;
		const s = settings;
		fillFeature();
		const setVal = (id, v) => { const el = $(id); if (document.activeElement !== el) el.value = v == null ? "" : v; };
		setVal("target", s.target);
		setVal("args", s.args);
		setVal("folderPath", s.folderPath);
		$("folderNameLabel").checked = kind === "folder" ? s.folderNameLabel !== false : s.folderNameLabel === true;
		setVal("url", s.url);
		setVal("iconLabel", s.iconLabel);
		setVal("shortcut", s.shortcut);
		setVal("companionShortcut", s.shortcut);
		setVal("command", s.command);
		setVal("companionDestination", s.destination);
		if (kind === "app") {
			if (!credentialDirty) setVal("credentialUsername", s.credentialUsername);
			$("credentialPassword").placeholder = s.credentialPassword ? "••••••••" : "Enter a password";
			$("credentialAutofill").checked = s.credentialAutofill !== false;
			$("clearCredentials").hidden = !s.credentialUsername && !s.credentialPassword;
		}
		$("showKeys").checked = s.showKeys !== false;
		$("browser").value = s.browser || "default";
		$("step").value = String(s.step || 6);
		$("repeat").checked = s.repeat !== false;
		$("mode").value = s.mode || $("mode").options[0].value;
		$("hideLabel").checked = !!s.hideLabel;
		$("gestures").checked = s.gestures !== false;
		$("holdSeconds").value = String(s.holdSeconds || 3);
		$("holdSeconds").disabled = s.gestures === false;
		$("holdLabel").textContent = String(s.holdSeconds || 3) + " s";

		if (APP_KINDS.includes(kind)) {
			const chosen = !!s.appName;
			$("appChosenRow").hidden = !chosen;
			$("appChosen").textContent = s.appName || "";
			$("appClear").textContent = "Clear";
			if (s.target) $("appAdvanced").open = true;
		}
		if (kind === "screenshot") {
			setVal("shotFolder", s.shotFolder);
			$("shotSave").checked = s.shotSave !== false;
			$("shotClipboard").checked = s.shotClipboard !== false;
			$("shotHold").value = String(s.holdSeconds || 1);
			$("shotHoldLabel").textContent = String(s.holdSeconds || 1) + " s";
		}
		if (SCREEN_KINDS.includes(kind)) {
			$("sleep").checked = s.sleep !== false;
			renderScreens();
		}
		$("sec-handoff").hidden = !handoffName();
		if (handoffName()) $("handoffName").textContent = handoffName();
		$("removeImage").hidden = !s.iconImage;
		fillLook();
		$("iconLabel").placeholder = defaultLabel();
		renderLook();
	}

	/* ------------------------------------------------------------ monitor on / off */

	function monitorN() {
		const screen = (screenList || []).find((x) => x.key === settings.screenKey);
		return (screen && screen.num) || settings.screenNumber || "?";
	}

	function renderScreens() {
		if (!SCREEN_KINDS.includes(kind)) return;
		const sel = $("screenPick");
		const list = screenList || [];
		const opts = [["", "Choose a monitor…", false]];
		for (const x of list) {
			const label = (x.num ? "Monitor " + x.num + " · " : "") + (x.name || "Screen") + (x.primary ? " (main display)" : "") + " — " + (x.on ? "on" : "off");
			opts.push([x.key, label, false]);
		}
		if (settings.screenKey && !list.some((x) => x.key === settings.screenKey)) opts.push([settings.screenKey, (settings.screenName || "Chosen screen") + " — not connected"]);
		sel.innerHTML = "";
		for (const [v, t, disabled] of opts) {
			const o = document.createElement("option");
			o.value = v;
			o.textContent = t;
			o.disabled = !!disabled;
			sel.appendChild(o);
		}
		sel.value = settings.screenKey || "";
		const st = $("screenStatus");
		st.className = "hint";
		if (screenList === null) { st.textContent = "Looking for screens…"; return; }
		const rotating = kind === "rotate";
		if (!settings.screenKey && rotating) { st.textContent = "Choose the monitor this key should turn between landscape and portrait. Add another Rotate Display key for a different screen."; return; }
		if (!settings.screenKey) { st.textContent = "Choose the monitor this key should turn off and on. Add another Monitor Control key to control a different screen."; return; }
		const target = list.find((x) => x.key === settings.screenKey);
		if (!target) { st.className = "hint err"; st.textContent = "The selected monitor isn't connected. Check its cable, or choose a monitor above."; return; }
		if (rotating) { st.textContent = target.on ? (target.name || "This screen") + " turns between landscape and portrait when you press the key." : (target.name || "This screen") + " is off. Turn it on before rotating it."; if (!target.on) st.className = "hint err"; return; }
		st.textContent = (target.name || "This screen") + " is " + (target.on ? "on — the key shows red TURN OFF." : "off — the key shows green TURN ON.");
		if (target.primary) st.textContent += " When turned off, another active screen becomes the main display.";
	}

	/* ------------------------------------------------------------ look / preview (mirrors the plugin) */

	function dynamicLabel() {
		const s = settings;
		const definition = window.WinToolkitCompanion?.commands?.find(c => "comp-" + c.id === kind);
		if (definition && (((definition.trading === "submit" || definition.requiresBinding) && !s.shortcut?.trim()) || (definition.operation === "url" && !definition.url && !s.destination?.trim()))) return definition.name + " · SETUP";
		if (APP_KINDS.includes(kind)) {
			if (s.appName) return s.appName;
			if (kind === "app" && s.target) return s.target.trim().split(/[\\/]/).pop().replace(/\.(exe|lnk|bat|cmd)$/i, "");
		}
		if (kind === "rotate" && s.screenKey) return "Monitor " + monitorN();
		if (kind === "vsc-shortcut" && s.shortcut) return s.shortcut.trim();
		if (kind === "vsc-command" && s.command) return s.command.trim().replace(/^.*?:\s*/, "");
		if ((kind === "folder" && s.folderNameLabel !== false || kind === "downloads" && s.folderNameLabel === true || kind === "vsc-project") && s.folderPath) {
			const p = s.folderPath.trim().replace(/[\\/]+$/, "");
			return (p.split(/[\\/]/).pop() || p).replace(/%/g, "");
		}
		if (kind === "downloads" && s.folderNameLabel === true && s.folderEmptyLabel) return s.folderEmptyLabel;
		if (kind === "website" && s.url) {
			try { return new URL(/^[a-z]+:/i.test(s.url) ? s.url : "https://" + s.url).hostname.replace(/^www\./, "").split(".")[0]; } catch { return ""; }
		}
		return "";
	}

	function defaultLabel() {
		const p = I().PRESET_ICONS[kind];
		return dynamicLabel() || (p ? p.label : "");
	}

	/* ------------------------------------------------------------ look settings (mirrors lookValue in base.ts) */

	const LOOK_FIELDS = ["iconStyle", "animate", "animSpeed", "motionStyle", "glow", "labelCase", "pressFx"];
	const STYLES = ["real", "glass", "neon", "vivid", "mono", "pro", "app", "light"];
	/** Windows Toolkit keys default to Vivid; the app companion plugins default to Glass. */
	function defaultStyle() { return window.WinToolkitCompanion || kind.indexOf("vsc-") === 0 ? "glass" : "vivid"; }
	function lookValue(k) {
		const d = globalSettings.lookDefaults || {};
		const own = !d.at || (settings.lookAt || 0) >= d.at;
		return own && settings[k] !== undefined ? settings[k] : d[k];
	}
	function lookChanged() { settings.lookAt = Date.now(); save(); fillLook(); }
	function saveGlobalSettings() { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ event: "setGlobalSettings", context: piUuid, payload: globalSettings })); }
	function styleOk(st) {
		if (!STYLES.includes(st)) return false;
		if (st === "real") return REAL_CAPABLE.includes(kind);
		if (st === "app") return !!window.WinToolkitDesign;
		if (st === "light") return !!(window.WinToolkitDesign && window.WinToolkitDesign.light);
		return true;
	}
	function fillLook() {
		if (!$("motionStyle")) return;
		$("motionStyle").value = lookValue("animate") === false ? "still" : ["glow", "icon"].includes(lookValue("motionStyle")) ? lookValue("motionStyle") : "loop";
		$("animSpeed").value = SPEEDS[lookValue("animSpeed")] ? lookValue("animSpeed") : "calm";
		$("animSpeed").disabled = lookValue("animate") === false;
		$("labelCase").value = ["title", "upper"].includes(lookValue("labelCase")) ? lookValue("labelCase") : "auto";
		$("glow").value = ["subtle", "bold"].includes(lookValue("glow")) ? lookValue("glow") : "normal";
		$("pressFx").checked = lookValue("pressFx") !== false;
		const c = customColours();
		$("clearColours").hidden = !c;
		if (c) { $("colour1").value = c[0]; $("colour2").value = c[1]; }
		renderLook();
	}
	function customColours() {
		const c = settings.iconColours, hex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
		return Array.isArray(c) && hex(c[0]) && hex(c[1]) ? c.slice(0, 2) : undefined;
	}

	function currentStyle() {
		const own = settings.iconStyle, plugin = lookValue("iconStyle");
		const d = globalSettings.lookDefaults;
		const ownWins = !d || (settings.lookAt || 0) >= (d.at || 0) || own === plugin;
		if (styleOk(own) && ownWins) return own;
		if (REAL_CAPABLE.includes(kind) && ["app", "website"].includes(kind)) return "real";
		if (styleOk(plugin)) return plugin;
		const preset = I().PRESET_ICONS[kind]?.style;
		return styleOk(preset) && preset !== "app" ? preset : defaultStyle();
	}

	function currentLook() {
		const lib = I();
		const p = lib.PRESET_ICONS[kind] || lib.PRESET_ICONS.app;
		const s = settings;
		return {
			glyph: s.iconGlyph || p.glyph,
			theme: s.iconTheme || p.theme,
			label: s.hideLabel ? "" : (s.iconLabel && s.iconLabel.trim()) || defaultLabel(),
			style: currentStyle(),
			colours: customColours(),
			motionStyle: lookValue("motionStyle"),
			labelCase: lookValue("labelCase"),
			glow: lookValue("glow"),
		};
	}

	function renderLook() {
		const lib = I();
		const look = currentLook();
		const prev = $("preview");
		const usingImage = !!(settings.iconImage && String(settings.iconImage).startsWith("data:image/"));
		const hint = $("styleHint");
		hint.className = "hint";
		hint.textContent = "";
		const brandOnly = look.style === "app" && !!window.WinToolkitDesign;
		if (brandOnly) hint.textContent = "Uses " + window.WinToolkitDesign.name + " colours. Pick Glass, Vivid, Neon, Mono or Pro to choose your own colour.";
		$("themes").hidden = $("customColourRow").hidden = brandOnly;
		$("themes").previousElementSibling.hidden = brandOnly;
		$("refreshIcon").hidden = usingImage || look.style !== "real";
		if (lookValue("animate") !== false && !motionTimer) motionTimer = setInterval(() => {
			if (!document.hidden) drawPreview();
		}, 1000 / 12);
		if (lookValue("animate") === false && motionTimer) { clearInterval(motionTimer); motionTimer = null; }

		if (MONITOR_KINDS.includes(kind)) {
			drawPreview();
			$("refreshIcon").hidden = true;
			return;
		}
		if (usingImage) {
			drawPreview();
			hint.textContent = "Using your picture. Pick a style to switch back.";
		} else if (look.style === "real") {
			const token = JSON.stringify(settings);
			if (realIcon.token === token && realIcon.image) {
				drawPreview();
				if (!realIcon.real) hint.textContent = "No icon found for this app, so it shows the colourful artwork instead.";
			} else {
				prev.innerHTML = lib.keySvg(Object.assign({}, look, { style: defaultStyle() }));
				hint.textContent = "Fetching the icon…";
				clearTimeout(iconTimer);
				iconTimer = setTimeout(() => sendToPlugin({ event: "getIcon", settings }), 250);
			}
		} else {
			drawPreview();
		}

		for (const b of document.querySelectorAll("#styleSeg button")) b.classList.toggle("on", !usingImage && b.dataset.style === look.style);
		const gridStyle = ["glass", "neon", "vivid", "mono", "pro"].includes(look.style) ? look.style : defaultStyle();
		for (const b of document.querySelectorAll(".swatch")) b.classList.toggle("on", !usingImage && b.dataset.theme === look.theme);
		for (const b of document.querySelectorAll(".glyph")) {
			b.classList.toggle("on", !usingImage && look.style !== "real" && b.dataset.glyph === look.glyph);
			const key = look.theme + "/" + gridStyle + "/" + (look.colours || []).join() + "/" + b.dataset.glyph;
			if (b.dataset.rendered !== key) {
				b.innerHTML = lib.keySvg({ glyph: b.dataset.glyph, theme: look.theme, label: "", style: gridStyle, colours: look.colours });
				b.dataset.rendered = key;
			}
		}
	}

	const SPEEDS = { slow: 0.5, calm: 0.75, normal: 1, fast: 1.5 };
	function loopMs() { return Math.round(12000 / (SPEEDS[lookValue("animSpeed")] || SPEEDS.calm)); }
	function animatedLook(look) {
		return lookValue("animate") !== false
			? Object.assign({}, look, { motion: { kind, phase: (Date.now() % loopMs()) / loopMs() } }) : look;
	}

	function drawPreview() {
		const lib = I(), look = currentLook(), motion = animatedLook(look).motion;
		const preview = $("preview");
		if (MONITOR_KINDS.includes(kind)) {
			const selected = screenList && screenList.find((screen) => screen.key === settings.screenKey);
			const state = !settings.screenKey ? "unconfigured" : !screenList ? "unknown" : !selected ? "missing" : selected.on ? "on" : "off";
			preview.innerHTML = lib.monitorKeySvg({ n: monitorN(), state, motion, image: settings.iconImage, caption: settings.hideLabel ? " " : (settings.iconLabel || "").trim() || (settings.screenKey ? "Monitor " + monitorN() : "Monitor Control") });
		} else if (settings.iconImage) {
			preview.innerHTML = motion ? lib.pictureKeySvg(settings.iconImage, motion) : '<img src="' + settings.iconImage.replace(/"/g, "&quot;") + '">';
		} else if (look.style === "real") {
			if (realIcon.token === JSON.stringify(settings) && realIcon.real && realIcon.sourceImage) preview.innerHTML = lib.keySvg(Object.assign({}, animatedLook(look), { image: realIcon.sourceImage }));
			else preview.innerHTML = lib.keySvg(animatedLook(Object.assign({}, look, { style: defaultStyle() })));
		} else preview.innerHTML = lib.keySvg(animatedLook(look));
	}

	/* ------------------------------------------------------------ custom picture */

	function onImageFile(e) {
		const file = e.target.files && e.target.files[0];
		e.target.value = "";
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			const img = new Image();
			img.onload = () => {
				// Cover-crop to a 144×144 PNG so settings stay small.
				const c = document.createElement("canvas");
				c.width = c.height = 144;
				const ctx = c.getContext("2d");
				const scale = Math.max(144 / img.width, 144 / img.height);
				const w = img.width * scale, h = img.height * scale;
				ctx.drawImage(img, (144 - w) / 2, (144 - h) / 2, w, h);
				try {
					set("iconImage", c.toDataURL("image/png"));
					save();
					fill();
				} catch (err) {
					alertHint("Couldn't use that picture: " + err.message);
				}
			};
			img.onerror = () => alertHint("That file isn't a picture Stream Deck can show. Try PNG or JPG.");
			img.src = reader.result;
		};
		reader.readAsDataURL(file);
	}

	function alertHint(msg) {
		const h = document.createElement("div");
		h.className = "hint err";
		h.textContent = msg;
		$("sec-look").appendChild(h);
		setTimeout(() => h.remove(), 6000);
	}
})();
