/**
 * form.js — Add Employee form
 *
 * Mode detection (automatic):
 *   - If page is served via http:// (PHP running) → calls backend/api.php
 *   - If opened as file:// (no server)            → falls back to localStorage
 */

const STORAGE_KEY = 'staffbase_employees';
const fieldNames  = Object.keys(fieldRules);

// ── Are we running on a real server? ──────────────────────────────────────
const USE_API = window.location.protocol === 'http:' || window.location.protocol === 'https:';
const API_URL = 'backend/api.php';

let lastSavedEmployee = null;

// ══════════════════════════════════════════════════════════════════════════
// API / localStorage abstraction
// ══════════════════════════════════════════════════════════════════════════

// ── localStorage helpers (fallback only) ──────────────────────────────────
function lsGet() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function lsSet(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function lsGenerateId() {
  const list = lsGet();
  const nums = list.map(e => parseInt((e.id || '').replace('EMP-', '')) || 0);
  return 'EMP-' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0');
}

// ── Map form field names → api.php field names ────────────────────────────
function toApiPayload(data) {
  return {
    employee_name:  data.employeeName,
    gender:         data.gender,
    marital_status: data.maritalStatus,
    phone:          data.phoneNo,
    email:          data.email,
    address:        data.address,
    dob:            data.dateOfBirth,
    nationality:    data.nationality,
    hire_date:      data.hireDate,
    department:     data.department,
    position:       data.jobTitle || '',
  };
}

// ── Map api.php response fields → internal field names (for download) ─────
function fromApiEmployee(emp) {
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
    jobTitle:      emp.position,
    createdAt:     emp.created_at,
  };
}

// ── Main save function — uses API or localStorage ─────────────────────────
async function apiSaveEmployee(formData) {
  if (USE_API) {
    // ── Real PHP API call ────────────────────────────────────────────────
    const res  = await fetch(`${API_URL}?action=add`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(toApiPayload(formData)),
    });

    const data = await res.json();

    if (!data.success) {
      // Map api.php error field names back to form field names
      const fieldMap = {
        employee_name:  'employeeName',
        marital_status: 'maritalStatus',
        phone:          'phoneNo',
        dob:            'dateOfBirth',
        hire_date:      'hireDate',
      };
      const firstKey   = Object.keys(data.errors || {})[0];
      const mappedKey  = fieldMap[firstKey] || firstKey;
      const mappedMsg  = Object.values(data.errors || {})[0] || data.message;
      throw { field: mappedKey, message: mappedMsg };
    }

    return { success: true, employee: fromApiEmployee(data.data) };

  } else {
    // ── localStorage fallback (file:// mode) ──────────────────────────────
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const list = lsGet();
          const dup  = list.find(e => e.email.toLowerCase() === formData.email.toLowerCase());
          if (dup) return reject({ field: 'email', message: 'This email is already registered.' });

          const emp = {
            ...formData,
            id:        lsGenerateId(),
            createdAt: new Date().toISOString(),
          };
          list.push(emp);
          lsSet(list);
          resolve({ success: true, employee: emp });
        } catch {
          reject({ message: 'Failed to save. Please try again.' });
        }
      }, 500);
    });
  }
}

// ── Next employee ID preview ──────────────────────────────────────────────
async function refreshEmployeeIdPreview() {
  if (USE_API) {
    try {
      const res  = await fetch(`${API_URL}?action=list`);
      const data = await res.json();
      if (data.success) {
        const list = data.data;
        const nums = list.map(e => parseInt((e.id || '').replace('EMP-', '')) || 0);
        const next = (nums.length ? Math.max(...nums) : 0) + 1;
        document.getElementById('employeeId').value = 'EMP-' + String(next).padStart(4, '0');
      }
    } catch {
      document.getElementById('employeeId').value = lsGenerateId();
    }
  } else {
    document.getElementById('employeeId').value = lsGenerateId();
  }
}

// ══════════════════════════════════════════════════════════════════════════
// UI Helpers
// ══════════════════════════════════════════════════════════════════════════

