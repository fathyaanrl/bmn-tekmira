<?php

$host = "127.0.0.1";
$port = 3307;
$dbname = "db_bmn_tekmira";
$username = "root";
$password = "";

try {

    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
        $username,
        $password
    );

    echo "KONEKSI DATABASE BERHASIL";

} catch (PDOException $e) {

    echo "KONEKSI GAGAL: " . $e->getMessage();

}

?>