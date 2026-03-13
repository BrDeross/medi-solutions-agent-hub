
const STORAGE_KEYS = {
  weekly: 'mymedi_weekly_data_v2',
  history: 'mymedi_weekly_history_v2',
  article: 'mymedi_article_v2',
  spotlight: 'mymedi_spotlight_v2',
  months: 'mymedi_months_v2',
  videos: 'mymedi_videos_v2'
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

let currentImportedRows = [];
let currentImportedWeekLabel = '';

document.addEventListener('DOMContentLoaded', () => {
  buildMonthSelect();
  bindEvents();
  hydrateAll();
});

function bindEvents() {
  document.getElementById('copyPromptBtn').addEventListener('click', copyPrompt);
  document.getElementById('saveArticleBtn').addEventListener('click', saveArticle);
  document.getElementById('saveSpotlightBtn').addEventListener('click', saveSpotlight);
  document.getElementById('saveMonthBtn').addEventListener('click', saveMonth);
  document.getElementById('saveVideoBtn').addEventListener('click', saveVideo);
  document.getElementById('clearVideosBtn').addEventListener('click', clearVideos);
  document.getElementById('saveWeekBtn').addEventListener('click', saveImportedWeek);
  document.getElementById('clearWeekBtn').addEventListener('click', clearWeekData);
  document.getElementById('printSnuBtn').addEventListener('click', () => window.print());
  document.getElementById('csvInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) processCsvFile(file);
  });

  const zone = document.getElementById('csvDropZone');
  ['dragenter','dragover'].forEach(evt => zone.addEventListener(evt, e => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.add('dragover');
  }));
  ['dragleave','drop'].forEach(evt => zone.addEventListener(evt, e => {
    e.preventDefault();
    e.stopPropagation();
    zone.classList.remove('dragover');
  }));
  zone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) processCsvFile(file);
  });
}

function buildMonthSelect() {
  const select = document.getElementById('monthSelect');
  MONTHS.forEach(month => {
    const opt = document.createElement('option');
    opt.value = month;
    opt.textContent = month;
    select.appendChild(opt);
  });
}

function copyPrompt() {
  const text = document.getElementById('assistantPrompt').value;
  navigator.clipboard.writeText(text).then(() => {
    const note = document.getElementById('copyPromptNote');
    note.textContent = 'Copied.';
    setTimeout(() => note.textContent = ' ', 1800);
  });
}

function hydrateAll() {
  hydrateArticle();
  hydrateSpotlight();
  hydrateMonths();
  hydrateVideos();
  hydrateWeekly();
}

function saveArticle() {
  const data = {
    title: document.getElementById('articleTitleInput').value.trim(),
    summary: document.getElementById('articleSummaryInput').value.trim()
  };
  localStorage.setItem(STORAGE_KEYS.article, JSON.stringify(data));
  hydrateArticle();
}

function hydrateArticle() {
  const article = JSON.parse(localStorage.getItem(STORAGE_KEYS.article) || 'null');
  document.getElementById('articleTitle').textContent = article?.title || 'No article loaded yet.';
  document.getElementById('articleSummary').textContent = article?.summary || 'Use Admin to add a weekly industry headline and summary.';
  document.getElementById('articleTitleInput').value = article?.title || '';
  document.getElementById('articleSummaryInput').value = article?.summary || '';
}

async function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function saveSpotlight() {
  const photoFile = document.getElementById('spotlightPhotoInput').files[0];
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.spotlight) || 'null');
  const data = {
    name: document.getElementById('spotlightNameInput').value.trim(),
    role: document.getElementById('spotlightRoleInput').value.trim(),
    bio: document.getElementById('spotlightBioInput').value.trim(),
    quote: document.getElementById('spotlightQuoteInput').value.trim(),
    photo: existing?.photo || ''
  };
  if (photoFile) data.photo = await fileToDataURL(photoFile);
  localStorage.setItem(STORAGE_KEYS.spotlight, JSON.stringify(data));
  hydrateSpotlight();
}

function hydrateSpotlight() {
  const data = JSON.parse(localStorage.getItem(STORAGE_KEYS.spotlight) || 'null');
  const img = document.getElementById('spotlightImage');
  const empty = document.getElementById('spotlightPhotoEmpty');

  if (data?.photo) {
    img.src = data.photo;
    img.style.display = 'block';
    empty.style.display = 'none';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
    empty.style.display = 'flex';
  }

  document.getElementById('spotlightName').textContent = data?.name || 'No spotlight loaded';
  document.getElementById('spotlightRole').textContent = data?.role || 'Set a spotlight in Admin.';
  document.getElementById('spotlightBio').textContent = data?.bio || 'Add a short bio or recognition note.';
  document.getElementById('spotlightQuote').textContent = data?.quote || '“Consistency compounds.”';

  document.getElementById('spotlightNameInput').value = data?.name || '';
  document.getElementById('spotlightRoleInput').value = data?.role || '';
  document.getElementById('spotlightBioInput').value = data?.bio || '';
  document.getElementById('spotlightQuoteInput').value = data?.quote || '';
}

