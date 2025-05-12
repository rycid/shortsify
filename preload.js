const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectVideo: () => ipcRenderer.invoke('select-video'),
  selectOutputPath: (defaultFileName) => ipcRenderer.invoke('select-output-path', defaultFileName),
  processVideo: (input, output, speedSetting) => ipcRenderer.invoke('process-video', input, output, speedSetting),
  onProgressUpdate: (callback) => ipcRenderer.on('progress-update', callback),
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath)
});