<?php
namespace HrAttendance;

use PDO;

class Mailer
{
    public static function send(PDO $db, string $to, string $subject, string $body): array
    {
        $stmt = $db->query('SELECT * FROM system_settings WHERE id = 1');
        $settings = $stmt->fetch();

        $sentAt = date('Y-m-d H:i:s');
        $smtpSent = 0;
        $error = null;

        $config = [
            'host' => $settings['smtp_host'] ?: ($_ENV['SMTP_HOST'] ?? ''),
            'port' => (int)($settings['smtp_port'] ?: ($_ENV['SMTP_PORT'] ?? 587)),
            'user' => $settings['smtp_user'] ?: ($_ENV['SMTP_USER'] ?? ''),
            'pass' => $settings['smtp_pass'] ?: ($_ENV['SMTP_PASS'] ?? ''),
            'from_email' => $settings['smtp_from_email'] ?: ($_ENV['SMTP_FROM_EMAIL'] ?? ''),
            'from_name' => $settings['smtp_from_name'] ?: ($_ENV['SMTP_FROM_NAME'] ?? 'HR Attendance'),
            'encryption' => $settings['smtp_encryption'] ?: ($_ENV['SMTP_ENCRYPTION'] ?? 'tls'),
        ];

        if ($config['host'] && $config['user'] && $config['pass']) {
            $ok = SimpleSmtp::send($config, $to, $subject, $body);
            if ($ok) {
                $smtpSent = 1;
            } else {
                $error = 'SMTP delivery failed';
            }
        }

        $ins = $db->prepare('INSERT INTO emails (recipient, subject, body, sent_at, smtp_sent) VALUES (?,?,?,?,?)');
        $ins->execute([$to, $subject, $body, $sentAt, $smtpSent]);

        return [
            'id' => (int)$db->lastInsertId(),
            'to' => $to,
            'subject' => $subject,
            'body' => $body,
            'sentAt' => $sentAt,
            'smtpSent' => (bool)$smtpSent,
            'error' => $error,
        ];
    }
}