function showErrorAlert(message) {
  const el   = document.getElementById('alert');
  const icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  el.className  = 'alert error';
  el.innerHTML  = icon + message;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideErrorAlert() {
  document.getElementById('alert').className = 'alert hidden';
}

function showSuccessCard(employee) {
  hideErrorAlert();
  lastSavedEmployee = employee;
  document.getElementById('successName').textContent = employee.employeeName;
  document.getElementById('successId').textContent   =
    'ID: ' + employee.id + ' · saved successfully';
  const card = document.getElementById('successCard');
  card.classList.remove('hidden');
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideSuccessCard() {
  document.getElementById('successCard').classList.add('hidden');
  lastSavedEmployee = null;
}

document.getElementById('successDismiss').addEventListener('click', hideSuccessCard);

// ══════════════════════════════════════════════════════════════════════════
// Download helpers
// ══════════════════════════════════════════════════════════════════════════

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById('downloadJson').addEventListener('click', () => {
  if (!lastSavedEmployee) return;
  triggerDownload(
    JSON.stringify([lastSavedEmployee], null, 2),
    'employee_' + lastSavedEmployee.id + '.json',
    'application/json'
  );
});

document.getElementById('downloadCsv').addEventListener('click', () => {
  if (!lastSavedEmployee) return;

  const headers = [
    'id', 'employeeName', 'gender', 'maritalStatus', 'dateOfBirth',
    'nationality', 'phoneNo', 'email', 'address',
    'department', 'jobTitle', 'hireDate', 'createdAt',
  ];

  const row = headers.map(h => {
    const val = String(lastSavedEmployee[h] || '');
    return /[,"\n]/.test(val) ? '"' + val.replace(/"/g, '""') + '"' : val;
  });

  triggerDownload(
    [headers.join(','), row.join(',')].join('\n'),
    'employee_' + lastSavedEmployee.id + '.csv',
    'text/csv'
  );
});

// ══════════════════════════════════════════════════════════════════════════
// Show mode banner (so user knows which storage is active)
// ══════════════════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
    background: ${USE_API ? '#dcfce7' : '#fef3c7'};
    color: ${USE_API ? '#166534' : '#92400e'};
    border: 1px solid ${USE_API ? '#86efac' : '#fde68a'};
    padding: 7px 16px; border-radius: 999px; font-size: 12px;
    font-family: monospace; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    pointer-events: none;
  `;
  banner.textContent = USE_API
    ? '✓ Connected to PHP API — data saves to employees.json'
    : '⚠ File mode — data saves to localStorage only (open via http:// to use PHP API)';
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 6000);
});

// ══════════════════════════════════════════════════════════════════════════
// Form logic
// ══════════════════════════════════════════════════════════════════════════

// Populate ID preview on load
refreshEmployeeIdPreview();

// Real-time validation on blur
fieldNames.forEach(name => {
  const el = document.getElementById(name) || document.querySelector('[name="' + name + '"]');
  if (!el) return;
  el.addEventListener('blur',  () => showFieldError(name, validateField(name, el.value)));
  el.addEventListener('input', () => {
    if (el.classList.contains('error'))
      showFieldError(name, validateField(name, el.value));
  });
});

// Submit
const form      = document.getElementById('employeeForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideSuccessCard();

  // Collect values
  const data = {};
  fieldNames.forEach(name => {
    const el = document.getElementById(name) || document.querySelector('[name="' + name + '"]');
    data[name] = el ? el.value : '';
  });
  data.jobTitle = document.getElementById('jobTitle')?.value || '';

  // Validate
  clearAllErrors(fieldNames);
  const { valid, errors } = validateForm(data);
  if (!valid) {
    Object.entries(errors).forEach(([n, msg]) => showFieldError(n, msg));
    document.getElementById(Object.keys(errors)[0])
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Submit
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<svg class="spin-icon" width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Saving…`;

  try {
    const result = await apiSaveEmployee(data);
    showSuccessCard(result.employee);
    form.reset();
    clearAllErrors(fieldNames);
    refreshEmployeeIdPreview();
  } catch (err) {
    if (err.field) {
      showFieldError(err.field, err.message);
      document.getElementById(err.field)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showErrorAlert(err.message || 'An unexpected error occurred.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"/></svg> Save Employee`;
  }
});

// Reset
document.getElementById('resetBtn').addEventListener('click', () => {
  form.reset();
  clearAllErrors(fieldNames);
  hideErrorAlert();
  hideSuccessCard();
  refreshEmployeeIdPreview();
});

// Spin animation
const _style = document.createElement('style');
_style.textContent = '.spin-icon { animation: spin 0.7s linear infinite; }';
document.head.appendChild(_style);