# StaffBase — Employee Management System

A full-stack Employee Management System built with **HTML5, CSS3, vanilla JavaScript** and a **PHP REST API** backend. Data is stored in a JSON file. No frameworks, no build tools — just open and run.

---

## Project Structure

```
employee-system/
├── index.html              # Add New Employee form
├── employees.html          # Employee Directory (list screen)
│
├── css/
│   └── style.css           # All styles (responsive, dark sidebar)
│
├── js/
│   ├── validation.js       # Frontend validation rules (reusable)
│   ├── form.js             # Add Employee form logic + API calls
│   └── employees.js        # Employee list, search, filter, import, export
│
└── backend/
    ├── api.php             # PHP REST API (GET, POST, PUT, DELETE)
    └── employees.json      # JSON data store (auto-created if missing)
```

---

## Features

### Add Employee Form (`index.html`)
- All required fields: Employee Name, Gender, Marital Status, Phone No., Email, Address, Date of Birth, Nationality, Hire Date, Department
- Extra fields: Job Title, Auto-generated Employee ID
- Real-time validation on blur (instant feedback per field)
- Full form validation on submit
- After saving — download the record as **JSON** or **CSV**

### Employee Directory (`employees.html`)
- Stats row: total employees, departments, hired this month
- Live search by name, email, department, or ID
- Filter by department
- Paginated table (10 per page)
- Click any row to view full employee details in a modal
- Delete employee (with confirmation)
- **Import** employees from a `.json` or `.csv` file (drag & drop or browse)
- **Export** all employees to `.csv`

### Validation
- **Frontend:** required fields, email format, phone digits (8–15), age range (18–70), date checks — runs instantly in the browser
- **Backend:** PHP mirrors all the same rules server-side — duplicate email detection, input sanitisation (`htmlspecialchars`), strict date format checks

### Storage modes (auto-detected)
| Mode | How to open | Where data saves |
|---|---|---|
| **File mode** | Double-click `index.html` | Browser `localStorage` |
| **Server mode** | `http://localhost:8000` | `backend/employees.json` via API |

A banner appears at the bottom of the page for 6 seconds telling you which mode is active.

---

## How to Run
#### Step 1 — Install PHP (no admin required)

If `php` is not installed:

1. Go to **https://windows.php.net/download**
2. Under **VS17 x64 Non Thread Safe** — click **Zip**
3. Extract the zip to `C:\Users\YourName\php\`
4. You should now have `C:\Users\YourName\php\php.exe`

To make `php` available everywhere (optional, one-time):

```powershell
[System.Environment]::SetEnvironmentVariable(
  "PATH",
  $env:PATH + ";C:\Users\YourName\php",
  "User"
)
```

Close and reopen PowerShell after running this.

#### Step 2 — Start the PHP server from the project ROOT

```powershell
# Navigate to the root of the project (where index.html lives)
cd C:\Users\YourName\Documents\Programming\employee-system

# Start PHP built-in server
php -S localhost:8000

# If php is not in PATH yet, use the full path:
C:\Users\YourName\php\php.exe -S localhost:8000
```

You should see:
```
PHP x.x.x Development Server (http://localhost:8000) started
```

> Important: run from the ROOT folder (where `index.html` is), NOT from inside `backend/`.

#### Step 3 — Open in browser

| Page | URL |
|---|---|
| Add Employee | http://localhost:8000/index.html |
| All Employees | http://localhost:8000/employees.html |

#### Step 4 — Verify API is working

Open this URL in your browser:
```
http://localhost:8000/backend/api.php?action=list
```

You should see:
```json
{
  "success": true,
  "count": 0,
  "data": []
}
```

---

## REST API Reference

All routes go through `backend/api.php`.

### Endpoints

| Method | URL | Description |
|---|---|---|
| GET | `api.php?action=list` | List all employees |
| GET | `api.php?action=list&search=ahmad` | Search employees |
| GET | `api.php?action=list&department=Engineering` | Filter by department |
| GET | `api.php?action=get&id=EMP-0001` | Get single employee |
| POST | `api.php?action=add` | Create new employee |
| PUT | `api.php?action=update&id=EMP-0001` | Update employee |
| DELETE | `api.php?action=delete&id=EMP-0001` | Delete employee |

### POST / PUT Body Fields

```json
{
  "employee_name":  "Ahmad Faris bin Abdullah",
  "gender":         "Male",
  "marital_status": "Single",
  "phone":          "0123456789",
  "email":          "ahmad@company.com",
  "address":        "No. 5, Jalan Harmoni, 10000 Georgetown, Penang",
  "dob":            "1990-05-12",
  "nationality":    "Malaysian",
  "hire_date":      "2022-01-10",
  "department":     "Engineering",
  "position":       "Software Engineer"
}
```

### Success Response

```json
{
  "success": true,
  "message": "Employee added.",
  "data": {
    "id": "EMP-0001",
    "employee_name": "Ahmad Faris bin Abdullah",
    "email": "ahmad@company.com",
    "created_at": "2025-01-10 09:00:00",
    ...
  }
}
```

### Validation Error Response (422)

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "email": "Invalid email address.",
    "phone": "Invalid phone (8-15 digits).",
    "dob":   "Employee must be at least 18."
  }
}
```

### Duplicate Email Response (409)

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {
    "email": "This email is already registered."
  }
}
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| Backend | PHP 8.0+ |
| Storage | JSON file (`employees.json`) |
| Fonts | Outfit + JetBrains Mono (Google Fonts) |
| No dependencies | No npm, no composer, no frameworks |

---
