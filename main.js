// File: main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
      devTools: false
    },
    autoHideMenuBar: true,
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  ipcMain.handle('select-video', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi'] }]
    });
    return result.filePaths[0];
  });
  
  ipcMain.handle('check-file-exists', async (event, filePath) => {
    const fs = require('fs');
    return fs.existsSync(filePath);
  });
  
  ipcMain.handle('show-confirm-dialog', async (event, options) => {
    const result = await dialog.showMessageBox({
      type: 'question',
      buttons: ['Yes', 'No'],
      defaultId: 1,
      title: options.title || 'Confirm',
      message: options.message || 'Are you sure?'
    });
    return result.response === 0; // Returns true if "Yes" was clicked
  });
  ipcMain.handle('process-video', async (event, inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
    //   const ffmpegPath = path.join(__dirname, 'ffmpeg', 'ffmpegT.exe');
      const ffmpegPath = app.isPackaged
        ? path.join(process.resourcesPath, 'ffmpeg', 'ffmpegT.exe')
        : path.join(__dirname, 'ffmpeg', 'ffmpegT.exe');
        
      const args = [
        '-y',  // This flag tells FFmpeg to overwrite files without asking
        '-i', inputPath,
        '-filter_complex',
        "[0:v]scale=-2:1920,crop=1080:1920:(in_w-1080)/2:0,boxblur=20:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2",
        '-c:a', 'copy',
        outputPath
      ];

      const ffmpeg = spawn(ffmpegPath, args);
      
      // Track processing progress
      let duration = 0;
      let progressTime = 0;

      ffmpeg.stderr.on('data', data => {
        const output = data.toString();
        console.log(output);
        
        // Try to extract duration
        if (!duration) {
          const durationMatch = output.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
          if (durationMatch) {
            const hours = parseInt(durationMatch[1]);
            const minutes = parseInt(durationMatch[2]);
            const seconds = parseInt(durationMatch[3]);
            duration = hours * 3600 + minutes * 60 + seconds;
          }
        }
        
        // Try to extract current time
        const timeMatch = output.match(/time=(\d+):(\d+):(\d+)\.(\d+)/);
        if (timeMatch && duration) {
          const hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const seconds = parseInt(timeMatch[3]);
          progressTime = hours * 3600 + minutes * 60 + seconds;
          
          const percent = Math.round((progressTime / duration) * 100);
          event.sender.send('progress-update', { percent });
        }
      });

      ffmpeg.on('exit', code => {
        if (code === 0) resolve('Done');
        else reject('FFmpeg failed with code ' + code);
      });
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

