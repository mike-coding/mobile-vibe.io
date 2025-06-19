import { Player } from './client/Player.js';
import { Projectile } from './client/Projectile.js';
import { TileMap } from './client/TileMap.js';
import { Joystick } from './client/Joystick.js';
import { UIManager } from './client/UIManager.js';
import { Enemy } from './client/Enemy.js';

const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const playerImg = new Image();
playerImg.src = 'sprites/entity/player/player.png';
const slimeImg = new Image();
slimeImg.src = 'sprites/entity/slime/test.png';
let enemies = [];
const uiManager = new UIManager();

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
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);
document.addEventListener('fullscreenchange', resize);
resize();

let me = null;
let players = {};
let playerObjects = {}; // Track player instances for rendering
let projectiles = [];
let map = [];
let grassMap = [];
const TILE_SIZE = 64;
const treeImg = new Image();
treeImg.src = 'sprites/tree.png';

const GRASS_TILE_COUNT = 13;
const grassTiles = [];
for (let i = 0; i <= GRASS_TILE_COUNT; i++) {
  const img = new Image();
  img.src = `sprites/tiles/grass/${i}.png`;
  grassTiles.push(img);
}

let tileMap = null;

// Receive map from server
socket.on('map', m => {
  map = m;
  grassMap = TileMap.generateGrassMap(map[0].length, map.length, GRASS_TILE_COUNT);
  tileMap = new TileMap(map, grassMap, grassTiles, treeImg, TILE_SIZE);
});

const ZOOM = 1.25; // 125%

// Draw loop
socket.on('state', all => {
  players = all;
  if (!me) me = { name: players[socket.id]?.name || '', id: socket.id };
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(ZOOM, ZOOM);  // --- HANDLE ROTATION FOR MOBILE PORTRAIT ---
  let rotated = false;
  if (isMobile() && isPortrait()) {
    rotated = true;
    // Try a different rotation approach: rotate around the center instead
    const centerX = window.innerWidth / ZOOM / 2;
    const centerY = window.innerHeight / ZOOM / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-centerY, -centerX); // Note: swapped after rotation
  }

  const p = players[socket.id];
  let camX = 0, camY = 0;
  let cssWidth = (parseInt(canvas.style.width) || window.innerWidth) / ZOOM;
  let cssHeight = (parseInt(canvas.style.height) || window.innerHeight) / ZOOM;  if (p) {
    if (rotated) {
      // With center-based rotation, we can use standard camera logic
      const rotatedCssWidth = window.innerHeight / ZOOM;
      const rotatedCssHeight = window.innerWidth / ZOOM;
      
      camX = p.x - rotatedCssWidth / 2;
      camY = p.y - rotatedCssHeight / 2;
      
      ctx.translate(-camX, -camY);
    } else {
      camX = p.x - cssWidth / 2;
      camY = p.y - cssHeight / 2;
      ctx.translate(-camX, -camY);
    }
  }
  // Calculate view dimensions accounting for rotation
  let viewW = rotated ? (window.innerHeight / ZOOM) : cssWidth;
  let viewH = rotated ? (window.innerWidth / ZOOM) : cssHeight;
  uiManager.updateDebugOverlay({
    camX,
    camY,
    playerX: p ? p.x : 'n/a',
    playerY: p ? p.y : 'n/a',
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    cssWidth,
    cssHeight,
    rotated,
    canvasStyleWidth: canvas.style.width,
    canvasStyleHeight: canvas.style.height,
    viewW,
    viewH,
    // View bounds - what we're actually seeing
    viewLeft: camX,
    viewRight: camX + viewW,
    viewTop: camY,
    viewBottom: camY + viewH,
    // Player offset from center
    playerOffsetX: p ? (p.x - (camX + viewW/2)) : 'n/a',
    playerOffsetY: p ? (p.y - (camY + viewH/2)) : 'n/a',    // Additional debug for rotation
    canvasTranslateX: rotated ? (window.innerHeight / ZOOM) : 0,
    canvasTranslateY: rotated ? 0 : 0,
    windowInnerW: window.innerWidth,
    windowInnerH: window.innerHeight,
    rotatedViewW: rotated ? (window.innerHeight / ZOOM) : 'n/a',
    rotatedViewH: rotated ? (window.innerWidth / ZOOM) : 'n/a',
    // New diagnostic data
    devicePixelRatio: window.devicePixelRatio || 1,
    actualCanvasWidthCSS: parseInt(canvas.style.width) || 0,
    actualCanvasHeightCSS: parseInt(canvas.style.height) || 0,
    zoomFactor: ZOOM
  });

  // --- MAP DRAW ---
  if (tileMap) {
    tileMap.draw(ctx, camX, camY, viewW, viewH);
  }

  // Player rendering with culling
  for (let id in players) {
    const pl = players[id];
    if (isOnScreen(pl.x, pl.y, camX, camY, viewW, viewH)) {
      if (!playerObjects[id]) {
        playerObjects[id] = new Player(pl, playerImg);
      } else {
        playerObjects[id].update(pl);
      }
      playerObjects[id].draw(ctx);
    }
  }  // Clean up player objects for disconnected players
  for (let id in playerObjects) {
    if (!players[id]) {
      delete playerObjects[id];
    }
  }

  // Projectile rendering with culling
  for (let proj of projectiles) {
    if (isOnScreen(proj.x, proj.y, camX, camY, viewW, viewH)) {
      proj.update();
      proj.draw(ctx);
    }
  }
  projectiles = projectiles.filter(p => p.t < 20);

  // Enemy rendering with culling
  for (let id in enemyObjects) {
    const enemy = enemyObjects[id];
    if (isOnScreen(enemy.x, enemy.y, camX, camY, viewW, viewH)) {
      enemy.draw(ctx);
    }
  }

  ctx.restore();
});

