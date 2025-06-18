const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let players = {};
let projectiles = [];
let lastFire = {}; // Track last fire time for each player
let enemies = [];
const ENEMY_COUNT = 8;
const ENEMY_HP = 25;

const MAP_WIDTH = 40;
const MAP_HEIGHT = 30;
const TILE_SIZE = 64; // pixels, should match your sprite size

const PADDING_X = 6; // left/right
const PADDING_Y = 3; // top/bottom

const PADDED_WIDTH = MAP_WIDTH + PADDING_X * 2;
const PADDED_HEIGHT = MAP_HEIGHT + PADDING_Y * 2;

// 0 = empty, 1 = tree
let map = [];
for (let y = 0; y < PADDED_HEIGHT; y++) {
  let row = [];
  for (let x = 0; x < PADDED_WIDTH; x++) {
    // Main map area (not padding)
    if (
      x >= PADDING_X && x < PADDING_X + MAP_WIDTH &&
      y >= PADDING_Y && y < PADDING_Y + MAP_HEIGHT
    ) {
      // Boundary of main box: always tree
      if (
        x === PADDING_X || y === PADDING_Y ||
        x === PADDING_X + MAP_WIDTH - 1 || y === PADDING_Y + MAP_HEIGHT - 1
      ) {
        row.push(1); // tree
      } else {
        // 15% chance tree, 85% empty
        row.push(Math.random() < 0.15 ? 1 : 0);
      }
    } else {
      // Padding: random grass (0) or tree (1)
      row.push(Math.random() < 0.8 ? 1 : 0); // ~80% trees
    }
  }
  map.push(row);
}

// Game loop: runs at 60 FPS
setInterval(() => {
  // Update projectiles
  for (let proj of projectiles) {
    proj.x += proj.dx * 10;
    proj.y += proj.dy * 10;
    proj.t++;
  }

  // Destroy projectiles that hit a tree
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    const tileX = Math.floor(proj.x / TILE_SIZE);
    const tileY = Math.floor(proj.y / TILE_SIZE);
    if (
      tileX < 0 || tileX >= PADDED_WIDTH ||
      tileY < 0 || tileY >= PADDED_HEIGHT ||
      map[tileY][tileX] === 1
    ) {
      projectiles.splice(i, 1);
      continue;
    }
    // Existing player collision logic follows...
    for (const [id, player] of Object.entries(players)) {
      if (id !== proj.owner) {
        const dx = proj.x - player.x;
        const dy = proj.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20 + 8) { // 20 = player radius, 8 = projectile radius
          // Remove projectile
          projectiles.splice(i, 1);
          // Damage player
          player.hp -= 5;
          if (player.hp <= 0) {
            io.to(id).emit('dead');
            delete players[id];
          }
          break;
        }
      }
    }
  }

  // Projectile vs enemy
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    // Only allow projectiles from players to damage enemies
    if (players[proj.owner]) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 20 + 8) { // 20 = enemy radius, 8 = projectile radius
          projectiles.splice(i, 1);
          enemy.hp -= 5;
          if (enemy.hp <= 0) {
            enemies.splice(j, 1);
          }
          break;
        }
      }
    }
  }

  // Remove old projectiles
  projectiles = projectiles.filter(p => p.t < 20);

  // --- ENSURE ENEMY COUNT ---
  while (enemies.length < ENEMY_COUNT) {
    enemies.push(spawnEnemy());
  }

  // --- ENEMY AI LOGIC ---
  for (let enemy of enemies) {
    // --- Random movement ---
    enemy.moveTimer--;
    if (enemy.moveTimer <= 0) {
      enemy.dir = Math.random() * Math.PI * 2;
      enemy.moveTimer = 60 + Math.floor(Math.random() * 60); // change direction every 1-2 seconds
    }
    const ENEMY_SPEED = 1.5;
    const dx = Math.cos(enemy.dir) * ENEMY_SPEED;
    const dy = Math.sin(enemy.dir) * ENEMY_SPEED;
    let newX = enemy.x + dx;
    let newY = enemy.y + dy;
    const tileX = Math.floor(newX / TILE_SIZE);
    const tileY = Math.floor(newY / TILE_SIZE);
    if (map[tileY] && map[tileY][tileX] === 0) {
      enemy.x = newX;
      enemy.y = newY;
    } else {
      // Hit wall, pick new direction next frame
      enemy.moveTimer = 0;
    }

    // --- Shooting ---
    enemy.fireCooldown--;
    if (enemy.fireCooldown <= 0) {
      // Shoot in a random direction
      const angle = Math.random() * Math.PI * 2;
      projectiles.push({
        x: enemy.x,
        y: enemy.y,
        dx: Math.cos(angle),
        dy: Math.sin(angle),
        owner: enemy.id,
        t: 0
      });
      enemy.fireCooldown = 90 + Math.floor(Math.random() * 60); // fire every 1.5–2.5 seconds
    }
  }

  for (const [id, player] of Object.entries(players)) {
    // Only send the player their own info + nearby others
    const nearbyPlayers = Object.values(players).filter(
      p => p === player || (
        (p.x - player.x) ** 2 + (p.y - player.y) ** 2 <= (7 * TILE_SIZE) ** 2
      )
    );
    const nearbyEnemies = getNearbyEntities(player, enemies, 7);
    const nearbyProjectiles = getNearbyEntities(player, projectiles, 7);

    io.to(id).emit('state', Object.fromEntries(nearbyPlayers.map(p => [p.id || id, p])));
    io.to(id).emit('projectiles', nearbyProjectiles);
    io.to(id).emit('enemies', nearbyEnemies);
  }
}, 1000 / 30); // 30Hz

