import { Entity } from './Entity.js';

export class Enemy extends Entity {
  constructor(data, sprite) {
    super(data);
    this.hp = data.hp;
    this.sprite = sprite;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.drawImage(this.sprite, -16, -16, 32, 32);
    ctx.restore();

    // Draw health bar
    if (this.hp < 20) {
      ctx.fillStyle = '#222';
      ctx.fillRect(this.x - 20, this.y + 20, 40, 4);
      ctx.fillStyle = '#f00';
      ctx.fillRect(this.x - 20, this.y + 20, 40 * (this.hp / 20), 4);
    }
  }

  update(data) {
    super.update(data);
    this.hp = data.hp;
  }
}