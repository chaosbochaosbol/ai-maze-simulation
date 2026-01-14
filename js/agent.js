import { QLearner } from "./qlearning.js";
import { clamp, directions, manhattan } from "./utils.js";

export class Agent {
  constructor({ id, color, start, actions, epsilon }) {
    this.id = id;
    this.color = color;
    this.position = { ...start };
    this.previousPosition = { ...start };
    this.actions = actions;
    this.learner = new QLearner({ actions, epsilon });
    this.cooldown = 0;
    this.path = [];
  }

  reset(start) {
    this.position = { ...start };
    this.previousPosition = { ...start };
    this.cooldown = 0;
    this.path = [];
  }

  getState(maze, opponent) {
    const dx = clamp(opponent.x - this.position.x, -2, 2);
    const dy = clamp(opponent.y - this.position.y, -2, 2);
    const walls = directions.map((dir) => (maze.isWall(this.position.x + dir.dx, this.position.y + dir.dy) ? 1 : 0));
    const deadEnd = maze.deadEndCount(this.position.x, this.position.y) ? 1 : 0;
    return { dx, dy, walls, deadEnd };
  }

  chooseAction(state) {
    return this.learner.chooseAction(state);
  }

  update(state, actionIndex, reward, nextState) {
    this.learner.update(state, actionIndex, reward, nextState);
  }

  moveTo(x, y) {
    this.previousPosition = { ...this.position };
    this.position = { x, y };
    this.path.push({ x, y });
    if (this.path.length > 30) {
      this.path.shift();
    }
  }

  distanceTo(opponent) {
    return manhattan(this.position, opponent);
  }
}
