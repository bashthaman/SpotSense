// lot-demo.js — simulated top-down lot view (no real sensor data).
// Rough row layout inspired by Brackenridge Ave Lot 1's row count/density.
// Every row has a driving aisle right below it, with a couple of cars
// continuously moving through, plus cars that actually drive into/out of
// a stall whenever that spot's occupancy flips.

const ROW_COUNTS = [16, 19, 21, 22, 19, 15, 11];
const FLIP_INTERVAL_MS = 2200;   // how often we pick spots to change state
const FLIPS_PER_TICK = [1, 4];   // min/max spots flipped per tick
const INITIAL_OCCUPANCY = 0.55;  // ~55% occupied at load, matches a busy lot
const AMBIENT_CAR_COLORS = ['var(--cyan)', 'var(--amber)', 'var(--orange)'];

const field = document.getElementById('lotField');
const occupiedCountEl = document.getElementById('occupiedCount');
const vacantCountEl = document.getElementById('vacantCount');
const utilPctEl = document.getElementById('utilPct');
const toastContainer = document.getElementById('toastContainer');

const spots = [];
const aisleByRow = []; // aisle element sitting just below each row

ROW_COUNTS.forEach((count, rowIndex) => {
  // The row of stalls itself
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
    const occupied = Math.random() < INITIAL_OCCUPANCY;
    if (occupied) spot.classList.add('occupied');
    row.appendChild(spot);
    spots.push(spot);
  }
  wrap.appendChild(row);
  field.appendChild(wrap);

  // The driving aisle right below this row
  const aisle = document.createElement('div');
  aisle.className = 'lot-aisle';

  // 1-2 ambient cars that continuously drive back and forth along it,
  // just for a "this lot is alive" feel — not tied to any spot's state.
  const carCount = 1 + Math.round(Math.random());
  for (let c = 0; c < carCount; c++) {
    const car = document.createElement('div');
    car.className = 'aisle-car';
    const goingRight = Math.random() < 0.5;
    const duration = (6 + Math.random() * 5).toFixed(1);
    const delay = (Math.random() * 6).toFixed(1);
    car.style.background = AMBIENT_CAR_COLORS[Math.floor(Math.random() * AMBIENT_CAR_COLORS.length)];
    car.style.animation = `${goingRight ? 'driveRight' : 'driveLeft'} ${duration}s linear infinite`;
    car.style.animationDelay = `${delay}s`;
    aisle.appendChild(car);
  }

  field.appendChild(aisle);
  aisleByRow.push(aisle);
});

// Snapshot of vacant-count-per-row, used to detect newly-opened spots
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

// Drives a small car from the aisle straight into a stall (direction 'enter'),
// or from a stall out into the aisle (direction 'leave'). Real positional
// movement over two steps so it reads as driving, not a fade/blink.
function travelCar(spot, direction) {
  const rowIndex = Number(spot.dataset.row);
  const aisle = aisleByRow[rowIndex];
  const aisleRect = aisle.getBoundingClientRect();
  const spotRect = spot.getBoundingClientRect();

  const spotX = spotRect.left + spotRect.width / 2;
  const spotY = spotRect.top + spotRect.height / 2;
  const aisleY = aisleRect.top + aisleRect.height / 2;
  // Point in the aisle directly below/above the stall's column
  const alignedX = spotX;
  // A point further down the aisle, so the car visibly drives along
  // the lane before turning into the stall, rather than teleporting in
  const approachX = spotX + (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 40);

  const car = document.createElement('div');
  car.className = 'traveling-car';
  document.body.appendChild(car);

  if (direction === 'enter') {
    // Start out in the aisle, a little ways down from the stall
    car.style.transition = 'none';
    car.style.left = `${approachX}px`;
    car.style.top = `${aisleY}px`;
    car.style.opacity = '1';
    void car.offsetWidth; // force the browser to register the start position

    // Leg 1: drive along the aisle to line up with the stall's column
    car.style.transition = 'left 0.45s ease-in-out';
    car.style.left = `${alignedX}px`;

    setTimeout(() => {
      // Leg 2: pull straight into the stall
      car.style.transition = 'top 0.45s ease-in-out, opacity 0.25s ease 0.3s';
      car.style.top = `${spotY}px`;
      car.style.opacity = '0';
    }, 460);

    setTimeout(() => car.remove(), 950);
  } else {
    // Start parked in the stall
    car.style.transition = 'none';
    car.style.left = `${spotX}px`;
    car.style.top = `${spotY}px`;
    car.style.opacity = '0';
    void car.offsetWidth;

    // Leg 1: pull out of the stall into the aisle, fading in as it goes
    car.style.transition = 'top 0.4s ease-in-out, opacity 0.25s ease';
    car.style.top = `${aisleY}px`;
    car.style.opacity = '1';

    setTimeout(() => {
      // Leg 2: drive off down the aisle
      car.style.transition = 'left 0.5s ease-in-out, opacity 0.3s ease 0.25s';
      car.style.left = `${approachX}px`;
      car.style.opacity = '0';
    }, 410);

    setTimeout(() => car.remove(), 950);
  }
}

function updateStats() {
  const occupied = spots.filter((s) => s.classList.contains('occupied')).length;
  const total = spots.length;
  const vacant = total - occupied;
  occupiedCountEl.textContent = occupied;
  vacantCountEl.textContent = vacant;
  utilPctEl.textContent = `${Math.round((occupied / total) * 100)}%`;
}

function randomFlip() {
  const flips = Math.floor(
    Math.random() * (FLIPS_PER_TICK[1] - FLIPS_PER_TICK[0] + 1) + FLIPS_PER_TICK[0]
  );
  for (let i = 0; i < flips; i++) {
    const spot = spots[Math.floor(Math.random() * spots.length)];
    spot.classList.toggle('occupied');
    spot.classList.add('flash');
    setTimeout(() => spot.classList.remove('flash'), 600);

    const nowOccupied = spot.classList.contains('occupied');
    travelCar(spot, nowOccupied ? 'enter' : 'leave');
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