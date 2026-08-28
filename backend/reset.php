<?php
require_once "config.php";
header("Content-Type: application/json; charset=UTF-8");
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!isset($input["confirm"]) || $input["confirm"] !== true) {
        echo json_encode(["success" => false, "message" => "Akses ditolak"]);
        exit;
    }

    try {
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
        $pdo->exec("TRUNCATE TABLE mutasi;");
        $pdo->exec("TRUNCATE TABLE aset;");
        $pdo->exec("TRUNCATE TABLE pegawai;");
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
        
        // Hapus file foto & PDF lama yang numpuk di server
        $folders = ['../uploads/tktm/', '../uploads/surat/'];
        foreach ($folders as $folder) {
            if (is_dir($folder)) {
                $files = glob($folder . '*'); // Ambil semua file
                foreach ($files as $file) {
                    if (is_file($file)) unlink($file); // Delete!
                }
            }
        }

        echo json_encode(["success" => true, "message" => "Sistem berhasil dikembalikan ke 0"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Gagal mengosongkan data", "error" => $e->getMessage()]);
    }
}
?>