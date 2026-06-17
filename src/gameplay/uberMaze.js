import { ui } from '../utils/dom.js';
import { uberState } from '../state/index.js';

let deps = null;

const LEVELS = [
  { cols: 7, rows: 9, seed: 20260617, requiredObstacles: 2, obstacleChance: 0.12, minObstacles: 5, maxObstacles: 7, obstacleSpeed: [0.24, 0.4], requiredSpeed: [0.18, 0.28], playerSpeed: 4.25 },
  { cols: 8, rows: 10, seed: 20260618, requiredObstacles: 3, obstacleChance: 0.18, minObstacles: 8, maxObstacles: 11, obstacleSpeed: [0.3, 0.5], requiredSpeed: [0.22, 0.34], playerSpeed: 4.05 },
  { cols: 9, rows: 11, seed: 20260619, requiredObstacles: 4, obstacleChance: 0.24, minObstacles: 12, maxObstacles: 16, obstacleSpeed: [0.38, 0.62], requiredSpeed: [0.26, 0.42], playerSpeed: 3.9 },
];

let levelIndex = 0;
let levelConfig = LEVELS[0];
let gridW = levelConfig.cols * 2 + 1;
let gridH = levelConfig.rows * 2 + 1;

let grid = [];
let cellSize = 20;
let originX = 0;
let originY = 0;
let checkpoints = [];
let solutionPath = [];
let solutionCells = new Set();
let obstacles = [];
let finishCell = { col: gridW - 2, row: gridH - 2 };
let startCell = { col: 1, row: 1 };

let inputDir = { x: 0, y: 0 };
let mazeInput = { up: false, down: false, left: false, right: false };

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function configureLevel(index) {
  levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
  levelConfig = LEVELS[levelIndex];
  gridW = levelConfig.cols * 2 + 1;
  gridH = levelConfig.rows * 2 + 1;
  finishCell = { col: gridW - 2, row: gridH - 2 };
  startCell = { col: 1, row: 1 };
}

function generateMaze() {
  const rng = mulberry32(levelConfig.seed);
  grid = [];
  for (let y = 0; y < gridH; y++) {
    grid[y] = [];
    for (let x = 0; x < gridW; x++) {
      grid[y][x] = 1;
    }
  }

  const visited = [];
  for (let y = 0; y < levelConfig.rows; y++) {
    visited[y] = [];
    for (let x = 0; x < levelConfig.cols; x++) visited[y][x] = false;
  }

  const stack = [[0, 0]];
  visited[0][0] = true;
  grid[1][1] = 0;

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const neighbors = [];
    const dirs = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx >= 0 && nx < levelConfig.cols && ny >= 0 && ny < levelConfig.rows && !visited[ny][nx]) {
        neighbors.push([nx, ny, dx, dy]);
      }
    }
    if (neighbors.length > 0) {
      const [nx, ny, dx, dy] = neighbors[Math.floor(rng() * neighbors.length)];
      visited[ny][nx] = true;
      grid[cy * 2 + 1][cx * 2 + 1] = 0;
      grid[ny * 2 + 1][nx * 2 + 1] = 0;
      grid[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = 0;
      stack.push([nx, ny]);
    } else {
      stack.pop();
    }
  }

  grid[finishCell.row][finishCell.col] = 0;
  grid[startCell.row][startCell.col] = 0;

  computeCheckpoints();
  computeObstacles(rng);
}

function computeCheckpoints() {
  const path = bfsPath(startCell, finishCell);
  solutionPath = path;
  solutionCells = new Set(path.map((cell) => cellKey(cell.col, cell.row)));
  checkpoints = [];
  if (path.length < 4) {
    checkpoints = [startCell];
    return;
  }
  const third = Math.floor(path.length / 3);
  const twoThirds = Math.floor((path.length * 2) / 3);
  checkpoints = [
    { col: path[0].col, row: path[0].row },
    { col: path[third].col, row: path[third].row },
    { col: path[twoThirds].col, row: path[twoThirds].row },
  ];
}

function bfsPath(from, to) {
  const queue = [[from.col, from.row]];
  const prev = {};
  prev[cellKey(from.col, from.row)] = null;
  while (queue.length > 0) {
    const [c, r] = queue.shift();
    if (c === to.col && r === to.row) break;
    const dirs = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ];
    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= gridW || nr < 0 || nr >= gridH) continue;
      if (grid[nr][nc] === 1) continue;
      if (prev[cellKey(nc, nr)] !== undefined) continue;
      prev[cellKey(nc, nr)] = [c, r];
      queue.push([nc, nr]);
    }
  }
  const path = [];
  let cur = [to.col, to.row];
  while (cur) {
    path.push({ col: cur[0], row: cur[1] });
    cur = prev[cellKey(cur[0], cur[1])];
  }
  path.reverse();
  return path;
}

