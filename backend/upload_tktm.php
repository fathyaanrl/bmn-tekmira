<?php
session_start();

// Matikan pesan error HTML agar response selalu berbentuk JSON murni
error_reporting(0);
ini_set('display_errors', 0);

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'status' => 'error',
        'message' => 'Metode request tidak diizinkan.'
    ]);
    exit;
}

$id = $_POST['id'] ?? null;

if (!$id) {
    echo json_encode([
        'status' => 'error',
        'message' => 'ID Transaksi tidak ditemukan.'
    ]);
    exit;
}

require_once "config.php";

$id = (int) $id;

/*
|--------------------------------------------------------------------------
| Folder upload (Keluar 1 tingkat ke root bmn-tekmira/uploads/tktm/)
|--------------------------------------------------------------------------
*/
$targetDir = dirname(__DIR__) . "/uploads/tktm/";

if (!is_dir($targetDir)) {
    @mkdir($targetDir, 0777, true);
}

$uploadedBarang = [];
$uploadedLabel = [];

/*
|--------------------------------------------------------------------------
| FOTO BARANG
|--------------------------------------------------------------------------
*/
if (
    isset($_FILES['foto_barang']) &&
    is_array($_FILES['foto_barang']['tmp_name'])
) {
    foreach ($_FILES['foto_barang']['tmp_name'] as $key => $tmpName) {

        if ($_FILES['foto_barang']['error'][$key] !== UPLOAD_ERR_OK) {
            continue;
        }

        $ext = strtolower(
            pathinfo(
                $_FILES['foto_barang']['name'][$key],
                PATHINFO_EXTENSION
            )
        );

        $allowed = ['jpg', 'jpeg', 'png', 'webp'];

        if (!in_array($ext, $allowed, true)) {
            continue;
        }

        $newName =
            "barang_" .
            $id . "_" .
            $key . "_" .
            time() .
            "." .
            $ext;

        $destination = $targetDir . $newName;

        if (@move_uploaded_file($tmpName, $destination)) {
            // Path relatif yang disimpan ke DB
            $uploadedBarang[] = "uploads/tktm/" . $newName;
        }
    }
}

/*
|--------------------------------------------------------------------------
| FOTO LABEL
|--------------------------------------------------------------------------
*/
if (
    isset($_FILES['foto_label']) &&
    is_array($_FILES['foto_label']['tmp_name'])
) {
    foreach ($_FILES['foto_label']['tmp_name'] as $key => $tmpName) {

        if ($_FILES['foto_label']['error'][$key] !== UPLOAD_ERR_OK) {
            continue;
        }

        $ext = strtolower(
            pathinfo(
                $_FILES['foto_label']['name'][$key],
                PATHINFO_EXTENSION
            )
        );

        $allowed = ['jpg', 'jpeg', 'png', 'webp'];

        if (!in_array($ext, $allowed, true)) {
            continue;
        }

        $newName =
            "label_" .
            $id . "_" .
            $key . "_" .
            time() .
            "." .
            $ext;

        $destination = $targetDir . $newName;

        if (@move_uploaded_file($tmpName, $destination)) {
            // Path relatif yang disimpan ke DB
            $uploadedLabel[] = "uploads/tktm/" . $newName;
        }
    }
}

/*
|--------------------------------------------------------------------------
| Ambil & Update lampiran_foto di Database
|--------------------------------------------------------------------------
*/
try {
    $stmt = $pdo->prepare("
        SELECT lampiran_foto
        FROM mutasi
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        ':id' => $id
    ]);

    $row = $stmt->fetch();

    if (!$row) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Data mutasi tidak ditemukan.'
        ]);
        exit;
    }

    $metadata = [];

    if (!empty($row['lampiran_foto'])) {
        $decoded = json_decode(
            $row['lampiran_foto'],
            true
        );

        if (is_array($decoded)) {
            $metadata = $decoded;
        }
    }

    if (
        !isset($metadata['barang']) ||
        !is_array($metadata['barang'])
    ) {
        $metadata['barang'] = [];
    }

    if (
        !isset($metadata['label']) ||
        !is_array($metadata['label'])
    ) {
        $metadata['label'] = [];
    }

    // Gabungkan foto baru
    $metadata['barang'] = array_merge(
        $metadata['barang'],
        $uploadedBarang
    );

    $metadata['label'] = array_merge(
        $metadata['label'],
        $uploadedLabel
    );

    $lampiranFoto = json_encode(
        $metadata,
        JSON_UNESCAPED_SLASHES |
        JSON_UNESCAPED_UNICODE
    );

    $update = $pdo->prepare("
        UPDATE mutasi
        SET lampiran_foto = :lampiran_foto
        WHERE id = :id
    ");

    $update->execute([
        ':lampiran_foto' => $lampiranFoto,
        ':id' => $id
    ]);

    echo json_encode([
        'status' => 'success',
        'message' => 'Foto TKTM berhasil diunggah dan disimpan.',
        'barang' => $uploadedBarang,
        'label' => $uploadedLabel
    ]);

} catch (PDOException $e) {
    http_response_code(500);

    echo json_encode([
        'status' => 'error',
        'message' => 'Foto berhasil diupload tetapi gagal menyimpan ke database.',
        'error' => $e->getMessage()
    ]);
}
?>