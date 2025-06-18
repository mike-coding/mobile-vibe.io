export class UIManager {
  constructor() {
    this.debugBtn = document.getElementById('debug-btn');
    this.debugOverlay = document.getElementById('debug-overlay');
    this.debugContent = document.getElementById('debug-content');
    this.debugClose = document.getElementById('debug-close');
    this.fullscreenBtn = document.getElementById('fullscreen-btn');
    this.uiContainer = document.getElementById('ui-container');

    this._bindEvents();
  }

  _bindEvents() {
    if (this.debugBtn) {
      this.debugBtn.onclick = () => {
        this.debugOverlay.style.display = 'flex';
        this.updateDebugOverlay(this.debugData || {});
      };
    }
    if (this.debugClose) {
      this.debugClose.onclick = () => {
        this.debugOverlay.style.display = 'none';
      };
    }
    if (this.fullscreenBtn) {
      this.fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      };
    }
    window.addEventListener('resize', () => this.updateUIRotation());
    window.addEventListener('orientationchange', () => this.updateUIRotation());
    document.addEventListener('DOMContentLoaded', () => this.updateUIRotation());
  }

  updateDebugOverlay(debugData) {
    this.debugData = debugData;
    if (!this.debugContent) return;
    this.debugContent.innerHTML = `
      <b>Debug Info</b><br>
      camX: ${debugData.camX}<br>
      camY: ${debugData.camY}<br>
      player.x: ${debugData.playerX}<br>
      player.y: ${debugData.playerY}<br>
      canvas.width: ${debugData.canvasWidth}<br>
      canvas.height: ${debugData.canvasHeight}<br>
      cssWidth: ${debugData.cssWidth}<br>
      cssHeight: ${debugData.cssHeight}<br>
      rotated: ${debugData.rotated}<br>
      window.innerWidth: ${window.innerWidth}<br>
      window.innerHeight: ${window.innerHeight}<br>
      devicePixelRatio: ${window.devicePixelRatio}<br>
      <br>canvas.style.width: ${debugData.canvasStyleWidth}
      <br>canvas.style.height: ${debugData.canvasStyleHeight}
      <br>document.body.clientWidth: ${document.body.clientWidth}
      <br>document.body.clientHeight: ${document.body.clientHeight}
      <br>screen.width: ${screen.width}
      <br>screen.height: ${screen.height}
    `;
  }

  updateUIRotation() {
    if (!this.uiContainer) return;
    if (this.isMobile() && this.isPortrait()) {
      this.uiContainer.style.transform = 'rotate(90deg)';
      this.uiContainer.style.transformOrigin = 'top left';
      this.uiContainer.style.width = window.innerHeight + 'px';
      this.uiContainer.style.height = window.innerWidth + 'px';
      this.uiContainer.style.left = (window.innerWidth) + 'px';
      this.uiContainer.style.top = '0';
      this.uiContainer.style.position = 'fixed';
    } else {
      this.uiContainer.style.transform = '';
      this.uiContainer.style.transformOrigin = '';
      this.uiContainer.style.width = '100vw';
      this.uiContainer.style.height = '100vh';
      this.uiContainer.style.left = '0';
      this.uiContainer.style.top = '0';
      this.uiContainer.style.position = 'fixed';
    }
  }

  isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
  }
  isPortrait() {
    return window.innerHeight > window.innerWidth;
  }
}