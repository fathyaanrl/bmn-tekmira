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

$data = json_decode(
    file_get_contents('php://input'),
    true
);

$username = trim(
    $data['username'] ?? ''
);

$passwordBaru = $data['password_baru'] ?? '';


if ($username === '' || $passwordBaru === '') {

    echo json_encode([
        'success' => false,
        'message' => 'Username dan password baru wajib diisi.'
    ]);

    exit;
}


try {

    // Cari username
    $cek = $pdo->prepare("
        SELECT id
        FROM admin
        WHERE username = ?
    ");

    $cek->execute([
        $username
    ]);

    $admin = $cek->fetch();


    // Username tidak ditemukan
    if (!$admin) {

        echo json_encode([
            'success' => false,
            'message' => 'Username tidak ditemukan.'
        ]);

        exit;
    }


    // Update password
    $stmt = $pdo->prepare("
        UPDATE admin
        SET password = ?, updated_at = NOW()
        WHERE username = ?
    ");

    $stmt->execute([
        $passwordBaru,
        $username
    ]);


    echo json_encode([
        'success' => true,
        'message' => 'Password berhasil direset.'
    ]);


} catch (PDOException $e) {

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}