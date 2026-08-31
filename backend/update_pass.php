<?php
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method harus POST']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$username = trim($data['username'] ?? '');
$passwordBaru = $data['password_baru'] ?? '';
$pinInput = $data['pin'] ?? ''; 

if ($username === '' || $passwordBaru === '' || $pinInput === '') {
    echo json_encode(['success' => false, 'message' => 'Username, PIN, dan Password Baru wajib diisi!']);
    exit;
}

try {
    $cek = $pdo->prepare("SELECT id, recovery_code_hash FROM admin WHERE username = ?");
    $cek->execute([$username]);
    $admin = $cek->fetch();

    if (!$admin) {
        echo json_encode(['success' => false, 'message' => 'Username tidak ditemukan.']);
        exit;
    }

    if (!password_verify($pinInput, $admin['recovery_code_hash'])) {
        echo json_encode(['success' => false, 'message' => 'PIN Darurat SALAH! Password gagal direset.']);
        exit;
    }

    $passwordHashBaru = password_hash($passwordBaru, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("UPDATE admin SET password = ?, updated_at = NOW() WHERE username = ?");
    $stmt->execute([$passwordHashBaru, $username]);

    echo json_encode(['success' => true, 'message' => 'Mantap! Password berhasil direset.']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>