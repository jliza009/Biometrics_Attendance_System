<?php
namespace HrAttendance;

use PDO;

class ApiHandler
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    public function handle(string $method, string $path, array $body): array
    {
        $path = trim($path, '/');

        if ($path === '' || $path === 'health') {
            return ['ok' => true, 'database' => true];
        }

        if ($path === 'bootstrap' && $method === 'GET') {
            return $this->bootstrap();
        }

        if ($path === 'auth/admin' && $method === 'POST') {
            return $this->authAdmin($body);
        }

        if ($path === 'auth/fingerprint' && $method === 'POST') {
            return $this->authFingerprint($body);
        }

        if ($path === 'employees' && $method === 'POST') {
            return $this->addEmployee($body);
        }

        if (preg_match('#^employees/(\d+)$#', $path, $m)) {
            if ($method === 'PUT') return $this->updateEmployee((int)$m[1], $body);
            if ($method === 'DELETE') return $this->deleteEmployee((int)$m[1]);
        }

        if (preg_match('#^employees/(\d+)/password$#', $path, $m) && $method === 'PUT') {
            return $this->resetEmployeePassword((int)$m[1], $body);
        }

        if ($path === 'clock' && $method === 'POST') {
            return $this->clockInOrOut($body);
        }

        if ($path === 'leave/apply' && $method === 'POST') {
            return $this->applyLeave($body);
        }

        if ($path === 'leave/status' && $method === 'POST') {
            return $this->updateLeaveStatus($body);
        }

        if ($path === 'leave/sick' && $method === 'POST') {
            return $this->addSickDay($body);
        }

        if ($path === 'leave/adjust' && $method === 'POST') {
            return $this->adjustLeaveBalance($body);
        }

        if ($path === 'leave/policy' && $method === 'PUT') {
            return $this->updateLeavePolicy($body);
        }

        if ($path === 'shifts' && $method === 'POST') {
            return $this->addShift($body);
        }

        if (preg_match('#^shifts/(\d+)$#', $path, $m)) {
            if ($method === 'PUT') return $this->updateShift((int)$m[1], $body);
            if ($method === 'DELETE') return $this->deleteShift((int)$m[1]);
        }

        if ($path === 'holidays' && $method === 'POST') {
            return $this->addHoliday($body);
        }

        if (preg_match('#^holidays/(\d+)$#', $path, $m) && $method === 'DELETE') {
            return $this->deleteHoliday((int)$m[1]);
        }

        if ($path === 'shift-assignments' && $method === 'POST') {
            return $this->assignShift($body);
        }

        if ($path === 'settings' && $method === 'PUT') {
            return $this->updateSettings($body);
        }

        if ($path === 'roster/cell' && $method === 'POST') {
            return $this->updateRosterCell($body);
        }

        if ($path === 'roster/import' && $method === 'POST') {
            return $this->importRoster($body);
        }

        if ($path === 'notifications/read' && $method === 'POST') {
            return $this->clearNotifications($body);
        }

        if ($path === 'reminders/run' && $method === 'POST') {
            return $this->runReminders();
        }

        http_response_code(404);
        return ['error' => 'Not found'];
    }

    private function bootstrap(): array
    {
        $employees = $this->db->query('SELECT * FROM employees ORDER BY id')->fetchAll();
        $emps = array_map([FingerprintService::class, 'mapEmployee'], $employees);

        $shifts = $this->db->query('SELECT id, name, start_time AS start, end_time AS end, grace, location FROM shifts')->fetchAll();
        foreach ($shifts as &$s) {
            $s['id'] = (int)$s['id'];
            $s['grace'] = (int)$s['grace'];
        }

        $holidays = $this->db->query('SELECT id, name, holiday_date AS date, recurring FROM public_holidays')->fetchAll();
        foreach ($holidays as &$h) {
            $h['id'] = (int)$h['id'];
            $h['recurring'] = (bool)$h['recurring'];
        }

        $assignments = [];
        $assignRows = $this->db->query('SELECT * FROM shift_assignments')->fetchAll();
        foreach ($assignRows as $a) {
            $assignments[(int)$a['employee_id']] = [
                'shiftName' => $a['shift_name'],
                'shiftId' => $a['shift_id'] ? (int)$a['shift_id'] : null,
                'schedule' => $a['schedule_json'] ? json_decode($a['schedule_json'], true) : null,
            ];
        }

        $balances = [];
        foreach ($this->db->query('SELECT * FROM leave_balances')->fetchAll() as $b) {
            $balances[] = [
                'employeeId' => (int)$b['employee_id'],
                'annual' => ['allocated' => (int)$b['annual_allocated'], 'used' => (int)$b['annual_used']],
                'sick' => ['allocated' => (int)$b['sick_allocated'], 'used' => (int)$b['sick_used']],
                'emergency' => ['allocated' => (int)$b['emergency_allocated'], 'used' => (int)$b['emergency_used']],
                'maternity' => ['allocated' => (int)$b['maternity_allocated'], 'used' => (int)$b['maternity_used']],
            ];
        }

        $leaves = [];
        foreach ($this->db->query('SELECT * FROM leave_requests ORDER BY id DESC')->fetchAll() as $l) {
            $leaves[] = [
                'id' => (int)$l['id'],
                'employeeId' => (int)$l['employee_id'],
                'employeeName' => $l['employee_name'],
                'department' => $l['department'],
                'type' => $l['leave_type'],
                'from' => $l['date_from'],
                'to' => $l['date_to'],
                'days' => (int)$l['days'],
                'reason' => $l['reason'],
                'status' => $l['status'],
            ];
        }

        $roster = [];
        foreach ($this->db->query('SELECT * FROM roster_cells')->fetchAll() as $r) {
            $key = $r['roster_year'] . '-' . $r['roster_month'];
            $eid = (int)$r['employee_id'];
            if (!isset($roster[$key])) $roster[$key] = [];
            if (!isset($roster[$key][$eid])) $roster[$key][$eid] = [];
            $roster[$key][$eid][(int)$r['day_num']] = $r['day_type'];
        }

        $logs = [];
        foreach ($this->db->query('SELECT * FROM clock_logs ORDER BY id DESC LIMIT 500')->fetchAll() as $log) {
            $logs[] = $this->mapClockLog($log);
        }

        $feed = [];
        foreach ($this->db->query('SELECT * FROM clock_feed ORDER BY id DESC LIMIT 50')->fetchAll() as $f) {
            $feed[] = [
                'id' => (int)$f['id'],
                'name' => $f['employee_name'],
                'time' => $f['feed_time'],
                'type' => $f['feed_type'],
                'status' => $f['status'],
            ];
        }

        $notifs = [];
        foreach ($this->db->query('SELECT * FROM notifications ORDER BY id DESC LIMIT 100')->fetchAll() as $n) {
            $notifs[] = [
                'id' => (int)$n['id'],
                'userId' => $n['user_id'],
                'message' => $n['message'],
                'time' => $n['notif_time'],
                'type' => $n['notif_type'],
                'read' => (bool)$n['is_read'],
            ];
        }

        $emails = [];
        foreach ($this->db->query('SELECT * FROM emails ORDER BY id DESC LIMIT 100')->fetchAll() as $e) {
            $emails[] = [
                'id' => (int)$e['id'],
                'to' => $e['recipient'],
                'subject' => $e['subject'],
                'body' => $e['body'],
                'sentAt' => $e['sent_at'],
            ];
        }

        $settings = $this->getSettings();
        $policy = $this->getLeavePolicy();

        return [
            'employees' => $emps,
            'shifts' => $shifts,
            'publicHolidays' => $holidays,
            'shiftAssignments' => $assignments,
            'leaveBalances' => $balances,
            'leaveRequests' => $leaves,
            'roster' => $roster,
            'clockLogs' => $logs,
            'clockFeed' => $feed,
            'notifications' => $notifs,
            'emails' => $emails,
            'systemSettings' => $settings,
            'leavePolicy' => $policy,
            'departments' => ['Engineering', 'HR', 'Finance', 'Operations', 'Marketing', 'Sales'],
        ];
    }

    private function getSettings(): array
    {
        $s = $this->db->query('SELECT * FROM system_settings WHERE id = 1')->fetch();
        return [
            'gracePeriodMinutes' => (int)$s['grace_period_minutes'],
            'missedClockInReminder' => (bool)$s['missed_clock_in_reminder'],
            'missedClockOutReminder' => (bool)$s['missed_clock_out_reminder'],
            'escalateToManager' => (bool)$s['escalate_to_manager'],
            'emailDigest' => (bool)$s['email_digest'],
            'leaveApprovalAlert' => (bool)$s['leave_approval_alert'],
            'adminPin' => $s['admin_pin'],
            'reminderEmailTemplate' => $s['reminder_email_template'] ?: "Dear {employee_name},\n\nYour shift starts at {shift_time} on {date}. Please clock in.\n\nHR Team",
            'clockOutReminderTemplate' => $s['clock_out_reminder_template'] ?: "Dear {employee_name},\n\nYour shift ended at {shift_time}. Please clock out.\n\nHR Team",
            'smtpHost' => $s['smtp_host'],
            'smtpPort' => (int)$s['smtp_port'],
            'smtpUser' => $s['smtp_user'],
            'smtpPass' => $s['smtp_pass'],
            'smtpFromEmail' => $s['smtp_from_email'],
            'smtpFromName' => $s['smtp_from_name'],
            'smtpEncryption' => $s['smtp_encryption'],
        ];
    }

    private function getLeavePolicy(): array
    {
        $p = $this->db->query('SELECT * FROM leave_policy WHERE id = 1')->fetch();
        return [
            'yearStart' => $p['year_start'],
            'yearEnd' => $p['year_end'],
            'defaults' => [
                'annual' => (int)$p['annual_days'],
                'sick' => (int)$p['sick_days'],
                'emergency' => (int)$p['emergency_days'],
                'maternity' => (int)$p['maternity_days'],
            ],
        ];
    }

    private function authAdmin(array $body): array
    {
        $pin = $body['pin'] ?? '';
        $s = $this->db->query('SELECT admin_pin FROM system_settings WHERE id = 1')->fetch();
        if ($pin !== $s['admin_pin']) {
            http_response_code(401);
            return ['success' => false, 'message' => 'Invalid admin passcode'];
        }
        return ['success' => true, 'user' => ['id' => 'admin', 'name' => 'Administrator', 'role' => 'HR Admin', 'department' => 'HR', 'email' => 'hr-admin@company.com']];
    }

    private function authFingerprint(array $body): array
    {
        $empId = (int)($body['employeeId'] ?? 0);
        $template = $body['template'] ?? '';
        $stmt = $this->db->prepare('SELECT * FROM employees WHERE id = ? AND status = ?');
        $stmt->execute([$empId, 'active']);
        $row = $stmt->fetch();
        if (!$row || !FingerprintService::verifyTemplate($row['fingerprint_template'], $template)) {
            http_response_code(401);
            return ['success' => false, 'message' => 'Biometric verification failed'];
        }
        return ['success' => true, 'employee' => FingerprintService::mapEmployee($row)];
    }

    private function addEmployee(array $body): array
    {
        $fp = $body['fingerprint'] ?? null;
        if (!$fp) {
            http_response_code(400);
            return ['success' => false, 'message' => 'Fingerprint enrollment required'];
        }

        $fpJson = is_array($fp) ? json_encode($fp) : json_encode(['id' => $fp, 'template' => $fp]);
        $fpId = is_array($fp) ? ($fp['id'] ?? null) : $fp;
        $policy = $this->getLeavePolicy();

        $stmt = $this->db->prepare('INSERT INTO employees (name, role, department, shift_name, status, email, phone, start_date, fingerprint_id, fingerprint_template, password) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
        $stmt->execute([
            $body['name'], $body['role'], $body['department'], $body['shift'] ?? null,
            $body['status'] ?? 'active', $body['email'], $body['phone'] ?? null,
            $body['startDate'] ?? date('Y-m-d'), $fpId, $fpJson, $body['password'] ?? null,
        ]);
        $id = (int)$this->db->lastInsertId();

        $this->db->prepare('INSERT INTO leave_balances (employee_id, annual_allocated, sick_allocated, emergency_allocated, maternity_allocated) VALUES (?,?,?,?,?)')
            ->execute([$id, $policy['defaults']['annual'], $policy['defaults']['sick'], $policy['defaults']['emergency'], $policy['defaults']['maternity']]);

        if (!empty($body['shift'])) {
            $shift = $this->db->prepare('SELECT id FROM shifts WHERE name = ?');
            $shift->execute([$body['shift']]);
            $shiftRow = $shift->fetch();
            $isWknd = stripos($body['shift'], 'Weekend') !== false;
            if ($isWknd) {
                 $schedule = json_encode(['0' => $shiftRow['id'] ?? null, '6' => $shiftRow['id'] ?? null]);
            } else {
                 $schedule = json_encode(['1' => $shiftRow['id'] ?? null, '2' => $shiftRow['id'] ?? null, '3' => $shiftRow['id'] ?? null, '4' => $shiftRow['id'] ?? null, '5' => $shiftRow['id'] ?? null]);
            }
            $this->db->prepare('INSERT INTO shift_assignments (employee_id, shift_name, shift_id, schedule_json) VALUES (?,?,?,?)')
                ->execute([$id, $body['shift'], $shiftRow['id'] ?? null, $schedule]);
        }

        $this->addNotification('admin', "New employee registered: {$body['name']}", 'employee');
        Mailer::send($this->db, $body['email'], 'Welcome to the Company Portal', "Hi {$body['name']},\n\nYour profile has been created and your biometric fingerprint is registered.\n\nBest,\nHR Administration");

        $stmt = $this->db->prepare('SELECT * FROM employees WHERE id = ?');
        $stmt->execute([$id]);
        return ['success' => true, 'employee' => FingerprintService::mapEmployee($stmt->fetch())];
    }

    private function updateEmployee(int $id, array $body): array
    {
        $fields = [];
        $vals = [];
        $map = ['name' => 'name', 'role' => 'role', 'department' => 'department', 'shift' => 'shift_name', 'status' => 'status', 'email' => 'email', 'phone' => 'phone'];
        foreach ($map as $k => $col) {
            if (isset($body[$k])) {
                $fields[] = "$col = ?";
                $vals[] = $body[$k];
            }
        }
        if (isset($body['fingerprint'])) {
            $fp = $body['fingerprint'];
            $fpJson = is_array($fp) ? json_encode($fp) : json_encode(['id' => $fp, 'template' => $fp]);
            $fpId = is_array($fp) ? ($fp['id'] ?? null) : $fp;
            $fields[] = "fingerprint_id = ?";
            $vals[] = $fpId;
            $fields[] = "fingerprint_template = ?";
            $vals[] = $fpJson;
        }
        if ($fields) {
            $vals[] = $id;
            $this->db->prepare('UPDATE employees SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($vals);
        }
        return ['success' => true];
    }

    private function deleteEmployee(int $id): array
    {
        $this->db->prepare('DELETE FROM employees WHERE id = ?')->execute([$id]);
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function resetEmployeePassword(int $id, array $body): array
    {
        $this->db->prepare('UPDATE employees SET password = ? WHERE id = ?')->execute([$body['password'], $id]);
        return ['success' => true];
    }

    private function clockInOrOut(array $body): array
    {
        $empId = (int)($body['employeeId'] ?? 0);
        $type = $body['type'] ?? 'in';
        $template = $body['template'] ?? '';

        $stmt = $this->db->prepare('SELECT * FROM employees WHERE id = ?');
        $stmt->execute([$empId]);
        $emp = $stmt->fetch();
        if (!$emp || $emp['status'] !== 'active') {
            return ['success' => false, 'message' => 'Employee not found or inactive'];
        }
        if (!FingerprintService::verifyTemplate($emp['fingerprint_template'], $template)) {
            return ['success' => false, 'message' => 'Biometric verification failed'];
        }

        $shift = $this->getEmployeeShift($empId, $emp['shift_name']);
        if (!$shift) {
            return ['success' => false, 'message' => 'No shift assigned'];
        }

        $today = date('Y-m-d');
        $time = date('H:i');
        $settings = $this->getSettings();
        $grace = (int)($shift['grace'] ?? $settings['gracePeriodMinutes']);

        $stmt = $this->db->prepare('SELECT * FROM clock_logs WHERE employee_id = ? AND log_date = ? ORDER BY id DESC');
        $stmt->execute([$empId, $today]);
        $todayLogs = $stmt->fetchAll();
        $openLog = null;
        foreach ($todayLogs as $log) {
            if ($log['actual_in'] && !$log['actual_out']) {
                $openLog = $log;
                break;
            }
        }
        $completed = false;
        foreach ($todayLogs as $log) {
            if ($log['actual_in'] && $log['actual_out']) {
                $completed = true;
                break;
            }
        }

        if ($type === 'in') {
            if ($openLog) return ['success' => false, 'message' => 'Already clocked in. Please clock out first.'];
            if ($completed) return ['success' => false, 'message' => 'Already completed clock-in and clock-out for today.'];

            $diff = $this->minutesDiff($shift['start'], $time);
            $status = $diff > $grace ? 'late' : 'on_time';

            $ins = $this->db->prepare('INSERT INTO clock_logs (employee_id, employee_name, department, shift_name, expected_in, actual_in, expected_out, status, location, log_date) VALUES (?,?,?,?,?,?,?,?,?,?)');
            $ins->execute([$empId, $emp['name'], $emp['department'], $shift['name'], $shift['start'], $time, $shift['end'], $status, $shift['location'], $today]);

            $this->addFeed($emp['name'], $time, 'in', $status);
            if ($status === 'late') {
                $this->addNotification('admin', "Late Clock-In: {$emp['name']} at {$time}", 'clock');
                Mailer::send($this->db, $emp['email'], 'Late Attendance Alert', "Hi {$emp['name']},\n\nLate clock-in at {$time}.\n\nBest,\nHR");
            } else {
                $this->addNotification('admin', "{$emp['name']} clocked in at {$time}", 'clock');
            }
            return ['success' => true, 'message' => "Clocked in at {$time}", 'status' => $status];
        }

        if (!$openLog) {
            if ($completed) return ['success' => false, 'message' => 'Already clocked out for today.'];
            return ['success' => false, 'message' => 'No active clock-in found.'];
        }

        $totalHours = round($this->minutesDiff($openLog['actual_in'], $time) / 60, 1);
        $isEarly = $this->minutesDiff($time, $shift['end']) > $grace;
        $status = $isEarly ? 'early_departure' : $openLog['status'];

        $upd = $this->db->prepare('UPDATE clock_logs SET actual_out = ?, total_hours = ?, status = ? WHERE id = ?');
        $upd->execute([$time, $totalHours, $status, $openLog['id']]);

        $this->addFeed($emp['name'], $time, 'out', $status);
        $this->addNotification('admin', "{$emp['name']} clocked out at {$time}", 'clock');
        if ($isEarly) {
            Mailer::send($this->db, $emp['email'], 'Early Departure', "Hi {$emp['name']},\n\nEarly departure at {$time}.\n\nBest,\nHR");
        }
        return ['success' => true, 'message' => "Clocked out at {$time}", 'status' => $status];
    }

    private function getEmployeeShift(int $empId, ?string $fallbackName): ?array
    {
        $stmt = $this->db->prepare('SELECT s.* FROM shift_assignments a JOIN shifts s ON s.id = a.shift_id WHERE a.employee_id = ?');
        $stmt->execute([$empId]);
        $row = $stmt->fetch();
        if ($row) {
            return ['id' => (int)$row['id'], 'name' => $row['name'], 'start' => $row['start_time'], 'end' => $row['end_time'], 'grace' => (int)$row['grace'], 'location' => $row['location']];
        }
        if ($fallbackName) {
            $stmt = $this->db->prepare('SELECT * FROM shifts WHERE name = ?');
            $stmt->execute([$fallbackName]);
            $row = $stmt->fetch();
            if ($row) {
                return ['id' => (int)$row['id'], 'name' => $row['name'], 'start' => $row['start_time'], 'end' => $row['end_time'], 'grace' => (int)$row['grace'], 'location' => $row['location']];
            }
        }
        return null;
    }

    private function minutesDiff(string $from, string $to): int
    {
        [$fh, $fm] = array_map('intval', explode(':', $from));
        [$th, $tm] = array_map('intval', explode(':', $to));
        return ($th * 60 + $tm) - ($fh * 60 + $fm);
    }

    private function applyLeave(array $body): array
    {
        $empId = (int)$body['employeeId'];
        $stmt = $this->db->prepare('SELECT * FROM employees WHERE id = ?');
        $stmt->execute([$empId]);
        $emp = $stmt->fetch();

        $ins = $this->db->prepare('INSERT INTO leave_requests (employee_id, employee_name, department, leave_type, date_from, date_to, days, reason, status) VALUES (?,?,?,?,?,?,?,?,\'pending\')');
        $ins->execute([$empId, $emp['name'], $emp['department'], $body['type'], $body['from'], $body['to'], (int)$body['days'], $body['reason'] ?? '']);

        $this->addNotification('admin', "{$emp['name']} applied for {$body['type']} Leave", 'leave');
        $settings = $this->getSettings();
        if ($settings['leaveApprovalAlert']) {
            Mailer::send($this->db, 'hr-admin@company.com', "Leave Request: {$emp['name']}", "Pending leave request from {$emp['name']}");
        }
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function updateLeaveStatus(array $body): array
    {
        $id = (int)$body['requestId'];
        $status = $body['status'];
        $stmt = $this->db->prepare('SELECT * FROM leave_requests WHERE id = ?');
        $stmt->execute([$id]);
        $req = $stmt->fetch();
        if (!$req) return ['success' => false];

        $this->db->prepare('UPDATE leave_requests SET status = ? WHERE id = ?')->execute([$status, $id]);
        $this->addNotification((string)$req['employee_id'], "Leave request {$status}", 'leave');

        $empStmt = $this->db->prepare('SELECT email, name FROM employees WHERE id = ?');
        $empStmt->execute([$req['employee_id']]);
        $emp = $empStmt->fetch();
        Mailer::send($this->db, $emp['email'], "Leave Request {$status}", "Hi {$emp['name']},\n\nYour leave request has been {$status}.");

        if ($status === 'approved') {
            $key = strtolower($req['leave_type']);
            $col = match ($key) {
                'annual' => 'annual_used',
                'sick' => 'sick_used',
                'emergency' => 'emergency_used',
                'maternity' => 'maternity_used',
                default => 'annual_used',
            };
            $allocCol = str_replace('_used', '_allocated', $col);
            $this->db->prepare("UPDATE leave_balances SET {$col} = LEAST({$col} + ?, {$allocCol}) WHERE employee_id = ?")
                ->execute([(int)$req['days'], $req['employee_id']]);

            $typeMap = ['Annual' => 'ANNUAL', 'Sick' => 'SICK', 'Emergency' => 'EMERGENCY', 'Maternity' => 'MATERNITY'];
            $rosterType = $typeMap[$req['leave_type']] ?? 'ANNUAL';
            $this->updateRosterRange((int)$req['employee_id'], $req['date_from'], $req['date_to'], $rosterType);
        }

        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function addSickDay(array $body): array
    {
        $empId = (int)$body['employeeId'];
        $date = $body['date'];
        $stmt = $this->db->prepare('SELECT * FROM employees WHERE id = ?');
        $stmt->execute([$empId]);
        $emp = $stmt->fetch();

        $this->db->prepare('INSERT INTO leave_requests (employee_id, employee_name, department, leave_type, date_from, date_to, days, reason, status) VALUES (?,?,?,\'Sick\',?,?,1,\'Admin logged\',\'approved\')')
            ->execute([$empId, $emp['name'], $emp['department'], $date, $date]);

        $this->db->prepare('UPDATE leave_balances SET sick_used = LEAST(sick_used + 1, sick_allocated) WHERE employee_id = ?')->execute([$empId]);
        $this->updateRosterRange($empId, $date, $date, 'SICK');
        $this->addNotification((string)$empId, "Sick day registered for {$date}", 'leave');
        Mailer::send($this->db, $emp['email'], 'Sick Leave Registered', "Sick day logged for {$date}.");

        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function adjustLeaveBalance(array $body): array
    {
        $empId = (int)$body['employeeId'];
        $type = strtolower($body['leaveType']);
        $days = (int)$body['days'];
        $action = $body['action'];
        $alloc = "{$type}_allocated";
        $used = "{$type}_used";
        if ($action === 'add') {
            $this->db->prepare("UPDATE leave_balances SET {$alloc} = {$alloc} + ? WHERE employee_id = ?")->execute([$days, $empId]);
        } else {
            $this->db->prepare("UPDATE leave_balances SET {$used} = LEAST({$used} + ?, {$alloc}) WHERE employee_id = ?")->execute([$days, $empId]);
        }
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function updateLeavePolicy(array $body): array
    {
        $d = $body['defaults'] ?? [];
        $this->db->prepare('UPDATE leave_policy SET year_start=?, year_end=?, annual_days=?, sick_days=?, emergency_days=?, maternity_days=? WHERE id=1')
            ->execute([$body['yearStart'], $body['yearEnd'], $d['annual'] ?? 18, $d['sick'] ?? 14, $d['emergency'] ?? 5, $d['maternity'] ?? 90]);
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function addShift(array $body): array
    {
        $this->db->prepare('INSERT INTO shifts (name, start_time, end_time, grace, location) VALUES (?,?,?,?,?)')
            ->execute([$body['name'], $body['start'], $body['end'], (int)($body['grace'] ?? 10), $body['location'] ?? 'Main Office']);
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function updateShift(int $id, array $body): array
    {
        $this->db->prepare('UPDATE shifts SET name=?, start_time=?, end_time=?, grace=?, location=? WHERE id=?')
            ->execute([$body['name'], $body['start'], $body['end'], (int)$body['grace'], $body['location'], $id]);
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function deleteShift(int $id): array
    {
        $this->db->prepare('DELETE FROM shifts WHERE id = ?')->execute([$id]);
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function addHoliday(array $body): array
    {
        $this->db->prepare('INSERT INTO public_holidays (name, holiday_date, recurring) VALUES (?,?,?)')
            ->execute([$body['name'], $body['date'], !empty($body['recurring']) ? 1 : 0]);
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function deleteHoliday(int $id): array
    {
        $this->db->prepare('DELETE FROM public_holidays WHERE id = ?')->execute([$id]);
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function assignShift(array $body): array
    {
        $empId = (int)$body['employeeId'];
        $a = $body['assignment'];
        $this->db->prepare('INSERT INTO shift_assignments (employee_id, shift_name, shift_id, schedule_json) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE shift_name=VALUES(shift_name), shift_id=VALUES(shift_id), schedule_json=VALUES(schedule_json)')
            ->execute([$empId, $a['shiftName'] ?? null, $a['shiftId'] ?? null, json_encode($a['schedule'] ?? [])]);
        if (!empty($a['shiftName'])) {
            $this->db->prepare('UPDATE employees SET shift_name = ? WHERE id = ?')->execute([$a['shiftName'], $empId]);
        }
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function updateSettings(array $body): array
    {
        $this->db->prepare('UPDATE system_settings SET grace_period_minutes=?, missed_clock_in_reminder=?, missed_clock_out_reminder=?, escalate_to_manager=?, email_digest=?, leave_approval_alert=?, admin_pin=?, reminder_email_template=?, clock_out_reminder_template=?, smtp_host=?, smtp_port=?, smtp_user=?, smtp_pass=?, smtp_from_email=?, smtp_from_name=?, smtp_encryption=? WHERE id=1')
            ->execute([
                (int)($body['gracePeriodMinutes'] ?? 10),
                !empty($body['missedClockInReminder']) ? 1 : 0,
                !empty($body['missedClockOutReminder']) ? 1 : 0,
                !empty($body['escalateToManager']) ? 1 : 0,
                !empty($body['emailDigest']) ? 1 : 0,
                !empty($body['leaveApprovalAlert']) ? 1 : 0,
                $body['adminPin'] ?? 'admin123',
                $body['reminderEmailTemplate'] ?? '',
                $body['clockOutReminderTemplate'] ?? '',
                $body['smtpHost'] ?? '',
                (int)($body['smtpPort'] ?? 587),
                $body['smtpUser'] ?? '',
                $body['smtpPass'] ?? '',
                $body['smtpFromEmail'] ?? '',
                $body['smtpFromName'] ?? 'HR Attendance',
                $body['smtpEncryption'] ?? 'tls',
            ]);
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function updateRosterCell(array $body): array
    {
        $this->db->prepare('INSERT INTO roster_cells (employee_id, roster_year, roster_month, day_num, day_type) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE day_type=VALUES(day_type)')
            ->execute([(int)$body['employeeId'], (int)$body['year'], (int)$body['month'], (int)$body['day'], $body['type']]);
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function importRoster(array $body): array
    {
        foreach ($body['rows'] ?? [] as $row) {
            $empId = (int)$row['employeeId'];
            foreach ($row['days'] ?? [] as $day => $type) {
                $this->db->prepare('INSERT INTO roster_cells (employee_id, roster_year, roster_month, day_num, day_type) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE day_type=VALUES(day_type)')
                    ->execute([$empId, (int)$body['year'], (int)$body['month'], (int)$day, $type]);
            }
        }
        $this->addNotification('admin', 'Roster imported successfully', 'roster');
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    private function updateRosterRange(int $empId, string $from, string $to, string $type): void
    {
        $start = new \DateTime($from);
        $end = new \DateTime($to);
        while ($start <= $end) {
            $this->db->prepare('INSERT INTO roster_cells (employee_id, roster_year, roster_month, day_num, day_type) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE day_type=VALUES(day_type)')
                ->execute([$empId, (int)$start->format('Y'), (int)$start->format('n'), (int)$start->format('j'), $type]);
            $start->modify('+1 day');
        }
    }

    private function clearNotifications(array $body): array
    {
        $userId = $body['userId'] ?? '';
        $this->db->prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?')->execute([$userId]);
        return ['success' => true, 'bootstrap' => $this->bootstrap()];
    }

    public function runReminders(): array
    {
        $settings = $this->getSettings();
        $today = date('Y-m-d');
        $nowMins = (int)date('H') * 60 + (int)date('i');
        $sent = 0;

        $emps = $this->db->query("SELECT * FROM employees WHERE status = 'active'")->fetchAll();
        foreach ($emps as $emp) {
            $shift = $this->getEmployeeShift((int)$emp['id'], $emp['shift_name']);
            if (!$shift) continue;

            $grace = (int)$shift['grace'];
            $startMins = $this->timeToMins($shift['start']);
            $endMins = $this->timeToMins($shift['end']);

            $stmt = $this->db->prepare('SELECT * FROM clock_logs WHERE employee_id = ? AND log_date = ?');
            $stmt->execute([$emp['id'], $today]);
            $logs = $stmt->fetchAll();
            $hasIn = false;
            $open = false;
            $hasOut = false;
            foreach ($logs as $l) {
                if ($l['actual_in']) $hasIn = true;
                if ($l['actual_in'] && !$l['actual_out']) $open = true;
                if ($l['actual_out']) $hasOut = true;
            }

            if ($settings['missedClockInReminder'] && !$hasIn && $nowMins > $startMins + $grace) {
                if ($this->logReminder((int)$emp['id'], 'clock_in', $today)) {
                    $body = str_replace(['{employee_name}', '{shift_time}', '{date}'], [$emp['name'], $shift['start'], $today], $settings['reminderEmailTemplate'] ?? '');
                    Mailer::send($this->db, $emp['email'], 'Clock-In Reminder', $body);
                    $this->addNotification((string)$emp['id'], 'Reminder: Please clock in', 'clock');
                    $sent++;
                }
            }

            if ($settings['missedClockOutReminder'] && $open && !$hasOut && $nowMins > $endMins + $grace) {
                if ($this->logReminder((int)$emp['id'], 'clock_out', $today)) {
                    $body = str_replace(['{employee_name}', '{shift_time}', '{date}'], [$emp['name'], $shift['end'], $today], $settings['clockOutReminderTemplate'] ?? '');
                    Mailer::send($this->db, $emp['email'], 'Clock-Out Reminder', $body);
                    $this->addNotification((string)$emp['id'], 'Reminder: Please clock out', 'clock');
                    $sent++;
                }
            }
        }

        return ['success' => true, 'sent' => $sent, 'bootstrap' => $this->bootstrap()];
    }

    private function logReminder(int $empId, string $type, string $date): bool
    {
        try {
            $this->db->prepare('INSERT INTO reminder_log (employee_id, reminder_type, log_date) VALUES (?,?,?)')->execute([$empId, $type, $date]);
            return true;
        } catch (\PDOException) {
            return false;
        }
    }

    private function timeToMins(string $t): int
    {
        [$h, $m] = array_map('intval', explode(':', $t));
        return $h * 60 + $m;
    }

    private function addNotification(string $userId, string $message, string $type): void
    {
        $this->db->prepare('INSERT INTO notifications (user_id, message, notif_time, notif_type) VALUES (?,?,?,?)')
            ->execute([$userId, $message, date('H:i'), $type]);
    }

    private function addFeed(string $name, string $time, string $type, string $status): void
    {
        $this->db->prepare('INSERT INTO clock_feed (employee_name, feed_time, feed_type, status) VALUES (?,?,?,?)')
            ->execute([$name, $time, $type, $status]);
    }

    private function mapClockLog(array $log): array
    {
        return [
            'id' => (int)$log['id'],
            'employeeId' => (int)$log['employee_id'],
            'employeeName' => $log['employee_name'],
            'department' => $log['department'],
            'shift' => $log['shift_name'],
            'expectedIn' => $log['expected_in'],
            'actualIn' => $log['actual_in'],
            'expectedOut' => $log['expected_out'],
            'actualOut' => $log['actual_out'],
            'totalHours' => $log['total_hours'] !== null ? (float)$log['total_hours'] : null,
            'status' => $log['status'],
            'location' => $log['location'],
            'date' => $log['log_date'],
        ];
    }
}
