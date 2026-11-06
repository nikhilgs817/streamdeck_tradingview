export type AppSelector = { names: string[]; path?: string };
export const COMPANIONS = [
	{ uuid: "com.windowstoolkit.vscode", name: "VS Code", kinds: ["vscode"], match: /visual studio code|\bvs ?code\b|vscodium|\bcode( - insiders)?\.exe\b|Microsoft\.VisualStudioCode/i, selector: { names: ["Code", "Code - Insiders", "VSCodium"] } },
	{ uuid: "com.windowstoolkit.chatgpt", name: "ChatGPT", kinds: [] as string[], match: /chatgpt|OpenAI\.(ChatGPT|Codex)/i, selector: { names: ["ChatGPT", "Codex"], path: "(?:OpenAI\\.(?:Codex|ChatGPT)|[\\\\/]ChatGPT[\\\\/])" } },
	{ uuid: "com.windowstoolkit.claude", name: "Claude", kinds: [] as string[], match: /\bclaude\b/i, selector: { names: ["Claude"], path: "(?:[\\\\/]Claude(?:_[^\\\\/]+)?[\\\\/]|[\\\\/]Anthropic[\\\\/])" } },
	{ uuid: "com.windowstoolkit.thinkorswim", name: "thinkorswim", kinds: [] as string[], match: /thinkorswim/i, selector: { names: ["thinkorswim", "javaw", "java"], path: "[\\\\/]thinkorswim(?:[\\\\/]|\\.exe$)" } },
	{ uuid: "com.windowstoolkit.fidelitytrader", name: "Fidelity Trader+", kinds: [] as string[], match: /Fidelity Trader\+|68D72461-B3DB-4FE2-AE47-50EF0FD7254F/i, selector: { names: ["Fidelity Trader+"], path: "[\\\\/]68D72461-B3DB-4FE2-AE47-50EF0FD7254F_" } },
	{ uuid: "com.windowstoolkit.tradingview", name: "TradingView", kinds: [] as string[], match: /tradingview/i, selector: { names: ["TradingView"], path: "[\\\\/]TradingView" } },
];

export function matchesApp(selector: AppSelector, name: string, path = ""): boolean {
	return selector.names.some((n) => n.toLowerCase() === name.replace(/\.exe$/i, "").toLowerCase()) && (!selector.path || !!path && new RegExp(selector.path, "i").test(path));
}
