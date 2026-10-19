// window.VoraxDesktop for the Solver page (src/solver/desktop/bridge.ts is the other side of this contract).
// Only on the site's solver.html: the shell also checks every message comes from that page.
const { contextBridge, ipcRenderer } = require('electron');

if (/\/solver\.html$/.test(location.pathname)) {
  contextBridge.exposeInMainWorld('VoraxDesktop', {
    logSize: () => ipcRenderer.invoke('log:size'),
    // the shell sends the bytes; the page gets an ArrayBuffer of exactly them
    readLog: (start, end) => ipcRenderer.invoke('log:read', start, end).then((u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength)),
    onGame: (cb) => {
      ipcRenderer.on('game', (e, g) => cb({ running: !!g.running }));
      ipcRenderer.invoke('game:get').then((g) => g && cb({ running: !!g.running }));
    },
    onSnap: (cb) => ipcRenderer.on('snap', () => cb()),
    showAdvice: (card) => ipcRenderer.send('advice', card),
    gameWindow: () => ipcRenderer.invoke('game:window'),
    showSolver: () => ipcRenderer.send('solver:show'),
  });
}
