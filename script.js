// --- CONFIGURATION ---
const VISUALIZER_COLORS = {
  // Color of the outer glow effect
  glow: 'rgba(255, 255, 255, 1)',

  // Define gradient colors from the inside (near avatar) to the outside (bar tips)
  // You can use as many colors as you like.
  gradient: [
    'rgba(5, 5, 5, 1.000)',    // Inner color
    'rgba(255, 255, 255, 1)',   // Middle color
    'rgba(255, 255, 255, 1)'     // Outer color
  ]
};

// === Elements ===
const audio = document.getElementById('bg-audio');
const video = document.getElementById('bg-video');
const splashScreen = document.getElementById('splash-screen');
const audioVisualizerCanvas = document.getElementById('audio-visualizer');
const avatar = document.querySelector('.avatar');
const profileCol = document.querySelector('.profile-col');
const musicPlayer = document.getElementById('music-player'); // Music Player element
const songTitleEl = musicPlayer.querySelector('.song-title');
const songArtistEl = musicPlayer.querySelector('.song-artist');
const albumArtImg = musicPlayer.querySelector('#album-art-img'); // New: Album Art Image element
const playPauseBtn = document.getElementById('play-pause-btn'); // Play/Pause button
const playIcon = playPauseBtn.querySelector('.play-icon'); // Play icon
const pauseIcon = playPauseBtn.querySelector('.pause-icon'); // Pause icon
const prevBtn = document.getElementById('prev-btn'); // Previous button
const nextBtn = document.getElementById('next-btn'); // Next button
const newVolumeSlider = document.querySelector('.volume-slider-new .level'); // New: New volume slider input
const newVolumeIcon = document.querySelector('.volume-slider-new .volume'); // New: New volume SVG icon

// === UPDATED: Playlist now points to local files ===
// To add more songs:
// 1. Add your .mp3 file to the `assets/musics/` folder.
// 2. Add a new object to this array with the title, artist, fileName, and albumArt (image filename in assets/icons/).
const playlist = [
    {
        title: 'Headlock',
        artist: 'Imogen Heap',
        fileName: 'headlock.mp3', // Original music file
        albumArt: 'headlock.png' // Assuming you have headlock.jpg in assets/icons/
    },
    {
        title: 'Government Hooker',
        artist: 'Lady Gaga',
        fileName: 'government.mp3', // Assuming you name the file this
        albumArt: 'government.jpg' // Assuming you have government.jpg in assets/icons/
    },
    {
        title: 'CtrlAltDelete',
        artist: 'BONES',
        fileName: 'ctrlaltdel.mp3', // Assuming you name the file this
        albumArt: 'ctrlaltdel.jpg' // Assuming you have ctrlaltdel.jpg in assets/icons/
    }
];
let currentSongIndex = 0;


// === State ===
let isMuted = true;
let audioContext;
let analyser;
let lastVolume = 0.1; // Retain last volume for mute/unmute
let prevAmplitudes;
let animationFrameId; // To control the visualizer animation loop
let isPlaying = false; // Music player play state

// === Music Player Drag State ===
// isDragging and dragOffsetX, dragOffsetY are kept for consistency but no longer used for dragging functionality.
let isDragging = false;
let dragOffsetX, dragOffsetY;

// === Initial Volume and Icon Setup ===
const initialVolume = 0.1;
audio.volume = initialVolume;
newVolumeSlider.value = initialVolume; // Set new slider's initial value
audio.muted = true;

// === Music Player Logic ===
function loadSong(songIndex) {
    const song = playlist[songIndex];
    songTitleEl.textContent = song.title;
    songArtistEl.textContent = song.artist;
    // UPDATED: Set the audio source to the correct local file path
    audio.src = `assets/musics/${song.fileName}`;
    // NEW: Set the album art image source
    albumArtImg.src = `assets/icons/${song.albumArt}`;
    albumArtImg.style.display = 'block'; // Ensure the image is visible
    currentSongIndex = songIndex;

    // If a song is playing, load and play the new one
    if (isPlaying) {
        audio.play().catch(err => console.warn("Audio play blocked:", err));
    }
}

function nextSong() {
    let newIndex = currentSongIndex + 1;
    if (newIndex >= playlist.length) {
        newIndex = 0; // Loop back to the start
    }
    loadSong(newIndex);
}