function cellKey(col, row) {
  return col + ',' + row;
}

function touchesSolution(cells) {
  return cells.some((cell) => solutionCells.has(cellKey(cell.col, cell.row)));
}

function computeObstacles(rng) {
  obstacles = [];
  const used = new Set();

  addRequiredSolutionObstacles(rng, used);

  const tryRun = (c, r, dc, dr) => {
    const cells = [];
    let cc = c;
    let rr = r;
    while (cc >= 0 && cc < gridW && rr >= 0 && rr < gridH && grid[rr][cc] === 0) {
      cells.push({ col: cc, row: rr });
      cc += dc;
      rr += dr;
    }
    return cells;
  };

  for (let r = 1; r < gridH - 1; r++) {
    for (let c = 1; c < gridW - 1; c++) {
      if (grid[r][c] === 1) continue;
      if ((c === startCell.col && r === startCell.row) || (c === finishCell.col && r === finishCell.row)) continue;
      const distStart = Math.abs(c - startCell.col) + Math.abs(r - startCell.row);
      if (distStart < 4) continue;

      if (rng() < levelConfig.obstacleChance) {
        const horizontal = rng() < 0.5;
        const cells = horizontal ? tryRun(c, r, 1, 0) : tryRun(c, r, 0, 1);
        if (cells.length >= 4 && !touchesSolution(cells)) {
          const sig = cells[0].col + ',' + cells[0].row + '-' + cells[cells.length - 1].col + ',' + cells[cells.length - 1].row;
          if (!used.has(sig)) {
            used.add(sig);
            obstacles.push({
              cells,
              t: rng(),
              speed: levelConfig.obstacleSpeed[0] + rng() * (levelConfig.obstacleSpeed[1] - levelConfig.obstacleSpeed[0]),
              dir: 1,
            });
            if (obstacles.length >= levelConfig.maxObstacles) return;
          }
        }
      }
    }
  }

  if (obstacles.length < levelConfig.minObstacles) {
    for (let r = 1; r < gridH - 1 && obstacles.length < levelConfig.minObstacles; r++) {
      const cells = [];
      for (let c = 1; c < gridW - 1; c++) {
        if (grid[r][c] === 0) cells.push({ col: c, row: r });
        if ((grid[r][c] === 1 || c === gridW - 2) && cells.length >= 4 && !touchesSolution(cells)) {
          obstacles.push({
            cells: cells.slice(),
            t: rng(),
            speed: levelConfig.obstacleSpeed[0] + rng() * (levelConfig.obstacleSpeed[1] - levelConfig.obstacleSpeed[0]),
            dir: rng() < 0.5 ? -1 : 1,
          });
        }
        if (grid[r][c] === 1) cells.length = 0;
      }
    }
  }
}

