// app.js — SpotSense dashboard logic
// Expects firebase to already be initialized (see firebase-config.js)
// and a global SPOTSENSE_KEY naming the node under /parking/.

const db = firebase.database();
const spotRef = db.ref(`parking/${SPOTSENSE_KEY}`);
const historyRef = db.ref(`parking/${SPOTSENSE_KEY}/history`);

const els = {
  heroCard: document.getElementById('heroCard'),
  spotId: document.getElementById('spotId'),
  statusText: document.getElementById('statusText'),
  distanceVal: document.getElementById('distanceVal'),
  lastUpdate: document.getElementById('lastUpdate'),
  batteryVoltage: document.getElementById('batteryVoltage'),
  batteryBar: document.getElementById('batteryBar'),
  batteryPct: document.getElementById('batteryPct'),
  chargingState: document.getElementById('chargingState'),
  chargingSub: document.getElementById('chargingSub'),
  rssiVal: document.getElementById('rssiVal'),
  rssiSub: document.getElementById('rssiSub'),
  uptimeVal: document.getElementById('uptimeVal'),
  connDot: document.getElementById('connDot'),
  connLabel: document.getElementById('connLabel'),
  logList: document.getElementById('logList'),
  logEmpty: document.getElementById('logEmpty'),
};

els.spotId.textContent = SPOTSENSE_KEY.replace('spot_', '').toUpperCase();

// ---------- Connection status ----------
db.ref('.info/connected').on('value', (snap) => {
  const isOnline = snap.val() === true;
  els.connDot.className = 'dot ' + (isOnline ? 'online' : 'offline');
  els.connLabel.textContent = isOnline ? 'Live' : 'Reconnecting…';
});

// ---------- Helpers ----------
function voltageToPercent(v) {
  // Single-cell LiPo: ~3.3V empty, ~4.2V full (adjust if using a different cell/pack)
  if (typeof v !== 'number' || isNaN(v)) return null;
  const pct = ((v - 3.3) / (4.2 - 3.3)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function formatRelativeTime(ts) {
  if (!ts) return '—';
  const diffMs = Date.now() - ts;
  const s = Math.floor(diffMs / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatUptime(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

let lastSeenTs = null;
setInterval(() => {
  if (lastSeenTs) els.lastUpdate.textContent = formatRelativeTime(lastSeenTs);
}, 1000);

// ---------- Main state listener ----------
spotRef.on('value', (snap) => {
  const data = snap.val() || {};
  const occupied = !!data.occupied;

  els.heroCard.classList.toggle('occupied', occupied);
  els.statusText.textContent = occupied ? 'OCCUPIED' : 'VACANT';

  els.distanceVal.textContent =
    typeof data.distance_cm === 'number' ? `${data.distance_cm.toFixed(1)} cm` : '— cm';

  lastSeenTs = data.last_seen ? Number(data.last_seen) : Date.now();
  els.lastUpdate.textContent = formatRelativeTime(lastSeenTs);

  // Battery
  if (typeof data.battery_voltage === 'number') {
    els.batteryVoltage.textContent = `${data.battery_voltage.toFixed(2)} V`;
    const pct = voltageToPercent(data.battery_voltage);
    if (pct !== null) {
      els.batteryBar.style.width = `${pct}%`;
      els.batteryPct.textContent = `${pct}%`;
    }
  } else {
    els.batteryVoltage.textContent = '— V';
    els.batteryPct.textContent = 'Awaiting battery pack';
  }

  // Solar / charging
  if (typeof data.charging === 'boolean') {
    els.chargingState.textContent = data.charging ? 'Charging' : 'Idle';
    els.chargingSub.textContent = data.charging
      ? 'Panel is supplying current'
      : 'On battery, no panel input';
  } else {
    els.chargingState.textContent = '—';
    els.chargingSub.textContent = 'Waiting on panel data';
  }

  // Wi-Fi signal
  els.rssiVal.textContent = typeof data.rssi === 'number' ? `${data.rssi} dBm` : '— dBm';

  // Uptime
  els.uptimeVal.textContent = formatUptime(data.uptime_s);
});

// ---------- Activity log ----------
// Reads a /parking/<spot>/history list if you push entries like
// { occupied: true, ts: <ms epoch> } from the firmware. Falls back to
// logging live transitions observed by the dashboard itself.
let sawHistoryData = false;

historyRef.limitToLast(12).on('value', (snap) => {
  const val = snap.val();
  if (!val) return;
  sawHistoryData = true;
  const entries = Object.values(val).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  renderLog(entries);
});

let prevOccupied = null;
const clientLog = [];
spotRef.on('value', (snap) => {
  if (sawHistoryData) return; // firmware-provided history takes priority
  const data = snap.val() || {};
  const occupied = !!data.occupied;
  if (prevOccupied !== null && occupied !== prevOccupied) {
    clientLog.unshift({ occupied, ts: Date.now() });
    renderLog(clientLog.slice(0, 12));
  }
  prevOccupied = occupied;
});

function renderLog(entries) {
  if (!entries.length) return;
  els.logList.innerHTML = '';
  entries.forEach((e) => {
    const li = document.createElement('li');
    const tag = document.createElement('span');
    tag.className = 'log-tag ' + (e.occupied ? 'occupied' : 'vacant');
    tag.textContent = e.occupied ? 'OCCUPIED' : 'VACANT';
    const time = document.createElement('span');
    time.textContent = new Date(e.ts).toLocaleString();
    li.appendChild(tag);
    li.appendChild(time);
    els.logList.appendChild(li);
  });
}