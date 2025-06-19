export class TileMap {
  constructor(map, grassMap, grassTiles, treeImg, tileSize = 64) {
    this.map = map;
    this.grassMap = grassMap;
    this.grassTiles = grassTiles;
    this.treeImg = treeImg;
    this.tileSize = tileSize;
  }
  draw(ctx, camX, camY, viewW, viewH) {
    // Calculate tile bounds for culling
    const startX = Math.max(0, Math.floor(camX / this.tileSize));
    const endX = Math.min(this.map[0].length, Math.ceil((camX + viewW) / this.tileSize));
    const startY = Math.max(0, Math.floor(camY / this.tileSize));
    const endY = Math.min(this.map.length, Math.ceil((camY + viewH) / this.tileSize));

    // Draw grass with culling
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const grassIdx = this.grassMap[y][x];
        ctx.drawImage(
          this.grassTiles[grassIdx],
          x * this.tileSize,
          y * this.tileSize,
          this.tileSize,
          this.tileSize
        );
      }
    }
    
    // Draw trees with culling
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        if (this.map[y][x] === 1) {
          ctx.drawImage(
            this.treeImg,
            x * this.tileSize,
            y * this.tileSize,
            this.tileSize,
            this.tileSize
          );
        }
      }
    }
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