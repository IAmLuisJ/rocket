<?php

require_once __DIR__ . '/../config/database.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = rtrim($uri, '/');

if ($uri === '' || $uri === '/') {
    require __DIR__ . '/../templates/home.php';
} else {
    http_response_code(404);
    require __DIR__ . '/../templates/404.php';
}
