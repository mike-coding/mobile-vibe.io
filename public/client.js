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
    ctx.translate(canvas.width, 0);
    ctx.rotate(Math.PI / 2);
  }

  const p = players[socket.id];
  let camX = 0, camY = 0;
  let cssWidth = parseInt(canvas.style.width) || window.innerWidth;
  let cssHeight = parseInt(canvas.style.height) || window.innerHeight;

  if (p) {
    if (rotated) {
      let fudgeX, fudgeY;
      if (document.fullscreenElement) {
        fudgeX = 3.65;
        fudgeY = 2.475;
      } else {
        fudgeX = 4;
        fudgeY = 2.15;
      }
      camX = p.x - canvas.width / fudgeX;
      camY = p.y - canvas.height / fudgeY;
      ctx.translate(-camX, -camY);
    } else {
      camX = p.x - cssWidth / 2;
      camY = p.y - cssHeight / 2;
      ctx.translate(-camX, -camY);
    }
  }

  // --- DEBUG DATA ---
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
    canvasStyleHeight: canvas.style.height
  });

  // --- MAP DRAW ---
  if (tileMap) {
    tileMap.draw(ctx);
  }

  // Player rendering
  let playerObjects = {};
  for (let id in players) {
    if (!playerObjects[id]) {
      playerObjects[id] = new Player(players[id], playerImg);
    } else {
      playerObjects[id].update(players[id]);
    }
    playerObjects[id].draw(ctx);
  }

  // Projectile rendering
  for (let proj of projectiles) {
    proj.update();
    proj.draw(ctx);
  }
  projectiles = projectiles.filter(p => p.t < 20);

  // Enemy rendering
  for (let id in enemyObjects) {
    enemyObjects[id].draw(ctx);
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
  const dx = e.clientX - p.x;
  const dy = e.clientY - p.y;
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







