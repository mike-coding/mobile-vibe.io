const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// --- Place the resize function here ---
function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  // Set smoothing after scaling
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
resize();

let players = {};
let projectiles = [];


// Join flow
document.getElementById('joinBtn').onclick = () => {
  const name = document.getElementById('nameInput').value.trim() || 'anon';
  document.getElementById('overlay').style.display = 'none';
  socket.emit('newPlayer', name);
  me = { name };
};

// --- MAP ---
let map = [];
let grassMap = [];
const TILE_SIZE = 64;
const treeImg = new Image();
treeImg.src = 'sprites/tree.png';

const GRASS_TILE_COUNT = 13; // Set this to your number of grass tiles
const grassTiles = [];
for (let i = 0; i <= GRASS_TILE_COUNT; i++) {
  const img = new Image();
  img.src = `sprites/tiles/grass/${i}.png`;
  grassTiles.push(img);
}

function generateGrassMap(width, height) {
  grassMap = [];
  for (let y = 0; y < height; y++) {
    let row = [];
    for (let x = 0; x < width; x++) {
      row.push(Math.floor(Math.random() * GRASS_TILE_COUNT));
    }
    grassMap.push(row);
  }
}

// After receiving the map from the server:
socket.on('map', m => {
  map = m;
  generateGrassMap(map[0].length, map.length);
});

