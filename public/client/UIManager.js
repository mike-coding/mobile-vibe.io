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
  }  updateDebugOverlay(debugData) {
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
      viewW: ${debugData.viewW}<br>
      viewH: ${debugData.viewH}<br>
      <br><b>View Bounds:</b><br>
      viewLeft: ${debugData.viewLeft}<br>
      viewRight: ${debugData.viewRight}<br>
      viewTop: ${debugData.viewTop}<br>
      viewBottom: ${debugData.viewBottom}<br>
      <br><b>Player Centering:</b><br>
      playerOffsetX: ${debugData.playerOffsetX}<br>
      playerOffsetY: ${debugData.playerOffsetY}<br>      <br><b>Rotation Transform:</b><br>
      canvasTranslateX: ${debugData.canvasTranslateX}<br>
      canvasTranslateY: ${debugData.canvasTranslateY}<br>
      rotatedViewW: ${debugData.rotatedViewW}<br>
      rotatedViewH: ${debugData.rotatedViewH}<br>
      <br><b>Coordinate Analysis:</b><br>
      windowInnerW: ${debugData.windowInnerW}<br>
      windowInnerH: ${debugData.windowInnerH}<br>
      <br><b>Expected vs Actual:</b><br>
      Expected center X: ${debugData.rotated ? debugData.rotatedViewW/2 : debugData.viewW/2}<br>
      Expected center Y: ${debugData.rotated ? debugData.rotatedViewH/2 : debugData.viewH/2}<br>
      Player screen X: ${debugData.playerX !== 'n/a' ? (debugData.playerX - debugData.camX) : 'n/a'}<br>
      Player screen Y: ${debugData.playerY !== 'n/a' ? (debugData.playerY - debugData.camY) : 'n/a'}<br>      <br><b>Canvas Diagnostics:</b><br>
      devicePixelRatio: ${debugData.devicePixelRatio}<br>
      actualCanvasWidthCSS: ${debugData.actualCanvasWidthCSS}<br>
      actualCanvasHeightCSS: ${debugData.actualCanvasHeightCSS}<br>
      zoomFactor: ${debugData.zoomFactor}<br>
      <br>canvas.style.width: ${debugData.canvasStyleWidth}
      <br>canvas.style.height: ${debugData.canvasStyleHeight}
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