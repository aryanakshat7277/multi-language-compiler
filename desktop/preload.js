const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  retry: () => ipcRenderer.send('retry-connection'),
  appVersion: '1.0.0'
});
