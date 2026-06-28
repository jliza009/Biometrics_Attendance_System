<?php
declare(strict_types=1);

require_once __DIR__ . '/../src/Env.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/SimpleSmtp.php';
require_once __DIR__ . '/../src/Mailer.php';
require_once __DIR__ . '/../src/FingerprintService.php';
require_once __DIR__ . '/../src/ApiHandler.php';

use HrAttendance\Env;
use HrAttendance\ApiHandler;
use HrAttendance\Database;

header('Content-Type: application/json; charset=utf-8');

Env::load(__DIR__ . '/../.env');

$origin = $_ENV['CORS_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: {$origin}");
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
$uri = preg_replace('#^/api#', '', $uri);
$uri = trim($uri, '/');
if ($uri === 'index.php') {
    $uri = '';
}

$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input') ?: '[]', true) ?? [];

try {
    $db = Database::connect();
    $handler = new ApiHandler($db);
    $result = $handler->handle($method, $uri, $body);
    echo json_encode($result);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
