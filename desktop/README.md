# Vorax Overlay (Windows app)

The Vorax Solver as a Windows app, with its advice in a small always-on-top card over the game, so one
monitor is enough. The design follows CoffeeBns's Tartarus Overlay (used with permission); the code is our own.

## How it's built

A thin Electron shell around the **live website** (`https://voraxlab.pages.dev/tli-vorax-simulator/`; until 0.1.10
`tidewarden.github.io`, whose saved data it copies over once at the first start): it loads `solver.html` from the site, so every fix to the
site reaches the app the next time the page loads, and the app's advice is exactly the website's.

| Piece | What it does |
|---|---|
| `main.js` | Finds `UE_game.log` (Steam's libraries via the registry and `libraryfolders.vdf`, app 1974050; beside the running game; the launcher's folders; or one the player chose) and reads it for the page. Finds the game window by its title (`Torchlight: Infinite`) and answers the page's window share with it, with no picker. Shows the overlay while the game is in front. Tray menu, hotkeys, site and app updates. Runs the page below normal priority so the game gets the processor first. |
| `preload.js` | `window.VoraxDesktop` for the Solver page only (`solver.html`, or `/solver` on Cloudflare Pages). The other side is `src/solver/desktop/bridge.ts`, which the site's tests cover. |
| `lib/overlay.*` | The card over the game: the move, its predicted end, the next choices, and Reload / Restart when there's an update. |

Pictures and the log never leave the PC. Boards are shared only by the page's own sharing switch. Nothing
touches the game: no clicks, no keys.

Hotkeys (not Tartarus Overlay's, so both can run): Ctrl+Alt+V show/hide the overlay · Ctrl+Alt+S the Solver · Ctrl+Alt+X take a picture now.

Run the game **borderless or windowed**: nothing can draw over exclusive fullscreen.

## Run it from source (Windows)

```
npm install
npm start          # against the live site
npm run local      # against the dev server (npm run dev in the repo root)
```

`--log=<path>` and `--game-title=<regex>` override the log and the window title. The debug log is in
`%APPDATA%\Vorax Overlay\logs\overlay.log`.

## Updates

- **Site changes**: every 10 minutes the shell compares the site's `version.json` with the page's build. It
  reloads at once while the game isn't running; during play the overlay offers Reload, and the page reloads
  by itself when the game closes.
- **App changes**: `electron-updater` checks this repo's GitHub Releases at start and every hour and
  downloads in the background. It installs by itself (quietly, then starts again) while the game isn't
  running, or as soon as the game closes. A Windows notification says when a new version is ready (click it
  to update now), and the card shows it with an Update button and the download's progress. Unsigned builds show
  SmartScreen's "Windows protected your PC" on first install.
- The installer is always `Vorax-Overlay-Setup.exe`. The website links to the newest release's page
  (`releases/latest`), so people see the notes and choose the download on GitHub.

## Release

1. Bump `version` in `package.json` (and `npm install` to update the lock file), commit, push.
2. `git tag -a vX.Y.Z -m "Vorax Overlay X.Y.Z" && git push origin vX.Y.Z` (plain `v` tags: electron-builder and
   electron-updater expect them).
3. `.github/workflows/desktop.yml` builds `Vorax-Overlay-Setup.exe` on Windows and publishes it, with
   `latest.yml` (what installed copies read), as release `vX.Y.Z`.
