/**
 * validation.js — Frontend form validation rules
 */

const Validators = {
  required: (value) => value.trim() !== '' ? null : 'This field is required.',

  minLength: (min) => (value) =>
    value.trim().length >= min ? null : `Minimum ${min} characters required.`,

  maxLength: (max) => (value) =>
    value.trim().length <= max ? null : `Maximum ${max} characters allowed.`,

  email: (value) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(value.trim()) ? null : 'Enter a valid email address.';
  },

  phone: (value) => {
    const cleaned = value.replace(/[\s\-()]/g, '');
    const re = /^[0-9]{8,12}$/;
    return re.test(cleaned) ? null : 'Enter a valid phone number (8–12 digits).';
  },

  date: (value) => {
    if (!value) return 'Please select a date.';
    const d = new Date(value);
    return isNaN(d.getTime()) ? 'Enter a valid date.' : null;
  },

  dateNotFuture: (value) => {
    if (!value) return 'Please select a date.';
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'Enter a valid date.';
    return d > new Date() ? 'Date cannot be in the future.' : null;
  },

  dateNotPast: (value) => {
    if (!value) return 'Please select a date.';
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'Enter a valid date.';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d < yesterday ? 'Hire date cannot be in the past.' : null;
  },

  age: (min, max) => (value) => {
    if (!value) return 'Please select a date.';
    const dob = new Date(value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    if (age < min) return `Employee must be at least ${min} years old.`;
    if (age > max) return `Employee cannot be older than ${max} years.`;
    return null;
  },

  select: (value) => value !== '' ? null : 'Please select an option.',
};

/**
 * Field rules map
 */
const fieldRules = {
  employeeName: [
    Validators.required,
    Validators.minLength(2),
    Validators.maxLength(100),
  ],
  gender: [Validators.required, Validators.select],
  maritalStatus: [Validators.required, Validators.select],
  dateOfBirth: [
    Validators.required,
    Validators.date,
    Validators.dateNotFuture,
    Validators.age(18, 70),
  ],
  nationality: [Validators.required, Validators.select],
  phoneNo: [Validators.required, Validators.phone],
  email: [Validators.required, Validators.email],
  address: [Validators.required, Validators.minLength(10), Validators.maxLength(300)],
  department: [Validators.required, Validators.select],
  hireDate: [Validators.required, Validators.date],
};

/**
 * Validate a single field and return first error or null
 */
function validateField(name, value) {
  const rules = fieldRules[name];
  if (!rules) return null;
  for (const rule of rules) {
    const err = rule(value);
    if (err) return err;
  }
  return null;
}

/**
 * Validate entire form and return { valid, errors }
 */

function validateForm(data) {
  const errors = {};
  let valid = true;

  for (const [name, rules] of Object.entries(fieldRules)) {
    const value = data[name] !== undefined ? String(data[name]) : '';
    for (const rule of rules) {
      const err = rule(value);
      if (err) {
        errors[name] = err;
        valid = false;
        break;
      }
    }
  }

  return { valid, errors };
}

/**
 * Show/clear error on a specific field element
 */
function showFieldError(name, message) {
  const el = document.getElementById(name) || document.querySelector(`[name="${name}"]`);
  const errEl = document.getElementById(`err-${name}`);
  if (el) {
    el.classList.toggle('error', !!message);
    if (el.closest('.input-prefix-wrap')) {
      el.closest('.input-prefix-wrap').classList.toggle('error', !!message);
    }
  }
  if (errEl) errEl.textContent = message || '';
}

function clearAllErrors(fieldNames) {
  fieldNames.forEach(name => showFieldError(name, ''));
}
