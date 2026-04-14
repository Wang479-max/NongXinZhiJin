const { contextBridge, ipcRenderer } = require('electron');

// Extract backend port from additionalArguments
const backendPortArg = process.argv.find(arg => arg.startsWith('--backend-port='));
const backendPort = backendPortArg ? parseInt(backendPortArg.split('=')[1], 10) : 3000;

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  backendPort: backendPort
});
