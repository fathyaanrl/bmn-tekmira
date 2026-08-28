<?php
require_once 'config.php';

$username = 'AdminBMN';
$password = '3MntekMIR@';

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("
    INSERT INTO admin (username, password)
    VALUES (?, ?)
");

$stmt->execute([
    $username,
    $hashedPassword
]);

echo "Admin berhasil dibuat.";