<?php
require_once "config.php";
try {
    $pinHash = password_hash("010203", PASSWORD_BCRYPT);
    
    $pdo->exec("UPDATE admin SET recovery_code_hash = '$pinHash'");
    echo "<h1>MANTAP! PIN Darurat (123456) berhasil dipasang ke database!</h1>";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>