function addRequiredSolutionObstacles(rng, used) {
  const candidates = solutionPath.filter((cell) => isSafeRequiredObstacleCell(cell));
  if (candidates.length === 0) return;

  let lastPathIndex = -999;
  for (let i = 0; i < levelConfig.requiredObstacles; i++) {
    const targetIndex = Math.floor(((i + 1) * solutionPath.length) / (levelConfig.requiredObstacles + 1));
    const cell = findNearestSafeSolutionCell(targetIndex, lastPathIndex + 5);
    if (!cell) continue;

    const sig = 'gate-' + cellKey(cell.col, cell.row);
    if (used.has(sig)) continue;
    used.add(sig);

    const phaseSeed = rng();
    const speed = levelConfig.requiredSpeed[0] + rng() * (levelConfig.requiredSpeed[1] - levelConfig.requiredSpeed[0]);
    const targetOpenPhase = 0.58 + (phaseSeed - 0.5) * 0.08;
    const expectedArrival = cell.pathIndex / levelConfig.playerSpeed;
    const initialPhase = positiveModulo(targetOpenPhase - speed * expectedArrival, 1);

    obstacles.push({
      gate: true,
      col: cell.col,
      row: cell.row,
      t: initialPhase,
      speed,
      closedRatio: 0.42,
      required: true,
    });
    lastPathIndex = cell.pathIndex;
  }
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function findNearestSafeSolutionCell(targetIndex, minPathIndex) {
  let best = null;
  let bestDistance = Infinity;
  for (let i = 0; i < solutionPath.length; i++) {
    if (i < minPathIndex) continue;
    const cell = solutionPath[i];
    if (!isSafeRequiredObstacleCell(cell)) continue;
    const distance = Math.abs(i - targetIndex);
    if (distance < bestDistance) {
      best = { ...cell, pathIndex: i };
      bestDistance = distance;
    }
  }
  return best;
}

function isSafeRequiredObstacleCell(cell) {
  const protectedCells = [startCell, finishCell, ...checkpoints];
  return protectedCells.every((protectedCell) => Math.abs(cell.col - protectedCell.col) + Math.abs(cell.row - protectedCell.row) > 4);
}

function isWall(col, row) {
  if (col < 0 || col >= gridW || row < 0 || row >= gridH) return true;
  return grid[row][col] === 1;
}

function setupCanvasMetrics() {
  const canvas = ui.uberCanvas;
  if (!canvas) return;
  const w = canvas.width;
  const h = canvas.height;
  cellSize = Math.floor(Math.min(w / gridW, h / gridH));
  const mazeW = cellSize * gridW;
  const mazeH = cellSize * gridH;
  originX = Math.floor((w - mazeW) / 2);
  originY = Math.floor((h - mazeH) / 2);
}

function cellCenter(col, row) {
  return {
    x: originX + col * cellSize + cellSize / 2,
    y: originY + row * cellSize + cellSize / 2,
  };
}

function resetPlayerToCheckpoint() {
  const cp = checkpoints[uberState.currentCheckpoint] || checkpoints[0] || startCell;
  const center = cellCenter(cp.col, cp.row);
  uberState.player.x = center.x;
  uberState.player.y = center.y;
  uberState.player.vx = 0;
  uberState.player.vy = 0;
  uberState.invulnTimer = 1.5;
}

function collidesAt(x, y) {
  const r = cellSize * 0.26;
  const minCol = Math.floor((x - r - originX) / cellSize);
  const maxCol = Math.floor((x + r - originX) / cellSize);
  const minRow = Math.floor((y - r - originY) / cellSize);
  const maxRow = Math.floor((y + r - originY) / cellSize);
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (isWall(col, row)) {
        const cx = originX + col * cellSize;
        const cy = originY + row * cellSize;
        const closestX = Math.max(cx, Math.min(x, cx + cellSize));
        const closestY = Math.max(cy, Math.min(y, cy + cellSize));
        const dx = x - closestX;
        const dy = y - closestY;
        if (dx * dx + dy * dy < r * r) return true;
      }
    }
  }
  return false;
}

function updateInputVector() {
  let x = 0;
  let y = 0;
  if (mazeInput.left) x -= 1;
  if (mazeInput.right) x += 1;
  if (mazeInput.up) y -= 1;
  if (mazeInput.down) y += 1;
  if (x !== 0 && y !== 0) {
    x *= 0.7071;
    y *= 0.7071;
  }
  inputDir.x = x;
  inputDir.y = y;
}

export function setMazeInput(dir, active) {
  if (!uberState.mazeRunning) return;
  if (dir === 'up') mazeInput.up = active;
  if (dir === 'down') mazeInput.down = active;
  if (dir === 'left') mazeInput.left = active;
  if (dir === 'right') mazeInput.right = active;
}

export function isUberMazeRunning() {
  return uberState.mazeRunning;
}

export function initUberMaze(dependencies) {
  deps = dependencies;
}

export function openUberApp() {
  if (deps && typeof deps.onExitPointerLock === 'function') deps.onExitPointerLock();
  resetUberMaze();
  if (ui.uberMazeContent) ui.uberMazeContent.classList.remove('is-hidden');
  if (ui.uberMapPinContent) ui.uberMapPinContent.classList.add('is-hidden');
  if (ui.uberMessage) {
    ui.uberMessage.innerHTML = 'Completá los <strong>3 niveles</strong> sin perder las 3 vidas.<br>Si una pelotita del camino está roja, esperá: cuando se transparenta podés cruzar 🚩';
    ui.uberMessage.style.display = 'flex';
  }
  if (ui.uberStartBtn) ui.uberStartBtn.style.display = '';
  if (ui.uberDpad) ui.uberDpad.style.display = 'grid';
  if (ui.uberCanvas) {
    configureLevel(0);
    setupCanvasMetrics();
    generateMaze();
    renderMaze();
  }
  if (deps && typeof deps.onSwitchView === 'function') deps.onSwitchView('phoneUberView');
}