function prevSong() {
    let newIndex = currentSongIndex - 1;
    if (newIndex < 0) {
        newIndex = playlist.length - 1; // Loop to the end
    }
    loadSong(newIndex);
}


// === Update icon based on volume ===
function updateVolumeIcon() {
  if (isMuted || audio.volume === 0) {
    // Icon state is handled by SVG/CSS
  } else {
    // Icon state is handled by SVG/CSS
  }
}

// === Audio Visualizer Logic (Using configurable colors) ===
function setupAudioVisualizer() {
  if (!audioContext) {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 128;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        prevAmplitudes = new Array(bufferLength).fill(0);
        const visualizerCtx = audioVisualizerCanvas.getContext('2d');

        function drawVisualizer() {
          animationFrameId = requestAnimationFrame(drawVisualizer);

          analyser.getByteFrequencyData(dataArray);
          visualizerCtx.clearRect(0, 0, audioVisualizerCanvas.width, audioVisualizerCanvas.height);

          const centerX = audioVisualizerCanvas.width / 2;
          const centerY = audioVisualizerCanvas.height / 2;
          const avatarSize = avatar.offsetWidth;
          const baseRadius = (avatarSize / 2) + 20;
          const maxAmplitude = avatarSize * 0.40;

          const gradient = visualizerCtx.createRadialGradient(
            centerX, centerY, baseRadius * 0.8,
            centerX, centerY, baseRadius + maxAmplitude
          );
          VISUALIZER_COLORS.gradient.forEach((color, index) => {
            const position = index / (VISUALIZER_COLORS.gradient.length - 1);
            gradient.addColorStop(position, color);
          });

          visualizerCtx.strokeStyle = gradient;
          visualizerCtx.lineWidth = 4;
          visualizerCtx.lineCap = 'round';
          visualizerCtx.shadowColor = VISUALIZER_COLORS.glow;
          visualizerCtx.shadowBlur = 12;

          for (let i = 0; i < bufferLength; i++) {
            const dataIndex = i < bufferLength / 2 ? i : bufferLength - i;
            const targetLength = (dataArray[dataIndex] / 255) * maxAmplitude;
            const smoothedLength = prevAmplitudes[i] * 0.85 + targetLength * 0.15;
            prevAmplitudes[i] = smoothedLength;

            if (smoothedLength < 1) continue;

            const angle = (i / bufferLength) * Math.PI * 2 - (Math.PI / 2);

            const x1 = centerX + Math.cos(angle) * baseRadius;
            const y1 = centerY + Math.sin(angle) * baseRadius;
            const x2 = centerX + Math.cos(angle) * (baseRadius + smoothedLength);
            const y2 = centerY + Math.sin(angle) * (baseRadius + smoothedLength);

            visualizerCtx.beginPath();
            visualizerCtx.moveTo(x1, y1);
            visualizerCtx.lineTo(x2, y2);
            visualizerCtx.stroke();
          }
        }

        drawVisualizer();
        updateVisualizerPosition();
    } catch (e) {
        console.error("Could not create AudioContext. Visualizer disabled.", e);
    }
  }
}

function updateVisualizerPosition() {
    const size = avatar.offsetWidth * 2.4;
    audioVisualizerCanvas.width = size;
    audioVisualizerCanvas.height = size;
    const avatarRect = avatar.getBoundingClientRect();
    const profileRect = profileCol.getBoundingClientRect();
    audioVisualizerCanvas.style.left = `${(avatarRect.left + avatarRect.width / 2) - profileRect.left}px`;
    audioVisualizerCanvas.style.top = `${(avatarRect.top + avatarRect.height / 2) - profileRect.top}px`;
    audioVisualizerCanvas.style.transform = 'translate(-50%, -50%)';
}

function fadeOutVisualizer() {
  audioVisualizerCanvas.style.opacity = '0';
}

function fadeInVisualizer() {
  audioVisualizerCanvas.style.opacity = '1';
}

// === Enter Site Logic ===
splashScreen.addEventListener('click', () => {
  splashScreen.classList.add('hidden');
  video.play().catch(err => console.warn("Video play failed:", err));

  setTimeout(() => {
    isMuted = false;
    audio.muted = false;
    updateVolumeIcon();
    setupAudioVisualizer();
    fadeInVisualizer();
    togglePlayPause();
  }, 800);

}, { once: true });


