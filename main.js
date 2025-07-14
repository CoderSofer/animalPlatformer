// Cute Animal Platformer - main.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game Objects ---
class Platform {
  constructor(x, y, width = 100, height = 16) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  draw() {
    ctx.fillStyle = '#ffe082';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, this.width, this.height);
  }
}
class Player {
  constructor() {
    this.x = 100;
    this.y = 500;
    this.vx = 0;
    this.vy = 0;
    this.width = 40;
    this.height = 40;
    this.onGround = false;
    this.color = '#ffb6b9';
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#fff';
    ctx.fillRect(10, 10, 8, 8); // cute face
    ctx.fillRect(22, 10, 8, 8);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.6; // gravity
    if (this.y + this.height >= 560) {
      this.y = 560 - this.height;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
  }
}

class Animal {
  constructor(x, y, type, color, shiny = false) {
    this.x = x;
    this.y = y;
    this.size = 32;
    this.type = type;
    this.color = color;
    this.collected = false;
    this.showBubble = false;
    this.bubbleTimer = 0;
    this.shiny = shiny;
    this.pulse = 0;
  }
  draw() {
    if (this.collected) return;
    ctx.save();
    // Shiny effect
    if (this.shiny) {
      this.pulse += 0.15;
      ctx.shadowColor = '#fffde4';
      ctx.shadowBlur = 18 + 8 * Math.sin(this.pulse);
    }
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.size/2, this.size/2, this.size/2, 0, 2 * Math.PI);
    ctx.fill();
    if (this.shiny) {
      ctx.strokeStyle = '#fffde4';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '16px Comic Sans MS';
    ctx.textAlign = 'center';
    ctx.fillText(this.type, this.size/2, this.size/2 + 6);
    // Draw text bubble if needed
    if (this.showBubble) {
      const bubbleW = 110, bubbleH = 36;
      const bx = this.size/2 - bubbleW/2;
      const by = -bubbleH - 10;
      // Bubble
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#fffbe7';
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bx, by, bubbleW, bubbleH, 12);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Text
      ctx.fillStyle = '#ff8c42';
      ctx.font = 'bold 16px Comic Sans MS';
      ctx.textAlign = 'center';
      if (this.shiny) {
        ctx.fillText('NOM NOM NOM', this.size/2, by + 24);
      } else {
        ctx.fillText(`You found a ${this.type}!`, this.size/2, by + 24);
      }
      ctx.restore();
    }
    ctx.restore();
  }
  update() {
    if (this.showBubble) {
      this.bubbleTimer--;
      if (this.bubbleTimer <= 0) {
        this.showBubble = false;
        this.collected = true;
      }
    }
  }
}
// --- Particle Trail ---
let particles = [];
function spawnParticle(x, y, color) {
  particles.push({ x, y, vx: (Math.random()-0.5)*2, vy: -1-Math.random()*1.5, alpha: 1, color });
}
function updateParticles() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.03;
  });
  particles = particles.filter(p => p.alpha > 0);
}
function drawParticles() {
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - cameraX, p.y, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  });
}

// --- Floating Platforms ---
let platforms = [new Platform(400, 420, 120, 16)];


let animals = [
  new Animal(300, 520, 'Cat', '#ffd166'),
  new Animal(500, 520, 'Dog', '#a3cef1'),
  new Animal(650, 520, 'Bun', '#ffb4a2'),
];

let groundSegments = [{ x: 0, width: 800 }];
let worldEnd = 800;
let cameraX = 0;
const GROUND_Y = 560;
const GROUND_HEIGHT = 40;
const SEGMENT_LENGTH = 800;
const ANIMAL_TYPES = [
  ['Cat', '#ffd166'],
  ['Dog', '#a3cef1'],
  ['Bun', '#ffb4a2'],
  ['Fox', '#ffadad'],
  ['Pig', '#fbc3bc'],
  ['Owl', '#b5ead7'],
  ['Bee', '#fff700'],
  ['Bat', '#bdb2ff']
];

