const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let players = {};
let projectiles = [];
let lastFire = {}; // Track last fire time for each player

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
    proj.x += proj.dx * 15;
    proj.y += proj.dy * 15;
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

  // Remove old projectiles
  projectiles = projectiles.filter(p => p.t < 20);

  // Emit state to all clients
  io.emit('state', players);
  io.emit('projectiles', projectiles);
}, 1000 / 60);

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
