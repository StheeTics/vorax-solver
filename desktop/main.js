// Vorax Overlay: the Solver as a Windows app, with its advice in a small card over the game.
//
// A thin shell around the live website (the design of CoffeeBns's Tartarus Overlay, our own code): it loads
// solver.html from the site, so every fix to the site reaches the app the next time the page loads. What the
// shell adds is what a browser can't do:
//   - find the game's UE_game.log and read it for the page (no file to drag in),
//   - find the game window and answer the page's window share with it (no picker),
//   - show the page's advice in an always-on-top card over the game, and green boxes on the game around the
//     advised card and tanks,
//   - a tray menu, hotkeys, and updates of the site and of the app.
// The log never leaves the PC. Boards (and a few pictures of cards it reads badly) are shared only by the page's own sharing switch.
// Nothing here touches the game: no clicks, no keys (AGENTS.md).

const { cleanCard } = require('./lib/card');
const { cleanBoxes } = require('./lib/boxes');
const { pageOf: pageIn, dumpStorage, restoreStorage } = require('./lib/site');
const { app, BrowserWindow, Menu, Notification, Tray, desktopCapturer, dialog, globalShortcut, ipcMain, nativeImage, net, screen, session, shell } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

// ---------- Settings ----------

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const LIVE_SITE = 'https://voraxlab.pages.dev/tli-vorax-simulator/';
// where the site was until 0.1.10: what players saved there is copied over once (moveStorage)
const OLD_SITE = 'https://tidewarden.github.io/tli-vorax-simulator/';
const SITE = arg('site') || LIVE_SITE;
const SITE_URL = new URL(SITE);
// the Solver page, by name: Cloudflare Pages serves solver.html as /solver
const PAGE = 'solver';
const GAME_TITLE = new RegExp(arg('game-title') || '^Torchlight: Infinite\\s*$');
const LOG_OVERRIDE = arg('log');
const STEAM_APP = '1974050'; // Torchlight: Infinite on Steam
// not Tartarus Overlay's (Ctrl+Alt+O/A/P): players often run both
const HOTKEYS = { overlay: 'Control+Alt+V', solver: 'Control+Alt+S', snap: 'Control+Alt+X' };
const ICON = path.join(__dirname, 'build', 'icon.png');
const OVERLAY_WIDTH = 360; // Tartarus Overlay's, so the two cards look alike side by side
const SUPPORT_URL = 'https://buymeacoffee.com/tidewarden';

if (!app.requestSingleInstanceLock()) app.quit();

// The Solver window is hidden, and the game covers it: Chromium would count it as in the background and slow
// it down (card names read in 1.2-2.9 s with the processor idle, against 0.25 s in sessions where it wasn't,
// Oct 20-23). As Tartarus Overlay does, it's never treated as covered.
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
const settings = Object.assign(
  { logPath: null, overlay: null, overlayOn: true, hideBehind: false, folded: false, gameFirst: true, solver: null, highlight: true },
  (() => {
    try {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  })(),
);
let saveTimer = 0;
function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    } catch (e) {
      note('settings not saved:', String(e));
    }
  }, 300);
}

// A small debug log beside the settings, for reports.
const LOG_FILE = path.join(app.getPath('userData'), 'logs', 'overlay.log');
function note(...parts) {
  const line = `${new Date().toISOString()} ${parts.join(' ')}\n`;
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    if ((fs.statSync(LOG_FILE, { throwIfNoEntry: false }) || { size: 0 }).size > 2_000_000) fs.renameSync(LOG_FILE, `${LOG_FILE}.old`);
    fs.appendFileSync(LOG_FILE, line);
  } catch (e) {
    // no debug log
  }
}

const statOf = (p) => {
  try {
    return fs.statSync(p);
  } catch (e) {
    return null;
  }
};

// ---------- Finding the game's log ----------

function regQuery(key, value) {
  return new Promise((resolve) => {
    execFile('reg', ['query', key, '/v', value], { windowsHide: true }, (err, out) => {
      const m = !err && new RegExp(`${value}\\s+REG_\\w+\\s+(.+)`).exec(out);
      resolve(m ? m[1].trim() : null);
    });
  });
}

// A game under Program Files that can't write there has its log in Windows' VirtualStore copy.
const virtualStore = (p) => (/^[a-z]:\\program files/i.test(p) && process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'VirtualStore', p.slice(3)) : null);
const LOG_IN_GAME = ['UE_game', 'TorchLight', 'Saved', 'Logs', 'UE_game.log'];

/**
 * Where the game writes UE_game.log: the one the player chose; beside the running game (Windows says where
 * its program is: UE_game\Binaries\Win64); under each Steam library that has the game; under the launcher's
 * default folders. The newest log wins. Without a log yet, where it will appear once the game starts.
 */
