import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { appendFileSync } from "node:fs";
import type { AppSelector } from "./companion-specs.js";
import type { PsResult } from "./ps.js";

export type TradingChord = { key: number; modifiers: number[] };
/** Exactly one app hotkey. Trade actions never append Enter or a second shortcut. */
export function tradingChord(text: string): TradingChord | undefined {
	if (!text.trim() || /\s/.test(text.trim())) return;
	const parts = text.split("+").map(p => p.toLowerCase());
	const modifiers: number[] = [];
	let key: number | undefined;
	for (const part of parts) {
		const modifier = ({ ctrl: 0x11, control: 0x11, alt: 0x12, shift: 0x10 } as Record<string, number>)[part];
		if (modifier) { if (modifiers.includes(modifier)) return; modifiers.push(modifier); continue; }
		if (key !== undefined) return;
		if (/^[a-z0-9]$/.test(part)) key = part.toUpperCase().charCodeAt(0);
		else if (/^f([1-9]|1\d|2[0-4])$/.test(part)) key = 0x6f + Number(part.slice(1));
		else if (/^(numpad|kp_)[0-9]$/.test(part)) key = 0x60 + Number(part.slice(-1));
		else return;
	}
	if (key === undefined || (!modifiers.some(m => m === 0x11 || m === 0x12) && !(key >= 0x70 && key <= 0x87))) return;
	return { key, modifiers };
}

export const TRADING_INPUT_SCRIPT = String.raw`
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
Add-Type @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
public static class TradingKeyboard {
 [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public UNION data; }
 [StructLayout(LayoutKind.Explicit)] struct UNION { [FieldOffset(0)] public MOUSEINPUT mouse; [FieldOffset(0)] public KEYBDINPUT keyboard; }
 [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int x,y; public uint mouseData,flags,time; public UIntPtr extra; }
 [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT { public ushort key,scan; public uint flags,time; public UIntPtr extra; }
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr w,out uint pid);
 [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
 [DllImport("user32.dll",SetLastError=true)] static extern uint SendInput(uint count,INPUT[] inputs,int size);
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool QueryFullProcessImageName(IntPtr p,uint flags,StringBuilder path,ref uint size);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr p);
 static INPUT Key(int key,bool up) { return new INPUT { type=1,data=new UNION { keyboard=new KEYBDINPUT { key=(ushort)key,flags=up?2u:0u } } }; }
 public static string Send(string[] names,string pattern,int key,int[] modifiers,long deadline) {
  if(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()>deadline) return "expired";
  IntPtr window=GetForegroundWindow(); uint pid; GetWindowThreadProcessId(window,out pid);
  if(pid==0) return "foreground";
  string name; try { name=Process.GetProcessById((int)pid).ProcessName; } catch { return "foreground"; }
  if(!Array.Exists(names,n=>String.Equals(n,name,StringComparison.OrdinalIgnoreCase))) return "foreground";
  IntPtr handle=OpenProcess(0x1000,false,pid); if(handle==IntPtr.Zero) return "identity";
  var path=new StringBuilder(32768); uint length=(uint)path.Capacity;
  try { if(!QueryFullProcessImageName(handle,0,path,ref length)) return "identity"; } finally { CloseHandle(handle); }
  if(!String.IsNullOrEmpty(pattern)&&!Regex.IsMatch(path.ToString(),pattern,RegexOptions.IgnoreCase)) return "identity";
  foreach(int modifier in new[]{0x10,0x11,0x12,0x5b,0x5c}) if((GetAsyncKeyState(modifier)&0x8000)!=0) return "modifier";
  if(GetForegroundWindow()!=window || DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()>deadline) return "expired";
  var inputs=new INPUT[modifiers.Length*2+2]; int index=0;
  foreach(int modifier in modifiers) inputs[index++]=Key(modifier,false);
  inputs[index++]=Key(key,false); inputs[index++]=Key(key,true);
  for(int i=modifiers.Length-1;i>=0;i--) inputs[index++]=Key(modifiers[i],true);
  return SendInput((uint)inputs.Length,inputs,Marshal.SizeOf(typeof(INPUT)))==inputs.Length?"ok":"unconfirmed";
 }
}
'@
[Console]::WriteLine('{"ready":true}')
while($null -ne ($line=[Console]::ReadLine())){
 $data=$null
 try {
  $data=$line | ConvertFrom-Json
  $status=[TradingKeyboard]::Send([string[]]$data.selector.names,[string]$data.selector.path,[int]$data.chord.key,[int[]]$data.chord.modifiers,[long]$data.deadline)
  [Console]::WriteLine((@{id=$data.id;status=$status} | ConvertTo-Json -Compress))
 } catch { $rid=0; try { $rid=[int]$data.id } catch { }; [Console]::WriteLine((@{id=$rid;status='unconfirmed'} | ConvertTo-Json -Compress)) }
}
`;

