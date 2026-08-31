<?php
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/config.php';

// Pastikan tidak ada error PHP yang merusak output JSON
error_reporting(0); 

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method harus POST']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$username = trim($data['username'] ?? '');
$passwordBaru = $data['password_baru'] ?? '';
$pinInput = $data['pin'] ?? '';

if ($username === '' || $passwordBaru === '' || $pinInput === '') {
    echo json_encode(['success' => false, 'message' => 'Data tidak lengkap!']);
    exit;
}

try {
    // CEK 1: Apakah Username ada?
    $cek = $pdo->prepare("SELECT id, recovery_code_hash FROM admin WHERE username = ?");
    $cek->execute([$username]);
    $admin = $cek->fetch(PDO::FETCH_ASSOC);

    if (!$admin) {
        echo json_encode(['success' => false, 'message' => 'Username tidak ditemukan di sistem!']);
        exit;
    }

    // CEK 2: Apakah PIN cocok?
    if (empty($admin['recovery_code_hash']) || !password_verify($pinInput, $admin['recovery_code_hash'])) {
        echo json_encode(['success' => false, 'message' => 'PIN Darurat salah atau belum diatur!']);
        exit;
    }

    // LULUS CEK: Lakukan Reset Password
    $passwordHashBaru = password_hash($passwordBaru, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE admin SET password = ?, updated_at = NOW() WHERE username = ?");
    
    if ($stmt->execute([$passwordHashBaru, $username])) {
        echo json_encode(['success' => true, 'message' => 'Password berhasil direset.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Gagal menyimpan ke database.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Terjadi kesalahan sistem backend.']);
}
?>