export function startMaze() {
  configureLevel(0);
  generateMaze();
  setupCanvasMetrics();
  uberState.mazeActive = true;
  uberState.mazeRunning = true;
  uberState.lives = 3;
  uberState.startedAt = performance.now();
  uberState.elapsed = 0;
  uberState.score = 0;
  uberState.finished = false;
  uberState.failed = false;
  uberState.currentCheckpoint = 0;
  uberState.invulnTimer = 0;
  mazeInput = { up: false, down: false, left: false, right: false };
  resetPlayerToCheckpoint();
  uberState.invulnTimer = 0;

  if (ui.uberMessage) ui.uberMessage.style.display = 'none';
  if (ui.uberStartBtn) ui.uberStartBtn.style.display = 'none';
  if (ui.uberMazeContent) ui.uberMazeContent.classList.remove('is-hidden');
  if (ui.uberMapPinContent) ui.uberMapPinContent.classList.add('is-hidden');
  updateHud();
  renderMaze();
}

export function resetUberMaze() {
  configureLevel(0);
  uberState.mazeActive = false;
  uberState.mazeRunning = false;
  uberState.lives = 3;
  uberState.elapsed = 0;
  uberState.score = 0;
  uberState.finished = false;
  uberState.failed = false;
  uberState.currentCheckpoint = 0;
  uberState.invulnTimer = 0;
  mazeInput = { up: false, down: false, left: false, right: false };
  if (ui.uberMazeContent) ui.uberMazeContent.classList.remove('is-hidden');
  if (ui.uberMapPinContent) ui.uberMapPinContent.classList.add('is-hidden');
  updateHud();
}

function updateHud() {
  if (ui.uberLevel) ui.uberLevel.textContent = `${levelIndex + 1}/${LEVELS.length}`;
  if (ui.uberLives) ui.uberLives.textContent = String(uberState.lives);
  if (ui.uberTimer) ui.uberTimer.textContent = uberState.elapsed.toFixed(1) + 's';
}

function computeScore(seconds) {
  if (seconds <= 90) return 100;
  if (seconds <= 130) return 75;
  if (seconds <= 180) return 50;
  return 25;
}

function onFinalMazeWin() {
  uberState.mazeRunning = false;
  if (deps && typeof deps.onMazeCompleted === 'function') {
    deps.onMazeCompleted(uberState.elapsed);
  } else {
    uberState.finished = true;
    if (deps && typeof deps.onWin === 'function') deps.onWin(100, uberState.elapsed);
  }
}

function advanceLevel() {
  levelIndex += 1;
  configureLevel(levelIndex);
  generateMaze();
  setupCanvasMetrics();
  uberState.currentCheckpoint = 0;
  resetPlayerToCheckpoint();
  uberState.invulnTimer = 1.2;
  if (ui.uberMessage) {
    ui.uberMessage.innerHTML = `Nivel ${levelIndex + 1}/${LEVELS.length}<br><span style="font-size:0.85rem;">Ahora hay que medir mejor el timing.</span>`;
    ui.uberMessage.style.display = 'flex';
    setTimeout(() => {
      if (uberState.mazeRunning && ui.uberMessage) ui.uberMessage.style.display = 'none';
    }, 1200);
  }
  updateHud();
  renderMaze();
}

function onMazeFail() {
  uberState.mazeRunning = false;
  uberState.failed = true;
  if (ui.uberMessage) {
    ui.uberMessage.textContent = 'Sin intentos…';
    ui.uberMessage.style.display = 'flex';
  }
  if (deps && typeof deps.onFail === 'function') deps.onFail();
}

function hitObstacle() {
  uberState.lives -= 1;
  updateHud();
  if (uberState.lives <= 0) {
    onMazeFail();
    return;
  }
  resetPlayerToCheckpoint();
}

