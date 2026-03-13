// ─── STATE ─────────────────────────────────────────────────────────────────
let items = [];
let sortKey = 'priority';
let sortDir = 1;
let filterPriority = 'all';
let filterTags = { article_type: 'all', species: 'all', methods: 'all', roi: 'all', model: 'all', theory: 'all' };
let filterCompleted = 'all';
let searchQuery = '';
let showHidden = false;

const PRIORITY_ORDER = { red: 0, yellow: 1, green: 2 };
const LOCAL_KEY = 'reading-list-v3';
const THEME_KEY = 'reading-list-theme';

// ─── TAG SCHEMA ────────────────────────────────────────────────────────────
const TAG_SCHEMA = {
  article_type: { label: 'Journal Type', options: ['research', 'review'] },
  species:      { label: 'Species',      options: ['human', 'primates', 'rodents'] },
  methods:      { label: 'Imaging',      options: ['3T-MRI', '7T-MRI', 'calcium imaging'] },
  roi:          { label: 'ROI',          options: ['hippocampus', 'CA1', 'language network', 'AngG'] },
  model:        { label: 'Model',        options: ['transformer'] },
  theory:       { label: 'Theory',       options: ['predictive coding'] },
};

const TAG_COLORS = {
  article_type: { research: 'tag-research', review: 'tag-review' },
  species:      { human: 'tag-human', primates: 'tag-primates', rodents: 'tag-rodents' },
  methods:      { '3T-MRI': 'tag-3tmri', '7T-MRI': 'tag-7tmri', 'calcium imaging': 'tag-calcium' },
  roi:          { hippocampus: 'tag-hippo', CA1: 'tag-ca1', 'language network': 'tag-langnet', AngG: 'tag-angg' },
  model:        { transformer: 'tag-transformer' },
  theory:       { 'predictive coding': 'tag-predcoding' },
};

function getTagColor(dim, val) {
  return (TAG_COLORS[dim] && TAG_COLORS[dim][val]) || 'tag-default';
}

const CAT_COLORS = ['cat-0','cat-1','cat-2','cat-3','cat-4'];
let _catColorMap = {};
let _catColorIdx = 0;

function getCatColor(cat) {
  if (!_catColorMap[cat]) {
    _catColorMap[cat] = CAT_COLORS[_catColorIdx % CAT_COLORS.length];
    _catColorIdx++;
  }
  return _catColorMap[cat];
}

// ─── THEME ─────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'day';
  applyTheme(saved);
}

function applyTheme(mode) {
  document.documentElement.dataset.theme = mode === 'night' ? 'night' : '';
  const label = document.getElementById('theme-label');
  if (label) label.textContent = mode === 'night' ? 'Night' : 'Day';
  localStorage.setItem(THEME_KEY, mode);
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme;
  applyTheme(current === 'night' ? 'day' : 'night');
}

// ─── INIT ──────────────────────────────────────────────────────────────────
async function init() {
  initTheme();
  const saved = localStorage.getItem(LOCAL_KEY);
  if (saved) {
    try { items = JSON.parse(saved); }
    catch { items = []; }
  } else {
    try {
      const res = await fetch('data/reading-list.json');
      items = await res.json();
      items = items.map(normalizeItem);
    } catch { items = []; }
  }
  renderAll();
}

function normalizeItem(item) {
  if (typeof item.categories === 'string') {
    item.categories = item.categories ? [item.categories] : [];
  }
  if (!Array.isArray(item.categories)) {
    const cats = (item.category || '').split(',').map(s => s.trim()).filter(Boolean);
    item.categories = cats.length ? cats : [];
    delete item.category;
  }
  if (item.hidden === undefined) item.hidden = false;
  if (!item.tags) {
    item.tags = { article_type: [], species: [], methods: [], roi: [], model: [], theory: [] };
  }
  Object.keys(TAG_SCHEMA).forEach(dim => {
    if (!Array.isArray(item.tags[dim])) item.tags[dim] = [];
  });
  return item;
}

function save() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

