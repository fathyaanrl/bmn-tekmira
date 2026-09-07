<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$targetDir = "uploads/surat/";
$ids = [];

if (is_dir($targetDir)) {
    $files = scandir($targetDir);
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        
        // Mengambil ID dari nama file (misal: bukti_123.pdf atau bukti_123_160000.pdf)
        if (preg_match('/bukti_([a-zA-Z0-9-]+)/', $file, $matches)) {
            $ids[] = (string)$matches[1];
        }
    }
}

echo json_encode([
    'status' => 'success',
    'ids' => array_values(array_unique($ids))
]);
?>