const player = new Player();
let keys = {};


// --- UI Elements ---
const infoBtn = document.getElementById('infoBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const popup = document.getElementById('popup');
const scoreboard = document.getElementById('scoreboard');
// --- Score Tracking ---
let score = {};
function resetScore() {
  score = {};
  ANIMAL_TYPES.forEach(([type]) => { score[type] = 0; });
}
resetScore();

function updateScoreboard() {
  let html = '';
  ANIMAL_TYPES.forEach(([type, color]) => {
    html += `<div class="score-row"><span style="display:inline-block;width:18px;height:18px;background:${color};border-radius:50%;margin-right:6px;"></span> <b>${type}</b>: ${score[type]}</div>`;
  });
  scoreboard.innerHTML = html;
}
updateScoreboard();

let paused = false;
let animationId = null;

// --- Info & Pause Popup Logic ---
function showPopup(html) {
  popup.innerHTML = `<div id="popupContent">${html}<br><button id="popupClose">Close</button></div>`;
  popup.style.display = 'flex';
  document.getElementById('popupClose').onclick = () => {
    closePopup();
    if (paused) resumeGame();
  };
}
function closePopup() {
  if (audioEnabled) {
    playTone(600, 0.1, 0.08);
  }
  popup.style.display = 'none';
}

infoBtn.onclick = () => {
  // Initialize audio on button click
  if (!audioEnabled) initAudio();
  playInfoButtonSound();
  showPopup('<b>How to Play</b><br>Use <b>arrow keys</b> to move, <b>space</b> to jump, <b>E</b> to collect animals!<br>Press <b>Pause</b> or <b>Esc</b> to pause.');
};

const jokes = [
  "Why did the cat sit on the computer? To keep an eye on the mouse! 🐭",
  "Keep going! The animals believe in you! 🐾",
  "Why did the bunny cross the road? To say hi to you! 🐰",
  "Don't paws now, you're doing great! 🐶",
  "What do you call a dog magician? A labracadabrador! 🐕‍🦺"
];


pauseBtn.onclick = () => {
  // Initialize audio on button click
  if (!audioEnabled) initAudio();
  playPauseButtonSound();
  pauseGame();
  const joke = jokes[Math.floor(Math.random() * jokes.length)];
  showPopup(`<b>Game Paused</b><br>${joke}<br><span style='font-size:0.9em;color:#888;'>(Press Space or Esc to resume)</span>`);
};

restartBtn.onclick = () => {
  // Initialize audio on button click
  if (!audioEnabled) initAudio();
  playRestartButtonSound();
  
  // Reset player
  player.x = 100;
  player.y = 500;
  player.vx = 0;
  player.vy = 0;
  // Reset world
  cameraX = 0;
  groundSegments = [{ x: 0, width: 800 }];
  worldEnd = 800;
  animals = [
    new Animal(300, 520, 'Cat', '#ffd166'),
    new Animal(500, 520, 'Dog', '#a3cef1'),
    new Animal(650, 520, 'Bun', '#ffb4a2'),
  ];
  resetScore();
  updateScoreboard();
};

function pauseGame() {
  paused = true;
  if (animationId) cancelAnimationFrame(animationId);
}
function resumeGame() {
  if (paused) {
    paused = false;
    gameLoop();
  }
}

// --- Input ---
document.addEventListener('keydown', e => {
  // Initialize audio on first keypress
  if (!audioEnabled) initAudio();
  
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Space"].includes(e.key)) {
    e.preventDefault();
  }
  keys[e.key] = true;

  // If popup is open (info or pause), close it and resume on Space or Escape
  if (popup.style.display === 'flex' && (e.key === ' ' || e.key === 'Escape')) {
    closePopup();
    resumeGame();
    return;
  }

  // If not paused, pressing Escape opens the pause menu
  if (!paused && e.key === 'Escape') {
    pauseGame();
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    showPopup(`<b>Game Paused</b><br>${joke}<br><span style='font-size:0.9em;color:#888;'>(Press Space or Esc to resume)</span>`);
    return;
  }
});
document.addEventListener('keyup', e => keys[e.key] = false);

