// ─── STATE ─────────────────────────────────────────────────────────────────
let items = [];
let sortKey = 'priority';
let sortDir = 1;
let filterPriority = 'all';
let filterCategory = 'all';
let filterCompleted = 'all';
let searchQuery = '';
let showHidden = false;

const PRIORITY_ORDER = { red: 0, yellow: 1, green: 2 };
const LOCAL_KEY = 'reading-list-v2';
const THEME_KEY = 'reading-list-theme';

// Category color cycling (mod 5 matching CSS .cat-0 … .cat-4)
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
      // Normalize: ensure categories is always an array
      items = items.map(normalizeItem);
    } catch { items = []; }
  }

  renderAll();
}

function normalizeItem(item) {
  // Convert old string category to array
  if (typeof item.categories === 'string') {
    item.categories = item.categories ? [item.categories] : [];
  }
  if (!Array.isArray(item.categories)) {
    // migrate from old "category" field
    const cats = (item.category || '').split(',').map(s => s.trim()).filter(Boolean);
    item.categories = cats.length ? cats : ['Uncategorized'];
    delete item.category;
  }
  if (item.hidden === undefined) item.hidden = false;
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
      if (filterCategory !== 'all' && !(item.categories || []).includes(filterCategory)) return false;
      if (filterCompleted === 'done' && !item.completed) return false;
      if (filterCompleted === 'todo' && item.completed) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const cats = (item.categories || []).join(' ').toLowerCase();
        if (!item.title.toLowerCase().includes(q) &&
            !(item.authors||'').toLowerCase().includes(q) &&
            !cats.includes(q) &&
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

function getAllCategories() {
  const set = new Set();
  items.forEach(i => (i.categories || []).forEach(c => set.add(c)));
  return [...set].sort();
}

// ─── RENDER ────────────────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderProgress();
  renderCategorySelect();
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

function renderCategorySelect() {
  const sel  = document.getElementById('filter-category');
  const cats = getAllCategories();
  sel.innerHTML = `<option value="all">All categories</option>` +
    cats.map(c => `<option value="${esc(c)}" ${c === filterCategory ? 'selected' : ''}>${esc(c)}</option>`).join('');
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

function renderTable() {
  const filtered = getFiltered();
  const tbody = document.getElementById('table-body');

  // update sort icons
  document.querySelectorAll('th[data-sort]').forEach(th => {
    const active = th.dataset.sort === sortKey;
    th.classList.toggle('sorted', active);
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = active ? (sortDir === 1 ? '↑' : '↓') : '↕';
  });

  // toggle show-hidden class on tbody's parent
  const tableWrap = document.querySelector('.table-wrap');
  tableWrap.classList.toggle('show-hidden', showHidden);

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr><td colspan="9">
        <div class="empty-state">
          <svg width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12h6M9 16h4"/>
          </svg>
          <h3>No papers found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const catBadges = (item.categories || ['Uncategorized']).map(c =>
      `<span class="category-badge ${getCatColor(c)}">${esc(c)}</span>`
    ).join('');

    const hideBtn = item.hidden
      ? `<button class="action-btn show-btn" onclick="toggleHidden(${item.id})" title="Make visible">Show</button>`
      : `<button class="action-btn hide-btn" onclick="toggleHidden(${item.id})" title="Hide this entry">Hide</button>`;

    const notes = item.notes || '';
    const isLong = notes.length > 40;
    const expanded = item._notesExpanded || false;
    const notesHtml = notes
      ? `<div class="notes-content ${expanded ? 'notes-expanded' : 'notes-collapsed'}">
          <span class="notes-body">${esc(notes)}</span>
          ${isLong ? `<button class="notes-toggle" onclick="toggleNotes(${item.id})">
            ${expanded ? '折りたたむ' : '続きを見る'}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <polyline points="2 3 5 7 8 3"/>
            </svg>
          </button>` : ''}
        </div>`
      : `<span style="color:var(--text-dim);font-size:12px">—</span>`;

    return `
      <tr class="${item.completed ? 'completed' : ''} ${item.hidden ? 'hidden-entry' : ''}" data-id="${item.id}">
        <td>
          <div class="custom-check ${item.completed ? 'checked' : ''}" onclick="toggleComplete(${item.id})">
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 3.5 3.5 6 8 1"/>
            </svg>
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
        <td class="hide-mobile">
          <div class="category-group">${catBadges}</div>
        </td>
        <td>
          <div class="link-group">
            ${item.pdf
              ? `<a href="${esc(item.pdf)}" class="link-btn pdf" target="_blank">
                  <svg width="10" height="11" viewBox="0 0 10 12" fill="currentColor"><path d="M1 0h6l3 3v9H1V0zm6 0v3h3"/><path d="M3 7h4M3 9h2" stroke="white" stroke-width="0.8" fill="none"/></svg>
                  PDF</a>`
              : `<span class="link-btn pdf disabled">PDF</span>`}
            ${item.url
              ? `<a href="${esc(item.url)}" class="link-btn url" target="_blank">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
                    <path d="M7 1h4v4M11 1 5 7"/><path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8"/>
                  </svg>
                  URL</a>`
              : `<span class="link-btn url disabled">URL</span>`}
          </div>
        </td>
        <td class="hide-mobile notes-cell">${notesHtml}</td>
        <td>
          <div class="row-actions">${hideBtn}</div>
        </td>
      </tr>`;
  }).join('');
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
  const cur = cycle.indexOf(item.priority);
  item.priority = cycle[(cur + 1) % cycle.length];
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
  // Re-render only the table (no save needed — _notesExpanded is UI state only)
  renderTable();
}

function toggleShowHidden() {
  showHidden = !showHidden;
  renderAll();
}

function setSort(key) {
  if (sortKey === key) sortDir *= -1;
  else { sortKey = key; sortDir = 1; }
  renderTable();
}

function setPriority(p) {
  filterPriority = p;
  renderAll();
}

// ─── UTILS ─────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── EVENTS ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();

  document.getElementById('search').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderTable();
  });

  document.getElementById('filter-category').addEventListener('change', e => {
    filterCategory = e.target.value;
    renderTable();
  });

  document.getElementById('filter-completed').addEventListener('change', e => {
    filterCompleted = e.target.value;
    renderTable();
  });
});
