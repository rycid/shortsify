const selectBtn = document.getElementById('select');
const selectOutputBtn = document.getElementById('select-output');
const processBtn = document.getElementById('process');
const cancelBtn = document.getElementById('cancel-btn');
const statusEl = document.getElementById('status');
const fileDisplayEl = document.getElementById('file-display');
const outputDisplayEl = document.getElementById('output-display');
const progressContainer = document.querySelector('.progress-container');
const progressBar = document.getElementById('progress-bar');

function getFileName(path) {
  return path.replace(/^.*[\\\/]/, '');
}

document.getElementById('select').addEventListener('click', async () => {
  const filePath = await window.electronAPI.selectVideo();
  
  if (filePath) {
    window.selectedVideo = filePath;
    
    // file info
    fileDisplayEl.style.display = 'block';
    fileDisplayEl.innerHTML = `
      <strong>Selected File:</strong> ${getFileName(filePath)}<br>
      <small>${filePath}</small>
    `;
      // default output path, but we keep the og file extension
    const fileExtension = filePath.match(/\.(\w+)$/);
    const extension = fileExtension ? fileExtension[0] : '.mp4';
    const defaultOutputPath = filePath.replace(/\.\w+$/, `_shortsify${extension}`);
    window.selectedOutput = defaultOutputPath;
    
    selectOutputBtn.disabled = false;
    
    outputDisplayEl.style.display = 'block';
    outputDisplayEl.innerHTML = `
      <strong>Output File:</strong> ${getFileName(defaultOutputPath)}<br>
      <small class="file-path" data-path="${defaultOutputPath}">${defaultOutputPath}</small>
    `;
    
    // Make output path clickable
    outputDisplayEl.querySelector('.file-path').addEventListener('click', (e) => {
      const filePath = e.target.getAttribute('data-path');
      if (filePath) {
        window.electronAPI.openFileLocation(filePath);
      }
    });
    
    // can actually process now
    processBtn.disabled = false;
    
    statusEl.innerText = 'Ready to process';
  }
});

cancelBtn.addEventListener('click', async () => {
  try {
    statusEl.innerText = 'Cancelling...';
    const result = await window.electronAPI.cancelProcessing();
    
    if (result.success) {
      progressBar.style.width = '0%';
      statusEl.innerHTML = '<span style="color: #ff4d4f">Processing cancelled</span>';
      
      selectBtn.disabled = false;
      selectOutputBtn.disabled = false;
      processBtn.disabled = false;
    } else {
      statusEl.innerText = 'Failed to cancel: ' + (result.error || 'Unknown error');
    }
  } catch (err) {
    console.error('Error while cancelling:', err);
    statusEl.innerText = 'Error while cancelling: ' + err;
  }
});

document.getElementById('select-output').addEventListener('click', async () => {
  if (!window.selectedVideo) return;

  const fileExtension = window.selectedVideo.match(/\.(\w+)$/);
  const extension = fileExtension ? fileExtension[0] : '.mp4';
  const defaultOutputPath = window.selectedVideo.replace(/\.\w+$/, `_shortsify${extension}`);
  const outputPath = await window.electronAPI.selectOutputPath(defaultOutputPath);
  
  if (outputPath) {
    window.selectedOutput = outputPath;
    
    outputDisplayEl.style.display = 'block';
    outputDisplayEl.innerHTML = `
      <strong>Output File:</strong> ${getFileName(outputPath)}<br>
      <small class="file-path" data-path="${outputPath}">${outputPath}</small>
    `;
    
    // Make output path clickable
    outputDisplayEl.querySelector('.file-path').addEventListener('click', (e) => {
      const filePath = e.target.getAttribute('data-path');
      if (filePath) {
        window.electronAPI.openFileLocation(filePath);
      }
    });
    
    statusEl.innerText = 'Ready to process';
  }
});

document.getElementById('process').addEventListener('click', async () => {
  if (!window.selectedVideo) return alert('No video selected.');
  const speedSetting = document.getElementById('process-speed').value;

  // no custom output? we make one with the og extension
  let outputPath = window.selectedOutput;
  if (!outputPath) {
    const fileExtension = window.selectedVideo.match(/\.(\w+)$/);
    const extension = fileExtension ? fileExtension[0] : '.mp4';
    outputPath = window.selectedVideo.replace(/\.\w+$/, `_shortsify${extension}`);
  }

  const fileExists = await window.electronAPI.checkFileExists(outputPath);
  
  // some overwrite confirmation
  if (fileExists) {
    const confirmOverwrite = await window.electronAPI.showConfirmDialog({
      title: 'File Already Exists',
      message: `The file "${getFileName(outputPath)}" already exists at the location. Would you like to overwrite it?`
    });
    
    if (!confirmOverwrite) {
      statusEl.innerText = 'Processing cancelled';
      return;
    }
  }
  
  // disable the btns while processing
  selectBtn.disabled = true;
  selectOutputBtn.disabled = true;
  processBtn.disabled = true;
  
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  
  statusEl.innerText = 'Processing video...';
  
  // listening for progress updates
  window.electronAPI.onProgressUpdate((event, { percent }) => {
    progressBar.style.width = `${percent}%`;
    statusEl.innerText = `Processing: ${percent}% complete`;
  });
  
  try {
    await window.electronAPI.processVideo(window.selectedVideo, outputPath, speedSetting);
    progressBar.style.width = '100%';
    statusEl.innerHTML = `
      <span style="color: #00a854">✓ Processing complete!</span><br>
      Saved to: <small class="file-path" data-path="${outputPath}">${outputPath}</small>
    `;
    
    statusEl.querySelector('.file-path').addEventListener('click', (e) => {
      const filePath = e.target.getAttribute('data-path');
      if (filePath) {
        window.electronAPI.openFileLocation(filePath);
      }
    });
  } catch (err) {
    statusEl.innerHTML = `<span style="color: #ff4d4f">✗ Error: ${err}</span>`;
  } finally {
    // we can enable the btns again
    selectBtn.disabled = false;
    selectOutputBtn.disabled = false;
    processBtn.disabled = false;
    
    setTimeout(() => {
      if (!statusEl.innerText.includes('Processing:')) {
        progressContainer.style.display = 'none';
      }
    }, 1500);
  }
});