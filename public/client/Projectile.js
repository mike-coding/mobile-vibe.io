export class Projectile {
  constructor(data) {
    this.x = data.x;
    this.y = data.y;
    this.dx = data.dx;
    this.dy = data.dy;
    this.t = data.t || 0;
  }

  update() {
    this.x += this.dx * 10;
    this.y += this.dy * 10;
    this.t++;
  }

  draw(ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'orange';
    ctx.shadowColor = 'orange';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}