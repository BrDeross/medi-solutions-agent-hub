
2. Copy everything below and paste it into that file 👇

---

# 📄 CLEAN `app.js` (Trip Tracker Only)

```javascript
// ===== TRIP TRACKER (STEP 1 CLEAN BUILD) =====

const TRIP_TABLE = 'trip_tracker';
const TRIP_START = new Date('2026-01-01');
const TRIP_TOTAL_MONTHS = 18;

let _tripAgents = [];
let _tripMeta = { qualifyingGoal: 0, monthLabel: '' };

// ===== HELPERS =====
function getMonthIndex() {
  const now = new Date();
  let m = (now.getFullYear() - TRIP_START.getFullYear()) * 12 +
          (now.getMonth() - TRIP_START.getMonth()) + 1;
  return Math.max(1, Math.min(TRIP_TOTAL_MONTHS, m));
}

// ===== LOAD DATA =====
async function loadTripData() {
  const res = await fetch(`${NF_URL}/rest/v1/${TRIP_TABLE}?hub=eq.${NF_HUB}&select=data`, {
    headers: {
      apikey: NF_KEY,
      Authorization: `Bearer ${NF_KEY}`
    }
  });

  const rows = await res.json();

  if (rows?.[0]?.data) {
    const d = typeof rows[0].data === 'string'
      ? JSON.parse(rows[0].data)
      : rows[0].data;

    _tripAgents = d.agents || [];
    _tripMeta = d.meta || {};
  }

  renderTrip();
}

// ===== RENDER =====
function renderTrip() {
  const list = document.getElementById('tripList');
  const qualifiedEl = document.getElementById('tripQualifiedCount');
  const monthEl = document.getElementById('tripMonthChip');

  if (!list) return;

  monthEl.textContent = `${getMonthIndex()}/${TRIP_TOTAL_MONTHS}`;

  if (!_tripAgents.length) {
    list.innerHTML = '<div>No trip data yet</div>';
    qualifiedEl.textContent = '0 qualified';
    return;
  }

  const goal = Number(_tripMeta.qualifyingGoal || 0);

  const qualified = _tripAgents.filter(a => {
    const g = a.goal || goal;
    return g > 0 && a.production >= g;
  }).length;

  qualifiedEl.textContent = `${qualified} qualified`;

  list.innerHTML = _tripAgents.map(a => {
    return `
      <div>
        <strong>${a.name}</strong> — ${a.production}
      </div>
    `;
  }).join('');
}

// ===== SAVE =====
async function saveTripData() {
  const goal = Number(document.getElementById('tripGoalInput')?.value || 0);
  const month = document.getElementById('tripMonthLabel')?.value || '';

  _tripMeta = {
    qualifyingGoal: goal,
    monthLabel: month
  };

  const payload = {
    agents: _tripAgents,
    meta: _tripMeta
  };

  await fetch(`${NF_URL}/rest/v1/${TRIP_TABLE}`, {
    method: 'POST',
    headers: {
      apikey: NF_KEY,
      Authorization: `Bearer ${NF_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ hub: NF_HUB, data: payload })
  });

  loadTripData();
}

// ===== CSV =====
function handleTripCsvFile(file) {
  const reader = new FileReader();

  reader.onload = e => {
    const lines = e.target.result.split('\n');

    _tripAgents = lines.slice(1).map(line => {
      const [name, production] = line.split(',');
      return {
        name: name?.trim(),
        production: Number(production || 0)
      };
    }).filter(a => a.name);
    
    renderTrip();
  };

  reader.readAsText(file);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadTripData();
});
