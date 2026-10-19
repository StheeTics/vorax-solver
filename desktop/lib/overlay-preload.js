// window.VoraxOverlay for the overlay card (overlay.js): text in, button presses out.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('VoraxOverlay', {
  on: (channel, cb) => ['card', 'update', 'folded'].includes(channel) && ipcRenderer.on(channel, (e, data) => cb(data)),
  height: (h) => ipcRenderer.send('overlay:height', h),
  fold: (folded) => ipcRenderer.send('overlay:fold', folded),
  openSolver: () => ipcRenderer.send('overlay:solver'),
  reload: () => ipcRenderer.send('overlay:reload'),
  restart: () => ipcRenderer.send('overlay:restart'),
  snap: () => ipcRenderer.send('overlay:snap'),
});
