<?php
// Matikan error HTML pas udah jalan normal nanti
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

try {
    // Panggil file konfigurasi kamu
    require 'config.php'; 

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        
        if (!isset($_FILES['file_pdf'])) {
            echo json_encode(['status' => 'error', 'message' => 'File tidak masuk!']);
            exit;
        }

        $id_riwayat = $_POST['id'];
        $uploadDir = '../uploads/surat/';
        
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $fileName = time() . '_' . basename($_FILES['file_pdf']['name']);
        $targetFilePath = $uploadDir . $fileName;
        $fileType = strtolower(pathinfo($targetFilePath, PATHINFO_EXTENSION));

        if($fileType !== 'pdf') {
            echo json_encode(['status' => 'error', 'message' => 'Cuma boleh upload file PDF ya!']);
            exit;
        }

        if (move_uploaded_file($_FILES['file_pdf']['tmp_name'], $targetFilePath)) {
            
            // ========================================================
            // PERBAIKAN DI SINI: Pakai PDO ($pdo) menyesuaikan sistemmu
            // ========================================================
            $query = "UPDATE mutasi SET file_bukti = :file_bukti WHERE id = :id";
            $stmt = $pdo->prepare($query);
            
            // Eksekusi datanya
            if($stmt->execute([':file_bukti' => $fileName, ':id' => $id_riwayat])) {
                echo json_encode(['status' => 'success', 'file_name' => $fileName]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Gagal simpan ke database.']);
            }
            
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Gagal mindahin file ke folder uploads/surat/']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Metode bukan POST']);
    }
} catch (Throwable $e) {
    echo json_encode(['status' => 'error', 'message' => 'Sistem Error: ' . $e->getMessage()]);
}
?>