async function saveMonth() {
  const photoFile = document.getElementById('monthPhotoInput').files[0];
  const month = document.getElementById('monthSelect').value;
  const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.months) || '[]');
  const idx = current.findIndex(x => x.month === month);

  const record = {
    month,
    name: document.getElementById('monthNameInput').value.trim(),
    note: document.getElementById('monthNoteInput').value.trim(),
    photo: idx >= 0 ? current[idx].photo : ''
  };

  if (photoFile) record.photo = await fileToDataURL(photoFile);

  if (idx >= 0) current[idx] = record;
  else current.push(record);

  localStorage.setItem(STORAGE_KEYS.months, JSON.stringify(current));
  hydrateMonths();
}

function hydrateMonths() {
  const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.months) || '[]');
  const grid = document.getElementById('monthGrid');

  grid.innerHTML = MONTHS.map(month => {
    const found = current.find(x => x.month === month);
    return `
      <div class="month-item">
        <h6>${month}</h6>
        <div class="month-photo">
          ${found?.photo ? `<img src="${escapeAttr(found.photo)}" alt="${escapeAttr(found.name || month)}">` : `<div class="photo-empty">Not set</div>`}
        </div>
        <div class="month-name">${escapeHtml(found?.name || 'No agent selected')}</div>
        <div class="month-note">${escapeHtml(found?.note || 'Not set')}</div>
      </div>
    `;
  }).join('');
}

async function saveVideo() {
  const videos = JSON.parse(localStorage.getItem(STORAGE_KEYS.videos) || '[]');
  const file = document.getElementById('videoFileInput').files[0];
  const thumb = document.getElementById('videoThumbInput').files[0];

  const item = {
    id: crypto.randomUUID(),
    title: document.getElementById('videoTitleInput').value.trim(),
    description: document.getElementById('videoDescriptionInput').value.trim(),
    url: document.getElementById('videoUrlInput').value.trim(),
    type: 'link',
    thumb: ''
  };

  if (file) {
    item.type = 'mp4';
    item.url = await fileToDataURL(file);
  }
  if (thumb) item.thumb = await fileToDataURL(thumb);

  videos.unshift(item);
  localStorage.setItem(STORAGE_KEYS.videos, JSON.stringify(videos));
  hydrateVideos();

  document.getElementById('videoTitleInput').value = '';
  document.getElementById('videoDescriptionInput').value = '';
  document.getElementById('videoUrlInput').value = '';
  document.getElementById('videoFileInput').value = '';
  document.getElementById('videoThumbInput').value = '';
}

function clearVideos() {
  if (!confirm('Clear all saved videos from this browser?')) return;
  localStorage.removeItem(STORAGE_KEYS.videos);
  hydrateVideos();
}

function isYouTube(url='') {
  return /youtu\.be|youtube\.com/.test(url);
}

function youtubeEmbed(url='') {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{6,})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : '';
}