async function findLog() {
  if (LOG_OVERRIDE) return { file: path.resolve(LOG_OVERRIDE), by: 'given' };
  if (settings.logPath && statOf(path.dirname(settings.logPath))) return { file: settings.logPath, by: 'chosen by the player' };
  const candidates = [];
  const program = game.running && win32 ? win32.programOf(game.hwnd) : null;
  if (program && /torchlight/i.test(program)) candidates.push(path.resolve(path.dirname(program), '..', '..', 'TorchLight', 'Saved', 'Logs', 'UE_game.log'));
  const roots = new Map();
  const addRoot = (p) => p && roots.set(path.resolve(p).toLowerCase(), path.resolve(p));
  for (const [key, value] of [['HKCU\\Software\\Valve\\Steam', 'SteamPath'], ['HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', 'InstallPath'], ['HKLM\\SOFTWARE\\Valve\\Steam', 'InstallPath']]) addRoot(await regQuery(key, value));
  addRoot('C:\\Program Files (x86)\\Steam');
  const libraries = new Map(roots);
  for (const root of roots.values()) {
    try {
      const vdf = fs.readFileSync(path.join(root, 'steamapps', 'libraryfolders.vdf'), 'utf8');
      for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) {
        const lib = path.resolve(m[1].replace(/\\\\/g, '\\'));
        libraries.set(lib.toLowerCase(), lib);
      }
    } catch (e) {
      // not a Steam folder
    }
  }
  for (const lib of libraries.values()) {
    try {
      const acf = fs.readFileSync(path.join(lib, 'steamapps', `appmanifest_${STEAM_APP}.acf`), 'utf8');
      const m = /"installdir"\s+"([^"]+)"/.exec(acf);
      if (m) candidates.push(path.join(lib, 'steamapps', 'common', m[1], ...LOG_IN_GAME));
    } catch (e) {
      // the game isn't in this library
    }
  }
  for (const base of ['C:\\Program Files (x86)\\Torchlight Infinite', 'C:\\Program Files\\Torchlight Infinite']) candidates.push(path.join(base, 'Game', ...LOG_IN_GAME));
  for (const p of [...candidates]) if (virtualStore(p)) candidates.push(virtualStore(p));
  const there = candidates.map((p) => ({ p, st: statOf(p) })).filter((x) => x.st && x.st.isFile()).sort((a, b) => b.st.mtimeMs - a.st.mtimeMs);
  if (there.length) return { file: there[0].p, by: program ? 'beside the running game or in the game folders' : 'in the game folders' };
  const installed = candidates.find((p) => statOf(path.resolve(p, '..', '..', '..')));
  return { file: installed || null, by: installed ? 'where the game will write it' : 'not found' };
}

let logPath = null;
async function refreshLog() {
  const found = await findLog();
  if (found.file !== logPath) {
    logPath = found.file;
    note(`log file (${found.by}):`, logPath || 'not found');
    rebuildMenu();
  }
  watchLog();
}

// The game writing to its log is passed to the Solver page at once (at most every 30 ms), so it reads the new lines
// then instead of at its next poll. The folder is watched, not the file: the game replaces the file when it
// starts. If Windows sends nothing, or the watch fails, the page's poll reads the log as before.
let logWatcher = null;
let watchedLog = null;
let pushTimer = null;
let lastPush = 0;
function logChanged() {
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    lastPush = Date.now();
    if (wins.solver && !wins.solver.isDestroyed()) wins.solver.webContents.send('log:changed');
  }, Math.max(0, 30 - (Date.now() - lastPush)));
}
function watchLog() {
  if (watchedLog === logPath) return;
  if (logWatcher) logWatcher.close();
  logWatcher = null;
  watchedLog = logPath;
  if (!logPath) return;
  const name = path.basename(logPath).toLowerCase();
  try {
    logWatcher = fs.watch(path.dirname(logPath), { persistent: false }, (event, file) => {
      if (!file || String(file).toLowerCase() === name) logChanged();
    });
    logWatcher.on('error', (e) => {
      note('log watch stopped:', String(e));
      logWatcher = null;
      watchedLog = null;
    });
    note('watching the log folder for new lines');
  } catch (e) {
    note('log watch unavailable, polling only:', String(e));
    logWatcher = null;
  }
}

async function pickLog() {
  const res = await dialog.showOpenDialog({
    title: 'Choose UE_game.log',
    defaultPath: logPath || undefined,
    properties: ['openFile'],
    filters: [{ name: 'Torchlight: Infinite log', extensions: ['log'] }],
  });
  if (res.canceled || !res.filePaths[0]) return;
  settings.logPath = res.filePaths[0];
  saveSettings();
  await refreshLog();
}

// ---------- The game window ----------

