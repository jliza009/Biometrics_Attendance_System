<?php
namespace HrAttendance;

class FingerprintService
{
    public static function verifyTemplate(?string $stored, string $scanned): bool
    {
        if (!$stored || !$scanned) {
            return false;
        }

        $storedData = json_decode($stored, true);
        if (is_array($storedData)) {
            if (!empty($storedData['template']) && $storedData['template'] === $scanned) {
                return true;
            }
            if (!empty($storedData['id']) && $storedData['id'] === $scanned) {
                return true;
            }
        }

        if ($stored === $scanned) {
            return true;
        }

        return self::verifyViaBridge($stored, $scanned);
    }

    public static function verifyViaBridge(string $storedTemplate, string $scannedTemplate): bool
    {
        $bridgeUrl = rtrim($_ENV['FINGERPRINT_BRIDGE_URL'] ?? 'http://127.0.0.1:9876', '/');

        $payload = json_encode([
            'stored' => $storedTemplate,
            'scanned' => $scannedTemplate,
        ]);

        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 5,
                'ignore_errors' => true,
            ],
        ]);

        $response = @file_get_contents("{$bridgeUrl}/verify", false, $ctx);
        if (!$response) {
            return false;
        }

        $data = json_decode($response, true);
        return !empty($data['match']);
    }

    public static function findEmployeeByTemplate(\PDO $db, string $scanned): ?array
    {
        $stmt = $db->query("SELECT * FROM employees WHERE status = 'active' AND fingerprint_template IS NOT NULL");
        while ($row = $stmt->fetch()) {
            if (self::verifyTemplate($row['fingerprint_template'], $scanned)) {
                return self::mapEmployee($row);
            }
        }
        return null;
    }

    public static function mapEmployee(array $row): array
    {
        $fp = null;
        if ($row['fingerprint_template']) {
            $fp = json_decode($row['fingerprint_template'], true) ?: $row['fingerprint_template'];
        }

        return [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'role' => $row['role'],
            'department' => $row['department'],
            'shift' => $row['shift_name'],
            'status' => $row['status'],
            'email' => $row['email'],
            'phone' => $row['phone'],
            'startDate' => $row['start_date'],
            'password' => $row['password'] ?? null,
            'fingerprint' => $fp,
        ];
    }
}
