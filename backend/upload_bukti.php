<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Tambahkan koneksi database Anda di sini (sesuaikan dengan nama file koneksi Anda)
// require_once 'koneksi.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['id'] ?? null;

    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'ID Transaksi tidak ditemukan.']);
        exit;
    }

    if (!isset($_FILES['file_pdf']) || $_FILES['file_pdf']['error'] !== UPLOAD_ERR_OK) {
        $errorCode = $_FILES['file_pdf']['error'] ?? 'No file';
        echo json_encode(['status' => 'error', 'message' => 'Gagal mengunggah berkas. Kode Error PHP: ' . $errorCode]);
        exit;
    }

    $targetDir = "uploads/surat/";
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0777, true);
    }

    $fileName = "bukti_" . preg_replace('/[^a-zA-Z0-9_-]/', '', $id) . "_" . time() . ".pdf";
    $targetFile = $targetDir . $fileName;

    if (move_uploaded_file($_FILES['file_pdf']['tmp_name'], $targetFile)) {
        
        /* 
         * JANGAN LUPA: Update kolom file bukti di database Anda!
         * Contoh query:
         * $stmt = $pdo->prepare("UPDATE mutasi SET file_bukti = ? WHERE id = ?");
         * $stmt->execute([$targetFile, $id]);
         */

        echo json_encode([
            'status' => 'success',
            'message' => 'Berkas berhasil diunggah.',
            'filePath' => $targetFile
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan berkas ke folder server.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Metode request tidak diizinkan.']);
}
?>