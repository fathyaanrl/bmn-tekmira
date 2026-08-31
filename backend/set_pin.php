<?php
require_once "config.php";
try {
    // Kita buat PIN default: 123456
    $pinHash = password_hash("123456", PASSWORD_BCRYPT);
    
    // Update ke semua admin
    $pdo->exec("UPDATE admin SET recovery_code_hash = '$pinHash'");
    echo "<h1>MANTAP! PIN Darurat (123456) berhasil dipasang ke database!</h1>";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>