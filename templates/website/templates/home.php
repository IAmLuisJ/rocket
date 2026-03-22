<?php require_once __DIR__ . '/layout.php'; ?>
<?php ob_start(); ?>
<div class="text-center py-12">
    <h1 class="text-4xl font-bold mb-4">Welcome to {{PROJECT_NAME}}</h1>
    <p class="text-lg text-gray-600">Your new website is ready.</p>
</div>
<?php
$content = ob_get_clean();
echo str_replace('{{CONTENT}}', $content, file_get_contents(__DIR__ . '/layout.php'));
?>
