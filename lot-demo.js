// lot-demo.js — simulated top-down lot view (no real sensor data).
// Rough row layout inspired by Brackenridge Ave Lot 1's row count/density.

const ROW_COUNTS = [16, 19, 21, 22, 19, 15, 11];
const FLIP_INTERVAL_MS = 2200;   // how often we pick spots to change state
const FLIPS_PER_TICK = [1, 4];   // min/max spots flipped per tick
const INITIAL_OCCUPANCY = 0.55;  // ~55% occupied at load, matches a busy lot

const field = document.getElementById('lotField');
const occupiedCountEl = document.getElementById('occupiedCount');
const vacantCountEl = document.getElementById('vacantCount');
const utilPctEl = document.getElementById('utilPct');
const toastContainer = document.getElementById('toastContainer');

const spots = [];

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
    const occupied = Math.random() < INITIAL_OCCUPANCY;
    if (occupied) spot.classList.add('occupied');
    row.appendChild(spot);
    spots.push(spot);
  }
  wrap.appendChild(row);
  field.appendChild(wrap);
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