// --- Sound Effects ---
let audioContext = null;
let audioEnabled = false;

// Initialize audio on first user interaction
function initAudio() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Resume audio context as some browsers suspend it by default
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      audioEnabled = true;
      console.log("Audio initialized successfully!");
    } catch (e) {
      console.error("Audio initialization failed:", e);
    }
  }
}

// Button click sounds
function playInfoButtonSound() {
  playTone(700, 0.1, 0.1);
  setTimeout(() => playTone(900, 0.1, 0.08), 100);
}

function playPauseButtonSound() {
  playTone(500, 0.15, 0.1);
  setTimeout(() => playTone(400, 0.1, 0.1), 150);
}

function playRestartButtonSound() {
  playTone(600, 0.05, 0.1);
  setTimeout(() => playTone(800, 0.05, 0.1), 50);
  setTimeout(() => playTone(1000, 0.05, 0.1), 100);
  setTimeout(() => playTone(800, 0.05, 0.1), 150);
}

function playTone(frequency, duration, volume = 0.1) {
  // Use window.audioContext from the start screen if available
  if (window.audioContext) {
    audioContext = window.audioContext;
    audioEnabled = true;
  }
  
  if (!audioEnabled || !audioContext) {
    console.log("Audio not enabled yet");
    return;
  }
  
  try {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
    
    console.log(`Playing tone: ${frequency}Hz`);
  } catch (e) {
    console.error("Error playing tone:", e);
  }
}

function playNomSound() {
  // Play a "nom nom" sound with multiple quick beeps
  playTone(800, 0.1, 0.15);
  setTimeout(() => playTone(900, 0.1, 0.15), 100);
  setTimeout(() => playTone(850, 0.15, 0.15), 200);
}

function playEatSound() {
  // Play a cute "pop" sound
  playTone(600, 0.2, 0.1);
}

// --- Game Loop ---
let ePressedLastFrame = false;

