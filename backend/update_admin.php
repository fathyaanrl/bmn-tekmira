<?php

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => 'Method harus POST'
    ]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$usernameLama = trim($data['username_lama'] ?? '');
$usernameBaru = trim($data['username_baru'] ?? '');
$passwordBaru = $data['password_baru'] ?? '';

if ($usernameLama === '' || $usernameBaru === '') {
    echo json_encode([
        'success' => false,
        'message' => 'Username tidak boleh kosong.'
    ]);
    exit;
}

try {

    // Cek username baru sudah dipakai atau belum
    $cek = $pdo->prepare("
        SELECT id
        FROM admin
        WHERE username = ?
        AND username != ?
    ");

    $cek->execute([
        $usernameBaru,
        $usernameLama
    ]);

    if ($cek->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'Username sudah digunakan.'
        ]);
        exit;
    }

    // Kalau password tidak diganti
    if ($passwordBaru === '') {

        $stmt = $pdo->prepare("
            UPDATE admin
            SET username = ?, updated_at = NOW()
            WHERE username = ?
        ");

        $stmt->execute([
            $usernameBaru,
            $usernameLama
        ]);

    } 
    
    // Kalau password ikut diganti
    else {

        $stmt = $pdo->prepare("
            UPDATE admin
            SET username = ?, password = ?, updated_at = NOW()
            WHERE username = ?
        ");

        $stmt->execute([
            $usernameBaru,
            $passwordBaru,
            $usernameLama
        ]);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Profil berhasil diperbarui.',
        'username' => $usernameBaru
    ]);

} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}