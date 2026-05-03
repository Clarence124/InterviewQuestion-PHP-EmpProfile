/**
 * employees.js — Employee directory list page
 *
 * Auto-detects mode:
 *   http://  → reads/writes via backend/api.php
 *   file://  → reads/writes via localStorage
 */

const STORAGE_KEY = 'staffbase_employees';
const PER_PAGE    = 10;
const USE_API     = window.location.protocol === 'http:' || window.location.protocol === 'https:';
const API_URL     = 'backend/api.php';

let allEmployees = [];
let filtered     = [];
let currentPage  = 1;

// ── localStorage helpers (file:// fallback) ────────────────────────────────
function lsGet() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function lsSet(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ── Map api.php snake_case → internal camelCase ────────────────────────────
function fromApi(emp) {
  return {
    id:            emp.id,
    employeeName:  emp.employee_name,
    gender:        emp.gender,
    maritalStatus: emp.marital_status,
    phoneNo:       emp.phone,
    email:         emp.email,
    address:       emp.address,
    dateOfBirth:   emp.dob,
    nationality:   emp.nationality,
    hireDate:      emp.hire_date,
    department:    emp.department,
    jobTitle:      emp.position || '',
    createdAt:     emp.created_at,
  };
}

// ── Fetch all employees (API or localStorage) ──────────────────────────────
async function getEmployees() {
  if (USE_API) {
    try {
      const res  = await fetch(`${API_URL}?action=list`);
      const data = await res.json();
      return data.success ? data.data.map(fromApi) : [];
    } catch {
      console.warn('API unreachable, falling back to localStorage');
      return lsGet();
    }
  }
  return lsGet();
}

// ── Delete employee (API or localStorage) ──────────────────────────────────
async function deleteEmployee(id) {
  if (USE_API) {
    const res  = await fetch(`${API_URL}?action=delete&id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    return data.success;
  }
  // localStorage fallback
  const list = lsGet().filter(e => e.id !== id);
  lsSet(list);
  return true;
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarClass(name) {
  const code = name.charCodeAt(0) % 6;
  return `avatar-${code}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ') : '—';
}

// ── Stats ─────────────────────────────────────────────────────────────────
function updateStats(employees) {
  document.getElementById('statTotal').textContent = employees.length;

  const depts = new Set(employees.map(e => e.department).filter(Boolean));
  document.getElementById('statDepts').textContent = depts.size;

  const now = new Date();
  const thisMonth = employees.filter(e => {
    const raw = e.hireDate || e.hire_date;
    if (!raw) return false;
    const d = new Date(raw);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  document.getElementById('statThisMonth').textContent = thisMonth;
}

// ── Department filter options ──────────────────────────────────────────────
function populateDeptFilter(employees) {
  const depts = [...new Set(employees.map(e => e.department).filter(Boolean))].sort();
  const select = document.getElementById('deptFilter');
  depts.forEach(dept => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    select.appendChild(opt);
  });
}

// ── Filter + search ────────────────────────────────────────────────────────
function applyFilters() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const dept = document.getElementById('deptFilter').value;

  filtered = allEmployees.filter(emp => {
    const matchesQuery =
      !query ||
      emp.employeeName?.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.department?.toLowerCase().includes(query) ||
      emp.id?.toLowerCase().includes(query);
    const matchesDept = !dept || emp.department === dept;
    return matchesQuery && matchesDept;
  });

  currentPage = 1;
  renderTable();
}

// ── Render table ───────────────────────────────────────────────────────────
function renderTable() {
  const loading = document.getElementById('loadingState');
  const empty = document.getElementById('emptyState');
  const table = document.getElementById('employeeTable');
  const tbody = document.getElementById('tableBody');

  loading.classList.add('hidden');

  if (filtered.length === 0) {
    empty.classList.remove('hidden');
    table.classList.add('hidden');
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  empty.classList.add('hidden');
  table.classList.remove('hidden');

  const start = (currentPage - 1) * PER_PAGE;
  const pageData = filtered.slice(start, start + PER_PAGE);

  tbody.innerHTML = pageData.map(emp => {
    const initials = getInitials(emp.employeeName || 'UN');
    const aClass = avatarClass(emp.employeeName || 'A');
    return `
      <tr data-id="${emp.id}" onclick="openModal('${emp.id}')">
        <td>
          <div class="employee-cell">
            <div class="employee-avatar ${aClass}">${initials}</div>
            <div>
              <div class="employee-name">${emp.employeeName}</div>
              <div class="employee-id">${emp.id || '—'}</div>
            </div>
          </div>
        </td>
        <td><span class="dept-badge">${emp.department || '—'}</span></td>
        <td>
          <div class="contact-info">
            <div class="contact-email">${emp.email || '—'}</div>
            <div class="contact-phone">+60 ${emp.phoneNo || '—'}</div>
          </div>
        </td>
        <td><span class="hire-date">${formatDate(emp.hireDate)}</span></td>
        <td><span class="status-badge active">Active</span></td>
        <td>
          <button class="action-btn" title="View details" onclick="event.stopPropagation(); openModal('${emp.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination();
}

// ── Pagination ─────────────────────────────────────────────────────────────
function renderPagination() {
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const container = document.getElementById('pagination');

  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';

  html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goPage(${currentPage - 1})">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
  </button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<button class="page-btn" disabled>…</button>`;
    }
  }

  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goPage(${currentPage + 1})">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
  </button>`;

  container.innerHTML = html;
}

function goPage(page) {
  currentPage = page;
  renderTable();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Modal ──────────────────────────────────────────────────────────────────
let currentModalId = null;

function openModal(id) {
  const emp = allEmployees.find(e => e.id === id);
  if (!emp) return;
  currentModalId = id;

  document.getElementById('modalName').textContent = emp.employeeName;

  document.getElementById('modalBody').innerHTML = `
    <div class="modal-detail-grid">
      <div class="modal-detail-item">
        <span class="detail-label">Employee ID</span>
        <span class="detail-value">${emp.id}</span>
      </div>
      <div class="modal-detail-item">
        <span class="detail-label">Department</span>
        <span class="detail-value">${emp.department}</span>
      </div>
      <div class="modal-detail-item">
        <span class="detail-label">Job Title</span>
        <span class="detail-value">${emp.jobTitle || '—'}</span>
      </div>
      <div class="modal-detail-item">
        <span class="detail-label">Hire Date</span>
        <span class="detail-value">${formatDate(emp.hireDate)}</span>
      </div>
      <div class="modal-detail-item">
        <span class="detail-label">Gender</span>
        <span class="detail-value">${capitalize(emp.gender)}</span>
      </div>
      <div class="modal-detail-item">
        <span class="detail-label">Marital Status</span>
        <span class="detail-value">${capitalize(emp.maritalStatus)}</span>
      </div>
      <div class="modal-detail-item">
        <span class="detail-label">Date of Birth</span>
        <span class="detail-value">${formatDate(emp.dateOfBirth)}</span>
      </div>
      <div class="modal-detail-item">
        <span class="detail-label">Nationality</span>
        <span class="detail-value">${emp.nationality}</span>
      </div>
      <div class="modal-detail-item">
        <span class="detail-label">Email</span>
        <span class="detail-value">${emp.email}</span>
      </div>
      <div class="modal-detail-item">
        <span class="detail-label">Phone</span>
        <span class="detail-value">+60 ${emp.phoneNo}</span>
      </div>
      <div class="modal-detail-item full">
        <span class="detail-label">Address</span>
        <span class="detail-value">${emp.address}</span>
      </div>
    </div>
  `;

  document.getElementById('modalBackdrop').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
  currentModalId = null;
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('modalBackdrop')) closeModal();
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
  if (!currentModalId) return;
  const emp = allEmployees.find(e => e.id === currentModalId);
  if (!confirm(`Delete ${emp?.employeeName}? This cannot be undone.`)) return;

  const ok = await deleteEmployee(currentModalId);
  if (ok) {
    allEmployees = allEmployees.filter(e => e.id !== currentModalId);
    applyFilters();
    updateStats(allEmployees);
    closeModal();
  } else {
    alert('Failed to delete employee. Please try again.');
  }
});

// ── Export CSV ─────────────────────────────────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', () => {
  if (filtered.length === 0) { alert('No employees to export.'); return; }

  const headers = ['ID', 'Full Name', 'Gender', 'Marital Status', 'Date of Birth',
    'Nationality', 'Phone', 'Email', 'Address', 'Department', 'Job Title', 'Hire Date'];

  const rows = filtered.map(emp => [
    emp.id, emp.employeeName, emp.gender, emp.maritalStatus, emp.dateOfBirth,
    emp.nationality, emp.phoneNo, emp.email, emp.address,
    emp.department, emp.jobTitle, emp.hireDate,
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `employees_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Seed sample data if empty ──────────────────────────────────────────────
function seedSampleData() {
  const samples = [
    {
      id: 'EMP-0001', employeeName: 'Ahmad Faris bin Abdullah', gender: 'male',
      maritalStatus: 'married', dateOfBirth: '1988-03-15', nationality: 'Malaysian',
      phoneNo: '12-3456789', email: 'ahmad.faris@company.com',
      address: 'No. 5, Jalan Harmoni, 10000 Georgetown, Pulau Pinang',
      department: 'Engineering', jobTitle: 'Senior Software Engineer',
      hireDate: '2019-06-01', createdAt: new Date().toISOString(),
    },
    {
      id: 'EMP-0002', employeeName: 'Nurul Ain binti Hassan', gender: 'female',
      maritalStatus: 'single', dateOfBirth: '1995-07-22', nationality: 'Malaysian',
      phoneNo: '11-9876543', email: 'nurul.ain@company.com',
      address: 'Blok A-12, Pangsapuri Indah, 14000 Bukit Mertajam, Pulau Pinang',
      department: 'Human Resources', jobTitle: 'HR Executive',
      hireDate: '2021-01-15', createdAt: new Date().toISOString(),
    },
    {
      id: 'EMP-0003', employeeName: 'Tan Wei Liang', gender: 'male',
      maritalStatus: 'single', dateOfBirth: '1992-11-08', nationality: 'Malaysian',
      phoneNo: '16-7654321', email: 'wei.liang@company.com',
      address: '22, Lorong Bahagia, 11700 Gelugor, Pulau Pinang',
      department: 'Finance', jobTitle: 'Financial Analyst',
      hireDate: '2020-04-01', createdAt: new Date().toISOString(),
    },
    {
      id: 'EMP-0004', employeeName: 'Priya Subramaniam', gender: 'female',
      maritalStatus: 'married', dateOfBirth: '1985-05-12', nationality: 'Malaysian',
      phoneNo: '17-2345678', email: 'priya.sub@company.com',
      address: 'No. 3, Jalan Tun Hussein, 10400 Georgetown, Pulau Pinang',
      department: 'Marketing', jobTitle: 'Marketing Manager',
      hireDate: '2017-09-10', createdAt: new Date().toISOString(),
    },
  ];
  saveEmployees(samples);
  return samples;
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  // Show loading state
  document.getElementById('loadingState').classList.remove('hidden');
  document.getElementById('employeeTable').classList.add('hidden');
  document.getElementById('emptyState').classList.add('hidden');

  allEmployees = await getEmployees();

  // localStorage fallback: seed sample data if empty
  if (!USE_API && allEmployees.length === 0) {
    allEmployees = seedSampleData();
  }

  filtered = [...allEmployees];

  updateStats(allEmployees);
  populateDeptFilter(allEmployees);
  renderTable();

  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('deptFilter').addEventListener('change', applyFilters);
}

init();

// ══════════════════════════════════════════════════════════════════════════
// IMPORT FUNCTIONALITY
// ══════════════════════════════════════════════════════════════════════════

const PREVIEW_COLS = ['employeeName', 'email', 'department', 'hireDate', 'phoneNo'];
const REQUIRED_FIELDS = ['employeeName', 'email'];

let parsedImportData = [];

// ── Open / close import modal ──────────────────────────────────────────────
function openImportModal() {
  document.getElementById('importModalBackdrop').classList.remove('hidden');
  resetImportModal();
}

function closeImportModal() {
  document.getElementById('importModalBackdrop').classList.add('hidden');
  resetImportModal();
}

function resetImportModal() {
  parsedImportData = [];
  document.getElementById('importPreview').classList.add('hidden');
  document.getElementById('confirmImportBtn').classList.add('hidden');
  document.getElementById('previewErrors').classList.add('hidden');
  document.getElementById('dropZone').classList.remove('dragover');
  document.getElementById('importFileInput').value = '';
}

document.getElementById('importBtn').addEventListener('click', openImportModal);
document.getElementById('importModalClose').addEventListener('click', closeImportModal);
document.getElementById('importCancelBtn').addEventListener('click', closeImportModal);
document.getElementById('importModalBackdrop').addEventListener('click', e => {
  if (e.target === document.getElementById('importModalBackdrop')) closeImportModal();
});

// ── Guide tab toggle ───────────────────────────────────────────────────────
document.querySelectorAll('.guide-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.guide-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.tab;
    document.getElementById('guideJson').classList.toggle('hidden', which !== 'json');
    document.getElementById('guideCsv').classList.toggle('hidden', which !== 'csv');
  });
});

// ── Browse button ──────────────────────────────────────────────────────────
document.getElementById('browseBtn').addEventListener('click', () => {
  document.getElementById('importFileInput').click();
});

document.getElementById('importFileInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// ── Drag and drop ──────────────────────────────────────────────────────────
const dropZone = document.getElementById('dropZone');

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// ── Header normalisation map ───────────────────────────────────────────────
// Maps any common column name variation → internal field key
const HEADER_MAP = {
  // employeeName
  'employeename':   'employeeName',
  'employee name':  'employeeName',
  'full name':      'employeeName',
  'fullname':       'employeeName',
  'name':           'employeeName',
  'staff name':     'employeeName',
  'staffname':      'employeeName',
  'employee':       'employeeName',

  // gender
  'gender':         'gender',
  'sex':            'gender',

  // maritalStatus
  'maritalstatus':  'maritalStatus',
  'marital status': 'maritalStatus',
  'marital':        'maritalStatus',
  'civil status':   'maritalStatus',

  // dateOfBirth
  'dateofbirth':    'dateOfBirth',
  'date of birth':  'dateOfBirth',
  'dob':            'dateOfBirth',
  'birth date':     'dateOfBirth',
  'birthdate':      'dateOfBirth',

  // nationality
  'nationality':    'nationality',
  'citizenship':    'nationality',

  // phoneNo
  'phoneno':        'phoneNo',
  'phone no':       'phoneNo',
  'phone no.':      'phoneNo',
  'phone':          'phoneNo',
  'phone number':   'phoneNo',
  'phonenumber':    'phoneNo',
  'mobile':         'phoneNo',
  'mobile number':  'phoneNo',
  'contact':        'phoneNo',
  'tel':            'phoneNo',

  // email
  'email':          'email',
  'email address':  'email',
  'emailaddress':   'email',
  'e-mail':         'email',
  'mail':           'email',

  // address
  'address':        'address',
  'home address':   'address',
  'homeaddress':    'address',
  'residential address': 'address',

  // department
  'department':     'department',
  'dept':           'department',
  'division':       'department',
  'team':           'department',

  // jobTitle
  'jobtitle':       'jobTitle',
  'job title':      'jobTitle',
  'position':       'jobTitle',
  'title':          'jobTitle',
  'role':           'jobTitle',
  'designation':    'jobTitle',

  // hireDate
  'hiredate':       'hireDate',
  'hire date':      'hireDate',
  'start date':     'hireDate',
  'startdate':      'hireDate',
  'joining date':   'hireDate',
  'joiningdate':    'hireDate',
  'date joined':    'hireDate',
  'date of joining':'hireDate',
  'employment date':'hireDate',
};

/**
 * Normalise a raw header string → internal field key.
 * Falls back to the original if no match found.
 */
function normaliseHeader(raw) {
  const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return HEADER_MAP[key] || raw.trim();
}

/**
 * Normalise all keys in a row object using HEADER_MAP.
 * Merges duplicate mappings (keeps first non-empty value).
 */
function normaliseRow(rawRow) {
  const out = {};
  for (const [rawKey, val] of Object.entries(rawRow)) {
    const normKey = normaliseHeader(rawKey);
    // Don't overwrite a value already mapped to this key
    if (!(normKey in out) || out[normKey] === '') {
      out[normKey] = val;
    }
  }
  return out;
}

// ── Parse JSON ─────────────────────────────────────────────────────────────
function parseJSON(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('JSON must be an array of employee objects.');
  // Normalise keys in every object
  return data.map(normaliseRow);
}

// ── Parse CSV ─────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');

  // Parse + normalise headers immediately
  const rawHeaders  = splitCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
  const normHeaders = rawHeaders.map(normaliseHeader);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = splitCSVLine(lines[i]).map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    normHeaders.forEach((h, idx) => {
      if (!(h in obj) || obj[h] === '') obj[h] = values[idx] || '';
    });
    rows.push(obj);
  }
  return rows;
}

// Handle quoted CSV fields correctly
function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── Validate imported rows (runs AFTER normalisation) ─────────────────────
function validateImportRow(row, index) {
  const warnings = [];
  REQUIRED_FIELDS.forEach(f => {
    if (!row[f] || !String(row[f]).trim()) {
      // Show human-friendly label in warning, not camelCase key
      const label = f === 'employeeName' ? 'Employee Name' : 'Email';
      warnings.push(`Row ${index + 1}: Missing required field "${label}".`);
    }
  });
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
    warnings.push(`Row ${index + 1}: Invalid email "${row.email}".`);
  }
  return warnings;
}

