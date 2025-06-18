export class Entity {
  constructor({ x, y }) {
    this.x = x;
    this.y = y;
  }

  draw(ctx) {
    // Default: draw nothing
  }

  update(data) {
    Object.assign(this, data);
  }
}