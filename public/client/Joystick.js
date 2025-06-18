export class Joystick {
  constructor(containerId, stickId, options = {}) {
    this.container = document.getElementById(containerId);
    this.stick = document.getElementById(stickId);
    this.active = false;
    this.dx = 0;
    this.dy = 0;
    this.pointerId = null;
    this.maxDist = options.maxDist || 40;
    this.center = options.center || { x: 60, y: 60 };
    this.onMove = options.onMove || (() => {});
    this.onEnd = options.onEnd || (() => {});
    this.raf = null;

    this._bindEvents();
  }

  _getPos(e) {
    const rect = this.container.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  _move(e) {
    const { x, y } = this._getPos(e);
    let dx = x - this.center.x, dy = y - this.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.maxDist) {
      dx = dx * this.maxDist / dist;
      dy = dy * this.maxDist / dist;
    }
    this.stick.style.left = (30 + dx) + "px";
    this.stick.style.top = (30 + dy) + "px";
    this.dx = dx / this.maxDist;
    this.dy = dy / this.maxDist;
    this.onMove(this.dx, this.dy);
  }

  _end() {
    this.active = false;
    this.stick.style.left = "30px";
    this.stick.style.top = "30px";
    this.dx = 0;
    this.dy = 0;
    this.onEnd();
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  _loop() {
    if (this.active && (Math.abs(this.dx) > 0.1 || Math.abs(this.dy) > 0.1)) {
      this.onMove(this.dx, this.dy);
    }
    if (this.active) this.raf = requestAnimationFrame(() => this._loop());
  }

  _bindEvents() {
    this.container.addEventListener('pointerdown', e => {
      if (this.pointerId === null) {
        this.pointerId = e.pointerId;
        e.preventDefault();
        this.active = true;
        this._move(e);
        this._loop();
        document.addEventListener('pointermove', this._onPointerMove);
        document.addEventListener('pointerup', this._onPointerUp);
      }
    });

    this._onPointerMove = e => {
      if (e.pointerId === this.pointerId) this._move(e);
    };
    this._onPointerUp = e => {
      if (e.pointerId === this.pointerId) {
        this._end();
        this.pointerId = null;
        document.removeEventListener('pointermove', this._onPointerMove);
        document.removeEventListener('pointerup', this._onPointerUp);
      }
    };
  }
}