// ─── FILTERING / SORTING ──────────────────────────────────────────────────
function getFiltered() {
  return items
    .filter(item => {
      if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
      // Check each tag dimension filter
      for (const [dim, val] of Object.entries(filterTags)) {
        if (val !== 'all' && !(item.tags[dim] || []).includes(val)) return false;
      }
      if (filterCompleted === 'done' && !item.completed) return false;
      if (filterCompleted === 'todo' && item.completed) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const cats = (item.categories || []).join(' ').toLowerCase();
        const tagStr = Object.values(item.tags || {}).flat().join(' ').toLowerCase();
        if (!item.title.toLowerCase().includes(q) &&
            !(item.authors||'').toLowerCase().includes(q) &&
            !cats.includes(q) &&
            !tagStr.includes(q) &&
            !(item.notes||'').toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let va, vb;
      if (sortKey === 'priority') {
        va = PRIORITY_ORDER[a.priority] ?? 9;
        vb = PRIORITY_ORDER[b.priority] ?? 9;
      } else if (sortKey === 'year') {
        va = a.year || 0; vb = b.year || 0;
      } else if (sortKey === 'title') {
        va = a.title.toLowerCase(); vb = b.title.toLowerCase();
      } else if (sortKey === 'completed') {
        va = a.completed ? 1 : 0; vb = b.completed ? 1 : 0;
      } else {
        va = String(a[sortKey]||'').toLowerCase();
        vb = String(b[sortKey]||'').toLowerCase();
      }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return  1 * sortDir;
      return 0;
    });
}

// ─── RENDER ────────────────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderProgress();
  renderTagFilters();
  renderChips();
  renderTable();
  renderVisibilityBtn();
}

function renderStats() {
  document.getElementById('stat-total').textContent = items.length;
  document.getElementById('stat-done').textContent  = items.filter(i => i.completed).length;
  document.getElementById('stat-high').textContent  = items.filter(i => i.priority === 'red').length;
}

function renderProgress() {
  const total = items.length;
  const done  = items.filter(i => i.completed).length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = pct + '% complete';
}

function renderTagFilters() {
  // Sync all dropdowns to current filterTags state and apply active styling
  Object.keys(filterTags).forEach(dim => {
    const sel = document.getElementById(`ftag-${dim}`);
    if (!sel) return;
    sel.value = filterTags[dim];
    sel.classList.toggle('is-active', filterTags[dim] !== 'all');
  });
  // Show/hide reset button
  const hasActive = Object.values(filterTags).some(v => v !== 'all');
  const btn = document.getElementById('btn-reset-tags');
  if (btn) btn.style.display = hasActive ? '' : 'none';
}

function setTagFilter(dim, val) {
  filterTags[dim] = val;
  renderTagFilters();
  renderTable();
}

function resetTagFilters() {
  Object.keys(filterTags).forEach(k => filterTags[k] = 'all');
  renderTagFilters();
  renderTable();
}

function renderChips() {
  document.querySelectorAll('.chip[data-priority]').forEach(c => {
    c.classList.toggle('active', c.dataset.priority === filterPriority);
  });
}

function renderVisibilityBtn() {
  const btn = document.getElementById('btn-visibility');
  const hiddenCount = items.filter(i => i.hidden).length;
  if (showHidden) {
    btn.classList.add('active');
    btn.innerHTML = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Show All (${hiddenCount} hidden)`;
  } else {
    btn.classList.remove('active');
    btn.innerHTML = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Show Hidden (${hiddenCount})`;
  }
}

function renderTagBadges(item, dim) {
  const vals = (item.tags && item.tags[dim]) || [];
  if (!vals.length) return `<span class="tag-empty">—</span>`;
  return vals.map(v =>
    `<span class="tag-badge ${getTagColor(dim, v)}" onclick="removeTag(${item.id},'${dim}','${v.replace(/'/g,"\\'")}');" title="クリックで削除">${esc(v)}</span>`
  ).join('');
}

function renderAddTagBtn(item, dim) {
  const available = TAG_SCHEMA[dim].options.filter(o => !(item.tags[dim]||[]).includes(o));
  if (!available.length) return '';
  const opts = available.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('');
  return `<select class="tag-add-select" onchange="addTag(${item.id},'${dim}',this.value);this.value=''"><option value="">＋</option>${opts}</select>`;
}

