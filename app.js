
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
/* ===== TRIP TRACKER + GLOBAL ADMIN-SAVE OVERRIDES ===== */

const TRIP_START = new Date('2026-01-01');
const TRIP_TOTAL_MONTHS = 18;
const TRIP_SYNC_MS = 10000;
const TRIP_TABLE = 'trip_tracker';

let _tripAgents = [];
let _tripMeta = { monthLabel: '', qualifyingGoal: 0, updatedAt: '' };
let _tripSnapshot = '';
let _tripSyncStarted = false;

function tripSnapshot(data) {
  try {
    return JSON.stringify({
      agents: (Array.isArray(data?.agents) ? data.agents : []).map(a => ({
        name: String(a.name || ''),
        production: Number(a.production || 0),
        goal: Number(a.goal || 0)
      })).sort((a, b) => String(a.name).localeCompare(String(b.name))),
      meta: {
        monthLabel: String(data?.meta?.monthLabel || ''),
        qualifyingGoal: Number(data?.meta?.qualifyingGoal || 0),
        updatedAt: String(data?.meta?.updatedAt || '')
      }
    });
  } catch (e) {
    return '';
  }
}

function normalizeTripAgents(list) {
  return (Array.isArray(list) ? list : []).map(a => ({
    name: String(a?.name || a?.agent || '').trim(),
    production: Number(a?.production || a?.points || 0) || 0,
    goal: Number(a?.goal || 0) || 0
  })).filter(a => a.name);
}

function getTripMonthIndex() {
  const today = new Date();
  let monthIndex =
    ((today.getFullYear() - TRIP_START.getFullYear()) * 12) +
    (today.getMonth() - TRIP_START.getMonth()) + 1;
  if (!Number.isFinite(monthIndex)) monthIndex = 1;
  return Math.max(1, Math.min(TRIP_TOTAL_MONTHS, monthIndex));
}

