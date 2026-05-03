<?php
/**
 * backend/api.php  —  Employee REST API
 *
 * Routes
 * ──────────────────────────────────────────────────────────
 *  GET    api.php?action=list            → list all employees
 *  GET    api.php?action=get&id=EMP-001  → single employee
 *  POST   api.php?action=add             → create employee
 *  PUT    api.php?action=update&id=…     → update employee
 *  DELETE api.php?action=delete&id=…     → delete employee
 *
 * Storage: employees.json  (same folder as this file)
 */

// ── CORS & headers ─────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Config ─────────────────────────────────────────────────
define('DATA_FILE', __DIR__ . '/employees.json');

// ── Helpers ────────────────────────────────────────────────
function respond(int $code, array $payload): void {
    http_response_code($code);
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

function loadEmployees(): array {
    if (!file_exists(DATA_FILE)) {
        file_put_contents(DATA_FILE, '[]');
        return [];
    }
    $raw  = file_get_contents(DATA_FILE);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function saveEmployees(array $employees): void {
    $ok = file_put_contents(
        DATA_FILE,
        json_encode(array_values($employees), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
    );
    if ($ok === false) {
        respond(500, ['success' => false,
            'message' => 'Cannot write employees.json — check folder write permission.']);
    }
}

function generateId(array $employees): string {
    if (empty($employees)) return 'EMP-0001';
    $nums = array_map(function ($e) {
        preg_match('/(\d+)$/', $e['id'] ?? '', $m);
        return isset($m[1]) ? (int)$m[1] : 0;
    }, $employees);
    return 'EMP-' . str_pad(max($nums) + 1, 4, '0', STR_PAD_LEFT);
}

function validateEmployee(array $d, bool $partial = false): array {
    $errors   = [];
    $required = ['employee_name','gender','marital_status','phone',
                 'email','address','dob','nationality','hire_date','department'];

    if (!$partial) {
        foreach ($required as $f) {
            if (empty(trim($d[$f] ?? ''))) {
                $errors[$f] = ucwords(str_replace('_', ' ', $f)) . ' is required.';
            }
        }
    }

    if (!empty($d['email']) && !filter_var($d['email'], FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Invalid email address.';
    }

    if (!empty($d['phone'])) {
        $p = preg_replace('/[\s\-\(\)+]/', '', $d['phone']);
        if (!preg_match('/^[0-9]{8,15}$/', $p)) {
            $errors['phone'] = 'Invalid phone (8-15 digits).';
        }
    }

    if (!empty($d['dob'])) {
        $dob = DateTime::createFromFormat('Y-m-d', $d['dob']);
        if (!$dob) {
            $errors['dob'] = 'Invalid date format. Use YYYY-MM-DD.';
        } else {
            $age = (new DateTime())->diff($dob)->y;
            if ($dob > new DateTime()) $errors['dob'] = 'DOB cannot be in the future.';
            elseif ($age < 18) $errors['dob'] = 'Employee must be at least 18.';
        }
    }

    if (!empty($d['hire_date']) && !DateTime::createFromFormat('Y-m-d', $d['hire_date'])) {
        $errors['hire_date'] = 'Invalid hire date. Use YYYY-MM-DD.';
    }

    return $errors;
}

function sanitise(array $d): array {
    return [
        'employee_name'  => htmlspecialchars(trim($d['employee_name']  ?? ''), ENT_QUOTES),
        'gender'         => trim($d['gender']         ?? ''),
        'marital_status' => trim($d['marital_status'] ?? ''),
        'phone'          => preg_replace('/[\s\-\(\)]/', '', $d['phone'] ?? ''),
        'email'          => strtolower(trim($d['email']        ?? '')),
        'address'        => htmlspecialchars(trim($d['address']        ?? ''), ENT_QUOTES),
        'dob'            => trim($d['dob']            ?? ''),
        'nationality'    => htmlspecialchars(trim($d['nationality']    ?? ''), ENT_QUOTES),
        'hire_date'      => trim($d['hire_date']      ?? ''),
        'department'     => htmlspecialchars(trim($d['department']     ?? ''), ENT_QUOTES),
        'position'       => htmlspecialchars(trim($d['position']       ?? ''), ENT_QUOTES),
    ];
}

// ── Router ──────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$action = trim($_GET['action'] ?? '');
$id     = trim($_GET['id']     ?? '');

// ── GET list ────────────────────────────────────────────────
if ($method === 'GET' && $action === 'list') {
    $list = loadEmployees();

    if ($q = strtolower(trim($_GET['search'] ?? ''))) {
        $list = array_values(array_filter($list, fn($e) =>
            str_contains(strtolower($e['employee_name'] ?? ''), $q) ||
            str_contains(strtolower($e['email']         ?? ''), $q) ||
            str_contains(strtolower($e['department']    ?? ''), $q) ||
            str_contains(strtolower($e['id']            ?? ''), $q)
        ));
    }

    if ($dept = trim($_GET['department'] ?? '')) {
        $list = array_values(array_filter($list, fn($e) => ($e['department'] ?? '') === $dept));
    }

    respond(200, ['success' => true, 'count' => count($list), 'data' => $list]);
}

// ── GET single ──────────────────────────────────────────────
if ($method === 'GET' && $action === 'get') {
    if (!$id) respond(400, ['success' => false, 'message' => 'Missing ?id=']);
    $list  = loadEmployees();
    $found = array_values(array_filter($list, fn($e) => $e['id'] === $id));
    if (empty($found)) respond(404, ['success' => false, 'message' => "No employee with id='$id'."]);
    respond(200, ['success' => true, 'data' => $found[0]]);
}

// ── POST add ────────────────────────────────────────────────
if ($method === 'POST' && $action === 'add') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) respond(400, ['success' => false, 'message' => 'Request body must be JSON.']);

    $errors = validateEmployee($body);
    if (!empty($errors)) respond(422, ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors]);

    $list = loadEmployees();

    $dup = array_filter($list, fn($e) =>
        strtolower($e['email'] ?? '') === strtolower($body['email']));
    if (!empty($dup)) respond(409, ['success' => false, 'message' => 'Validation failed.',
        'errors' => ['email' => 'This email is already registered.']]);

    $emp = sanitise($body);
    $emp['id']         = generateId($list);
    $emp['created_at'] = (new DateTime())->format('Y-m-d H:i:s');
    $emp['updated_at'] = null;

    $list[] = $emp;
    saveEmployees($list);

    respond(201, ['success' => true, 'message' => 'Employee added.', 'data' => $emp]);
}

// ── PUT update ──────────────────────────────────────────────
if ($method === 'PUT' && $action === 'update') {
    if (!$id) respond(400, ['success' => false, 'message' => 'Missing ?id=']);

    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) respond(400, ['success' => false, 'message' => 'Request body must be JSON.']);

    $errors = validateEmployee($body, true);
    if (!empty($errors)) respond(422, ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors]);

    $list  = loadEmployees();
    $index = null;
    foreach ($list as $i => $e) { if ($e['id'] === $id) { $index = $i; break; } }
    if ($index === null) respond(404, ['success' => false, 'message' => "No employee with id='$id'."]);

    if (!empty($body['email'])) {
        $dup = array_filter($list, fn($e) =>
            strtolower($e['email'] ?? '') === strtolower($body['email']) && $e['id'] !== $id);
        if (!empty($dup)) respond(409, ['success' => false, 'message' => 'Validation failed.',
            'errors' => ['email' => 'Email already used by another employee.']]);
    }

    $merged = array_merge($list[$index], sanitise(array_merge($list[$index], $body)));
    $merged['id']         = $id;
    $merged['created_at'] = $list[$index]['created_at'];
    $merged['updated_at'] = (new DateTime())->format('Y-m-d H:i:s');

    $list[$index] = $merged;
    saveEmployees($list);

    respond(200, ['success' => true, 'message' => 'Employee updated.', 'data' => $merged]);
}

// ── DELETE ──────────────────────────────────────────────────
if ($method === 'DELETE' && $action === 'delete') {
    if (!$id) respond(400, ['success' => false, 'message' => 'Missing ?id=']);

    $list   = loadEmployees();
    $before = count($list);
    $list   = array_values(array_filter($list, fn($e) => $e['id'] !== $id));

    if (count($list) === $before) respond(404, ['success' => false, 'message' => "No employee with id='$id'."]);

    saveEmployees($list);
    respond(200, ['success' => true, 'message' => "Employee '$id' deleted."]);
}

// ── Fallback ────────────────────────────────────────────────
respond(400, ['success' => false,
    'message' => "Unknown action '$action'. Valid: list | get | add | update | delete"]);