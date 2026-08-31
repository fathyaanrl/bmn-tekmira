<?php
header('Content-Type: application/json');

if (!isset($_POST['id']) || !isset($_FILES['file_pdf'])) {
    echo json_encode(['status' => 'error', 'message' => 'Data tidak lengkap (id / file kosong).']);
    exit;
}

$id = preg_replace('/[^0-9]/', '', $_POST['id']);
if ($id === '') {
    echo json_encode(['status' => 'error', 'message' => 'ID tidak valid.']);
    exit;
}

$file = $_FILES['file_pdf'];

// Cek apakah file tidak korup saat proses transfer
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['status' => 'error', 'message' => 'File rusak atau gagal diunggah.']);
    exit;
}

// maksimal 10MB
$maxSize = 10 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    echo json_encode(['status' => 'error', 'message' => 'Ukuran file maksimal 10MB.']);
    exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if ($mimeType !== 'application/pdf') {
    echo json_encode(['status' => 'error', 'message' => 'Sistem menolak! File harus berformat PDF asli.']);
    exit;
}

// Folder tujuan 
$targetDir = __DIR__ . '/../uploads/surat/';
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

// Nama file bukti_<id>.pdf
$targetFile = $targetDir . 'bukti_' . $id . '.pdf';

if (move_uploaded_file($file['tmp_name'], $targetFile)) {
    echo json_encode(['status' => 'success', 'message' => 'File berhasil diupload dengan aman.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan file ke server.']);
}
?>