function getObstaclePosition(obs) {
  if (obs.gate) return cellCenter(obs.col, obs.row);

  const n = obs.cells.length;
  const seg = obs.t * (n - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  const a = obs.cells[i];
  const b = obs.cells[Math.min(i + 1, n - 1)];
  const ca = cellCenter(a.col, a.row);
  const cb = cellCenter(b.col, b.row);
  return { x: ca.x + (cb.x - ca.x) * f, y: ca.y + (cb.y - ca.y) * f };
}

function isGateClosed(obs) {
  return obs.gate && obs.t < obs.closedRatio;
}

export function updateUberMaze(dt) {
  if (!uberState.mazeRunning) return;

  uberState.elapsed = (performance.now() - uberState.startedAt) / 1000;
  updateHud();

  if (uberState.invulnTimer > 0) uberState.invulnTimer -= dt;

  updateInputVector();

  const speed = cellSize * levelConfig.playerSpeed;
  const dx = inputDir.x * speed * dt;
  const dy = inputDir.y * speed * dt;

  if (dx !== 0 && !collidesAt(uberState.player.x + dx, uberState.player.y)) {
    uberState.player.x += dx;
  }
  if (dy !== 0 && !collidesAt(uberState.player.x, uberState.player.y + dy)) {
    uberState.player.y += dy;
  }

  const playerCol = Math.floor((uberState.player.x - originX) / cellSize);
  const playerRow = Math.floor((uberState.player.y - originY) / cellSize);

  for (let i = 1; i < checkpoints.length; i++) {
    if (playerCol === checkpoints[i].col && playerRow === checkpoints[i].row && i > uberState.currentCheckpoint) {
      uberState.currentCheckpoint = i;
    }
  }

  if (playerCol === finishCell.col && playerRow === finishCell.row) {
    if (levelIndex < LEVELS.length - 1) {
      advanceLevel();
    } else {
      onFinalMazeWin();
    }
    return;
  }

  for (const obs of obstacles) {
    if (obs.gate) {
      obs.t = (obs.t + obs.speed * dt) % 1;
    } else {
      obs.t += obs.speed * obs.dir * dt;
      if (obs.t >= 1) {
        obs.t = 1;
        obs.dir = -1;
      } else if (obs.t <= 0) {
        obs.t = 0;
        obs.dir = 1;
      }
    }

    if (obs.gate && !isGateClosed(obs)) continue;

    if (uberState.invulnTimer <= 0) {
      const pos = getObstaclePosition(obs);
      const r = cellSize * (obs.gate ? 0.34 : 0.4);
      const ddx = uberState.player.x - pos.x;
      const ddy = uberState.player.y - pos.y;
      if (ddx * ddx + ddy * ddy < r * r) {
        hitObstacle();
        if (!uberState.mazeRunning) return;
      }
    }
  }

  renderMaze();
}

function renderMaze() {
  const canvas = ui.uberCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, w, h);

  for (let row = 0; row < gridH; row++) {
    for (let col = 0; col < gridW; col++) {
      const x = originX + col * cellSize;
      const y = originY + row * cellSize;
      if (grid[row][col] === 1) {
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.fillStyle = '#2557a0';
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }
  }

  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i];
    const c = cellCenter(cp.col, cp.row);
    ctx.beginPath();
    ctx.arc(c.x, c.y, cellSize * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = i <= uberState.currentCheckpoint ? 'rgba(34,197,94,0.85)' : 'rgba(34,197,94,0.3)';
    ctx.fill();
    if (i > uberState.currentCheckpoint) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  const fc = cellCenter(finishCell.col, finishCell.row);
  ctx.fillStyle = '#fbbf24';
  ctx.font = `${Math.floor(cellSize * 0.7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚩', fc.x, fc.y);

  for (const obs of obstacles) {
    const pos = getObstaclePosition(obs);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, cellSize * (obs.gate ? 0.24 : 0.22), 0, Math.PI * 2);
    ctx.fillStyle = obs.gate && !isGateClosed(obs) ? 'rgba(239,68,68,0.18)' : '#ef4444';
    ctx.fill();
    ctx.strokeStyle = obs.gate && !isGateClosed(obs) ? 'rgba(252,165,165,0.45)' : '#fca5a5';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  const blink = uberState.invulnTimer > 0 && Math.floor(uberState.invulnTimer * 10) % 2 === 0;
  if (!blink) {
    ctx.beginPath();
    ctx.arc(uberState.player.x, uberState.player.y, cellSize * 0.27, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function attachUberListeners() {
  if (ui.uberStartBtn) {
    ui.uberStartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startMaze();
    });
  }

  if (ui.uberDpad) {
    ui.uberDpad.querySelectorAll('.uber-dpad-btn').forEach((btn) => {
      const dir = btn.getAttribute('data-uber-dir');
      const press = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMazeInput(dir, true);
      };
      const release = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMazeInput(dir, false);
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release);
    });
  }
}