io.on('connection', socket => {
  socket.on('newPlayer', username => {
    let spawnX, spawnY;
    while (true) {
      // Random position inside the playable area (not padding, not on a tree)
      const x = PADDING_X + 1 + Math.floor(Math.random() * (MAP_WIDTH - 2));
      const y = PADDING_Y + 1 + Math.floor(Math.random() * (MAP_HEIGHT - 2));
      if (map[y][x] === 0) { // 0 = empty
        spawnX = x * TILE_SIZE + TILE_SIZE / 2;
        spawnY = y * TILE_SIZE + TILE_SIZE / 2;
        break;
      }
    }
    players[socket.id] = {
      id: socket.id, // add this line
      x: spawnX,
      y: spawnY,
      name: username,
      hp: 40
    };
    socket.emit('state', players);
    socket.emit('projectiles', projectiles);
    io.emit('state', players);
  });

  socket.on('move', data => {
    const p = players[socket.id];
    if (!p || !data) return;
    const speed = 5;
    if (typeof data.dx === 'number' && typeof data.dy === 'number') {
      let newX = p.x + data.dx * speed;
      let newY = p.y + data.dy * speed;
      // Convert to tile coordinates
      const tileX = Math.floor(newX / TILE_SIZE);
      const tileY = Math.floor(newY / TILE_SIZE);
      // Check collision with trees
      if (
        //tileX >= 0 && tileX < MAP_WIDTH &&
        //tileY >= 0 && tileY < MAP_HEIGHT &&
        map[tileY][tileX] === 0
      ) {
        p.x = newX;
        p.y = newY;
      }
      // else: blocked by tree, don't move
    }
    // No longer emit state here; game loop handles it
  });

  socket.on('fire', data => {
    const now = Date.now();
    if (!lastFire[socket.id] || now - lastFire[socket.id] > 500) { // 500ms cooldown
      if (typeof data.dx === 'number' && typeof data.dy === 'number') {
        const p = players[socket.id];
        if (!p) return;
        projectiles.push({
          x: p.x,
          y: p.y,
          dx: data.dx,
          dy: data.dy,
          owner: socket.id,
          t: 0
        });
        lastFire[socket.id] = now;
      }
    }
    // No longer emit projectile here; game loop handles it
  });

  socket.emit('map', map);

  socket.on('disconnect', () => {
    delete players[socket.id];
    // No longer emit state here; game loop handles it
  });
});

http.listen(3000, '0.0.0.0', () => {
  console.log('Listening on :3000');
  console.log('Access from your network at: http://' + getLocalIp() + ':3000');
});

// Helper to print your local IP address
function getLocalIp() {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  for (let iface of Object.values(ifaces)) {
    for (let i of iface) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return 'localhost';
}

function spawnEnemy() {
  while (true) {
    const x = PADDING_X + 1 + Math.floor(Math.random() * (MAP_WIDTH - 2));
    const y = PADDING_Y + 1 + Math.floor(Math.random() * (MAP_HEIGHT - 2));
    if (map[y][x] === 0) {
      return {
        id: 'enemy_' + Math.random().toString(36).slice(2, 10),
        x: x * TILE_SIZE + TILE_SIZE / 2,
        y: y * TILE_SIZE + TILE_SIZE / 2,
        hp: ENEMY_HP,
        dir: Math.random() * Math.PI * 2, // random direction in radians
        moveTimer: 0,
        fireCooldown: 0
      };
    }
  }
}

while (enemies.length < ENEMY_COUNT) {
  enemies.push(spawnEnemy());
}

function getNearbyEntities(center, entities, radiusTiles) {
  const radiusPx = radiusTiles * TILE_SIZE;
  return entities.filter(e => {
    const dx = e.x - center.x;
    const dy = e.y - center.y;
    return dx * dx + dy * dy <= radiusPx * radiusPx;
  });
}
