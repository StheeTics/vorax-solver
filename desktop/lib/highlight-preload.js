// window.VoraxHighlight for the boxes over the game (highlight.js): boxes in, nothing out.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('VoraxHighlight', {
  on: (cb) => ipcRenderer.on('boxes', (e, boxes) => cb(boxes)),
});
