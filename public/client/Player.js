import { Entity } from './Entity.js';

export class Player extends Entity {
  constructor(data, sprite) {
    super(data);
    this.name = data.name;
    this.hp = data.hp;
    this.sprite = sprite; // Image object
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.drawImage(this.sprite, -16, -16, 32, 32);
    ctx.restore();

    ctx.fillStyle = '#000';
    ctx.fillText(this.name, this.x - 15, this.y - 30);

    if (this.hp < 40) {
      ctx.fillStyle = '#222';
      ctx.fillRect(this.x - 20, this.y + 32, 40, 4);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(this.x - 20, this.y + 32, 40 * (this.hp / 40), 4);
    }
  }

  update(data) {
    super.update(data);
    this.hp = data.hp;
    this.name = data.name;
  }
}