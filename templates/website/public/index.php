<?php

require_once __DIR__ . '/../config/database.php';

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Simple router
match ($uri) {
    '/', '/home' => require __DIR__ . '/../src/controllers/HomeController.php',
    '/about' => require __DIR__ . '/../src/controllers/AboutController.php',
    default => http_response_code(404) && print('Page not found'),
};
