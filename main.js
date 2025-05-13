const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// to track the ffmpeg process
let activeFFmpegProcess = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 700,
    minWidth: 300,
    minHeight: 600,
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

function getEncoderSettings() {
  // simple check for hw acceleration. need to improve this
  try {
    // nvidia 
    const nvidia = require('child_process').execSync('nvidia-smi').toString();
    return {
      hwaccel: 'cuda',
      vcodec: 'h264_nvenc',
      preset: 'fast' 
    };
  } catch (e) {
    try {
      // amd
      const amd = require('child_process').execSync('clinfo').toString();
      return {
        hwaccel: 'amf',
        vcodec: 'h264_amf',
        preset: 'speed'
      };
    } catch (e) {

      return {
        hwaccel: '',
        vcodec: 'libx264',
        preset: 'veryfast' // either ultrafast, superfast, veryfast, faster, fast
      };
    }
  }
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
    ipcMain.handle('select-output-path', async (event, defaultFileName) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultFileName,
      filters: [
        { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'flv', '3gp', 'ogv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    return result.canceled ? null : result.filePath;
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
    return result.response === 0; // true if "Yes" was clicked
  });
  
  ipcMain.handle('open-file-location', async (event, filePath) => {
    try {
      // If the file doesn't exist yet, show the directory
      const fs = require('fs');
      const dirPath = path.dirname(filePath);
      
      if (fs.existsSync(dirPath)) {
        await shell.showItemInFolder(filePath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to open file location:', err);
      return false;
    }
  });
  
  ipcMain.handle('cancel-processing', async () => {
    if (activeFFmpegProcess) {
      try {
        // for windows, gotta kill the process forcefully; should probably improve this
        const { exec } = require('child_process');
        
        const pid = activeFFmpegProcess.pid;
        
        exec(`taskkill /pid ${pid} /T /F`);
        
        activeFFmpegProcess = null;
        return { success: true };
      } catch (err) {
        console.error('Failed to cancel processing:', err);
        return { success: false, error: err.message };
      }
    } else {
      return { success: false, error: 'No active process' };
    }
  });
  
  ipcMain.handle('process-video', async (event, inputPath, outputPath, speedSetting) => {
    return new Promise((resolve, reject) => {
    //   const ffmpegPath = path.join(__dirname, 'ffmpeg', 'ffmpegT.exe');
      const ffmpegPath = app.isPackaged
        ? path.join(process.resourcesPath, 'ffmpeg', 'ffmpegT.exe')
        : path.join(__dirname, 'ffmpeg', 'ffmpegT.exe');

      let preset = 'medium'; // something balanced
      if (speedSetting === 'speed') preset = 'ultrafast';
      if (speedSetting === 'quality') preset = 'slow';

      const complexFilter = speedSetting === 'speed' 
  ? "[0:v]scale=-2:960,format=yuv420p,crop=540:960:(in_w-540)/2:0,boxblur=10:2[bg];[0:v]scale=540:-2,format=yuv420p[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p,scale=1080:1920"
  : "[0:v]scale=-2:1920,format=yuv420p,crop=1080:1920:(in_w-1080)/2:0,boxblur=20:5[bg];[0:v]scale=1080:-2,format=yuv420p[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p";
        
      const encoderSettings = getEncoderSettings();

      const args = [
        '-y'  // overwrite files without asking again
      ]

      if (encoderSettings.hwaccel) {
        args.push('-hwaccel', encoderSettings.hwaccel);
      }

      args.push(
        '-threads', '0',
        '-i', inputPath,
        '-filter_complex',
        complexFilter,
        '-c:v', encoderSettings.vcodec,
        '-preset', encoderSettings.preset,
        '-c:a', 'copy',
        outputPath
      );

      const ffmpeg = spawn(ffmpegPath, args);
      
      activeFFmpegProcess = ffmpeg;
      
      // processing progress
      let duration = 0;
      let progressTime = 0;

      ffmpeg.stderr.on('data', data => {
        const output = data.toString();
        console.log(output);
        
        // get the duration
        if (!duration) {
          const durationMatch = output.match(/Duration: (\d+):(\d+):(\d+)\.(\d+)/);
          if (durationMatch) {
            const hours = parseInt(durationMatch[1]);
            const minutes = parseInt(durationMatch[2]);
            const seconds = parseInt(durationMatch[3]);
            duration = hours * 3600 + minutes * 60 + seconds;
          }
        }
        
        // get current time
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
        activeFFmpegProcess = null;
        
        if (code === 0) resolve('Done');
        else if (code === null || code === 255) {
          reject('Processing cancelled');
        } 
        else reject('FFmpeg failed with code ' + code);
      });
      
      ffmpeg.on('error', err => {
        activeFFmpegProcess = null;        
        reject('FFmpeg error: ' + err.message);
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

