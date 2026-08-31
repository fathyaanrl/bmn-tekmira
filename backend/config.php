<?php
$host = "127.0.0.1";
$port = 3306;

$dbname = "db_bmn_tekmira";
$username = "root";
$password = "";

// KONEKSI PDO
try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

} catch (PDOException $e) {

    http_response_code(500);
    header(
        "Content-Type: application/json; charset=UTF-8"
    );

    echo json_encode([
        "success" => false,
        "message" => "Koneksi database gagal",
        "error" => $e->getMessage()
    ]);

    exit;
}

// CORS
header(
    "Access-Control-Allow-Origin: *"
);

header(
    "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"
);

header(
    "Access-Control-Allow-Headers: Content-Type"
);

// HANDLE PREFLIGHT REQUEST
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

?>