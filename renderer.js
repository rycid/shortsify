const selectBtn = document.getElementById('select');
const processBtn = document.getElementById('process');
const statusEl = document.getElementById('status');
const fileDisplayEl = document.getElementById('file-display');
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
    
    // can actually process now
    processBtn.disabled = false;
    
    statusEl.innerText = 'Ready to process';
  }
});

document.getElementById('process').addEventListener('click', async () => {
  if (!window.selectedVideo) return alert('No video selected.');
  
  const outputPath = window.selectedVideo.replace(/\.(\w+)$/, '_tiktokified.mp4');
  
  const fileExists = await window.electronAPI.checkFileExists(outputPath);
  
  // some overwrite confirmation
  if (fileExists) {
    const confirmOverwrite = await window.electronAPI.showConfirmDialog({
      title: 'File Already Exists',
      message: `The file "${getFileName(outputPath)}" already exists. Would you like to overwrite it?`
    });
    
    if (!confirmOverwrite) {
      statusEl.innerText = 'Processing cancelled';
      return;
    }
  }
  
  // disable the btns while processing
  selectBtn.disabled = true;
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
    await window.electronAPI.processVideo(window.selectedVideo, outputPath);
    progressBar.style.width = '100%';
    statusEl.innerHTML = `
      <span style="color: #00a854">✓ Processing complete!</span><br>
      Saved to: ${getFileName(outputPath)}<br>
      <small>${outputPath}</small>
    `;
  } catch (err) {
    statusEl.innerHTML = `<span style="color: #ff4d4f">✗ Error: ${err}</span>`;
  } finally {
    
    // we can enable the btns again
    selectBtn.disabled = false;
    processBtn.disabled = false;
  }
});