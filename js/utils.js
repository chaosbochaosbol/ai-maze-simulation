export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

export const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export const keyFromState = (state) => JSON.stringify(state);

export const directions = [
  { name: "N", dx: 0, dy: -1 },
  { name: "E", dx: 1, dy: 0 },
  { name: "S", dx: 0, dy: 1 },
  { name: "W", dx: -1, dy: 0 },
];

export const lerp = (a, b, t) => a + (b - a) * t;

export const range = (n) => Array.from({ length: n }, (_, i) => i);
