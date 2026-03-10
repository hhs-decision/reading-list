// ─── STATE ─────────────────────────────────────────────────────────────────
let items = [];
let editingId = null;
let sortKey = 'priority';
let sortDir = 1;
let filterPriority = 'all';
let filterCategory = 'all';
let filterCompleted = 'all';
let searchQuery = '';

const PRIORITY_ORDER = { red: 0, yellow: 1, green: 2 };
const LOCAL_KEY = 'reading-list-v1';

// ─── INIT ──────────────────────────────────────────────────────────────────
async function init() {
  const saved = localStorage.getItem(LOCAL_KEY);
  if (saved) {
    try { items = JSON.parse(saved); }
    catch { items = []; }
  } else {
    // Load from JSON file the first time
    try {
      const res = await fetch('data/reading-list.json');
      items = await res.json();
    } catch {
      items = [];
    }
  }
  renderAll();
}

function save() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

// ─── FILTERING / SORTING ──────────────────────────────────────────────────
function getFiltered() {
  return items
    .filter(item => {
      if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (filterCompleted === 'done' && !item.completed) return false;
      if (filterCompleted === 'todo' && item.completed) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!item.title.toLowerCase().includes(q) &&
            !item.authors.toLowerCase().includes(q) &&
            !(item.category || '').toLowerCase().includes(q) &&
            !(item.notes || '').toLowerCase().includes(q)) return false;
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
        va = (a[sortKey] || '').toString().toLowerCase();
        vb = (b[sortKey] || '').toString().toLowerCase();
      }
      if (va < vb) return -1 * sortDir;
      if (va > vb) return 1 * sortDir;
      return 0;
    });
}

function getCategories() {
  return [...new Set(items.map(i => i.category).filter(Boolean))].sort();
}

// ─── RENDER ────────────────────────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderProgress();
  renderCategorySelect();
  renderTable();
  renderChips();
}

function renderStats() {
  const total = items.length;
  const done = items.filter(i => i.completed).length;
  const high = items.filter(i => i.priority === 'red').length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-high').textContent = high;
}

function renderProgress() {
  const total = items.length;
  const done = items.filter(i => i.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = pct + '% complete';
}

function renderCategorySelect() {
  const sel = document.getElementById('filter-category');
  const cur = sel.value;
  const cats = getCategories();
  sel.innerHTML = `<option value="all">All categories</option>` +
    cats.map(c => `<option value="${esc(c)}" ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('');
}

function renderChips() {
  document.querySelectorAll('.chip[data-priority]').forEach(c => {
    c.classList.toggle('active', c.dataset.priority === filterPriority);
  });
}

function renderTable() {
  const filtered = getFiltered();
  const tbody = document.getElementById('table-body');

  // Update sort headers
  document.querySelectorAll('th[data-sort]').forEach(th => {
    const active = th.dataset.sort === sortKey;
    th.classList.toggle('sorted', active);
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = active ? (sortDir === 1 ? '↑' : '↓') : '↕';
  });

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr><td colspan="8">
        <div class="empty-state">
          <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
            <rect x="9" y="3" width="6" height="4" rx="1"/>
            <path d="M9 12h6M9 16h4"/>
          </svg>
          <h3>No papers found</h3>
          <p>Try adjusting your filters or add a new paper.</p>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr class="${item.completed ? 'completed' : ''}" data-id="${item.id}">
      <td>
        <div class="custom-check ${item.completed ? 'checked' : ''}" onclick="toggleComplete(${item.id})">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 4 7 9 1"/>
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
      <td class="hide-mobile">
        <span class="category-badge">${esc(item.category || 'Uncategorized')}</span>
      </td>
      <td>
        <div class="link-group">
          ${item.pdf
            ? `<a href="${esc(item.pdf)}" class="link-btn pdf" target="_blank">
                <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M1 0h6l3 3v9H1V0zm6 0v3h3"/><path d="M3 7h4M3 9h2" stroke="currentColor" stroke-width="1" fill="none"/></svg>
                PDF
               </a>`
            : `<span class="link-btn pdf disabled">PDF</span>`}
          ${item.url
            ? `<a href="${esc(item.url)}" class="link-btn url" target="_blank">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
                  <path d="M7 1h4v4M11 1 5 7"/><path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8"/>
                </svg>
                URL
               </a>`
            : `<span class="link-btn url disabled">URL</span>`}
        </div>
      </td>
      <td class="hide-mobile" style="max-width:160px; color:var(--text-muted); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(item.notes || '')}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="action-btn" onclick="openEdit(${item.id})" title="Edit">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="action-btn" onclick="deleteItem(${item.id})" title="Delete">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
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

function deleteItem(id) {
  if (!confirm('Delete this entry?')) return;
  items = items.filter(i => i.id !== id);
  save(); renderAll();
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

// ─── MODAL ─────────────────────────────────────────────────────────────────
function openAdd() {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Add Paper';
  clearForm();
  setModalPriority('red');
  document.getElementById('modal').classList.add('open');
}

function openEdit(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  editingId = id;
  document.getElementById('modal-title').textContent = 'Edit Paper';
  document.getElementById('f-title').value = item.title || '';
  document.getElementById('f-authors').value = item.authors || '';
  document.getElementById('f-year').value = item.year || '';
  document.getElementById('f-category').value = item.category || '';
  document.getElementById('f-pdf').value = item.pdf || '';
  document.getElementById('f-url').value = item.url || '';
  document.getElementById('f-notes').value = item.notes || '';
  setModalPriority(item.priority || 'red');
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  editingId = null;
}

function clearForm() {
  ['f-title','f-authors','f-year','f-category','f-pdf','f-url','f-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

let _selectedPriority = 'red';
function setModalPriority(p) {
  _selectedPriority = p;
  document.querySelectorAll('.priority-pick-btn').forEach(btn => {
    btn.classList.remove('selected-red','selected-yellow','selected-green');
    if (btn.dataset.val === p) btn.classList.add('selected-' + p);
  });
}

function saveItem() {
  const title = document.getElementById('f-title').value.trim();
  if (!title) { alert('Title is required.'); return; }
  const data = {
    title,
    authors: document.getElementById('f-authors').value.trim(),
    year: parseInt(document.getElementById('f-year').value) || null,
    category: document.getElementById('f-category').value.trim() || 'Uncategorized',
    pdf: document.getElementById('f-pdf').value.trim(),
    url: document.getElementById('f-url').value.trim(),
    notes: document.getElementById('f-notes').value.trim(),
    priority: _selectedPriority,
  };
  if (editingId !== null) {
    const idx = items.findIndex(i => i.id === editingId);
    if (idx > -1) items[idx] = { ...items[idx], ...data };
  } else {
    const maxId = items.reduce((m, i) => Math.max(m, i.id || 0), 0);
    items.push({ id: maxId + 1, completed: false, ...data });
  }
  save(); renderAll(); closeModal();
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

  // Close modal on overlay click
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target === document.getElementById('modal')) closeModal();
  });

  // ESC to close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