// ── Handle file ────────────────────────────────────────────────────────────
function handleFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['json', 'csv'].includes(ext)) {
    showImportError('Unsupported file type. Please upload a .json or .csv file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;
      let data;

      if (ext === 'json') data = parseJSON(text);
      else data = parseCSV(text);

      if (data.length === 0) {
        showImportError('The file contains no employee records.');
        return;
      }

      // Validate all rows
      const allWarnings = [];
      data.forEach((row, i) => {
        const w = validateImportRow(row, i);
        allWarnings.push(...w);
      });

      parsedImportData = data;
      renderImportPreview(data, file.name, allWarnings);

    } catch (err) {
      showImportError('Could not parse file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// ── Show parse error in modal ──────────────────────────────────────────────
function showImportError(msg) {
  const errEl = document.getElementById('previewErrors');
  errEl.innerHTML = '⚠ ' + msg;
  errEl.classList.remove('hidden');
  document.getElementById('importPreview').classList.remove('hidden');
  document.getElementById('previewCount').textContent = '';
  document.getElementById('previewFileName').textContent = '';
  document.getElementById('previewHead').innerHTML = '';
  document.getElementById('previewBody').innerHTML = '';
  document.getElementById('confirmImportBtn').classList.add('hidden');
}

// ── Render preview table ───────────────────────────────────────────────────
function renderImportPreview(data, fileName, warnings) {
  document.getElementById('importPreview').classList.remove('hidden');
  document.getElementById('previewFileName').textContent = fileName;
  document.getElementById('previewCount').textContent =
    `${data.length} record${data.length !== 1 ? 's' : ''} found`;

  // Show warnings
  const errEl = document.getElementById('previewErrors');
  if (warnings.length > 0) {
    errEl.innerHTML = warnings.map(w => `⚠ ${w}`).join('<br>');
    errEl.classList.remove('hidden');
  } else {
    errEl.classList.add('hidden');
  }

  // Header row
  const head = document.getElementById('previewHead');
  head.innerHTML = PREVIEW_COLS.map(c => `<th>${c}</th>`).join('');

  // Body rows (first 20 preview)
  const body = document.getElementById('previewBody');
  const preview = data.slice(0, 20);
  body.innerHTML = preview.map(row => {
    const cells = PREVIEW_COLS.map(col => `<td title="${row[col] || ''}">${row[col] || '—'}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  if (data.length > 20) {
    body.innerHTML += `<tr><td colspan="${PREVIEW_COLS.length}" style="text-align:center;color:var(--text-muted);font-style:italic;padding:10px">
      … and ${data.length - 20} more rows
    </td></tr>`;
  }

  // Show confirm button (even with warnings — user decides)
  document.getElementById('confirmImportBtn').classList.remove('hidden');
}

// ── Confirm import ─────────────────────────────────────────────────────────
document.getElementById('confirmImportBtn').addEventListener('click', async () => {
  if (!parsedImportData.length) return;

  const btn = document.getElementById('confirmImportBtn');
  btn.disabled = true;
  btn.textContent = 'Importing…';

  const existingEmails = new Set(allEmployees.map(e => (e.email || '').toLowerCase()));
  let added = 0, skipped = 0;

  for (const row of parsedImportData) {
    const email = (row.email || '').toLowerCase();
    if (existingEmails.has(email)) { skipped++; continue; }

    if (USE_API) {
      // POST each record to the API
      try {
        const res  = await fetch(`${API_URL}?action=add`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_name:  row.employeeName || '',
            gender:         row.gender       || '',
            marital_status: row.maritalStatus || '',
            phone:          row.phoneNo      || '',
            email:          row.email        || '',
            address:        row.address      || '',
            dob:            row.dateOfBirth  || '',
            nationality:    row.nationality  || '',
            hire_date:      row.hireDate     || '',
            department:     row.department   || '',
            position:       row.jobTitle     || '',
          }),
        });
        const data = await res.json();
        if (data.success) {
          existingEmails.add(email);
          added++;
        } else {
          skipped++;
        }
      } catch { skipped++; }

    } else {
      // localStorage fallback
      const all  = lsGet();
      const nums = all.map(e => parseInt((e.id || '').replace('EMP-', '')) || 0);
      const next = (nums.length ? Math.max(...nums) : 0) + 1;
      all.push({
        id:            'EMP-' + String(next).padStart(4, '0'),
        employeeName:  row.employeeName || '',
        gender:        row.gender       || '',
        maritalStatus: row.maritalStatus || '',
        phoneNo:       row.phoneNo      || '',
        email:         row.email        || '',
        address:       row.address      || '',
        dateOfBirth:   row.dateOfBirth  || '',
        nationality:   row.nationality  || '',
        hireDate:      row.hireDate     || '',
        department:    row.department   || '',
        jobTitle:      row.jobTitle     || '',
        createdAt:     new Date().toISOString(),
      });
      lsSet(all);
      existingEmails.add(email);
      added++;
    }
  }

  // Refresh the list from source
  allEmployees = await getEmployees();
  filtered     = [...allEmployees];
  updateStats(allEmployees);

  const deptSelect = document.getElementById('deptFilter');
  deptSelect.innerHTML = '<option value="">All Departments</option>';
  populateDeptFilter(allEmployees);
  applyFilters();

  closeImportModal();
  btn.disabled = false;
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Import Employees`;

  // Toast
  const banner = document.createElement('div');
  banner.className = 'alert success';
  banner.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999;min-width:280px;box-shadow:0 4px 16px rgba(0,0,0,0.12)';
  banner.innerHTML = `✓ Imported <strong>${added}</strong> employee${added !== 1 ? 's' : ''}` +
    (skipped ? ` &nbsp;·&nbsp; <span style="opacity:0.7">${skipped} skipped (duplicate)</span>` : '');
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 5000);
});