// What a browser can't see: which window is the game, which is in front, and where. From Windows itself
// (koffi calls into user32); without it, the capture's list of windows, and the overlay shows whenever the
// game runs.
const win32 = (() => {
  if (process.platform !== 'win32') return null;
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    const kernel32 = koffi.load('kernel32.dll');
    const RECT = koffi.struct('RECT', { left: 'long', top: 'long', right: 'long', bottom: 'long' });
    const foreground = user32.func('__stdcall', 'GetForegroundWindow', 'intptr', []);
    const getRect = user32.func('__stdcall', 'GetWindowRect', 'bool', ['intptr', koffi.out(koffi.pointer(RECT))]);
    const getClientRect = user32.func('__stdcall', 'GetClientRect', 'bool', ['intptr', koffi.out(koffi.pointer(RECT))]);
    const POINT = koffi.struct('POINT', { x: 'long', y: 'long' });
    const clientToScreen = user32.func('__stdcall', 'ClientToScreen', 'bool', ['intptr', koffi.inout(koffi.pointer(POINT))]);
    const iconic = user32.func('__stdcall', 'IsIconic', 'bool', ['intptr']);
    const visible = user32.func('__stdcall', 'IsWindowVisible', 'bool', ['intptr']);
    const nextWindow = user32.func('__stdcall', 'FindWindowExW', 'intptr', ['intptr', 'intptr', 'void *', 'void *']);
    const windowText = user32.func('__stdcall', 'GetWindowTextW', 'int', ['intptr', 'void *', 'int']);
    const windowPid = user32.func('__stdcall', 'GetWindowThreadProcessId', 'uint32', ['intptr', koffi.out(koffi.pointer('uint32'))]);
    const openProcess = kernel32.func('__stdcall', 'OpenProcess', 'intptr', ['uint32', 'bool', 'uint32']);
    const imageName = kernel32.func('__stdcall', 'QueryFullProcessImageNameW', 'bool', ['intptr', 'uint32', 'void *', koffi.inout(koffi.pointer('uint32'))]);
    const closeHandle = kernel32.func('__stdcall', 'CloseHandle', 'bool', ['intptr']);
    return {
      /** The shown top-level window whose title matches, not one of this app's: { title, hwnd } or null. Titles only. */
      findWindow(re, known) {
        const buf = Buffer.alloc(1024);
        const fits = (h) => {
          if (!visible(h)) return null;
          const n = windowText(h, buf, 512);
          const title = n > 0 ? buf.toString('utf16le', 0, n * 2) : '';
          if (!re.test(title)) return null;
          const pid = [0];
          windowPid(h, pid);
          return pid[0] === process.pid ? null : { title, hwnd: h };
        };
        if (known) {
          const again = fits(known);
          if (again) return again;
        }
        for (let h = Number(nextWindow(0, 0, null, null)); h; h = Number(nextWindow(0, h, null, null))) {
          const found = fits(h);
          if (found) return found;
        }
        return null;
      },
      /** The program behind a window: its file's path only. */
      programOf(hwnd) {
        const pid = [0];
        windowPid(hwnd, pid);
        if (!pid[0]) return null;
        const h = openProcess(0x1000, false, pid[0]); // PROCESS_QUERY_LIMITED_INFORMATION
        if (!h) return null;
        try {
          const buf = Buffer.alloc(4096);
          const size = [2048];
          return imageName(h, 0, buf, size) ? buf.toString('utf16le', 0, size[0] * 2) : null;
        } finally {
          closeHandle(h);
        }
      },
      foreground: () => Number(foreground()),
      rect(hwnd) {
        const r = {};
        return getRect(hwnd, r) ? { x: r.left, y: r.top, width: r.right - r.left, height: r.bottom - r.top } : null;
      },
      minimized: (hwnd) => !!iconic(hwnd),
      /** The picture inside the window, without its title bar and borders: its size only. */
      client(hwnd) {
        const r = {};
        return getClientRect(hwnd, r) ? { width: r.right - r.left, height: r.bottom - r.top } : null;
      },
      /** The picture inside the window, where it is on screen (screen pixels): for drawing over it. */
      clientOnScreen(hwnd) {
        const r = {};
        const p = { x: 0, y: 0 };
        if (!getClientRect(hwnd, r) || !clientToScreen(hwnd, p)) return null;
        return { x: p.x, y: p.y, width: r.right - r.left, height: r.bottom - r.top };
      },
    };
  } catch (e) {
    return null;
  }
})();

let game = { running: false, title: '', hwnd: 0 };
// The game counts as closed only after its window has been missing three looks in a row: a loading screen
// between two windows doesn't hide the overlay or end the share.
let missing = 0;
async function findGameWindow() {
  if (win32) return win32.findWindow(GAME_TITLE, game.hwnd);
  const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 }, fetchWindowIcons: false });
  const s = sources.find((x) => GAME_TITLE.test(x.name));
  return s ? { title: s.name, hwnd: Number(s.id.split(':')[1]) || 0 } : null;
}
async function lookForGame() {
  let found = null;
  let looked = false;
  try {
    found = await findGameWindow();
    looked = true;
  } catch (e) {
    // try again next time
  }
  missing = found ? 0 : missing + (looked ? 1 : 0);
  if (found || !game.running || missing >= 3) {
    const was = game.running;
    game = { running: !!found, title: found ? found.title.trim() : '', hwnd: found ? found.hwnd : 0 };
    if (game.running !== was) {
      note(game.running ? `game running: "${game.title}"` : 'game closed');
      if (game.running) {
        await refreshLog();
        placeOverlay();
      } else {
        if (siteUpdate) reloadSolver('site update, game closed');
        installWhenFree();
      }
      send('solver', 'game', { running: game.running });
      rebuildMenu();
    }
  }
  updateOverlay();
  setTimeout(lookForGame, game.running ? 500 : 2000);
}

