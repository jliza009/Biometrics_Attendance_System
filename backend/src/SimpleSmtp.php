<?php
namespace HrAttendance;

class SimpleSmtp
{
    public static function send(array $config, string $to, string $subject, string $body): bool
    {
        $host = $config['host'] ?? '';
        $port = (int)($config['port'] ?? 587);
        $user = $config['user'] ?? '';
        $pass = $config['pass'] ?? '';
        $from = $config['from_email'] ?? $user;
        $fromName = $config['from_name'] ?? 'HR System';
        $encryption = strtolower($config['encryption'] ?? 'tls');

        if (!$host || !$user || !$pass || !$from) {
            return false;
        }

        $remote = ($encryption === 'ssl' ? 'ssl://' : '') . $host;
        $socket = @stream_socket_client("{$remote}:{$port}", $errno, $errstr, 15);
        if (!$socket) {
            return false;
        }

        $read = function () use ($socket) {
            $data = '';
            while ($line = fgets($socket, 515)) {
                $data .= $line;
                if (isset($line[3]) && $line[3] === ' ') break;
            }
            return $data;
        };

        $write = function (string $cmd) use ($socket) {
            fwrite($socket, $cmd . "\r\n");
        };

        $read();
        $write('EHLO localhost');
        $read();

        if ($encryption === 'tls') {
            $write('STARTTLS');
            $read();
            stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            $write('EHLO localhost');
            $read();
        }

        $write('AUTH LOGIN');
        $read();
        $write(base64_encode($user));
        $read();
        $write(base64_encode($pass));
        $resp = $read();
        if (!str_starts_with($resp, '235')) {
            fclose($socket);
            return false;
        }

        $write("MAIL FROM:<{$from}>");
        $read();
        $write("RCPT TO:<{$to}>");
        $read();
        $write('DATA');
        $read();

        $headers = "From: {$fromName} <{$from}>\r\n";
        $headers .= "To: <{$to}>\r\n";
        $headers .= "Subject: {$subject}\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $headers .= "\r\n";
        $write($headers . $body . "\r\n.");
        $resp = $read();
        $write('QUIT');
        fclose($socket);

        return str_starts_with($resp, '250');
    }
}