function hydrateVideos() {
  const videos = JSON.parse(localStorage.getItem(STORAGE_KEYS.videos) || '[]');
  const grid = document.getElementById('videoGrid');
  document.getElementById('heroVideoCount').textContent = videos.length.toLocaleString();

  if (!videos.length) {
    grid.innerHTML = '<div class="empty">No training videos yet. Add them in Admin below.</div>';
    return;
  }

  grid.innerHTML = videos.map(video => {
    let media = '';
    if (video.thumb) {
      media = `<img src="${escapeAttr(video.thumb)}" alt="${escapeAttr(video.title)}">`;
    } else if (video.type === 'mp4') {
      media = `<video controls preload="metadata"><source src="${escapeAttr(video.url)}" type="video/mp4"></video>`;
    } else if (isYouTube(video.url)) {
      const embed = youtubeEmbed(video.url);
      media = embed ? `<iframe src="${escapeAttr(embed)}" allowfullscreen loading="lazy"></iframe>` : `<div class="photo-empty">No preview</div>`;
    } else if (video.url) {
      media = `<div class="photo-empty">Open video</div>`;
    } else {
      media = `<div class="photo-empty">No media</div>`;
    }

    return `
      <div class="video-card">
        <div class="video-thumb">${media}</div>
        <h4>${escapeHtml(video.title || 'Untitled video')}</h4>
        <p>${escapeHtml(video.description || '')}</p>
        <div class="actions">
          ${video.url ? `<a class="btn secondary" href="${escapeAttr(video.url)}" target="_blank" rel="noopener noreferrer">Open</a>` : ''}
          <button class="btn secondary" type="button" onclick="deleteVideo('${escapeAttr(video.id)}')">Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function deleteVideo(id) {
  const videos = JSON.parse(localStorage.getItem(STORAGE_KEYS.videos) || '[]');
  const next = videos.filter(v => v.id !== id);
  localStorage.setItem(STORAGE_KEYS.videos, JSON.stringify(next));
  hydrateVideos();
}

function processCsvFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result || '');
    const rows = parseCsv(text);
    currentImportedRows = normalizeWeeklyRows(rows);
    renderWeekly(currentImportedRows);
  };
  reader.readAsText(file);
}

function parseCsv(text) {
  const lines = text.replace(/\r/g,'').split('\n').filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = (cols[i] || '').trim());
    return obj;
  });
}

function splitCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i+1] === '"') { current += '"'; i++; continue; }
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { out.push(current); current = ''; continue; }
    current += c;
  }
  out.push(current);
  return out;
}

function normalizeWeeklyRows(rows) {
  const result = rows.map(r => {
    const name = r.Agent || r.AgentName || r.Name || r['Agent Name'] || '';
    const pointsRaw = r.Points || r.Production || r['Weekly Points'] || r['Point Total'] || '0';
    const points = Number(String(pointsRaw).replace(/[^0-9.-]/g,'')) || 0;
    return { name: name.trim(), points };
  }).filter(r => r.name);

  result.sort((a,b) => b.points - a.points);
  return result;
}

function getRankColor(points) {
  if (points <= 5000) return 'rank-red';
  if (points <= 9999) return 'rank-green';
  return 'rank-blue';
}

function renderWeekly(rows) {
  const producerGrid = document.getElementById('producerGrid');
  const leaderboardBody = document.getElementById('leaderboardBody');
  document.getElementById('heroTopCount').textContent = rows.length.toLocaleString();

  if (!rows.length) {
    producerGrid.innerHTML = '<div class="empty">Import a CSV in Admin to load this week\'s SNU.</div>';
    leaderboardBody.innerHTML = '<tr><td colspan="4" class="empty-row">No weekly points loaded.</td></tr>';
    document.getElementById('topProducerCountBadge').textContent = '0 Producers';
    return;
  }

  document.getElementById('topProducerCountBadge').textContent = `${rows.length} Producers`;

  producerGrid.innerHTML = rows.map((row, i) => `
    <div class="producer-card ${getRankColor(row.points)}">
      <div class="producer-rank">Rank ${i + 1}</div>
      <div class="producer-name">${escapeHtml(row.name)}</div>
      <div class="producer-points">${formatCurrency(row.points)}</div>
    </div>
  `).join('');

  leaderboardBody.innerHTML = rows.map((row, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(row.name)}</td>
      <td>${formatCurrency(row.points)}</td>
      <td>${colorLabel(row.points)}</td>
    </tr>
  `).join('');
}

function colorLabel(points) {
  if (points <= 5000) return 'Red · 5,000 and under';
  if (points <= 9999) return 'Green · 5,001–9,999';
  return 'Blue · 10,000+';
}

function saveImportedWeek() {
  if (!currentImportedRows.length) {
    alert('Import a CSV first.');
    return;
  }
  const label = document.getElementById('csvWeekLabel').value.trim();
  if (!label) {
    alert('Enter a week label before saving.');
    return;
  }
  currentImportedWeekLabel = label;

  const weekly = { weekLabel: label, rows: currentImportedRows };
  localStorage.setItem(STORAGE_KEYS.weekly, JSON.stringify(weekly));

  const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
  const top7 = currentImportedRows.slice(0, 7).map(r => r.name);
  history.push({ weekLabel: label, top7, savedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));

  hydrateWeekly();
  alert('Weekly SNU saved.');
}

function clearWeekData() {
  if (!confirm('Clear weekly data and streak history?')) return;
  localStorage.removeItem(STORAGE_KEYS.weekly);
  localStorage.removeItem(STORAGE_KEYS.history);
  currentImportedRows = [];
  document.getElementById('csvWeekLabel').value = '';
  hydrateWeekly();
}

function hydrateWeekly() {
  const weekly = JSON.parse(localStorage.getItem(STORAGE_KEYS.weekly) || 'null');
  const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');

  document.getElementById('weekLabel').textContent = weekly?.weekLabel || 'Week —';
  document.getElementById('heroWeekLabel').textContent = weekly?.weekLabel || '—';
  document.getElementById('csvWeekLabel').value = weekly?.weekLabel || '';

  renderWeekly(weekly?.rows || []);
  renderConsecutive(history);
}

function renderConsecutive(history) {
  const grid = document.getElementById('consecutiveGrid');
  if (!history.length) {
    grid.innerHTML = '<div class="empty">No streaks yet.</div>';
    return;
  }

  const streaks = {};
  history.forEach(week => {
    (week.top7 || []).forEach(name => {
      streaks[name] = (streaks[name] || 0) + 1;
    });
  });

  const items = Object.entries(streaks)
    .filter(([,count]) => count > 1)
    .sort((a,b) => b[1] - a[1]);

  if (!items.length) {
    grid.innerHTML = '<div class="empty">No consecutive executives yet.</div>';
    return;
  }

  grid.innerHTML = items.map(([name,count]) => `
    <div class="consecutive-card">
      <h6>${escapeHtml(name)}</h6>
      <p>${count} week${count === 1 ? '' : 's'} in the Top 7</p>
    </div>
  `).join('');
}

function formatCurrency(value) {
  const num = Number(value || 0);
  return '$' + num.toLocaleString();
}

function escapeHtml(str='') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str='') {
  return escapeHtml(str);
}