// ---------- Windows ----------

const wins = { solver: null, overlay: null, highlight: null };
let quitting = false;
let tray = null;
const send = (name, channel, data) => wins[name] && !wins[name].isDestroyed() && wins[name].webContents.send(channel, data);
const pageOf = (url) => pageIn(url, SITE);
const fromSolver = (e) => !!wins.solver && !wins.solver.isDestroyed() && e.sender === wins.solver.webContents && !!e.senderFrame && pageOf(e.senderFrame.url) === PAGE;
const fromOverlay = (e) => !!wins.overlay && !wins.overlay.isDestroyed() && e.sender === wins.overlay.webContents;

const onScreen = (b) => screen.getAllDisplays().some((d) => {
  const a = d.workArea;
  return b.x + 60 > a.x && b.x < a.x + a.width - 60 && b.y >= a.y - 10 && b.y < a.y + a.height - 40;
});

let loadedBuild = null;
function loadSolver() {
  wins.solver.loadURL(SITE + 'solver.html', { extraHeaders: 'pragma: no-cache\n' }).catch(() => {
    // did-fail-load retries
  });
}
function makeSolver() {
  const b = settings.solver && onScreen(settings.solver) ? settings.solver : {};
  const win = new BrowserWindow(Object.assign({
    show: false,
    width: 1280,
    height: 900,
    title: 'Vorax Solver · Vorax Overlay',
    backgroundColor: '#0b0506',
    icon: ICON,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), backgroundThrottling: false, contextIsolation: true, sandbox: true, spellcheck: false },
  }, b));
  win.removeMenu();
  wins.solver = win;
  const wc = win.webContents;
  wc.on('did-finish-load', () => {
    note('solver page loaded:', wc.getURL());
    tunePriority();
    currentBuild().then((b) => (loadedBuild = b));
    siteUpdate = false;
    send('overlay', 'update', updateState());
  });
  // the page's timing notes and errors, for the debug log
  wc.on('console-message', (e) => {
    const msg = String(e.message || '');
    if (msg.startsWith('[timing]') || e.level === 'error') note('page:', msg.slice(0, 300));
  });
  wc.on('did-fail-load', (e, code, text, url, mainFrame) => {
    if (!mainFrame || code === -3) return; // -3: a load replaced by another
    note('solver page failed to load:', code, text);
    send('overlay', 'card', { move: 'Can’t reach the Vorax site', detail: 'Trying again in 15 seconds. Check your connection.', others: [], round: null, updating: false });
    setTimeout(() => !win.isDestroyed() && loadSolver(), 15000);
  });
  wc.on('render-process-gone', (e, details) => {
    note('solver page crashed:', details && details.reason);
    setTimeout(() => !win.isDestroyed() && loadSolver(), 1000);
  });
  // Only the Solver loads here; any other link opens in the player's browser.
  wc.on('will-navigate', (e, url) => {
    if (pageOf(url) === PAGE) return;
    e.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') wc.toggleDevTools();
  });
  const keep = () => {
    if (win.isMaximized() || win.isMinimized()) return;
    settings.solver = win.getBounds();
    saveSettings();
  };
  win.on('moved', keep);
  win.on('resized', keep);
  win.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    win.hide();
  });
  loadSolver();
  return win;
}

function showSolver() {
  const win = wins.solver;
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}
function toggleSolver() {
  const win = wins.solver;
  if (win && win.isVisible() && win.isFocused()) win.hide();
  else showSolver();
}

// The game gets the processor first: the Solver page (and its workers, in the same process) runs below
// normal priority.
function tunePriority() {
  const wc = wins.solver && wins.solver.webContents;
  if (!wc) return;
  try {
    os.setPriority(wc.getOSProcessId(), settings.gameFirst ? os.constants.priority.PRIORITY_BELOW_NORMAL : os.constants.priority.PRIORITY_NORMAL);
  } catch (e) {
    note('priority not set:', String(e));
  }
}

// ---------- The overlay ----------

function placeOverlay() {
  const win = wins.overlay;
  if (!win) return;
  let at = settings.overlay && onScreen(settings.overlay) ? settings.overlay : null;
  if (!at) {
    // at first, the game window's top right corner, or the main screen's
    let area = screen.getPrimaryDisplay().workArea;
    const r = game.running && win32 ? win32.rect(game.hwnd) : null;
    if (r && r.width > 200) area = screen.screenToDipRect(null, r);
    at = { x: Math.round(area.x + area.width - OVERLAY_WIDTH - 24), y: Math.round(area.y + Math.min(140, area.height / 8)) };
  }
  win.setBounds({ x: at.x, y: at.y, width: OVERLAY_WIDTH, height: overlayHeight });
}

