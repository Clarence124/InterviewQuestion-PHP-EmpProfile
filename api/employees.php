<?php
/**
 * api/employees.php
 * REST API endpoint for Employee Management
 *
 * Routes:
 *   GET    /api/employees.php          → list all employees (with optional ?search=&department=&page=)
 *   GET    /api/employees.php?id=X     → get single employee
 *   POST   /api/employees.php          → create new employee
 *   DELETE /api/employees.php?id=X     → delete employee
 *
 * Storage: JSON file (data/employees.json)
 * In production, replace with a proper database (MySQL/PostgreSQL).
 */

// ── CORS & Headers ─────────────────────────────────────────────────────────
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Config ─────────────────────────────────────────────────────────────────
define('DATA_FILE', __DIR__ . '/../data/employees.json');
define('PER_PAGE', 10);

// ── Helpers ────────────────────────────────────────────────────────────────

function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

function loadEmployees(): array {
    if (!file_exists(DATA_FILE)) {
        return [];
    }
    $raw = file_get_contents(DATA_FILE);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function saveEmployees(array $employees): void {
    $dir = dirname(DATA_FILE);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents(DATA_FILE, json_encode($employees, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function generateId(array $employees): string {
    if (empty($employees)) return 'EMP-0001';
    $nums = array_map(function($e) {
        preg_match('/(\d+)$/', $e['id'] ?? '', $m);
        return isset($m[1]) ? (int)$m[1] : 0;
    }, $employees);
    $next = max($nums) + 1;
    return 'EMP-' . str_pad($next, 4, '0', STR_PAD_LEFT);
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateEmployeeInput(array $data, bool $isNew = true): array {
    $errors = [];

    // Employee Name
    if (empty(trim($data['employeeName'] ?? ''))) {
        $errors['employeeName'] = 'Employee name is required.';
    } elseif (strlen(trim($data['employeeName'])) < 2) {
        $errors['employeeName'] = 'Name must be at least 2 characters.';
    } elseif (strlen(trim($data['employeeName'])) > 100) {
        $errors['employeeName'] = 'Name cannot exceed 100 characters.';
    }

    // Gender
    $validGenders = ['male', 'female', 'prefer_not_to_say'];
    if (empty($data['gender']) || !in_array($data['gender'], $validGenders)) {
        $errors['gender'] = 'Please select a valid gender.';
    }

    // Marital Status
    $validMarital = ['single', 'married', 'divorced', 'widowed'];
    if (empty($data['maritalStatus']) || !in_array($data['maritalStatus'], $validMarital)) {
        $errors['maritalStatus'] = 'Please select a valid marital status.';
    }

    // Date of Birth
    if (empty($data['dateOfBirth'])) {
        $errors['dateOfBirth'] = 'Date of birth is required.';
    } else {
        $dob = DateTime::createFromFormat('Y-m-d', $data['dateOfBirth']);
        if (!$dob) {
            $errors['dateOfBirth'] = 'Invalid date format.';
        } else {
            $now = new DateTime();
            $age = $now->diff($dob)->y;
            if ($dob > $now) {
                $errors['dateOfBirth'] = 'Date of birth cannot be in the future.';
            } elseif ($age < 18) {
                $errors['dateOfBirth'] = 'Employee must be at least 18 years old.';
            } elseif ($age > 70) {
                $errors['dateOfBirth'] = 'Employee cannot be older than 70 years.';
            }
        }
    }

    // Nationality
    if (empty(trim($data['nationality'] ?? ''))) {
        $errors['nationality'] = 'Nationality is required.';
    }

    // Phone
    $phone = preg_replace('/[\s\-\(\)]/', '', $data['phoneNo'] ?? '');
    if (empty($phone)) {
        $errors['phoneNo'] = 'Phone number is required.';
    } elseif (!preg_match('/^[0-9]{8,12}$/', $phone)) {
        $errors['phoneNo'] = 'Enter a valid phone number (8–12 digits).';
    }

    // Email
    if (empty(trim($data['email'] ?? ''))) {
        $errors['email'] = 'Email address is required.';
    } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Enter a valid email address.';
    }

    // Address
    if (empty(trim($data['address'] ?? ''))) {
        $errors['address'] = 'Address is required.';
    } elseif (strlen(trim($data['address'])) < 10) {
        $errors['address'] = 'Address must be at least 10 characters.';
    }

    // Department
    $validDepts = ['Engineering', 'Human Resources', 'Finance', 'Marketing', 'Operations',
                   'Sales', 'IT', 'Legal', 'Customer Service'];
    if (empty($data['department']) || !in_array($data['department'], $validDepts)) {
        $errors['department'] = 'Please select a valid department.';
    }

    // Hire Date
    if (empty($data['hireDate'])) {
        $errors['hireDate'] = 'Hire date is required.';
    } else {
        $hireDate = DateTime::createFromFormat('Y-m-d', $data['hireDate']);
        if (!$hireDate) {
            $errors['hireDate'] = 'Invalid hire date format.';
        }
    }

    return $errors;
}

// ── Sanitize input ─────────────────────────────────────────────────────────

function sanitizeEmployee(array $data): array {
    return [
        'employeeName'  => htmlspecialchars(trim($data['employeeName'] ?? '')),
        'gender'        => $data['gender'] ?? '',
        'maritalStatus' => $data['maritalStatus'] ?? '',
        'dateOfBirth'   => $data['dateOfBirth'] ?? '',
        'nationality'   => htmlspecialchars(trim($data['nationality'] ?? '')),
        'phoneNo'       => preg_replace('/[\s\-\(\)]/', '', $data['phoneNo'] ?? ''),
        'email'         => strtolower(trim($data['email'] ?? '')),
        'address'       => htmlspecialchars(trim($data['address'] ?? '')),
        'department'    => $data['department'] ?? '',
        'jobTitle'      => htmlspecialchars(trim($data['jobTitle'] ?? '')),
        'hireDate'      => $data['hireDate'] ?? '',
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id'] ?? null;

// ── GET /api/employees.php ─────────────────────────────────────────────────
if ($method === 'GET' && !$id) {
    $employees = loadEmployees();

    // Filter by search query
    $search = strtolower(trim($_GET['search'] ?? ''));
    if ($search) {
        $employees = array_filter($employees, function($e) use ($search) {
            return str_contains(strtolower($e['employeeName'] ?? ''), $search)
                || str_contains(strtolower($e['email'] ?? ''), $search)
                || str_contains(strtolower($e['department'] ?? ''), $search)
                || str_contains(strtolower($e['id'] ?? ''), $search);
        });
        $employees = array_values($employees);
    }

    // Filter by department
    $dept = trim($_GET['department'] ?? '');
    if ($dept) {
        $employees = array_filter($employees, fn($e) => ($e['department'] ?? '') === $dept);
        $employees = array_values($employees);
    }

    // Pagination
    $total = count($employees);
    $page  = max(1, (int)($_GET['page'] ?? 1));
    $pages = max(1, (int)ceil($total / PER_PAGE));
    $offset = ($page - 1) * PER_PAGE;
    $paged  = array_slice($employees, $offset, PER_PAGE);

    respond(200, [
        'success' => true,
        'data'    => $paged,
        'meta'    => [
            'total'        => $total,
            'per_page'     => PER_PAGE,
            'current_page' => $page,
            'last_page'    => $pages,
        ],
    ]);
}

// ── GET /api/employees.php?id=X ────────────────────────────────────────────
if ($method === 'GET' && $id) {
    $employees = loadEmployees();
    $emp = array_values(array_filter($employees, fn($e) => $e['id'] === $id));
    if (empty($emp)) {
        respond(404, ['success' => false, 'message' => 'Employee not found.']);
    }
    respond(200, ['success' => true, 'data' => $emp[0]]);
}

// ── POST /api/employees.php ────────────────────────────────────────────────
if ($method === 'POST') {
    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);

    if (!is_array($body)) {
        respond(400, ['success' => false, 'message' => 'Invalid JSON body.']);
    }

    // Validate
    $errors = validateEmployeeInput($body);
    if (!empty($errors)) {
        respond(422, [
            'success' => false,
            'message' => 'Validation failed.',
            'errors'  => $errors,
        ]);
    }

    // Check duplicate email
    $employees = loadEmployees();
    $existing = array_filter($employees, fn($e) =>
        strtolower($e['email'] ?? '') === strtolower(trim($body['email']))
    );

    if (!empty($existing)) {
        respond(409, [
            'success' => false,
            'message' => 'Validation failed.',
            'errors'  => ['email' => 'This email is already registered.'],
        ]);
    }

    // Save
    $newEmployee = sanitizeEmployee($body);
    $newEmployee['id']        = generateId($employees);
    $newEmployee['createdAt'] = (new DateTime())->format(DateTime::ATOM);

    $employees[] = $newEmployee;
    saveEmployees($employees);

    respond(201, [
        'success' => true,
        'message' => 'Employee created successfully.',
        'data'    => $newEmployee,
    ]);
}

// ── DELETE /api/employees.php?id=X ────────────────────────────────────────
if ($method === 'DELETE' && $id) {
    $employees = loadEmployees();
    $original  = count($employees);
    $employees = array_values(array_filter($employees, fn($e) => $e['id'] !== $id));

    if (count($employees) === $original) {
        respond(404, ['success' => false, 'message' => 'Employee not found.']);
    }

    saveEmployees($employees);
    respond(200, ['success' => true, 'message' => 'Employee deleted successfully.']);
}

// ── Fallback ───────────────────────────────────────────────────────────────
respond(405, ['success' => false, 'message' => 'Method not allowed.']);
