# Changelog

## 2.1.0 — 2026-11-25

- **Design System 4**, shared with Windows Toolkit 3.1: new **Glass** look (now the default) and **Mono** look, alongside the app's own Dark and Light looks, Vivid, Neon (formerly Colourful) and Pro.
- Custom two-colour keys, Full / Glow only / Icon only / Still animation at four speeds, glow strength, a press ripple, label case and labels up to 18 letters.
- **Use this look on all keys** restyles every key of the plugin at once; keys changed afterwards keep their own look.
- Keys go still while Windows **Animation effects** is off (optional).
- README images show the new looks.

## 2.0.0

- **Renamed for Windows Toolkit:** the plugin ID is now `com.windowstoolkit.tradingview` (was `com.dailyops.tradingview.v1`). The installer backs up and removes the old plugin; keys made with it need to be added again (the bundled profile covers the standard layout).
- Works with **Windows Toolkit 3.0** (bundled) for automatic app switching.
- Key animations now loop every 12 seconds (slower, calmer movement).

## 1.0.1

- **Back fixed:** page keys (Draw ›, Time ›, ‹ Trade) no longer replace your main keys as the place Back returns to. Back and switching away from TradingView now return to your Default profile.

## 1.0.0

- First release: TradingView Controls with Trade, Draw and Time pages (39 actions).
- TradingView Dark (default) and Light looks plus Colourful, Vivid and Pro, with an animated icon on every key.
- Buy/Sell send your configured TradingView shortcut once per tap (SETUP until Shift+B / Shift+S is entered).
- Interval keys (1m–Weekly) and Maximize are the only keys allowed to send Enter, and start with Escape.
- Double-click installer with backup, profile install and rollback (shared with the other Windows Toolkit companions).