function makeOverlay() {
  const win = new BrowserWindow({
    width: OVERLAY_WIDTH,
    height: 160,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false, // clicking the card doesn't take the game out of focus
    hasShadow: false,
    title: 'Vorax Overlay',
    icon: ICON,
    webPreferences: { preload: path.join(__dirname, 'lib', 'overlay-preload.js'), backgroundThrottling: false, contextIsolation: true, sandbox: true },
  });
  wins.overlay = win;
  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile(path.join(__dirname, 'lib', 'overlay.html'));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('did-finish-load', () => {
    send('overlay', 'folded', settings.folded);
    send('overlay', 'update', updateState());
    send('overlay', 'support', supportOffer);
    if (lastCard) send('overlay', 'card', lastCard);
  });
  win.on('moved', () => {
    const b = win.getBounds();
    settings.overlay = { x: b.x, y: b.y };
    saveSettings();
  });
  win.on('close', (e) => {
    if (!quitting) e.preventDefault();
  });
  placeOverlay();
  return win;
}

// Buy me a coffee, offered on the card each time the app starts, until the player hides it (the Solver page
// reloading for a site update doesn't bring it back: it's kept here, not in the page).
let supportOffer = true;

// Shown while the game runs, whatever is in front. With hideBehind (tray menu, off at first), only while the
// game itself is in front.
let overlayShown = false;
function overlayWanted() {
  if (!settings.overlayOn || !game.running) return false;
  if (!settings.hideBehind || !win32) return true;
  const front = win32.foreground();
  if (front === game.hwnd) return !win32.minimized(game.hwnd);
  return !!wins.overlay && front === hwndOf(wins.overlay);
}
const hwndOf = (win) => {
  const b = win.getNativeWindowHandle();
  return b.length >= 8 ? Number(b.readBigUInt64LE(0)) : b.readUInt32LE(0);
};
let lastRaise = 0;
function updateOverlay() {
  updateHighlight();
  const win = wins.overlay;
  if (!win || win.isDestroyed()) return;
  const want = overlayWanted();
  // other overlays over the game also ask to stay on top, and the last to ask gets the clicks: while the card
  // shows, it asks again every 2 s
  if (want && overlayShown && Date.now() - lastRaise > 2000) {
    lastRaise = Date.now();
    win.setAlwaysOnTop(true, 'screen-saver');
    win.moveTop();
  }
  if (want === overlayShown) return;
  overlayShown = want;
  if (want) {
    win.showInactive();
    win.setAlwaysOnTop(true, 'screen-saver');
  } else win.hide();
}
function setOverlayOn(on) {
  settings.overlayOn = !!on;
  saveSettings();
  updateOverlay();
  rebuildMenu();
}

// ---------- The boxes on the game ----------

// Green boxes around the advised card and tanks (src/solver/advice/highlight.ts), drawn by a see-through
// window laid over the game's picture that never takes a click or the focus. Shown only while the game is
// in front, so they never cover another window.
let boxes = [];
let highlightAt = null;
let highlightHide = null;
const HIGHLIGHT_HIDE_MS = 2000;
function makeHighlight() {
  const win = new BrowserWindow({
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    title: 'Vorax highlights',
    webPreferences: { preload: path.join(__dirname, 'lib', 'highlight-preload.js'), backgroundThrottling: false, contextIsolation: true, sandbox: true },
  });
  wins.highlight = win;
  // clicks go through to the game
  win.setIgnoreMouseEvents(true);
  // under the card (which asks for 'screen-saver'), over the game
  win.setAlwaysOnTop(true, 'pop-up-menu');
  win.loadFile(path.join(__dirname, 'lib', 'highlight.html'));
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('did-finish-load', () => send('highlight', 'boxes', boxes));
  win.on('close', (e) => {
    if (!quitting) e.preventDefault();
  });
  return win;
}
function updateHighlight() {
  const win = wins.highlight;
  if (!win || win.isDestroyed()) return;
  const front = win32 && game.running && game.hwnd && !win32.minimized(game.hwnd) && win32.foreground() === game.hwnd;
  const at = settings.highlight && front ? win32.clientOnScreen(game.hwnd) : null;
  if (!at || at.width < 100 || at.height < 100) {
    clearTimeout(highlightHide);
    highlightHide = null;
    if (win.isVisible()) win.hide();
    highlightAt = null;
    return;
  }
  // No boxes: the window stays up, empty, a moment before it hides. Hidden at once, it kept its last picture (the
  // old box), which flashed when it was shown for the next one.
  if (!boxes.length) {
    if (win.isVisible() && !highlightHide) highlightHide = setTimeout(() => {
      highlightHide = null;
      if (!boxes.length && !win.isDestroyed()) win.hide();
    }, HIGHLIGHT_HIDE_MS);
    return;
  }
  clearTimeout(highlightHide);
  highlightHide = null;
  // the game's picture in Electron's own units, which a display's scaling makes differ from screen pixels
  const b = screen.screenToDipRect(null, at);
  const key = `${b.x},${b.y},${b.width},${b.height}`;
  if (key !== highlightAt) {
    highlightAt = key;
    win.setBounds({ x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) });
  }
  if (!win.isVisible()) {
    win.showInactive();
    win.setAlwaysOnTop(true, 'pop-up-menu');
  }
}
ipcMain.on('highlights', (e, list) => {
  if (!fromSolver(e)) return;
  boxes = cleanBoxes(list);
  send('highlight', 'boxes', boxes);
  updateHighlight();
});
function setHighlight(on) {
  settings.highlight = !!on;
  saveSettings();
  updateHighlight();
}

