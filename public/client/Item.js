import { Entity } from './Entity.js';

export class Item extends Entity {
  constructor(data, sprite) {
    super(data);
    this.type = data.type;
    this.healAmount = data.healAmount || 15;
    this.sprite = sprite;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Add a subtle floating animation
    const floatOffset = Math.sin(Date.now() * 0.003) * 2;
    ctx.translate(0, floatOffset);
    
    // Draw the item sprite
    ctx.drawImage(this.sprite, -16, -16, 32, 32);
    
    // Add a subtle glow effect
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 10;
    ctx.drawImage(this.sprite, -16, -16, 32, 32);
    
    ctx.restore();
  }

  update(data) {
    super.update(data);
    this.type = data.type;
    this.healAmount = data.healAmount || 15;
  }
}
