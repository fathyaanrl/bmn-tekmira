<?php
header('Content-Type: application/json');

// Validasi input
if (!isset($_POST['id']) || !isset($_FILES['file_pdf'])) {
    echo json_encode(['status' => 'error', 'message' => 'Data tidak lengkap (id / file kosong).']);
    exit;
}

$id = preg_replace('/[^0-9]/', '', $_POST['id']); // cuma boleh angka, biar aman
if ($id === '') {
    echo json_encode(['status' => 'error', 'message' => 'ID tidak valid.']);
    exit;
}

$file = $_FILES['file_pdf'];

// Validasi tipe file harus PDF
if ($file['type'] !== 'application/pdf') {
    echo json_encode(['status' => 'error', 'message' => 'File harus format PDF!']);
    exit;
}

// Validasi ukuran file (maksimal 5MB, ubah sesuai kebutuhan)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    echo json_encode(['status' => 'error', 'message' => 'Ukuran file maksimal 5MB.']);
    exit;
}

// Folder tujuan: backend/../uploads/surat/ (sesuaikan kalau struktur foldermu beda)
$targetDir = __DIR__ . '/../uploads/surat/';
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

// Nama file dibikin dari ID doang -> bukti_<id>.pdf
// Kalau upload ulang, otomatis ke-overwrite (nimpa file lama), gak perlu hapus manual
$targetFile = $targetDir . 'bukti_' . $id . '.pdf';

if (move_uploaded_file($file['tmp_name'], $targetFile)) {
    echo json_encode(['status' => 'success', 'message' => 'File berhasil diupload.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan file ke server. Cek permission folder uploads/surat/.']);
}