// ---------- Between the page and the overlay ----------

let lastCard = null;
ipcMain.on('advice', (e, card) => {
  if (!fromSolver(e)) return;
  // only plain text crosses into the overlay
  const clean = cleanCard(card);
  if (!clean) return;
  lastCard = clean;
  send('overlay', 'card', lastCard);
});
ipcMain.handle('game:get', (e) => (fromSolver(e) ? { running: game.running } : null));
// the page brings its window up to ask the player something (their Intern Shelley level, the first time)
ipcMain.on('solver:show', (e) => fromSolver(e) && showSolver());
// for working out why a setup misreads: the game window's outer size, the picture inside it (a title bar and
// borders make them differ) and the display's scaling; sizes only, nothing else about the window
ipcMain.handle('game:window', (e) => {
  if (!fromSolver(e) || !win32 || !game.running || !game.hwnd) return null;
  const outer = win32.rect(game.hwnd);
  const client = win32.client(game.hwnd);
  if (!outer || !client) return null;
  // the window's rect is in screen pixels; the display it's on is found in Electron's own units
  const scale = screen.getDisplayMatching(screen.screenToDipRect(null, { x: outer.x, y: outer.y, width: outer.width, height: outer.height })).scaleFactor;
  return { outer: [outer.width, outer.height], client: [client.width, client.height], scale };
});
ipcMain.handle('log:size', async (e) => {
  if (!fromSolver(e)) return null;
  if (!logPath) await refreshLog();
  const st = logPath && statOf(logPath);
  return st && st.isFile() ? st.size : null;
});
const MAX_READ = 2 * 1024 * 1024;
ipcMain.handle('log:read', async (e, start, end) => {
  if (!fromSolver(e) || !logPath || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) return new Uint8Array(0);
  const length = Math.min(end - start, MAX_READ);
  const fh = await fs.promises.open(logPath, 'r');
  try {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await fh.read(buf, 0, length, start);
    return new Uint8Array(buf.buffer, buf.byteOffset, bytesRead);
  } finally {
    await fh.close();
  }
});
// The card's size is ours, never read back from the window: with Windows display scaling a window's
// bounds come back rounded up, and setting them again grows it a little every time.
let overlayHeight = 160;
ipcMain.on('overlay:height', (e, h) => {
  if (!fromOverlay(e) || !Number.isFinite(h)) return;
  const height = Math.max(16, Math.min(600, Math.ceil(h)));
  if (height === overlayHeight) return;
  overlayHeight = height;
  const b = wins.overlay.getBounds();
  wins.overlay.setBounds({ x: b.x, y: b.y, width: OVERLAY_WIDTH, height });
});
ipcMain.on('overlay:fold', (e, folded) => {
  if (!fromOverlay(e)) return;
  settings.folded = !!folded;
  saveSettings();
});
ipcMain.on('overlay:solver', (e) => fromOverlay(e) && toggleSolver());
// the card's question: the Solver window opens on it (never hides, as the Solver button can)
ipcMain.on('overlay:answer', (e) => fromOverlay(e) && showSolver());
// the instrument question answered on the card: the page checks it's one of the offer
ipcMain.on('overlay:choose', (e, name) => fromOverlay(e) && typeof name === 'string' && name.length <= 80 && send('solver', 'choose', name));
ipcMain.on('overlay:snap', (e) => fromOverlay(e) && game.running && send('solver', 'snap'));
ipcMain.on('overlay:force', (e) => fromOverlay(e) && send('solver', 'force'));
ipcMain.on('overlay:reload', (e) => fromOverlay(e) && reloadSolver('the player asked'));
ipcMain.on('overlay:restart', (e) => fromOverlay(e) && updateNow());
ipcMain.on('overlay:support', (e, open) => {
  if (!fromOverlay(e)) return;
  supportOffer = false;
  send('overlay', 'support', false);
  if (open) shell.openExternal(SUPPORT_URL);
});

// ---------- Updates ----------

