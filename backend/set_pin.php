<?php
require_once "config.php";

try {
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $pinHash = password_hash("010203", PASSWORD_BCRYPT);
    
    $stmtPin = $pdo->prepare("UPDATE admin SET recovery_code_hash = ?");
    $stmtPin->execute([$pinHash]);
    $barisPin = $stmtPin->rowCount();
    
    $passHash = password_hash("tekmira", PASSWORD_BCRYPT);
    $stmtPass = $pdo->prepare("UPDATE admin SET password = ? WHERE username = 'AdminBMN'");
    $stmtPass->execute([$passHash]);
    
    echo "<h1>SUKSES!</h1>";
    echo "<p>- Berhasil update PIN Darurat di <b>$barisPin</b> akun.</p>";
    echo "<p>- Berhasil mengamankan ulang password AdminBMN.</p>";
    echo "<p>Silakan refresh phpMyAdmin kamu dan cek tabelnya!</p>";

} catch (PDOException $e) {
    echo "<h1>YAH GAGAL: " . $e->getMessage() . "</h1>";
}
?>