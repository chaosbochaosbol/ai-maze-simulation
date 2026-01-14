# AI Maze Simulation

This project is a real-time 3D top-down simulation of two reinforcement learning agents in a procedurally generated sci-fi maze. The environment is rebuilt every episode to keep learning non-trivial, while both agents continuously update their policies with an on-policy Q-learning loop.

## Running

Open `index.html` with a local server (recommended) or a static file server of your choice.

## Architecture Overview

The implementation is intentionally modular so each subsystem can be swapped or extended without touching the rest of the project.

- **Maze generation (`js/maze.js`)**
  - Generates a perfect maze with randomized depth-first carving on a grid of odd dimensions.
  - Provides pathfinding utilities (shortest path length, connectivity checks) used by both agents.
  - Tracks heatmap visits for visualization of frequently traversed corridors.

- **Agents (`js/agent.js`)**
  - Red (predator) and blue (prey) agents share a common base with independent Q-learning policies.
  - Each agent tracks movement history for debug rendering.

- **Reinforcement Learning (`js/qlearning.js`)**
  - Tabular Q-learning with epsilon-greedy exploration.
  - Online update: `state → action → reward → update` performed every tick.
  - Each agent has its own Q-table and decaying epsilon.

- **Rendering (`js/renderer.js`)**
  - Three.js scene with neon-leaning materials, emissive accents, soft shadows, and fog.
  - Top-down camera with smooth zoom transitions.
  - Instanced meshes for maze tiles and walls to keep updates lightweight.
  - Heatmap and debug path line overlays for training insight.

- **UI / HUD (`js/ui.js`)**
  - Start/Pause, reset learning, speed control (x1/x5/x20), and debug toggle.
  - Live metrics for episode time, wins, exploration rate, and agent state.

## State Representation

Each agent receives a compact discrete state vector to keep the Q-table manageable:

- **Relative position:** clamped `dx, dy` in the range `[-2, 2]` between agent and opponent.
- **Local wall occupancy:** 4-bit vector for walls in North/East/South/West.
- **Dead-end flag:** whether the current cell has <= 1 exit.

This yields a small but expressive state that captures local topology and pursuit context.

## Rewards

**Red (predator):**
- `+100` for capture.
- `-1` per step.
- `-10` for entering a dead-end.

**Blue (prey):**
- `+1` per tick survived.
- `+10` for a successful wall block that increases shortest path length.
- `+4` for a valid wall block that does not increase distance.
- `-100` when caught.
- Additional penalties for invalid wall placements or blocked movement.

Blue wall blocks are limited by cooldown and cannot completely trap the red agent (path connectivity is enforced).

## Expansion Paths

The system is designed for research-oriented extensions:

- **Multiple agents:** spawn additional predators/prey with distinct policies.
- **Hierarchical actions:** add wall removal, temporal planning, or multi-tile moves.
- **Environment evolution:** increase maze size over curriculum episodes or mutate walls mid-episode.
- **Function approximation:** replace Q-tables with neural networks, tile coding, or SARSA(λ).
- **Observability limits:** restrict perception to local radius or ray-cast sensors for partial observability.

---

**Tip:** enable Debug mode to visualize agent paths and watch how high-frequency corridors emerge in the heatmap.
