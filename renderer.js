async function start() {
  const source = await window.electronAPI.getScreenStream();
  const sourceId = source.id;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
          minWidth: 800,
          maxWidth: 1920,
          minHeight: 600,
          maxHeight: 1080
        }
      }
    });

    const video = document.querySelector("video");
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.play().catch(err => console.error("Video play error:", err));
    };

  } catch (err) {
    console.error("Error capturing screen:", err);
  }
}

// Drag and drop for preview
const preview = document.getElementById('preview');
let isDragging = false, offsetX = 0, offsetY = 0;

preview.addEventListener('mousedown', (e) => {
  isDragging = true;
  offsetX = e.clientX - preview.offsetLeft;
  offsetY = e.clientY - preview.offsetTop;
  preview.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  preview.style.left = (e.clientX - offsetX) + 'px';
  preview.style.top = (e.clientY - offsetY) + 'px';
  preview.style.right = 'auto';
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  preview.style.cursor = 'grab';
});

// Tell main process to ignore mouse events except preview & chat
window.addEventListener('DOMContentLoaded', () => {
  window.electronAPI?.setOverlayRegions?.([
    preview,
    document.getElementById('chat-btn')
  ]);
});

start();
