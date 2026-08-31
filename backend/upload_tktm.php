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

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$allowedImageTypes = ['image/jpeg' => 'jpg', 'image/png' => 'png'];

// Proses foto fisik barang
if (isset($_FILES['foto_barang']) && !empty($_FILES['foto_barang']['name'][0])) {
    foreach ($_FILES['foto_barang']['name'] as $key => $name) {
        if ($_FILES['foto_barang']['error'][$key] !== UPLOAD_ERR_OK) continue;
        
        $tmpName = $_FILES['foto_barang']['tmp_name'][$key];
        
        // Batas maksimal 3MB per foto
        if ($_FILES['foto_barang']['size'][$key] > 3 * 1024 * 1024) continue;
        
        $mimeType = finfo_file($finfo, $tmpName);
        if (!array_key_exists($mimeType, $allowedImageTypes)) continue;

        $ext = $allowedImageTypes[$mimeType];
        $newName = "barang_{$id}_" . uniqid() . "_{$key}." . $ext;
        
        if (move_uploaded_file($tmpName, $uploadDir . $newName)) {
            $savedFiles['barang'][] = "uploads/tktm/" . $newName;
        }
    }
}

// Proses foto label BMN
if (isset($_FILES['foto_label']) && !empty($_FILES['foto_label']['name'][0])) {
    foreach ($_FILES['foto_label']['name'] as $key => $name) {
        if ($_FILES['foto_label']['error'][$key] !== UPLOAD_ERR_OK) continue;
        
        $tmpName = $_FILES['foto_label']['tmp_name'][$key];
        
        if ($_FILES['foto_label']['size'][$key] > 3 * 1024 * 1024) continue;
        
        $mimeType = finfo_file($finfo, $tmpName);
        if (!array_key_exists($mimeType, $allowedImageTypes)) continue;

        $ext = $allowedImageTypes[$mimeType];
        $newName = "label_{$id}_" . uniqid() . "_{$key}." . $ext;
        
        if (move_uploaded_file($tmpName, $uploadDir . $newName)) {
            $savedFiles['label'][] = "uploads/tktm/" . $newName;
        }
    }
}

finfo_close($finfo);

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