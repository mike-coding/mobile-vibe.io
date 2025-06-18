export class TileMap {
  constructor(map, grassMap, grassTiles, treeImg, tileSize = 64) {
    this.map = map;
    this.grassMap = grassMap;
    this.grassTiles = grassTiles;
    this.treeImg = treeImg;
    this.tileSize = tileSize;
  }

  draw(ctx) {
    // Draw grass
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
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
    // Draw trees
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
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