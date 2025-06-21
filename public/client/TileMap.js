export class TileMap {
  constructor(map, grassMap, grassTiles, treeImg, tileSize = 64) {
    this.map = map;
    this.grassMap = grassMap;
    this.grassTiles = grassTiles;
    this.treeImg = treeImg;
    this.tileSize = tileSize;
  }  draw(ctx, camX, camY, viewW, viewH) {
    // Calculate tile bounds for culling
    const startX = Math.max(0, Math.floor(camX / this.tileSize));
    const endX = Math.min(this.map[0].length, Math.ceil((camX + viewW) / this.tileSize));
    const startY = Math.max(0, Math.floor(camY / this.tileSize));
    const endY = Math.min(this.map.length, Math.ceil((camY + viewH) / this.tileSize));

    // Save current context state
    ctx.save();
    
    // Disable image smoothing to prevent anti-aliasing artifacts
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    // Draw grass with culling and pixel-perfect positioning
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const grassIdx = this.grassMap[y][x];
        // Use Math.floor to ensure pixel-perfect positioning
        const drawX = Math.floor(x * this.tileSize);
        const drawY = Math.floor(y * this.tileSize);
        // Add 0.5 pixel overlap to eliminate gaps
        ctx.drawImage(
          this.grassTiles[grassIdx],
          drawX,
          drawY,
          this.tileSize + 0.5,
          this.tileSize + 0.5
        );
      }
    }
    
    // Draw trees with culling and pixel-perfect positioning
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (this.map[y][x] === 1) {
          // Use Math.floor to ensure pixel-perfect positioning
          const drawX = Math.floor(x * this.tileSize);
          const drawY = Math.floor(y * this.tileSize);
          // Add 0.5 pixel overlap to eliminate gaps
          ctx.drawImage(
            this.treeImg,
            drawX,
            drawY,
            this.tileSize + 0.5,
            this.tileSize + 0.5
          );
        }
      }
    }
    
    // Restore context state
    ctx.restore();
  }

  static generateGrassMap(width, height, grassTileCount) {
    const grassMap = [];
    for (let y = 0; y < height; y++) {
      let row = [];
      for (let x = 0; x < width; x++) {
        row.push(Math.floor(Math.random() * grassTileCount));
      }
      grassMap.push(row);
    }
    return grassMap;
  }
}