function setTripStatus(msg, kind) {
  const el = document.getElementById('tripCsvStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'csv-status' + (kind ? ' ' + kind : '');
}

function renderTripTracker() {
  const list = document.getElementById('tripList');
  const qCount = document.getElementById('tripQualifiedCount');
  const updLabel = document.getElementById('tripUpdatedLabel');
  const goalBar = document.getElementById('tripGoalBar');
  const goalPct = document.getElementById('tripGoalPct');
  const monthChip = document.getElementById('tripMonthChip');

  if (!list) return;
  if (monthChip) monthChip.textContent = `${getTripMonthIndex()}/${TRIP_TOTAL_MONTHS}`;

  if (!_tripAgents.length) {
    list.innerHTML = '<div class="trip-empty">No trip data yet — upload a CSV in Admin to get started.</div>';
    if (qCount) qCount.textContent = '0 qualified';
    if (goalBar) goalBar.style.width = '0%';
    if (goalPct) goalPct.textContent = '0% on track';
    return;
  }

  const sorted = [..._tripAgents].sort((a, b) => (Number(b.production) || 0) - (Number(a.production) || 0));
  const globalGoal = Number(_tripMeta.qualifyingGoal || 0);

  const qualified = sorted.filter(a => {
    const effectiveGoal = Number(a.goal || 0) > 0 ? Number(a.goal || 0) : globalGoal;
    return effectiveGoal > 0 && Number(a.production || 0) >= effectiveGoal;
  }).length;

  if (qCount) qCount.textContent = qualified + ' qualified';
  if (updLabel) updLabel.textContent = _tripMeta.monthLabel ? 'Updated: ' + _tripMeta.monthLabel : '';

  const avgProgress = sorted.length ? Math.round(sorted.reduce((sum, a) => {
    const effectiveGoal = Number(a.goal || 0) > 0 ? Number(a.goal || 0) : globalGoal;
    if (effectiveGoal <= 0) return sum;
    return sum + Math.min(100, (Number(a.production || 0) / effectiveGoal) * 100);
  }, 0) / sorted.length) : 0;

  if (goalBar) goalBar.style.width = avgProgress + '%';
  if (goalPct) goalPct.textContent = avgProgress + '% on track';

  const rankEmoji = i => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);

  list.innerHTML = sorted.map((a, i) => {
    const production = Number(a.production || 0);
    const effectiveGoal = Number(a.goal || 0) > 0 ? Number(a.goal || 0) : globalGoal;
    const pct = effectiveGoal > 0 ? Math.min(100, Math.round((production / effectiveGoal) * 100)) : 0;
    const qualifiedBadge = effectiveGoal > 0 && production >= effectiveGoal
      ? '<span class="trip-status qualified">Qualified</span>'
      : '<span class="trip-status tracking">Tracking</span>';

    return `
      <div class="trip-row">
        <div class="trip-rank">${rankEmoji(i)}</div>
        <div class="trip-main">
          <div class="trip-name-row">
            <div class="trip-name">${typeof pesc === 'function' ? pesc(a.name) : a.name}</div>
            ${qualifiedBadge}
          </div>
          <div class="trip-sub">
            <span>${production.toLocaleString()} pts</span>
            <span>Goal: ${effectiveGoal > 0 ? effectiveGoal.toLocaleString() : '—'}</span>
          </div>
          <div class="trip-progress">
            <div class="trip-progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderTripAdminEditor() {
  const preview = document.getElementById('tripAdminPreview');
  const count = document.getElementById('tripPreviewCount');
  const rows = document.getElementById('tripPreviewRows');
  const goalEditor = document.getElementById('tripAgentGoalEditor');
  const goalInp = document.getElementById('tripGoalInput');
  const monthInp = document.getElementById('tripMonthLabel');

  if (goalInp) goalInp.value = _tripMeta.qualifyingGoal || '';
  if (monthInp) monthInp.value = _tripMeta.monthLabel || '';

  if (preview) preview.style.display = _tripAgents.length ? 'block' : 'none';
  if (count) count.textContent = String(_tripAgents.length || 0);

  if (rows) {
    rows.innerHTML = !_tripAgents.length
      ? '<div style="color:var(--muted-2);font-style:italic;font-size:12px;padding:8px 0;">No trip agents loaded yet.</div>'
      : _tripAgents.slice().sort((a, b) => (Number(b.production) || 0) - (Number(a.production) || 0)).map((a, i) => `
          <div style="display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);">
            <div style="color:var(--muted-2);font-size:11px;">${i + 1}</div>
            <div style="min-width:0;">
              <div style="color:#fff;font-size:12px;font-weight:700;">${typeof pesc === 'function' ? pesc(a.name) : a.name}</div>
            </div>
            <div style="color:var(--teal);font-size:12px;font-weight:700;">${Number(a.production || 0).toLocaleString()}</div>
          </div>
        `).join('');
  }

  if (goalEditor) {
    goalEditor.innerHTML = !_tripAgents.length
      ? '<div style="color:var(--muted-2);font-style:italic;font-size:12px;padding:8px 0;">No trip agents loaded yet.</div>'
      : _tripAgents.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).map(a => `
          <div style="display:grid;grid-template-columns:minmax(0,1fr) 120px;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);">
            <div style="min-width:0;">
              <div style="color:#fff;font-size:12px;font-weight:700;">${typeof pesc === 'function' ? pesc(a.name) : a.name}</div>
              <div style="color:var(--muted-2);font-size:11px;">Production: ${Number(a.production || 0).toLocaleString()}</div>
            </div>
            <input type="number" min="0" step="1000" class="admin-input trip-goal-edit" data-agent-name="${typeof esc === 'function' ? esc(a.name) : a.name}" value="${Number(a.goal || 0) || ''}" placeholder="Goal">
          </div>
        `).join('');
  }
}

function loadTripData(opts) {
  const silent = !!(opts && opts.silent);
  return supaGet(TRIP_TABLE).then(rows => {
    let next = { agents: [], meta: {} };
    if (rows && rows.length && rows[0].data) {
      const raw = rows[0].data;
      const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
      next = {
        agents: normalizeTripAgents(d && d.agents),
        meta: (d && d.meta) || {}
      };
    }
    const snap = tripSnapshot(next);
    const changed = snap !== _tripSnapshot;

    _tripAgents = next.agents;
    _tripMeta = {
      monthLabel: String(next.meta && next.meta.monthLabel || ''),
      qualifyingGoal: Number(next.meta && next.meta.qualifyingGoal || 0) || 0,
      updatedAt: String(next.meta && next.meta.updatedAt || '')
    };
    _tripSnapshot = snap;

    renderTripTracker();
    renderTripAdminEditor();

    if (!silent && changed && typeof toast === 'function') {
      toast('✓ Trip tracker refreshed.');
    }
  }).catch(err => {
    console.error('loadTripData failed:', err);
    if (!silent) setTripStatus('⚠ Could not load trip data.', 'err');
  });
}

function startTripLiveSync() {
  if (_tripSyncStarted) return;
  _tripSyncStarted = true;
  loadTripData({ silent: true });
  setInterval(function() {
    loadTripData({ silent: true });
  }, TRIP_SYNC_MS);
}

function parseTripRows(rows) {
  return normalizeTripAgents((rows || []).map(r => ({
    name: r.Name || r.name || r.Agent || r.agent || r['Agent Name'] || '',
    production: r.Production || r.production || r.Points || r.points || r['Point Total'] || r['Total Points'] || 0,
    goal: r.Goal || r.goal || 0
  })));
}

window.handleTripCsvFile = function(file) {
  if (!file) return;

  const processRows = function(rows) {
    const mapped = parseTripRows(rows);
    if (!mapped.length) {
      setTripStatus('✗ No valid rows found. Need a Name and Production column.', 'err');
      return;
    }
    _tripAgents = mapped;
    renderTripTracker();
    renderTripAdminEditor();
    setTripStatus('✓ Loaded ' + mapped.length + ' trip agents. Review and Save & Publish.', 'ok');
  };

  const name = String(file.name || '').toLowerCase();

  if (name.endsWith('.csv')) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const lines = String(e.target.result || '').trim().split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) {
          setTripStatus('✗ File appears empty.', 'err');
          return;
        }
        const header = smartSplitCsv(lines[0]).map(h => String(h || '').replace(/^"|"$/g, '').trim());
        const rows = lines.slice(1).map(function(line) {
          const cols = smartSplitCsv(line);
          const obj = {};
          header.forEach(function(h, i) {
            obj[h] = String(cols[i] || '').replace(/^"|"$/g, '').trim();
          });
          return obj;
        });
        processRows(rows);
      } catch (err) {
        setTripStatus('✗ Could not parse CSV: ' + err.message, 'err');
      }
    };
    reader.onerror = function() {
      setTripStatus('✗ Could not read file.', 'err');
    };
    reader.readAsText(file);
    return;
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    loadSheetJS(function() {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          processRows(rows);
        } catch (err) {
          setTripStatus('✗ Could not parse Excel file: ' + err.message, 'err');
        }
      };
      reader.onerror = function() {
        setTripStatus('✗ Could not read file.', 'err');
      };
      reader.readAsArrayBuffer(file);
    });
    return;
  }

  setTripStatus('✗ Please upload a .csv, .xlsx, or .xls file.', 'err');
};

window.applyTripAgentGoalEdits = function() {
  const goalMap = new Map();
  document.querySelectorAll('.trip-goal-edit').forEach(function(inp) {
    goalMap.set(inp.getAttribute('data-agent-name'), Number(inp.value || 0) || 0);
  });
  _tripAgents = _tripAgents.map(function(a) {
    return { ...a, goal: goalMap.get(a.name) != null ? goalMap.get(a.name) : (Number(a.goal || 0) || 0) };
  });
  renderTripTracker();
  renderTripAdminEditor();
  if (typeof toast === 'function') toast('✓ Agent goals updated in editor.');
};

window.resetTripAgentGoalEditor = function() {
  renderTripAdminEditor();
};

window.saveTripData = function() {
  _tripMeta = {
    ..._tripMeta,
    qualifyingGoal: Number(document.getElementById('tripGoalInput')?.value || 0) || 0,
    monthLabel: String(document.getElementById('tripMonthLabel')?.value || '').trim(),
    updatedAt: new Date().toISOString()
  };
  const payload = { agents: normalizeTripAgents(_tripAgents), meta: _tripMeta };
  return supaUpsert(TRIP_TABLE, payload).then(function() {
    _tripSnapshot = tripSnapshot(payload);
    renderTripTracker();
    renderTripAdminEditor();
    setTripStatus('✓ Trip data saved and published.', 'ok');
    if (typeof toast === 'function') toast('✓ Trip data saved!');
  }).catch(function(err) {
    console.error('saveTripData failed:', err);
    setTripStatus('⚠ Trip save failed.', 'err');
    if (typeof toast === 'function') toast('⚠ Trip save failed.');
  });
};

window.clearTripData = function() {
  _tripAgents = [];
  _tripMeta = { monthLabel: '', qualifyingGoal: 0, updatedAt: new Date().toISOString() };
  return supaUpsert(TRIP_TABLE, { agents: [], meta: _tripMeta }).then(function() {
    renderTripTracker();
    renderTripAdminEditor();
    setTripStatus('✓ Trip data cleared.', 'ok');
    if (typeof toast === 'function') toast('✓ Trip data cleared.');
  }).catch(function(err) {
    console.error('clearTripData failed:', err);
    setTripStatus('⚠ Trip clear failed.', 'err');
    if (typeof toast === 'function') toast('⚠ Trip clear failed.');
  });
};

function _parseSharedDataRows(rows) {
  if (rows && rows.length && rows[0] && rows[0].data) {
    const raw = rows[0].data;
    return Array.isArray(raw) ? raw : (typeof raw === 'string' ? JSON.parse(raw) : []);
  }
  return [];
}

async function _refreshDirectoryShared() {
  try {
    const rows = await supaGet('agent_directory');
    _dir = _parseSharedDataRows(rows);
    if (typeof renderDirModal === 'function') renderDirModal(_dir);
    if (typeof refreshDirAdminList === 'function') refreshDirAdminList();
  } catch (e) {
    console.error('refresh directory failed', e);
  }
}

async function _refreshCarriersShared() {
  try {
    const rows = await supaGet('carrier_contacts');
    _carriers = _parseSharedDataRows(rows);
    if (typeof renderCarrierModal === 'function') renderCarrierModal(_carriers);
    if (typeof refreshCarrierAdminList === 'function') refreshCarrierAdminList();
  } catch (e) {
    console.error('refresh carriers failed', e);
  }
}

async function _refreshOnboardingShared() {
  try {
    const rows = await supaGet('onboarding_steps');
    _onboard = _parseSharedDataRows(rows);
    if (typeof renderOnboardModal === 'function') renderOnboardModal();
    if (typeof refreshOnboardAdminList === 'function') refreshOnboardAdminList();
  } catch (e) {
    console.error('refresh onboarding failed', e);
  }
}

async function _refreshTasksShared() {
  try {
    const rows = await supaGet('task_list');
    _taskItems = _parseSharedDataRows(rows);
    if (typeof renderTeamTasks === 'function') renderTeamTasks();
    if (typeof refreshTaskAdminList === 'function') refreshTaskAdminList();
    if (typeof updateChecklistPill === 'function') updateChecklistPill();
  } catch (e) {
    console.error('refresh tasks failed', e);
  }
}

window.submitDirEntry = async function() {
  const g = id => (document.getElementById(id)?.value?.trim() || '');
  const name = g('dirAdminName');
  if (!name) { toast('⚠ Name required.'); return; }
  const entry = {
    id: _dirEditId || Date.now(),
    name,
    title: g('dirAdminTitle'),
    phone: g('dirAdminPhone'),
    email: g('dirAdminEmail'),
    territory: g('dirAdminTerritory'),
    tag: g('dirAdminTag')
  };
  if (_dirEditId) {
    const i = _dir.findIndex(x => x.id === _dirEditId);
    if (i >= 0) _dir[i] = entry; else _dir.push(entry);
  } else {
    _dir.push(entry);
  }
  if (typeof cancelDirEdit === 'function') cancelDirEdit();
  if (typeof refreshDirAdminList === 'function') refreshDirAdminList();
  toast('⏳ Saving…');
  try {
    await supaUpsert('agent_directory', _dir);
    await _refreshDirectoryShared();
    toast('✓ Directory saved globally!');
  } catch (e) {
    console.error(e);
    toast('⚠ Directory save failed.');
  }
};

window.deleteDirEntry = async function(id) {
  _dir = _dir.filter(x => x.id !== id);
  if (typeof refreshDirAdminList === 'function') refreshDirAdminList();
  toast('⏳ Removing…');
  try {
    await supaUpsert('agent_directory', _dir);
    await _refreshDirectoryShared();
    toast('🗑 Directory entry removed.');
  } catch (e) {
    console.error(e);
    toast('⚠ Remove failed.');
  }
};

window.submitCarrierEntry = async function() {
  const g = id => (document.getElementById(id)?.value?.trim() || '');
  const name = g('carrierAdminName');
  if (!name) { toast('⚠ Name required.'); return; }
  const entry = {
    id: _carrierEditId || Date.now(),
    name,
    phone: g('carrierAdminPhone'),
    auth: g('carrierAdminAuth'),
    url: g('carrierAdminUrl'),
    notes: g('carrierAdminNotes')
  };
  if (_carrierEditId) {
    const i = _carriers.findIndex(x => x.id === _carrierEditId);
    if (i >= 0) _carriers[i] = entry; else _carriers.push(entry);
  } else {
    _carriers.push(entry);
  }
  if (typeof cancelCarrierEdit === 'function') cancelCarrierEdit();
  if (typeof refreshCarrierAdminList === 'function') refreshCarrierAdminList();
  toast('⏳ Saving…');
  try {
    await supaUpsert('carrier_contacts', _carriers);
    await _refreshCarriersShared();
    toast('✓ Carrier contacts saved globally!');
  } catch (e) {
    console.error(e);
    toast('⚠ Save failed.');
  }
};

window.deleteCarrierEntry = async function(id) {
  _carriers = _carriers.filter(x => x.id !== id);
  if (typeof refreshCarrierAdminList === 'function') refreshCarrierAdminList();
  toast('⏳ Removing…');
  try {
    await supaUpsert('carrier_contacts', _carriers);
    await _refreshCarriersShared();
    toast('🗑 Carrier removed.');
  } catch (e) {
    console.error(e);
    toast('⚠ Remove failed.');
  }
};

window.submitOnboardEntry = async function() {
  const g = id => (document.getElementById(id)?.value?.trim() || '');
  const label = g('onboardAdminLabel');
  if (!label) { toast('⚠ Label required.'); return; }
  const entry = {
    id: _onboardEditId || Date.now(),
    phase: g('onboardAdminPhase') || 'General',
    label,
    desc: g('onboardAdminDesc'),
    link: g('onboardAdminLink')
  };
  if (_onboardEditId) {
    const i = _onboard.findIndex(x => x.id === _onboardEditId);
    if (i >= 0) _onboard[i] = entry; else _onboard.push(entry);
  } else {
    _onboard.push(entry);
  }
  if (typeof cancelOnboardEdit === 'function') cancelOnboardEdit();
  if (typeof refreshOnboardAdminList === 'function') refreshOnboardAdminList();
  toast('⏳ Saving…');
  try {
    await supaUpsert('onboarding_steps', _onboard);
    await _refreshOnboardingShared();
    toast('✓ Onboarding saved globally!');
  } catch (e) {
    console.error(e);
    toast('⚠ Save failed.');
  }
};

window.deleteOnboardEntry = async function(id) {
  _onboard = _onboard.filter(x => x.id !== id);
  if (typeof refreshOnboardAdminList === 'function') refreshOnboardAdminList();
  toast('⏳ Removing…');
  try {
    await supaUpsert('onboarding_steps', _onboard);
    await _refreshOnboardingShared();
    toast('🗑 Onboarding step removed.');
  } catch (e) {
    console.error(e);
    toast('⚠ Remove failed.');
  }
};

window.submitTaskEntry = async function() {
  const label = (document.getElementById('taskAdminLabel')?.value?.trim() || '');
  if (!label) { toast('⚠ Label required.'); return; }
  _taskItems.push({ id: Date.now(), label: label });
  const inp = document.getElementById('taskAdminLabel');
  if (inp) inp.value = '';
  if (typeof refreshTaskAdminList === 'function') refreshTaskAdminList();
  if (typeof renderTeamTasks === 'function') renderTeamTasks();
  if (typeof updateChecklistPill === 'function') updateChecklistPill();
  toast('⏳ Saving…');
  try {
    await supaUpsert('task_list', _taskItems);
    await _refreshTasksShared();
    toast('✓ Tasks saved globally!');
  } catch (e) {
    console.error(e);
    toast('⚠ Save failed.');
  }
};

window.deleteTaskEntry = async function(id) {
  _taskItems = _taskItems.filter(x => x.id !== id);
  if (typeof refreshTaskAdminList === 'function') refreshTaskAdminList();
  if (typeof renderTeamTasks === 'function') renderTeamTasks();
  if (typeof updateChecklistPill === 'function') updateChecklistPill();
  toast('⏳ Removing…');
  try {
    await supaUpsert('task_list', _taskItems);
    await _refreshTasksShared();
    toast('🗑 Task removed.');
  } catch (e) {
    console.error(e);
    toast('⚠ Remove failed.');
  }
};

window.pushNotification = async function() {
  const title = (document.getElementById('notifAdminTitle')?.value?.trim() || '');
  const msg = (document.getElementById('notifAdminMsg')?.value?.trim() || '');
  const icon = (document.getElementById('notifAdminIcon')?.value?.trim() || '🔔');
  if (!title || !msg) { toast('⚠ Title and message required.'); return; }

  try {
    const headers = typeof hdrs === 'function' ? hdrs() : hdrs;
    const res = await fetch(`${NF_URL}/rest/v1/notifications`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ hub: NF_HUB, title: title, message: msg, icon: icon })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    toast('✓ Notification pushed globally!');
    if (typeof showNotifToast === 'function') showNotifToast(title, msg, icon);

    const t = document.getElementById('notifAdminTitle');
    const m = document.getElementById('notifAdminMsg');
    if (t) t.value = '';
    if (m) m.value = '';

    if (typeof checkNotifications === 'function') checkNotifications({ silent: true });
  } catch (e) {
    console.error(e);
    toast('⚠ Push failed.');
  }
};

document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') loadTripData({ silent: true });
});

document.addEventListener('DOMContentLoaded', function() {
  const tripDrop = document.getElementById('tripCsvDrop');
  if (tripDrop) {
    tripDrop.addEventListener('dragover', function(e) {
      e.preventDefault();
      tripDrop.classList.add('drag-over');
    });
    tripDrop.addEventListener('dragleave', function() {
      tripDrop.classList.remove('drag-over');
    });
    tripDrop.addEventListener('drop', function(e) {
      e.preventDefault();
      tripDrop.classList.remove('drag-over');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) window.handleTripCsvFile(file);
    });
  }

  loadTripData({ silent: true });
  startTripLiveSync();
  _refreshDirectoryShared();
  _refreshCarriersShared();
  _refreshOnboardingShared();
  _refreshTasksShared();
});