// === New Volume Slider Input ===
newVolumeSlider.addEventListener('input', () => {
  const vol = parseFloat(newVolumeSlider.value);
  audio.volume = vol;
  isMuted = vol === 0;
  audio.muted = isMuted;

  if (vol > 0 && audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
    fadeInVisualizer();
  } else if (vol === 0 && audioContext && audioContext.state === 'running') {
    fadeOutVisualizer();
  }
  updateVolumeIcon();
});


// === Ripple Effect for Socials ===
document.querySelectorAll('.socials a').forEach((btn) => {
  btn.addEventListener('pointerdown', (e) => {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(btn.clientWidth, btn.clientHeight);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.offsetX - size / 2}px`;
    ripple.style.top = `${e.offsetY - size / 2}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
});

// === Custom Cursor Logic (Disabled on phone devices) ===
// Only enable custom cursor logic if the screen width is greater than 900px
if (window.innerWidth > 900) {
  document.addEventListener('mousemove', (e) => {
    document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
  });
}


// === Particle Effect ===
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particlesArray;

function setCanvasSize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
setCanvasSize();

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2.5 + 1;
    this.speed = Math.random() * 1.5 + 0.5;
    this.opacity = Math.random() * 0.6 + 0.2;
  }
  update() {
    this.y += this.speed;
    if (this.y > canvas.height + this.size) {
      this.y = 0 - this.size;
      this.x = Math.random() * canvas.width;
    }
  }
  draw() {
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initParticles() {
  particlesArray = [];
  const numberOfParticles = window.innerWidth < 900 ? 100 : 200;
  for (let i = 0; i < numberOfParticles; i++) {
    particlesArray.push(new Particle());
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < particlesArray.length; i++) {
    particlesArray[i].update();
    particlesArray[i].draw();
  }
  requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        setCanvasSize();
        initParticles();
        updateVisualizerPosition();
        // Re-evaluate custom cursor on resize
        if (window.innerWidth > 900) {
          document.addEventListener('mousemove', (e) => {
            document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
            document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
          });
        } else {
          document.removeEventListener('mousemove', (e) => {
            document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
            document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
          });
        }
    }, 150);
});


// === Music Player Drag Functionality ===
// The following event listeners are commented out to disable dragging.
/*
musicPlayer.addEventListener('mousedown', (e) => {
  if (e.target.closest('button') || e.target.closest('.volume-slider-new')) {
    return;
  }
  isDragging = true;
  musicPlayer.classList.add('dragging');
  dragOffsetX = e.clientX - musicPlayer.getBoundingClientRect().left;
  dragOffsetY = e.clientY - musicPlayer.getBoundingClientRect().top;
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;

  let newX = e.clientX - dragOffsetX;
  let newY = e.clientY - dragOffsetY;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  newX = Math.max(0, Math.min(newX, viewportWidth - musicPlayer.offsetWidth));
  newY = Math.max(0, Math.min(newY, viewportHeight - musicPlayer.offsetHeight));

  musicPlayer.style.left = `${newX}px`;
  musicPlayer.style.top = `${newY}px`;
  musicPlayer.style.transform = 'none';
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  musicPlayer.classList.remove('dragging');
});
*/

// === Music Player Controls ===
function togglePlayPause() {
  if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
  }

  if (audio.paused || audio.ended) {
    audio.play().catch(err => console.warn("Audio play blocked:", err));
    isPlaying = true;
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
    fadeInVisualizer();
  } else {
    audio.pause();
    isPlaying = false;
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    fadeOutVisualizer();
  }
}

playPauseBtn.addEventListener('click', togglePlayPause);
prevBtn.addEventListener('click', prevSong);
nextBtn.addEventListener('click', nextSong);


// === Initial Setup on Load ===
function initialize() {
    // Select a random song on initial load
    const randomIndex = Math.floor(Math.random() * playlist.length);
    loadSong(randomIndex);

    // Set initial icon state
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
    isPlaying = false;
    updateVolumeIcon();

    // Initialize VanillaTilt on the music player
    // Ensure this runs after the DOM is fully loaded
    if (musicPlayer) {
        VanillaTilt.init(musicPlayer, {
            max: 10,
            speed: 400,
            perspective: 1000,
            'mouse-event-element': '.container' // Apply tilt effect when mouse is over the container
        });
    }
}

initialize();