// Replace the old array with instances
socket.on('projectiles', allProjectiles => {
  projectiles = allProjectiles.map(p => new Projectile(p));
});

let enemyObjects = {};
socket.on('enemies', data => {
  // Update or create Enemy instances
  for (let enemy of data) {
    if (!enemyObjects[enemy.id]) {
      enemyObjects[enemy.id] = new Enemy(enemy, slimeImg);
    } else {
      enemyObjects[enemy.id].update(enemy);
    }
  }
  // Remove enemies that no longer exist
  for (let id in enemyObjects) {
    if (!data.find(e => e.id === id)) {
      delete enemyObjects[id];
    }
  }
});

// Input (supports mobile taps and free direction)
canvas.addEventListener('pointerdown', e => {
  if (!me) return;
  const p = players[socket.id];
  if (!p) return;
  
  // Get canvas bounds and account for device pixel ratio
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  let canvasX = (e.clientX - rect.left) / ZOOM;
  let canvasY = (e.clientY - rect.top) / ZOOM;
    // Account for rotation if in portrait mode
  if (isMobile() && isPortrait()) {
    const temp = canvasX;
    canvasX = canvasY;
    canvasY = (window.innerHeight / ZOOM) - temp;
  }// Convert to world coordinates
  let camX, camY;
  
  if (isMobile() && isPortrait()) {
    camX = p.x - (window.innerHeight / ZOOM) / 2;
    camY = p.y - (window.innerWidth / ZOOM) / 2;
  } else {
    const cssWidth = (parseInt(canvas.style.width) || window.innerWidth) / ZOOM;
    const cssHeight = (parseInt(canvas.style.height) || window.innerHeight) / ZOOM;
    camX = p.x - cssWidth / 2;
    camY = p.y - cssHeight / 2;
  }
  
  const worldX = canvasX + camX;
  const worldY = canvasY + camY;
  
  const dx = worldX - p.x;
  const dy = worldY - p.y;
  const len = Math.sqrt(dx*dx + dy*dy) || 1;
  socket.emit('move', { dx: dx/len, dy: dy/len });
});

function rotateInput(dx, dy) {
  if (isMobile() && isPortrait()) {
    return { dx: dy, dy: -dx };
  }
  return { dx, dy };
}

const PLAYER_SPEED = 1.2; // Try 0.1–0.3 for tuning

let lastMoveEmit = 0;
const MOVE_EMIT_INTERVAL = 1000 / 30; // 30 times per second

// Movement joystick
const moveJoystick = new Joystick('joystick', 'stick', {
  onMove: (dx, dy) => {
    const now = Date.now();
    if (now - lastMoveEmit > MOVE_EMIT_INTERVAL) {
      lastMoveEmit = now;
      const { dx: rdx, dy: rdy } = rotateInput(dx, dy);
      socket.emit('move', { dx: rdx * PLAYER_SPEED, dy: rdy * PLAYER_SPEED });
    }
  }
});

// Fire joystick
const fireJoystick = new Joystick('fire-joystick', 'fire-stick', {
  onMove: (dx, dy) => {
    // Only direction matters, not magnitude!
    // Only emit if the stick is not centered (avoid accidental fires)
    let deadzone = 0.35; // Adjust this value to tune sensitivity
    if (Math.abs(dx) > deadzone || Math.abs(dy) > deadzone) {
      const { dx: rdx, dy: rdy } = rotateInput(dx, dy);
      // Normalize direction to unit vector
      const len = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
      socket.emit('fire', { dx: rdx / len, dy: rdy / len });
    }
  }
});

socket.on('dead', () => {
  document.getElementById('overlay').style.display = 'flex';
  me = null;
});

document.getElementById('joinBtn').onclick = function() {
  const name = document.getElementById('nameInput').value.trim();
  if (name) {
    socket.emit('newPlayer', name);
    document.getElementById('overlay').style.display = 'none';
    me = { name };
  }
};

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
}
function isPortrait() {
  return window.innerHeight > window.innerWidth;
}
function isOnScreen(x, y, camX, camY, viewW, viewH, margin = 64) {
  return (
    x > camX - margin &&
    x < camX + viewW + margin &&
    y > camY - margin &&
    y < camY + viewH + margin
  );
}







