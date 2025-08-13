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

// Dragging
const container = document.getElementById('interactive-container');
let isDragging = false, offsetX = 0, offsetY = 0;

container.addEventListener('mousedown', (e) => {
  isDragging = true;
  const rect = container.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
  container.style.cursor = 'grabbing';
  e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  container.style.left = (e.clientX - offsetX) + 'px';
  container.style.top = (e.clientY - offsetY) + 'px';
  container.style.right = 'auto';
});

window.addEventListener('mouseup', () => {
  isDragging = false;
  container.style.cursor = 'default';
});

// Enable/disable click-through
container.addEventListener('mouseenter', () => {
  window.electronAPI.setClickable(true);
});

container.addEventListener('mouseleave', () => {
  window.electronAPI.setClickable(false);
});

// Chat send logic
const sendBtn = document.getElementById('send-btn');
const chatInput = document.getElementById('chat-input');

sendBtn.addEventListener('click', () => {
  if (chatInput.value.trim()) {
    console.log("Message sent:", chatInput.value);
    chatInput.value = '';
  }
});

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendBtn.click();
  }
});

start();
