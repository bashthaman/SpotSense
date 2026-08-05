// lot-demo.js — simulated top-down lot view (no real sensor data).
// Rows + occupancy state live in the DOM (same as before). All car motion
// is rendered on a canvas overlay, driven by requestAnimationFrame, so
// cars move continuously frame-by-frame instead of jumping between two
// CSS states — genuinely fluid, not a blink.

const ROW_COUNTS = [16, 19, 21, 22, 19, 15, 11];
const FLIP_INTERVAL_MS = 2200;   // how often we pick spots to change occupancy
const FLIPS_PER_TICK = [1, 4];
const INITIAL_OCCUPANCY = 0.55;
const AMBIENT_SPAWN_MS = 1100;   // how often a new through-traffic car appears
const CAR_COLORS = ['#F15A22', '#1FD8C4', '#FFB627', '#E8432F'];

const field = document.getElementById('lotField');
const canvas = document.getElementById('trafficCanvas');
const ctx = canvas.getContext('2d');
const occupiedCountEl = document.getElementById('occupiedCount');
const vacantCountEl = document.getElementById('vacantCount');
const utilPctEl = document.getElementById('utilPct');
const toastContainer = document.getElementById('toastContainer');

const spots = [];       // spot DOM elements, index-aligned with spotLayout
const spotLayout = [];  // { x, y, row } in field-local pixel coords
const aisleEls = [];
const aisleYs = [];     // aisle center-y per row, in field-local pixel coords

// ---------- Build the grid (rows of stalls + an aisle under each row) ----------
ROW_COUNTS.forEach((count, rowIndex) => {
  const wrap = document.createElement('div');
  wrap.className = 'lot-row-wrap';

  const label = document.createElement('span');
  label.className = 'row-label';
  label.textContent = `Row ${rowIndex + 1}`;
  wrap.appendChild(label);

  const row = document.createElement('div');
  row.className = 'lot-row';
  for (let i = 0; i < count; i++) {
    const spot = document.createElement('div');
    spot.className = 'lot-spot';
    spot.dataset.row = rowIndex;
    if (Math.random() < INITIAL_OCCUPANCY) spot.classList.add('occupied');
    row.appendChild(spot);
    spots.push(spot);
  }
  wrap.appendChild(row);
  field.appendChild(wrap);

  const aisle = document.createElement('div');
  aisle.className = 'lot-aisle';
  field.appendChild(aisle);
  aisleEls.push(aisle);
});

// ---------- Canvas sizing + coordinate layout ----------
let fieldRect, canvasCssWidth, canvasCssHeight;