/** A warmed worker; no queue, delayed send, focus stealing, repeat-on-hold or automatic retry. */
export class TradingInput {
	#worker?: ChildProcessWithoutNullStreams;
	#ready = false;
	#sequence = 0;
	#pending?: { id: number; resolve: (result: PsResult) => void; timer: NodeJS.Timeout };
	constructor(readonly selector: AppSelector) {}
	warm(): void {
		if (this.#worker || process.env.DAILYOPS_DRYRUN === "1" || process.platform !== "win32") return;
		const bootstrap = "$s=[Console]::In.ReadLine(); & ([ScriptBlock]::Create([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($s))))";
		const worker = this.#worker = spawn("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", Buffer.from(bootstrap, "utf16le").toString("base64")], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
		let buffer = "";
		worker.stdin.on("error", () => {}); worker.stderr.on("data", () => {});
		worker.stdout.on("data", (part: Buffer) => {
			buffer += part.toString("utf8");
			if (buffer.length > 4096) { worker.kill(); return; }
			let at;
			while ((at = buffer.indexOf("\n")) >= 0) {
				const line = buffer.slice(0, at); buffer = buffer.slice(at + 1);
				try {
					const response = JSON.parse(line);
					if (response.ready === true) this.#ready = true;
					else if (this.#pending && response.id === this.#pending.id) this.#finish(this.#result(response.status));
				} catch { /* only bounded protocol JSON is accepted */ }
			}
		});
		const lost = () => { if (this.#worker !== worker) return; this.#worker = undefined; this.#ready = false; this.#finish(this.#result("unconfirmed")); };
		worker.on("error", lost); worker.on("exit", lost);
		worker.stdin.write(Buffer.from(TRADING_INPUT_SCRIPT, "utf8").toString("base64") + "\n");
	}
	#result(status: string): PsResult {
		if (status === "ok") return { status: "ok", message: "App hotkey sent" };
		const messages: Record<string, string> = { foreground: "Bring the trading app to the front first", identity: "The trading app could not be verified", modifier: "Release keyboard modifiers and press again", expired: "Press expired; no hotkey was sent", unconfirmed: "Input result is unknown; check the app before pressing again" };
		return { status: "miss", message: messages[status] || "Trading input is unavailable" };
	}
	#finish(result: PsResult): void { const pending = this.#pending; if (!pending) return; this.#pending = undefined; clearTimeout(pending.timer); pending.resolve(result); }
	send(shortcut: string): Promise<PsResult> {
		const chord = tradingChord(shortcut);
		if (!chord) return Promise.resolve({ status: "miss", message: "Set one app hotkey, such as Ctrl+Alt+B or F8" });
		if (process.env.DAILYOPS_DRYRUN === "1" || process.platform !== "win32") {
			if (process.env.DAILYOPS_DRYRUN_LOG) appendFileSync(process.env.DAILYOPS_DRYRUN_LOG, JSON.stringify({ command: "trading-hotkey", data: { selector: this.selector, shortcut, chord } }) + "\n");
			return Promise.resolve({ status: "ok", message: "Trading hotkey simulated" });
		}
		this.warm();
		if (!this.#ready || !this.#worker) return Promise.resolve({ status: "miss", message: "Trading keyboard is starting; press again when ready" });
		if (this.#pending) return Promise.resolve({ status: "miss", message: "Previous key is still processing; this press was not queued" });
		return new Promise(resolve => {
			const id = ++this.#sequence;
			this.#pending = { id, resolve, timer: setTimeout(() => { this.#finish(this.#result("unconfirmed")); this.#worker?.kill(); }, 1000) };
			this.#worker!.stdin.write(JSON.stringify({ id, selector: this.selector, chord, deadline: Date.now() + 200 }) + "\n");
		});
	}
	close(): void { this.#ready = false; this.#worker?.kill(); }
}
