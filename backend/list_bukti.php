<?php
header('Content-Type: application/json');

// Folder tempat file bukti disimpen (samain sama upload_bukti.php)
$targetDir = __DIR__ . '/../uploads/surat/';

$ids = [];

if (is_dir($targetDir)) {
    $files = scandir($targetDir);
    foreach ($files as $file) {
        // Cari file dengan pola bukti_<angka>.pdf, ambil angkanya (id) doang
        if (preg_match('/^bukti_(\d+)\.pdf$/', $file, $match)) {
            $ids[] = (int) $match[1];
        }
    }
}

echo json_encode(['status' => 'success', 'ids' => $ids]);