function resizeCanvas() {
  fieldRect = field.getBoundingClientRect();
  canvasCssWidth = fieldRect.width;
  canvasCssHeight = fieldRect.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvasCssWidth * dpr;
  canvas.height = canvasCssHeight * dpr;
  canvas.style.width = `${canvasCssWidth}px`;
  canvas.style.height = `${canvasCssHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function computeLayout() {
  fieldRect = field.getBoundingClientRect();

  aisleYs.length = 0;
  aisleEls.forEach((aisle) => {
    const r = aisle.getBoundingClientRect();
    aisleYs.push(r.top + r.height / 2 - fieldRect.top);
  });

  spotLayout.length = 0;
  spots.forEach((spot) => {
    const r = spot.getBoundingClientRect();
    spotLayout.push({
      x: r.left + r.width / 2 - fieldRect.left,
      y: r.top + r.height / 2 - fieldRect.top,
      row: Number(spot.dataset.row),
    });
  });
}

function refreshLayout() {
  resizeCanvas();
  computeLayout();
}
refreshLayout();

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(refreshLayout, 150);
});

// ---------- Car engine ----------
// Each car has a path of waypoints and moves toward the next one at a
// constant speed (px/sec), fully re-computed every animation frame.
let cars = [];

function makeCar(path, opts = {}) {
  return {
    path,
    seg: 0,
    x: path[0].x,
    y: path[0].y,
    speed: opts.speed || 90,
    color: opts.color || CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    dir: 'h', // 'h' or 'v', used to orient the drawn rectangle
    dead: false,
  };
}

function updateCars(dtSeconds) {
  cars.forEach((car) => {
    const target = car.path[car.seg];
    if (!target) { car.dead = true; return; }
    const dx = target.x - car.x;
    const dy = target.y - car.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.5) {
      car.dir = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
    }

    const step = car.speed * dtSeconds;
    if (step >= dist) {
      car.x = target.x;
      car.y = target.y;
      car.seg++;
      if (car.seg >= car.path.length) car.dead = true;
    } else {
      car.x += (dx / dist) * step;
      car.y += (dy / dist) * step;
    }
  });
  cars = cars.filter((c) => !c.dead);
}

function drawCars() {
  ctx.clearRect(0, 0, canvasCssWidth, canvasCssHeight);
  cars.forEach((car) => {
    const w = car.dir === 'h' ? 15 : 8;
    const h = car.dir === 'h' ? 8 : 15;
    ctx.fillStyle = car.color;
    ctx.shadowColor = car.color;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.roundRect(car.x - w / 2, car.y - h / 2, w, h, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
}

let lastTs = null;
function tick(ts) {
  if (lastTs === null) lastTs = ts;
  const dt = Math.min((ts - lastTs) / 1000, 0.1); // clamp to avoid big jumps on tab-away
  lastTs = ts;
  updateCars(dt);
  drawCars();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ---------- Ambient through-traffic: cars driving the length of an aisle ----------
function spawnAmbientCar() {
  if (aisleYs.length === 0) return;
  const rowIndex = Math.floor(Math.random() * aisleYs.length);
  const y = aisleYs[rowIndex];
  const goingRight = Math.random() < 0.5;
  const margin = 20;
  const startX = goingRight ? -margin : canvasCssWidth + margin;
  const endX = goingRight ? canvasCssWidth + margin : -margin;

  const path = [{ x: startX, y }, { x: endX, y }];
  cars.push(makeCar(path, { speed: 70 + Math.random() * 50 }));
}
setInterval(spawnAmbientCar, AMBIENT_SPAWN_MS);

// ---------- Parking-event traffic: a car actually drives into/out of a stall ----------
function spawnParkingCar(spotIndex, direction) {
  const spot = spotLayout[spotIndex];
  if (!spot) return;
  const aisleY = aisleYs[spot.row];
  const fromLeft = Math.random() < 0.5;
  const edgeX = fromLeft ? -20 : canvasCssWidth + 20;

  let path;
  if (direction === 'enter') {
    // Drive in along the aisle, then turn straight into the stall
    path = [
      { x: edgeX, y: aisleY },
      { x: spot.x, y: aisleY },
      { x: spot.x, y: spot.y },
    ];
  } else {
    // Pull out of the stall into the aisle, then drive off
    path = [
      { x: spot.x, y: spot.y },
      { x: spot.x, y: aisleY },
      { x: edgeX, y: aisleY },
    ];
  }
  cars.push(makeCar(path, { speed: 110 }));
}

// ---------- Occupancy simulation (unchanged logic, now drives spawnParkingCar) ----------
function vacantCountsByRow() {
  const counts = new Array(ROW_COUNTS.length).fill(0);
  spots.forEach((s) => {
    if (!s.classList.contains('occupied')) counts[Number(s.dataset.row)]++;
  });
  return counts;
}
let lastVacantByRow = vacantCountsByRow();

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function updateStats() {
  const occupied = spots.filter((s) => s.classList.contains('occupied')).length;
  const total = spots.length;
  occupiedCountEl.textContent = occupied;
  vacantCountEl.textContent = total - occupied;
  utilPctEl.textContent = `${Math.round((occupied / total) * 100)}%`;
}

function randomFlip() {
  const flips = Math.floor(
    Math.random() * (FLIPS_PER_TICK[1] - FLIPS_PER_TICK[0] + 1) + FLIPS_PER_TICK[0]
  );
  for (let i = 0; i < flips; i++) {
    const idx = Math.floor(Math.random() * spots.length);
    const spot = spots[idx];
    spot.classList.toggle('occupied');
    spot.classList.add('flash');
    setTimeout(() => spot.classList.remove('flash'), 600);

    const nowOccupied = spot.classList.contains('occupied');
    spawnParkingCar(idx, nowOccupied ? 'enter' : 'leave');
  }
  updateStats();

  const nowVacantByRow = vacantCountsByRow();
  nowVacantByRow.forEach((count, rowIndex) => {
    const gained = count - lastVacantByRow[rowIndex];
    if (gained > 0) {
      const spotWord = gained === 1 ? 'spot' : 'spots';
      showToast(`Row ${rowIndex + 1} has ${gained} ${spotWord} open`);
    }
  });
  lastVacantByRow = nowVacantByRow;
}

updateStats();
setInterval(randomFlip, FLIP_INTERVAL_MS);