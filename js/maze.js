import { directions, pickRandom, range } from "./utils.js";

export class Maze {
  constructor({ size = 21 }) {
    this.size = size % 2 === 0 ? size + 1 : size;
    this.grid = [];
    this.visitHeat = new Map();
    this.generate();
  }

  generate() {
    this.grid = range(this.size).map(() => range(this.size).map(() => 1));
    const stack = [];
    const start = { x: 1, y: 1 };
    this.grid[start.y][start.x] = 0;
    stack.push(start);

    while (stack.length) {
      const current = stack[stack.length - 1];
      const neighbors = directions
        .map((dir) => ({
          x: current.x + dir.dx * 2,
          y: current.y + dir.dy * 2,
          between: { x: current.x + dir.dx, y: current.y + dir.dy },
        }))
        .filter((cell) => this.isInBounds(cell.x, cell.y))
        .filter((cell) => this.grid[cell.y][cell.x] === 1);

      if (neighbors.length === 0) {
        stack.pop();
        continue;
      }

      const next = pickRandom(neighbors);
      this.grid[next.between.y][next.between.x] = 0;
      this.grid[next.y][next.x] = 0;
      stack.push({ x: next.x, y: next.y });
    }

    this.visitHeat.clear();
  }

  isInBounds(x, y) {
    return x > 0 && y > 0 && x < this.size - 1 && y < this.size - 1;
  }

  isWall(x, y) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) {
      return true;
    }
    return this.grid[y][x] === 1;
  }

  isEmpty(x, y) {
    return !this.isWall(x, y);
  }

  setWall(x, y, value) {
    if (!this.isInBounds(x, y)) return;
    this.grid[y][x] = value ? 1 : 0;
  }

  findRandomEmpty() {
    let x = 1;
    let y = 1;
    do {
      x = 1 + Math.floor(Math.random() * (this.size - 2));
      y = 1 + Math.floor(Math.random() * (this.size - 2));
    } while (this.isWall(x, y));
    return { x, y };
  }

  neighbors(x, y) {
    return directions.map((dir) => ({ dir, x: x + dir.dx, y: y + dir.dy }));
  }

  deadEndCount(x, y) {
    const open = this.neighbors(x, y).filter((cell) => !this.isWall(cell.x, cell.y));
    return open.length <= 1;
  }

  canPlaceWall(x, y) {
    return this.isInBounds(x, y) && this.isEmpty(x, y);
  }

  recordVisit(x, y, agentId) {
    const key = `${x},${y}`;
    if (!this.visitHeat.has(key)) {
      this.visitHeat.set(key, { red: 0, blue: 0 });
    }
    this.visitHeat.get(key)[agentId] += 1;
  }

  getHeat(x, y) {
    const key = `${x},${y}`;
    return this.visitHeat.get(key) || { red: 0, blue: 0 };
  }

  shortestPathLength(start, target) {
    const queue = [{ ...start, dist: 0 }];
    const visited = new Set([`${start.x},${start.y}`]);

    while (queue.length) {
      const current = queue.shift();
      if (current.x === target.x && current.y === target.y) {
        return current.dist;
      }
      for (const neighbor of this.neighbors(current.x, current.y)) {
        if (this.isWall(neighbor.x, neighbor.y)) continue;
        const key = `${neighbor.x},${neighbor.y}`;
        if (visited.has(key)) continue;
        visited.add(key);
        queue.push({ x: neighbor.x, y: neighbor.y, dist: current.dist + 1 });
      }
    }
    return Infinity;
  }

  hasPath(start, target) {
    return Number.isFinite(this.shortestPathLength(start, target));
  }
}
