const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectVideo: () => ipcRenderer.invoke('select-video'),
  processVideo: (input, output) => ipcRenderer.invoke('process-video', input, output),
  onProgressUpdate: (callback) => ipcRenderer.on('progress-update', callback),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options)
});