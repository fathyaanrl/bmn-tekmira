<?php
header('Content-Type: application/json');

$targetDir = __DIR__ . '/../uploads/surat/';
$ids = [];

if (file_exists($targetDir)) {
    $files = scandir($targetDir);
    foreach ($files as $file) {
        if (preg_match('/^bukti_(\d+)\.pdf$/i', $file, $matches)) {
            $ids[] = (int)$matches[1];
        }
    }
}

echo json_encode(['status' => 'success', 'ids' => $ids]);
?>