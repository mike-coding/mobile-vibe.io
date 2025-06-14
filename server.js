const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let players = {};
let projectiles = [];
let lastFire = {}; // Track last fire time for each player

const MAP_WIDTH = 20;
const MAP_HEIGHT = 15;
const TILE_SIZE = 64; // pixels, should match your sprite size

// 0 = empty, 1 = tree
let map = [];
for (let y = 0; y < MAP_HEIGHT; y++) {
  let row = [];
  for (let x = 0; x < MAP_WIDTH; x++) {
    // Make a box boundary of trees
    if (x === 0 || y === 0 || x === MAP_WIDTH-1 || y === MAP_HEIGHT-1) {
      row.push(1);
    } else {
      row.push(0);
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

  // Collision detection
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
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
  projectiles = projectiles.filter(p => p.t < 60);

  // Emit state to all clients
  io.emit('state', players);
  io.emit('projectiles', projectiles);
}, 1000 / 60);

io.on('connection', socket => {
  socket.on('newPlayer', username => {
    players[socket.id] = {
      x: TILE_SIZE * 2 + TILE_SIZE/2,
      y: TILE_SIZE * 2 + TILE_SIZE/2,
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
        tileX >= 0 && tileX < MAP_WIDTH &&
        tileY >= 0 && tileY < MAP_HEIGHT &&
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