// Site: the page loads from the site, so it's current when it loads. Every 10 minutes the shell compares
// the site's version.json with the build the page was loaded from. A newer site reloads the page at once
// while the game isn't running; during play the overlay offers Reload, and the page reloads by itself
// when the game closes.
let siteUpdate = false;
async function currentBuild() {
  try {
    const r = await net.fetch(`${SITE}version.json`, { cache: 'no-store' });
    return r.ok ? (await r.json()).build || null : null;
  } catch (e) {
    return null;
  }
}
async function checkSite() {
  const build = await currentBuild();
  if (!build || !loadedBuild || build === loadedBuild) return;
  if (!game.running) return reloadSolver(`site ${loadedBuild} → ${build}`);
  if (!siteUpdate) note(`site update ${loadedBuild} → ${build}: offered on the overlay`);
  siteUpdate = true;
  send('overlay', 'update', updateState());
}
function reloadSolver(why) {
  note('reloading the Solver page:', why);
  siteUpdate = false;
  loadSolver();
}

// App: electron-updater checks this repo's GitHub Releases at start and every hour and downloads a new version
// in the background. It installs it by itself (quietly, then starts again) while the game isn't running, or
// as soon as the game closes; during a game the overlay offers Restart, and quitting installs it too.
// appUpdate: '' none; 'downloading' a new version is coming down; 'ready' downloaded, installs on Restart
let appUpdate = '';
let appVersion = '';
let appProgress = 0;
// the player pressed Update (the card or the notification) before the download finished
let installWhenReady = false;
let autoUpdater = null;
function startAppUpdates() {
  if (!app.isPackaged) return;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', (info) => {
    appUpdate = 'downloading';
    appVersion = (info && info.version) || '';
    appProgress = 0;
    note('app update available:', appVersion);
    send('overlay', 'update', updateState());
  });
  autoUpdater.on('download-progress', (p) => {
    appProgress = Math.round((p && p.percent) || 0);
    send('overlay', 'update', updateState());
  });
  autoUpdater.on('update-downloaded', (info) => {
    appUpdate = 'ready';
    appVersion = (info && info.version) || appVersion;
    note('app update downloaded:', appVersion);
    send('overlay', 'update', updateState());
    rebuildMenu();
    if (installWhenReady) return installUpdate();
    notifyUpdate();
    installWhenFree();
  });
  autoUpdater.on('error', (e) => note('app update check failed:', String((e && e.message) || e)));
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  check();
  setInterval(check, 60 * 60 * 1000);
}
// A Windows notification: clicking it installs the update and starts the app again.
function notifyUpdate() {
  if (!Notification.isSupported()) return;
  const n = new Notification({ title: `Vorax Overlay ${appVersion} is ready`, body: game.running ? 'Click to update now (the app restarts in a few seconds), or it updates when the game closes.' : 'Click to update now.', icon: ICON });
  n.on('click', () => updateNow());
  n.show();
}
// Update, from the card's button, the notification or the tray: now if downloaded, else as soon as it is.
function updateNow() {
  if (appUpdate === 'ready') return installUpdate();
  if (appUpdate === 'downloading') {
    installWhenReady = true;
    send('overlay', 'update', updateState());
  }
}
// Installs a downloaded update unless the game is running (then it waits for the game to close).
function installWhenFree() {
  if (appUpdate !== 'ready' || game.running) return;
  setTimeout(() => {
    if (appUpdate === 'ready' && !game.running) {
      note('installing the app update: the game isn\u2019t running');
      installUpdate();
    }
  }, 5000);
}
function installUpdate() {
  quitting = true;
  autoUpdater.quitAndInstall(true, true);
}
const updateState = () => ({ site: siteUpdate, app: appUpdate, version: appVersion, progress: appProgress, waiting: installWhenReady });

// ---------- Tray and hotkeys ----------

