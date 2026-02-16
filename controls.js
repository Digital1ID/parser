const video = document.getElementById("video");
const playPauseBtn = document.getElementById("playPauseBtn");
const rewindBtn = document.getElementById("rewindBtn");
const forwardBtn = document.getElementById("forwardBtn");
const seekBar = document.getElementById("seekBar");
const timeDisplay = document.getElementById("timeDisplay");
const volumeBtn = document.getElementById("volumeBtn");
const volumeMenu = document.querySelector(".volume-menu");
const volumeSelector = document.getElementById("volumeSelector");
const speedSelector = document.getElementById("speedSelector");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const settingsBtn = document.getElementById("settingsBtn");
const settingsMenu = document.querySelector(".settings-menu");
const controls = document.getElementById("customControls");
const videoOverlay = document.getElementById("videoOverlay");

// ▶⏸ Play/Pause
playPauseBtn.onclick = () => {
  if (video.paused) {
    video.play();
    videoOverlay.style.display = "none";
  } else {
    video.pause();
    videoOverlay.style.display = "flex";
  }
};

// ⏪ Rewind 10s
rewindBtn.onclick = () => {
  video.currentTime = Math.max(0, video.currentTime - 10);
  videoOverlay.style.display = "none";
};

// ⏩ Forward 10s
forwardBtn.onclick = () => {
  video.currentTime = Math.min(video.duration, video.currentTime + 10);
  videoOverlay.style.display = "none";
};

// 🎬 Overlay toggle
video.addEventListener("play", () => videoOverlay.style.display = "none");
video.addEventListener("pause", () => videoOverlay.style.display = "flex");

// ⏱ Format time
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// ⏩ Update seek bar and time
video.addEventListener("timeupdate", () => {
  if (video.duration) {
    seekBar.value = (video.currentTime / video.duration) * 100;
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  }
});

// ⏩ Seek when user drags
seekBar.oninput = () => {
  if (video.duration) {
    video.currentTime = (seekBar.value / 100) * video.duration;
  }
};

// 🔊 Volume dropdown
volumeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  volumeMenu.style.display = volumeMenu.style.display === "flex" ? "none" : "flex";
});
volumeSelector.addEventListener("change", () => {
  video.volume = parseFloat(volumeSelector.value);
});

// ⚙️ Speed
if (speedSelector) {
  speedSelector.onchange = () => {
    video.playbackRate = parseFloat(speedSelector.value);
  };
}

// ⛶ Fullscreen
fullscreenBtn.onclick = () => {
  if (!document.fullscreenElement) {
    video.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

// ⚙️ Settings dropdown
settingsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  settingsMenu.style.display = settingsMenu.style.display === "flex" ? "none" : "flex";
});

// ปิดเมนูเมื่อคลิกนอก
document.addEventListener("click", (e) => {
  if (!volumeBtn.contains(e.target) && !volumeMenu.contains(e.target)) {
    volumeMenu.style.display = "none";
  }
  if (!settingsBtn.contains(e.target) && !settingsMenu.contains(e.target)) {
    settingsMenu.style.display = "none";
  }
});
settingsMenu.addEventListener("click", (e) => e.stopPropagation());

// 🎬 Auto-hide controls
let hideTimeout;
function showControls() {
  controls.classList.remove("hidden");
  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    const volumeOpen = volumeMenu.style.display === "flex";
    const settingsOpen = settingsMenu.style.display === "flex";
    if (!video.paused && !volumeOpen && !settingsOpen) {
      controls.classList.add("hidden");
    }
  }, 3000);
}
document.addEventListener("mousemove", showControls);
document.addEventListener("touchstart", showControls);
video.addEventListener("play", showControls);
video.addEventListener("pause", showControls);

// Init time display
video.addEventListener("loadedmetadata", () => {
  timeDisplay.textContent = `00:00 / ${formatTime(video.duration)}`;
  playPauseBtn.textContent = video.paused ? "▶" : "⏸";
});

// 📱 Double-tap gesture
let lastTap = 0;
video.addEventListener("touchend", (e) => {
  const currentTime = new Date().getTime();
  const tapInterval = currentTime - lastTap;
  if (tapInterval < 300 && tapInterval > 0) {
    const touchX = e.changedTouches[0].clientX;
    const screenWidth = window.innerWidth;
    if (touchX < screenWidth / 2) {
      video.currentTime = Math.max(0, video.currentTime - 10);
    } else {
      video.currentTime = Math.min(video.duration, video.currentTime + 10);
    }
  }
  lastTap = currentTime;
});

// 🎯 ปรับ icon play/pause ให้เป็น SVG
video.addEventListener("play", () => {
  playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24"><path fill="white" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
});
video.addEventListener("pause", () => {
  playPauseBtn.innerHTML = `<svg viewBox="0 0 24 24"><path fill="white" d="M8 5v14l11-7z"/></svg>`;
});