// Only start the game loop when the start button is clicked
// The HTML will handle calling this
if (!document.getElementById('startScreen')) {
  // If no start screen (old version), start game immediately
  gameLoop();
}
function gameLoop() {
  if (paused) return;
  // Update
  let baseSpeed = 2.5;
  if (player.speedBoost > 0) baseSpeed = 4.2;
  if (keys['ArrowLeft']) player.vx = -baseSpeed;
  else if (keys['ArrowRight']) player.vx = baseSpeed;
  else player.vx = 0;
  if ((keys[' '] || keys['ArrowUp']) && player.onGround) player.vy = -11;
  if (player.speedBoost > 0) player.speedBoost--;

  player.update();
  animals.forEach(animal => animal.update());

  // If player falls below the screen, reset world and player and score
  if (player.y > 700) {
    // Reset player
    player.x = 100;
    player.y = 500;
    player.vx = 0;
    player.vy = 0;
    // Reset world
    cameraX = 0;
    groundSegments = [{ x: 0, width: 800 }];
    worldEnd = 800;
    animals = [
      new Animal(300, 520, 'Cat', '#ffd166'),
      new Animal(500, 520, 'Dog', '#a3cef1'),
      new Animal(650, 520, 'Bun', '#ffb4a2'),
    ];
    platforms = [new Platform(400, 420, 120, 16)];
    resetScore();
    updateScoreboard();
  }

  // Infinite world generation
  if (player.x + player.width > worldEnd - 400) {
    // Add new ground segment
    groundSegments.push({ x: worldEnd, width: SEGMENT_LENGTH });
    // Add 1-2 new animals per segment
    for (let i = 0; i < 2; i++) {
      const [type, color] = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
      const ax = worldEnd + 100 + Math.random() * (SEGMENT_LENGTH - 200);
      animals.push(new Animal(ax, 520, type, color));
    }
    // Add a floating platform and a shiny animal on it every other segment
    if (Math.random() < 0.7) {
      const px = worldEnd + 200 + Math.random() * (SEGMENT_LENGTH - 400);
      const py = 420 + Math.random() * 30;
      platforms.push(new Platform(px, py, 120, 16));
      // Add a small step platform before the floating platform, a bit higher than before
      const stepX = px - 70;
      const stepY = GROUND_Y - 40;
      platforms.push(new Platform(stepX, stepY, 60, 12));
      // Place a shiny animal on the platform
      const [type, color] = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
      animals.push(new Animal(px + 44, py - 32, type, color, true));
    }
    worldEnd += SEGMENT_LENGTH;
  }

  // Camera follows player
  // Camera always keeps player visible
  let targetCameraX = player.x - 200;
  if (targetCameraX < 0) targetCameraX = 0;
  cameraX += (targetCameraX - cameraX) * 0.85;
  if (cameraX < 0) cameraX = 0;

  // --- Platform collision ---
  let onPlatform = false;
  platforms.forEach(p => {
    // Simple AABB collision, only check if falling
    if (
      player.vy >= 0 &&
      player.x + player.width > p.x && player.x < p.x + p.width &&
      player.y + player.height <= p.y + 8 && player.y + player.height + player.vy >= p.y
    ) {
      player.y = p.y - player.height;
      player.vy = 0;
      player.onGround = true;
      onPlatform = true;
    }
  });
  if (!onPlatform && player.y + player.height < GROUND_Y) {
    player.onGround = false;
  }

  // Interact with animals
  const ePressed = !!keys['e'];
  animals.forEach(animal => {
    if (!animal.collected && !animal.showBubble &&
        Math.abs(player.x - animal.x) < 32 &&
        Math.abs(player.y - animal.y) < 32 &&
        ePressed && !ePressedLastFrame) {
      animal.showBubble = true;
      animal.bubbleTimer = 60; // ~1 second at 60fps
      // Score will be updated when collected
      if (animal.shiny) {
        player.secretPower = 180; // 3 seconds
        player.speedBoost = 180; // 3 seconds
        playNomSound();
      } else {
        playEatSound();
      }
    }
    // Update score when collected
    if (!animal.collected && animal.showBubble && animal.bubbleTimer === 1) {
      score[animal.type] = (score[animal.type] || 0) + 1;
      updateScoreboard();
    }
  });
  ePressedLastFrame = ePressed;

  // Draw
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw ground segments
  ctx.fillStyle = '#81c784';
  groundSegments.forEach(seg => {
    ctx.fillRect(seg.x - cameraX, GROUND_Y, seg.width, GROUND_HEIGHT);
  });
  // Draw platforms
  platforms.forEach(p => {
    ctx.save();
    ctx.translate(p.x - cameraX, p.y);
    p.draw();
    ctx.restore();
  });
  // Draw animals
  animals.forEach(a => {
    if (!a.collected && a.x - cameraX > -50 && a.x - cameraX < 850) {
      ctx.save();
      ctx.translate(a.x - cameraX, a.y);
      a.draw();
      ctx.restore();
    }
  });
  // Draw player
  if (player.secretPower > 0) drawParticles();
  ctx.save();
  ctx.translate(player.x - cameraX, player.y);
  player.draw();
  ctx.restore();

  animationId = requestAnimationFrame(gameLoop);
}
// --- Secret Power ---
player.secretPower = 0;
const PARTICLE_COLORS = ['#fffde4', '#ffd166', '#ffb6b9', '#a3cef1'];
setInterval(() => {
  if (player.secretPower > 0) {
    for (let i = 0; i < 2; i++) {
      spawnParticle(player.x + 20 + Math.random()*10, player.y + 30 + Math.random()*10, PARTICLE_COLORS[Math.floor(Math.random()*PARTICLE_COLORS.length)]);
    }
    player.secretPower--;
  }
}, 16);

setInterval(updateParticles, 16);