function rebuildMenu() {
  if (!tray) return;
  tray.setToolTip(`Vorax Overlay${game.running ? ' · game running' : ''}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open the Solver', accelerator: HOTKEYS.solver, click: showSolver },
    { label: 'Show the overlay over the game', type: 'checkbox', checked: settings.overlayOn, accelerator: HOTKEYS.overlay, click: (i) => setOverlayOn(i.checked) },
    { label: 'Highlight the advised move on the game', type: 'checkbox', checked: settings.highlight, enabled: !!win32, click: (i) => setHighlight(i.checked) },
    { label: 'Hide it while another window is in front', type: 'checkbox', checked: settings.hideBehind, enabled: !!win32, click: (i) => ((settings.hideBehind = i.checked), saveSettings(), updateOverlay()) },
    { label: 'Take a picture now', accelerator: HOTKEYS.snap, enabled: game.running, click: () => send('solver', 'snap') },
    { type: 'separator' },
    { label: logPath ? `Game log: ${logPath}` : 'Game log: not found yet', enabled: false },
    { label: 'Choose the game log…', click: () => void pickLog() },
    { label: 'Let the game go first (lower priority)', type: 'checkbox', checked: settings.gameFirst, click: (i) => ((settings.gameFirst = i.checked), saveSettings(), tunePriority()) },
    { type: 'separator' },
    appUpdate ? { label: appUpdate === 'ready' ? `Update to ${appVersion} now` : `Update to ${appVersion} (downloading)`, click: updateNow } : { label: `Version ${app.getVersion()}`, enabled: false },
    { label: 'Open the debug log folder', click: () => shell.openPath(path.dirname(LOG_FILE)) },
    { label: 'Quit', click: () => ((quitting = true), app.quit()) },
  ]));
}

function registerHotkeys() {
  const keys = [
    [HOTKEYS.overlay, () => setOverlayOn(!settings.overlayOn)],
    [HOTKEYS.solver, toggleSolver],
    [HOTKEYS.snap, () => game.running && send('solver', 'snap')],
  ];
  for (const [key, fn] of keys) if (!globalShortcut.register(key, fn)) note('hotkey taken by another program:', key);
}

// ---------- Start ----------

function permissions() {
  // The Solver's window share is answered with the game window, with no picker; nothing else may ask.
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    const mine = !!wins.solver && !!request.frame && pageOf(request.frame.url) === PAGE;
    if (!mine) return callback({});
    desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 0, height: 0 }, fetchWindowIcons: false })
      .then((sources) => {
        const matching = sources.filter((x) => GAME_TITLE.test(x.name));
        let s = matching[0];
        // Windows has the game's window, but the capture's list left it out: ask for it by its handle. (A window
        // left out is usually one Windows won't capture, such as a game run as administrator.)
        if (!s && game.running && game.hwnd) s = { id: `window:${game.hwnd}:0`, name: game.title };
        // for a player's debug log: which window, and whether Windows offered it for capture
        note(!s ? 'window share refused: no game window'
          : matching.length ? `window share: "${s.name.trim()}" (${s.id}; ${matching.length} matching window${matching.length === 1 ? '' : 's'} offered: ${matching.map((x) => `"${x.name.trim()}"`).join(', ')})`
          : `window share: "${s.name.trim()}" by its handle, not offered for capture (game run as administrator?)`);
        callback(s ? { video: s } : {});
      })
      .catch((e) => {
        note('window share failed:', String((e && e.message) || e));
        callback({});
      });
  });
  const allowed = new Set(['media', 'display-capture', 'clipboard-sanitized-write']);
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb, details) => cb(allowed.has(permission) && !!pageOf(details.requestingUrl || wc.getURL())));
  session.defaultSession.setPermissionCheckHandler((wc, permission, origin) => allowed.has(permission) && origin === SITE_URL.origin);
}

// The site moved address, and a page's storage stays with its address: once, before the Solver opens, what the
// player saved at the old one is copied to the new one (never over anything saved there). Each address is opened
// in a hidden window on its version.json, a page of that address with no script of its own. If the old site can't
// be reached, the Solver opens anyway and the copy is tried again at the next start.
async function moveStorage() {
  if (settings.storageMoved === OLD_SITE) return;
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, sandbox: true, javascript: true } });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const at = async (site, code) => {
    await win.loadURL(`${site}version.json`);
    if (new URL(win.webContents.getURL()).origin !== new URL(site).origin) throw new Error(`${site} answered from ${win.webContents.getURL()}`);
    return win.webContents.executeJavaScript(code);
  };
  const timeout = new Promise((_, no) => setTimeout(() => no(new Error('timed out')), 20000));
  try {
    await Promise.race([timeout, (async () => {
      const dump = await at(OLD_SITE, `(${dumpStorage.toString()})()`);
      const added = await at(SITE, `(${restoreStorage.toString()})(${JSON.stringify(dump)})`);
      note(`saved data moved from ${OLD_SITE}: ${Object.keys(dump.local).length} settings and ${Object.keys(dump.refs).length} named cards there, ${added} entries added`);
      settings.storageMoved = OLD_SITE;
      saveSettings();
    })()]);
  } catch (e) {
    note('saved data not moved yet (tried again next start):', String((e && e.message) || e));
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
}

app.on('second-instance', showSolver);
app.on('window-all-closed', (e) => e.preventDefault());
app.on('before-quit', () => (quitting = true));
app.on('will-quit', () => globalShortcut.unregisterAll());

app.whenReady().then(async () => {
  app.setAppUserModelId('io.github.tidewarden.vorax-overlay');
  note(`Vorax Overlay ${app.getVersion()} starting; site ${SITE}; Windows ${os.release()}`);
  permissions();
  // testing against a dev server: --fresh starts its page with nothing saved (the live site's storage is kept)
  if (arg('site') && process.argv.includes('--fresh')) await session.defaultSession.clearStorageData({ origin: SITE_URL.origin, storages: ['localstorage'] });
  if (!arg('site')) await moveStorage();
  makeSolver();
  makeOverlay();
  makeHighlight();
  tray = new Tray(nativeImage.createFromPath(ICON).resize({ width: 16, height: 16 }));
  tray.on('click', showSolver);
  rebuildMenu();
  registerHotkeys();
  await refreshLog();
  lookForGame();
  setInterval(checkSite, 10 * 60 * 1000);
  startAppUpdates();
  // the first time, show the Solver so the player sees the app started
  if (!settings.seenSolver) {
    settings.seenSolver = true;
    saveSettings();
    wins.solver.once('ready-to-show', showSolver);
  }
});
