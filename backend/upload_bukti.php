<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['id'] ?? null;
    
    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'ID Riwayat/Mutasi tidak terkirim!']);
        exit;
    }

    if (!isset($_FILES['file_pdf'])) {
        echo json_encode(['status' => 'error', 'message' => 'File PDF tidak terdeteksi oleh server']);
        exit;
    }

    // Cek jika ada error dari sistem upload PHP
    if ($_FILES['file_pdf']['error'] !== UPLOAD_ERR_OK) {
        $errorCode = $_FILES['file_pdf']['error'];
        $errorMessages = [
            1 => 'Ukuran file melebihi upload_max_filesize di php.ini (maksimal 2MB)',
            2 => 'Ukuran file terlalu besar',
            3 => 'File hanya ter-upload sebagian',
            4 => 'Tidak ada file yang di-upload',
            6 => 'Folder temporary server tidak ditemukan',
            7 => 'Gagal menulis file ke disk server (Izin folder/Permissions)',
            8 => 'Ekstensi PHP menghentikan proses upload'
        ];
        $msg = $errorMessages[$errorCode] ?? 'Error code: ' . $errorCode;
        echo json_encode(['status' => 'error', 'message' => $msg]);
        exit;
    }

    // Lokasi penyimpanan: backend/uploads/surat/
    $targetDir = __DIR__ . '/../uploads/surat/';

    // Buat folder otomatis jika belum ada
    if (!file_exists($targetDir)) {
        if (!mkdir($targetDir, 0777, true)) {
            echo json_encode(['status' => 'error', 'message' => 'Gagal membuat folder backend/uploads/surat/']);
            exit;
        }
    }

    $fileName = 'bukti_' . $id . '.pdf';
    $targetFilePath = $targetDir . $fileName;

    // Pindahkan file dari temporary ke folder uploads/surat/
    if (move_uploaded_file($_FILES['file_pdf']['tmp_name'], $targetFilePath)) {
        echo json_encode([
            'status' => 'success', 
            'message' => 'File berhasil disimpan!', 
            'file' => $fileName
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Gagal memindahkan file. Periksa izin akses (permission) folder uploads']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Method tidak diizinkan']);
}
?>