// Draw loop
socket.on('state', all => {
  players = all;
  if (!me) me = { name: players[socket.id]?.name || '', id: socket.id };
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  // --- HANDLE ROTATION FOR MOBILE PORTRAIT ---
  let rotated = false;
  if (isMobile() && isPortrait()) {
    rotated = true;
    // Rotate context 90deg clockwise and translate origin
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  }

  // --- CAMERA ---
  const p = players[socket.id];
  let camX = 0, camY = 0;
  let cssWidth = parseInt(canvas.style.width) || window.innerWidth;
  let cssHeight = parseInt(canvas.style.height) || window.innerHeight;

  if (p) {
    if (rotated) {
      // Swap width/height for camera centering
      camX = p.x - cssHeight / 2;
      camY = p.y - cssWidth / 2;
    } else {
      camX = p.x - cssWidth / 2;
      camY = p.y - cssHeight / 2;
    }
  }
  if (rotated) {
    ctx.translate(-camY, -camX);
  } else {
    ctx.translate(-camX, -camY);
  }

  // --- MAP DRAW ---
  if (map.length && grassMap.length) {
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        const grassIdx = grassMap[y][x];
        ctx.drawImage(grassTiles[grassIdx], x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === 1) {
          ctx.drawImage(treeImg, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  for (let id in players) {
    const p = players[id];
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, 2*Math.PI);
    ctx.fillStyle = id === socket.id ? '#0f0' : '#f00';
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillText(p.name, p.x - 15, p.y - 30);

    // Draw health bar
    if (p.hp == 40) continue; // Full health, no bar needed
    ctx.fillStyle = '#222';
    ctx.fillRect(p.x - 20, p.y + 32, 40, 4);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(p.x - 20, p.y + 32, 40 * (p.hp / 40), 4);
    //ctx.strokeStyle = '#000';
    //ctx.strokeRect(p.x - 20, p.y + 32, 40, 4);
  }

  // Projectile rendering
  for (let proj of projectiles) {
    proj.x += proj.dx * 10;
    proj.y += proj.dy * 10;
    proj.t++;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#00f';
    ctx.fill();
  }
  // Optionally, remove projectiles after some time:
  projectiles = projectiles.filter(p => p.t < 60);

  ctx.restore();
});

// New projectiles array from server
socket.on('projectiles', allProjectiles => {
  projectiles = allProjectiles;
});

// Input (supports mobile taps and free direction)
canvas.addEventListener('pointerdown', e => {
  if (!me) return;
  const p = players[socket.id];
  if (!p) return;
  const dx = e.clientX - p.x;
  const dy = e.clientY - p.y;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
  // Normalize to unit vector
  socket.emit('move', { dx: dx/len, dy: dy/len });
});

// Virtual Joystick logic
const joystick = document.getElementById('joystick');
const stick = document.getElementById('stick');
let joyActive = false, joyDx = 0, joyDy = 0, joyRAF;

function getJoystickPos(e, joystickElem) {
  const rect = joystickElem.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { x, y };
}

function startJoystick(e) {
  joyActive = true;
  moveJoystick(e);
  joyLoop();
}

function moveJoystick(e) {
  const { x, y } = getJoystickPos(e, joystick);
  const cx = 60, cy = 60; // center
  let dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const maxDist = 40;
  if (dist > maxDist) {
    dx = dx * maxDist / dist;
    dy = dy * maxDist / dist;
  }
  stick.style.left = (30 + dx) + "px";
  stick.style.top = (30 + dy) + "px";
  joyDx = dx / maxDist;
  joyDy = dy / maxDist;
}

function endJoystick() {
  joyActive = false;
  stick.style.left = "30px";
  stick.style.top = "30px";
  joyDx = 0; joyDy = 0;
}

function joyLoop() {
  if (joyActive && (Math.abs(joyDx) > 0.1 || Math.abs(joyDy) > 0.1)) {
    socket.emit('move', { dx: joyDx, dy: joyDy });
  }
  if (joyActive) joyRAF = requestAnimationFrame(joyLoop);
}

// --- Movement Joystick ---
let movePointerId = null;

function onMovePointerMove(e) {
  if (e.pointerId === movePointerId) moveJoystick(e);
}
function onMovePointerUp(e) {
  if (e.pointerId === movePointerId) {
    endJoystick();
    movePointerId = null;
    document.removeEventListener('pointermove', onMovePointerMove);
    document.removeEventListener('pointerup', onMovePointerUp);
  }
}

joystick.addEventListener('pointerdown', e => {
  if (movePointerId === null) {
    movePointerId = e.pointerId;
    e.preventDefault();
    startJoystick(e);
    document.addEventListener('pointermove', onMovePointerMove);
    document.addEventListener('pointerup', onMovePointerUp);
  }
});

// Fire Joystick logic
const fireJoystick = document.getElementById('fire-joystick');
const fireStick = document.getElementById('fire-stick');
let fireActive = false, fireDx = 0, fireDy = 0, fireRAF;

function startFireJoystick(e) {
  fireActive = true;
  moveFireJoystick(e);
  fireLoop();
}

function moveFireJoystick(e) {
  const { x, y } = getJoystickPos(e, fireJoystick);
  const cx = 60, cy = 60; // center
  let dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const maxDist = 40;
  if (dist > maxDist) {
    dx = dx * maxDist / dist;
    dy = dy * maxDist / dist;
  }
  fireStick.style.left = (30 + dx) + "px";
  fireStick.style.top = (30 + dy) + "px";
  // Normalize for fixed projectile speed
  const mag = Math.sqrt(dx*dx + dy*dy);
  if (mag > 0.3 * maxDist) { // Only send if moved enough
    fireDx = dx / mag;
    fireDy = dy / mag;
  } else {
    fireDx = 0;
    fireDy = 0;
  }
}

function endFireJoystick() {
  fireActive = false;
  fireStick.style.left = "30px";
  fireStick.style.top = "30px";
  fireDx = 0; fireDy = 0;
}

function fireLoop() {
  if (fireActive && (Math.abs(fireDx) > 0.3 || Math.abs(fireDy) > 0.3)) {
    // Only fire if joystick is moved enough from center
    socket.emit('fire', { dx: fireDx, dy: fireDy });
  }
  if (fireActive) fireRAF = requestAnimationFrame(fireLoop);
}

// --- Fire Joystick ---
let firePointerId = null;

function onFirePointerMove(e) {
  if (e.pointerId === firePointerId) moveFireJoystick(e);
}
function onFirePointerUp(e) {
  if (e.pointerId === firePointerId) {
    endFireJoystick();
    firePointerId = null;
    document.removeEventListener('pointermove', onFirePointerMove);
    document.removeEventListener('pointerup', onFirePointerUp);
  }
}

fireJoystick.addEventListener('pointerdown', e => {
  if (firePointerId === null) {
    firePointerId = e.pointerId;
    e.preventDefault();
    startFireJoystick(e);
    document.addEventListener('pointermove', onFirePointerMove);
    document.addEventListener('pointerup', onFirePointerUp);
  }
});

socket.on('dead', () => {
  // Reset to login overlay
  document.getElementById('overlay').style.display = 'flex';
  // Optionally clear your player state
  me = null;
});

// Remove any global pointermove/pointerup listeners for joysticks!

const fullscreenBtn = document.getElementById('fullscreen-btn');
fullscreenBtn.onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
}
function isPortrait() {
  return window.innerHeight > window.innerWidth;
}

function updateCanvasOrientation() {
  // Optionally, you can leave this empty or just ensure the canvas fills the window:
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
}

window.addEventListener('resize', updateCanvasOrientation);
window.addEventListener('orientationchange', updateCanvasOrientation);
document.addEventListener('DOMContentLoaded', updateCanvasOrientation);
