import { keyFromState } from "./utils.js";

export class QLearner {
  constructor({ actions, alpha = 0.2, gamma = 0.9, epsilon = 0.2, epsilonMin = 0.05, epsilonDecay = 0.999 }) {
    this.actions = actions;
    this.alpha = alpha;
    this.gamma = gamma;
    this.epsilon = epsilon;
    this.epsilonMin = epsilonMin;
    this.epsilonDecay = epsilonDecay;
    this.qTable = new Map();
  }

  reset() {
    this.qTable.clear();
    this.epsilon = 0.2;
  }

  getQValues(state) {
    const key = keyFromState(state);
    if (!this.qTable.has(key)) {
      this.qTable.set(key, new Array(this.actions.length).fill(0));
    }
    return this.qTable.get(key);
  }

  chooseAction(state) {
    const qValues = this.getQValues(state);
    if (Math.random() < this.epsilon) {
      return Math.floor(Math.random() * this.actions.length);
    }
    const maxQ = Math.max(...qValues);
    const best = qValues
      .map((value, index) => ({ value, index }))
      .filter((item) => item.value === maxQ)
      .map((item) => item.index);
    return best[Math.floor(Math.random() * best.length)];
  }

  update(state, actionIndex, reward, nextState) {
    const qValues = this.getQValues(state);
    const nextQ = this.getQValues(nextState);
    const bestNext = Math.max(...nextQ);
    qValues[actionIndex] = qValues[actionIndex] + this.alpha * (reward + this.gamma * bestNext - qValues[actionIndex]);
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
  }
}
