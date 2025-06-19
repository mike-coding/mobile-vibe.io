export class Projectile {
  constructor(data) {
    this.x = data.x;
    this.y = data.y;
    this.dx = data.dx;
    this.dy = data.dy;
    this.t = data.t || 0;
    this.owner = data.owner;
    this.type = data.type || 'fireball'; // 'fireball' for players, 'slimeball' for enemies
  }

  update() {
    this.x += this.dx * 10;
    this.y += this.dy * 10;
    this.t++;
  }

  draw(ctx) {
    ctx.save();
    
    if (this.type === 'fireball') {
      this.drawFireball(ctx);
    } else if (this.type === 'slimeball') {
      this.drawSlimeball(ctx);
    }
    
    ctx.restore();
  }

  drawFireball(ctx) {
    // Animated fireball with flickering flames
    const time = Date.now() * 0.01;
    const flicker = Math.sin(time + this.x + this.y) * 0.3 + 0.7;
    
    // Outer glow
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 20 * flicker;
    
    // Core fire gradient
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 12);
    gradient.addColorStop(0, '#ffff88');
    gradient.addColorStop(0.3, '#ff8800');
    gradient.addColorStop(0.7, '#ff4400');
    gradient.addColorStop(1, '#aa1100');
    
    // Main fireball
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8 * flicker, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Inner bright core
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffff00';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4 * flicker, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffff88';
    ctx.fill();
    
    // Flame trails
    for (let i = 0; i < 3; i++) {
      const angle = (time + i * 2.1) % (Math.PI * 2);
      const trailX = this.x + Math.cos(angle) * 6 * flicker;
      const trailY = this.y + Math.sin(angle) * 6 * flicker;
      
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(trailX, trailY, 2 * flicker, 0, 2 * Math.PI);
      ctx.fillStyle = '#ff6600';
      ctx.fill();
    }
  }

  drawSlimeball(ctx) {
    // Bouncy slimeball with slime effects
    const time = Date.now() * 0.008;
    const bounce = Math.sin(time + this.x + this.y) * 0.2 + 0.8;
    
    // Slime trail/glow
    ctx.shadowColor = '#00ff44';
    ctx.shadowBlur = 15;
    
    // Main slimeball gradient
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 10);
    gradient.addColorStop(0, '#88ff88');
    gradient.addColorStop(0.4, '#44dd44');
    gradient.addColorStop(0.8, '#22aa22');
    gradient.addColorStop(1, '#116611');
    
    // Main slimeball (slightly squished for bounce effect)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(1, bounce);
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
    
    // Slime shine/highlight
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#aaffaa';
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, 3 * bounce, 0, 2 * Math.PI);
    ctx.fillStyle = '#ccffcc';
    ctx.fill();
    
    // Slime drips
    for (let i = 0; i < 2; i++) {
      const dripAngle = (time + i * 3.14) % (Math.PI * 2);
      const dripX = this.x + Math.cos(dripAngle) * 8;
      const dripY = this.y + Math.sin(dripAngle) * 8;
      
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(dripX, dripY, 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#44aa44';
      ctx.fill();
    }
  }
}