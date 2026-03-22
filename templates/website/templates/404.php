<?php
$content = '<div class="text-center py-12"><h1 class="text-4xl font-bold mb-4">404</h1><p class="text-lg text-gray-600">Page not found.</p><a href="/" class="text-blue-600 hover:underline">Go home</a></div>';
echo str_replace('{{CONTENT}}', $content, file_get_contents(__DIR__ . '/layout.php'));
?>
