<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $id = $_POST['id'] ?? null;

    if (!$id) {
        echo json_encode(['status' => 'error', 'message' => 'ID Transaksi tidak ditemukan.']);
        exit;
    }

    $targetDir = "uploads/tktm/";
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0777, true);
    }

    $uploadedBarang = [];
    $uploadedLabel = [];

    // Unggah Foto Barang
    if (isset($_FILES['foto_barang'])) {
        foreach ($_FILES['foto_barang']['tmp_name'] as $key => $tmpName) {
            if ($_FILES['foto_barang']['error'][$key] === UPLOAD_ERR_OK) {
                $ext = pathinfo($_FILES['foto_barang']['name'][$key], PATHINFO_EXTENSION);
                $newName = "barang_" . $id . "_" . $key . "_" . time() . "." . $ext;
                if (move_uploaded_file($tmpName, $targetDir . $newName)) {
                    $uploadedBarang[] = $targetDir . $newName;
                }
            }
        }
    }

    // Unggah Foto Label
    if (isset($_FILES['foto_label'])) {
        foreach ($_FILES['foto_label']['tmp_name'] as $key => $tmpName) {
            if ($_FILES['foto_label']['error'][$key] === UPLOAD_ERR_OK) {
                $ext = pathinfo($_FILES['foto_label']['name'][$key], PATHINFO_EXTENSION);
                $newName = "label_" . $id . "_" . $key . "_" . time() . "." . $ext;
                if (move_uploaded_file($tmpName, $targetDir . $newName)) {
                    $uploadedLabel[] = $targetDir . $newName;
                }
            }
        }
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Foto TKTM berhasil diunggah.',
        'barang' => $uploadedBarang,
        'label' => $uploadedLabel
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Metode request tidak diizinkan.']);
}
?>