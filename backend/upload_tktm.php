<?php
header('Content-Type: application/json');
require_once 'config.php'; 

$id = isset($_POST['id']) ? intval($_POST['id']) : 0;
if ($id === 0) {
    echo json_encode(['success' => false, 'message' => 'ID Mutasi tidak valid.']);
    exit;
}

$uploadDir = '../uploads/tktm/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Ambil data nama pemeriksa yang udah disimpen sebelumnya di mutasi.php
$stmt = $pdo->prepare("SELECT lampiran_foto FROM mutasi WHERE id = ?");
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

$existingData = [];
if ($row && !empty($row['lampiran_foto'])) {
    $existingData = json_decode($row['lampiran_foto'], true) ?: [];
}

$savedFiles = [
    'barang' => $existingData['barang'] ?? [], 
    'label' => $existingData['label'] ?? []
];

// Proses foto fisik barang
if (isset($_FILES['foto_barang']) && !empty($_FILES['foto_barang']['name'][0])) {
    foreach ($_FILES['foto_barang']['name'] as $key => $name) {
        $tmpName = $_FILES['foto_barang']['tmp_name'][$key];
        $ext = pathinfo($name, PATHINFO_EXTENSION);
        $newName = "barang_{$id}_" . time() . "_{$key}." . $ext;
        if (move_uploaded_file($tmpName, $uploadDir . $newName)) {
            $savedFiles['barang'][] = "uploads/tktm/" . $newName;
        }
    }
}

// Proses foto label BMN
if (isset($_FILES['foto_label']) && !empty($_FILES['foto_label']['name'][0])) {
    foreach ($_FILES['foto_label']['name'] as $key => $name) {
        $tmpName = $_FILES['foto_label']['tmp_name'][$key];
        $ext = pathinfo($name, PATHINFO_EXTENSION);
        $newName = "label_{$id}_" . time() . "_{$key}." . $ext;
        if (move_uploaded_file($tmpName, $uploadDir . $newName)) {
            $savedFiles['label'][] = "uploads/tktm/" . $newName;
        }
    }
}

// Gabungin foto sama nama pemeriksa, terus simpan ulang
$existingData['barang'] = $savedFiles['barang'];
$existingData['label'] = $savedFiles['label'];
$jsonFiles = json_encode($existingData);

$updateStmt = $pdo->prepare("UPDATE mutasi SET lampiran_foto = ? WHERE id = ?");
if ($updateStmt->execute([$jsonFiles, $id])) {
    echo json_encode(['success' => true, 'files' => $savedFiles]);
} else {
    echo json_encode(['success' => false, 'message' => 'Gagal update database.']);
}
?>