import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { lerp } from "./utils.js";

export class Renderer {
  constructor({ canvas, maze, tileSize = 1 }) {
    this.canvas = canvas;
    this.maze = maze;
    this.tileSize = tileSize;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x02060f, 10, 45);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    this.camera.position.set(0, 25, 0.01);
    this.camera.lookAt(0, 0, 0);

    this.targetZoom = 25;

    this.objects = {
      floor: null,
      walls: null,
      agents: new Map(),
      pathLines: new Map(),
    };

    this.initLights();
    this.buildMaze();

    window.addEventListener("resize", () => this.onResize());
  }

  initLights() {
    const ambient = new THREE.AmbientLight(0x3a5b72, 0.6);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0x7af0ff, 1.1);
    key.position.set(8, 18, 6);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    key.shadow.camera.near = 5;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -20;
    key.shadow.camera.right = 20;
    key.shadow.camera.top = 20;
    key.shadow.camera.bottom = -20;
    this.scene.add(key);

    const rim = new THREE.PointLight(0x416dff, 0.8, 40);
    rim.position.set(-10, 12, -10);
    this.scene.add(rim);
  }

  buildMaze() {
    if (this.objects.floor) {
      this.scene.remove(this.objects.floor);
      this.scene.remove(this.objects.walls);
    }

    const { size } = this.maze;
    const floorGeo = new THREE.BoxGeometry(this.tileSize, 0.2, this.tileSize);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1623,
      emissive: 0x0b1f2e,
      emissiveIntensity: 0.6,
    });
    const floor = new THREE.InstancedMesh(floorGeo, floorMat, size * size);
    floor.receiveShadow = true;
    floor.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    floor.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(size * size * 3), 3);

    const wallGeo = new THREE.BoxGeometry(this.tileSize, 1.2, this.tileSize);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0b1f2e,
      emissive: 0x1c3752,
      emissiveIntensity: 0.4,
      roughness: 0.4,
      metalness: 0.2,
    });
    const wallInstances = [];

    let index = 0;
    let wallIndex = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const posX = (x - size / 2) * this.tileSize;
        const posZ = (y - size / 2) * this.tileSize;
        const matrix = new THREE.Matrix4().makeTranslation(posX, -0.15, posZ);
        floor.setMatrixAt(index, matrix);
        floor.setColorAt(index, new THREE.Color(0x0b1623));
        if (this.maze.isWall(x, y)) {
          wallInstances.push({ x: posX, z: posZ });
        }
        index += 1;
      }
    }

    const walls = new THREE.InstancedMesh(wallGeo, wallMat, wallInstances.length);
    walls.castShadow = true;
    walls.receiveShadow = true;
    wallInstances.forEach((wall, idx) => {
      const matrix = new THREE.Matrix4().makeTranslation(wall.x, 0.45, wall.z);
      walls.setMatrixAt(idx, matrix);
      wallIndex += 1;
    });

    this.objects.floor = floor;
    this.objects.walls = walls;
    this.scene.add(floor);
    this.scene.add(walls);
  }

  rebuildWalls() {
    this.scene.remove(this.objects.walls);
    const { size } = this.maze;
    const wallGeo = new THREE.BoxGeometry(this.tileSize, 1.2, this.tileSize);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0b1f2e,
      emissive: 0x1c3752,
      emissiveIntensity: 0.4,
      roughness: 0.4,
      metalness: 0.2,
    });
    const wallInstances = [];
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (this.maze.isWall(x, y)) {
          wallInstances.push({
            x: (x - size / 2) * this.tileSize,
            z: (y - size / 2) * this.tileSize,
          });
        }
      }
    }
    const walls = new THREE.InstancedMesh(wallGeo, wallMat, wallInstances.length);
    walls.castShadow = true;
    walls.receiveShadow = true;
    wallInstances.forEach((wall, idx) => {
      const matrix = new THREE.Matrix4().makeTranslation(wall.x, 0.45, wall.z);
      walls.setMatrixAt(idx, matrix);
    });
    this.objects.walls = walls;
    this.scene.add(walls);
  }

  addAgent(agent) {
    const geometry = new THREE.BoxGeometry(this.tileSize * 0.7, 0.8, this.tileSize * 0.7);
    const material = new THREE.MeshStandardMaterial({
      color: agent.color,
      emissive: agent.color,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.3,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.set(0, 0.4, 0);
    this.scene.add(mesh);
    this.objects.agents.set(agent.id, mesh);

    const lineMaterial = new THREE.LineBasicMaterial({ color: agent.color, transparent: true, opacity: 0.7 });
    const lineGeometry = new THREE.BufferGeometry();
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.visible = false;
    this.scene.add(line);
    this.objects.pathLines.set(agent.id, line);
  }

  updateAgent(agent, smoothing = 0.3) {
    const mesh = this.objects.agents.get(agent.id);
    const { size } = this.maze;
    const targetX = (agent.position.x - size / 2) * this.tileSize;
    const targetZ = (agent.position.y - size / 2) * this.tileSize;
    mesh.position.x = lerp(mesh.position.x, targetX, smoothing);
    mesh.position.z = lerp(mesh.position.z, targetZ, smoothing);
  }

  updateHeatmap() {
    const { size } = this.maze;
    let index = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const heat = this.maze.getHeat(x, y);
        const heatValue = Math.min(1, (heat.red + heat.blue) / 80);
        const color = new THREE.Color().setHSL(0.6 - heatValue * 0.5, 0.7, 0.15 + heatValue * 0.35);
        this.objects.floor.setColorAt(index, color);
        index += 1;
      }
    }
    this.objects.floor.instanceColor.needsUpdate = true;
  }

  updatePaths(agents, debugEnabled) {
    agents.forEach((agent) => {
      const line = this.objects.pathLines.get(agent.id);
      line.visible = debugEnabled;
      if (!debugEnabled) return;
      const positions = [];
      agent.path.forEach((node) => {
        positions.push((node.x - this.maze.size / 2) * this.tileSize, 0.15, (node.y - this.maze.size / 2) * this.tileSize);
      });
      line.geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      line.geometry.computeBoundingSphere();
    });
  }

  setZoom(zoom) {
    this.targetZoom = zoom;
  }

  updateCamera() {
    this.camera.position.y = lerp(this.camera.position.y, this.targetZoom, 0.05);
    this.camera.lookAt(0, 0, 0);
  }

  onResize() {
    const { clientWidth, clientHeight } = this.canvas;
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
