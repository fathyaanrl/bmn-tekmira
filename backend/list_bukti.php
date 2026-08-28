<?php
header('Content-Type: application/json');

// Folder tempat file bukti disimpan
$targetDir = __DIR__ . '/../uploads/surat/';
$ids = [];

if (is_dir($targetDir)) {
    $files = scandir($targetDir);
    foreach ($files as $file) {
        if (preg_match('/^bukti_(\d+)\.pdf$/', $file, $match)) {
            $ids[] = (int) $match[1];
        }
    }
}

echo json_encode(['status' => 'success', 'ids' => $ids]);