import { Maze } from "./maze.js";
import { Agent } from "./agent.js";
import { Renderer } from "./renderer.js";
import { UIController } from "./ui.js";
import { directions, manhattan } from "./utils.js";

const canvas = document.getElementById("scene");

const CONFIG = {
  mazeSize: 21,
  maxEpisodeTicks: 600,
  tickDuration: 0.1,
  wallCooldown: 10,
};

const maze = new Maze({ size: CONFIG.mazeSize });
const renderer = new Renderer({ canvas, maze });
const ui = new UIController();

const redActions = directions.map((dir) => ({ type: "move", dir }));
const blueActions = [
  ...directions.map((dir) => ({ type: "move", dir })),
  ...directions.map((dir) => ({ type: "block", dir })),
];

const redAgent = new Agent({
  id: "red",
  color: 0xff4d6d,
  start: maze.findRandomEmpty(),
  actions: redActions,
  epsilon: 0.25,
});

const blueAgent = new Agent({
  id: "blue",
  color: 0x4b7cff,
  start: maze.findRandomEmpty(),
  actions: blueActions,
  epsilon: 0.25,
});

renderer.addAgent(redAgent);
renderer.addAgent(blueAgent);

const state = {
  running: false,
  speed: 1,
  episodeTicks: 0,
  episodeIndex: 1,
  redWins: 0,
  blueWins: 0,
  debug: false,
};

const resetEpisode = () => {
  maze.generate();
  renderer.buildMaze();
  const redStart = maze.findRandomEmpty();
  let blueStart = maze.findRandomEmpty();
  while (manhattan(redStart, blueStart) < 6) {
    blueStart = maze.findRandomEmpty();
  }
  redAgent.reset(redStart);
  blueAgent.reset(blueStart);
  state.episodeTicks = 0;
  state.episodeIndex += 1;
};

const resetLearning = () => {
  redAgent.learner.reset();
  blueAgent.learner.reset();
  state.redWins = 0;
  state.blueWins = 0;
  state.episodeIndex = 1;
  resetEpisode();
};

const applyMovement = (agent, dir) => {
  const nextX = agent.position.x + dir.dx;
  const nextY = agent.position.y + dir.dy;
  if (maze.isWall(nextX, nextY)) {
    return false;
  }
  agent.moveTo(nextX, nextY);
  return true;
};

const attemptWallBlock = (dir) => {
  if (blueAgent.cooldown > 0) {
    return { success: false, reward: -2 };
  }
  const targetX = blueAgent.position.x + dir.dx;
  const targetY = blueAgent.position.y + dir.dy;
  if (!maze.canPlaceWall(targetX, targetY)) {
    return { success: false, reward: -2 };
  }
  if ((targetX === redAgent.position.x && targetY === redAgent.position.y) || (targetX === blueAgent.position.x && targetY === blueAgent.position.y)) {
    return { success: false, reward: -2 };
  }

  const previousDistance = maze.shortestPathLength(redAgent.position, blueAgent.position);
  maze.setWall(targetX, targetY, true);
  const pathExists = maze.hasPath(redAgent.position, blueAgent.position);

  if (!pathExists) {
    maze.setWall(targetX, targetY, false);
    return { success: false, reward: -5 };
  }

  const newDistance = maze.shortestPathLength(redAgent.position, blueAgent.position);
  blueAgent.cooldown = CONFIG.wallCooldown;
  renderer.rebuildWalls();
  const bonus = newDistance > previousDistance ? 10 : 4;
  return { success: true, reward: bonus };
};

const stepAgents = () => {
  const redState = redAgent.getState(maze, blueAgent.position);
  const redActionIndex = redAgent.chooseAction(redState);
  const redAction = redAgent.actions[redActionIndex];

  let redReward = -1;
  if (redAction.type === "move") {
    const moved = applyMovement(redAgent, redAction.dir);
    if (!moved) {
      redReward -= 1;
    }
  }

  if (maze.deadEndCount(redAgent.position.x, redAgent.position.y)) {
    redReward -= 10;
  }

  const redCaught = redAgent.position.x === blueAgent.position.x && redAgent.position.y === blueAgent.position.y;
  if (redCaught) {
    redReward += 100;
  }

  const redNextState = redAgent.getState(maze, blueAgent.position);
  redAgent.update(redState, redActionIndex, redReward, redNextState);

  const blueState = blueAgent.getState(maze, redAgent.position);
  const blueActionIndex = blueAgent.chooseAction(blueState);
  const blueAction = blueAgent.actions[blueActionIndex];

  let blueReward = 1;
  if (blueAction.type === "move") {
    const moved = applyMovement(blueAgent, blueAction.dir);
    if (!moved) {
      blueReward -= 1;
    }
  }

  if (blueAction.type === "block") {
    const result = attemptWallBlock(blueAction.dir);
    blueReward += result.reward;
  }

  const blueCaught = redAgent.position.x === blueAgent.position.x && redAgent.position.y === blueAgent.position.y;
  if (blueCaught) {
    blueReward -= 100;
  }

  const blueNextState = blueAgent.getState(maze, redAgent.position);
  blueAgent.update(blueState, blueActionIndex, blueReward, blueNextState);

  if (blueAgent.cooldown > 0) {
    blueAgent.cooldown -= 1;
  }

  maze.recordVisit(redAgent.position.x, redAgent.position.y, "red");
  maze.recordVisit(blueAgent.position.x, blueAgent.position.y, "blue");

  return { redCaught, blueCaught };
};

const endEpisode = (winner) => {
  if (winner === "red") {
    state.redWins += 1;
  } else {
    state.blueWins += 1;
  }
  resetEpisode();
};

ui.bind({
  onToggle: () => {
    state.running = !state.running;
  },
  onReset: resetLearning,
  onSpeedChange: (speed) => {
    state.speed = speed;
    ui.setSpeedActive(speed);
    renderer.setZoom(22 + Math.log(speed + 1) * 3);
  },
  onDebugToggle: (enabled) => {
    state.debug = enabled;
  },
});

ui.setSpeedActive(state.speed);

const updateUI = () => {
  ui.updateStatus({
    episodeTime: state.episodeTicks * CONFIG.tickDuration,
    redWins: state.redWins,
    blueWins: state.blueWins,
    speed: state.speed,
    epsilon: Math.max(redAgent.learner.epsilon, blueAgent.learner.epsilon),
    episodeIndex: state.episodeIndex,
    running: state.running,
    redState: JSON.stringify(redAgent.getState(maze, blueAgent.position)),
    blueState: JSON.stringify(blueAgent.getState(maze, redAgent.position)),
  });
};

const animate = () => {
  if (state.running) {
    for (let i = 0; i < state.speed; i += 1) {
      const result = stepAgents();
      state.episodeTicks += 1;
      if (result.redCaught) {
        endEpisode("red");
        break;
      }
      if (state.episodeTicks >= CONFIG.maxEpisodeTicks) {
        endEpisode("blue");
        break;
      }
    }
  }

  renderer.updateAgent(redAgent);
  renderer.updateAgent(blueAgent);
  renderer.updateHeatmap();
  renderer.updatePaths([redAgent, blueAgent], state.debug);
  renderer.updateCamera();
  renderer.render();
  updateUI();
  requestAnimationFrame(animate);
};

animate();
