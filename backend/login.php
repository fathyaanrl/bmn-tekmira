<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once "config.php";

$data = json_decode(file_get_contents("php://input"), true);

$usernameInput = trim($data["username"] ?? "");
$passwordInput = $data["password"] ?? "";

if ($usernameInput === "" || $passwordInput === "") {
    echo json_encode([
        "success" => false,
        "message" => "Username dan password wajib diisi."
    ]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT id, username, password
        FROM admin
        WHERE username = ?
        LIMIT 1
    ");

    $stmt->execute([$usernameInput]);
    $admin = $stmt->fetch();

    if (!$admin) {
        echo json_encode([
            "success" => false,
            "message" => "Username atau password salah!"
        ]);
        exit;
    }

    if ($passwordInput !== $admin["password"]) {
        echo json_encode([
            "success" => false,
            "message" => "Username atau password salah!"
        ]);
        exit;
    }

    $_SESSION["admin_id"] = $admin["id"];
    $_SESSION["admin_username"] = $admin["username"];

    echo json_encode([
        "success" => true,
        "message" => "Login berhasil.",
        "username" => $admin["username"]
    ]);

} catch (PDOException $e) {

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Terjadi kesalahan database.",
        "error" => $e->getMessage()
    ]);
}