function renderTable() {
  const filtered = getFiltered();
  const tbody = document.getElementById('table-body');

  document.querySelectorAll('th[data-sort]').forEach(th => {
    const active = th.dataset.sort === sortKey;
    th.classList.toggle('sorted', active);
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = active ? (sortDir === 1 ? '↑' : '↓') : '↕';
  });

  const tableWrap = document.querySelector('.table-wrap');
  tableWrap.classList.toggle('show-hidden', showHidden);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="14"><div class="empty-state">
      <svg width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
      </svg>
      <h3>No papers found</h3><p>Try adjusting your filters.</p>
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const hideBtn = item.hidden
      ? `<button class="action-btn show-btn" onclick="toggleHidden(${item.id})">Show</button>`
      : `<button class="action-btn hide-btn" onclick="toggleHidden(${item.id})">Hide</button>`;

    const notes = item.notes || '';
    const isLong = notes.length > 40;
    const expanded = item._notesExpanded || false;
    const notesHtml = notes
      ? `<div class="notes-content ${expanded ? 'notes-expanded' : 'notes-collapsed'}">
          <span class="notes-body">${esc(notes)}</span>
          ${isLong ? `<button class="notes-toggle" onclick="toggleNotes(${item.id})">
            ${expanded ? '折りたたむ' : '続きを見る'}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="2 3 5 7 8 3"/></svg>
          </button>` : ''}
        </div>`
      : `<span style="color:var(--text-dim);font-size:12px">—</span>`;

    return `
      <tr class="${item.completed ? 'completed' : ''} ${item.hidden ? 'hidden-entry' : ''}" data-id="${item.id}">
        <td>
          <div class="custom-check ${item.completed ? 'checked' : ''}" onclick="toggleComplete(${item.id})">
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 3.5 3.5 6 8 1"/></svg>
          </div>
        </td>
        <td class="priority-cell">
          <button class="priority-btn ${item.priority}" onclick="cyclePriority(${item.id})" title="Click to change priority"></button>
        </td>
        <td class="title-cell">
          <span class="title-text">${esc(item.title)}</span>
          <span class="authors-text">${esc(item.authors || '')}</span>
        </td>
        <td class="hide-mobile"><span class="year-text">${item.year || '—'}</span></td>
        <td class="hide-mobile"><span class="journal-text">${esc(item.journal || '—')}</span></td>
        <td class="tag-cell hide-mobile"><div class="tag-group">${renderTagBadges(item,'article_type')}${renderAddTagBtn(item,'article_type')}</div></td>
        <td class="tag-cell hide-mobile"><div class="tag-group">${renderTagBadges(item,'species')}${renderAddTagBtn(item,'species')}</div></td>
        <td class="tag-cell hide-mobile"><div class="tag-group">${renderTagBadges(item,'methods')}${renderAddTagBtn(item,'methods')}</div></td>
        <td class="tag-cell hide-mobile"><div class="tag-group">${renderTagBadges(item,'roi')}${renderAddTagBtn(item,'roi')}</div></td>
        <td class="tag-cell hide-mobile"><div class="tag-group">${renderTagBadges(item,'model')}${renderAddTagBtn(item,'model')}</div></td>
        <td class="tag-cell hide-mobile"><div class="tag-group">${renderTagBadges(item,'theory')}${renderAddTagBtn(item,'theory')}</div></td>
        <td>
          <div class="link-group">
            ${item.pdf
              ? `<a href="${esc(item.pdf)}" class="link-btn pdf" target="_blank"><svg width="10" height="11" viewBox="0 0 10 12" fill="currentColor"><path d="M1 0h6l3 3v9H1V0zm6 0v3h3"/><path d="M3 7h4M3 9h2" stroke="white" stroke-width="0.8" fill="none"/></svg>PDF</a>`
              : `<span class="link-btn pdf disabled">PDF</span>`}
            ${item.url
              ? `<a href="${esc(item.url)}" class="link-btn url" target="_blank"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M7 1h4v4M11 1 5 7"/><path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8"/></svg>URL</a>`
              : `<span class="link-btn url disabled">URL</span>`}
          </div>
        </td>
        <td class="hide-mobile notes-cell">${notesHtml}</td>
        <td><div class="row-actions">${hideBtn}</div></td>
      </tr>`;
  }).join('');
}

// ─── TAG ACTIONS ──────────────────────────────────────────────────────────
function addTag(id, dim, val) {
  if (!val) return;
  const item = items.find(i => i.id === id);
  if (!item) return;
  if (!item.tags) item.tags = {};
  if (!Array.isArray(item.tags[dim])) item.tags[dim] = [];
  if (!item.tags[dim].includes(val)) { item.tags[dim].push(val); save(); renderTable(); }
}

function removeTag(id, dim, val) {
  const item = items.find(i => i.id === id);
  if (!item || !item.tags || !Array.isArray(item.tags[dim])) return;
  item.tags[dim] = item.tags[dim].filter(v => v !== val);
  save(); renderTable();
}

// ─── ACTIONS ───────────────────────────────────────────────────────────────
function toggleComplete(id) {
  const item = items.find(i => i.id === id);
  if (item) { item.completed = !item.completed; save(); renderAll(); }
}

function cyclePriority(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  const cycle = ['red', 'yellow', 'green'];
  item.priority = cycle[(cycle.indexOf(item.priority) + 1) % cycle.length];
  save(); renderAll();
}

function toggleHidden(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item.hidden = !item.hidden;
  save(); renderAll();
}

function toggleNotes(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item._notesExpanded = !item._notesExpanded;
  renderTable();
}

function toggleShowHidden() { showHidden = !showHidden; renderAll(); }

function setSort(key) {
  if (sortKey === key) sortDir *= -1;
  else { sortKey = key; sortDir = 1; }
  renderTable();
}

function setPriority(p) { filterPriority = p; renderAll(); }

// ─── UTILS ─────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── EVENTS ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  document.getElementById('search').addEventListener('input', e => { searchQuery = e.target.value; renderTable(); });
  document.getElementById('filter-completed').addEventListener('change', e => { filterCompleted = e.target.value; renderTable(); });
});