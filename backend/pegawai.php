<?php
require_once "config.php";
header("Content-Type: application/json; charset=UTF-8");
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    try {
        // Hapus pemanggilan unit_kerja di sini
        $stmt = $pdo->prepare("SELECT id, nama, nip, jabatan, created_at, updated_at FROM pegawai ORDER BY nama ASC");
        $stmt->execute();
        echo json_encode(["success" => true, "message" => "Data pegawai berhasil diambil", "data" => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Gagal mengambil data pegawai", "error" => $e->getMessage()]);
    }
    exit;
}

if ($method === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input || empty($input["nama"])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Nama pegawai wajib diisi"]);
        exit;
    }
    try {
        // Hapus unit_kerja dari proses Insert
        $stmt = $pdo->prepare("INSERT INTO pegawai (nama, nip, jabatan) VALUES (:nama, :nip, :jabatan)");
        $stmt->execute([
            ":nama" => $input["nama"],
            ":nip" => $input["nip"] ?? null,
            ":jabatan" => $input["jabatan"] ?? null
        ]);
        echo json_encode(["success" => true, "message" => "Pegawai berhasil ditambahkan", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Gagal menambahkan pegawai", "error" => $e->getMessage()]);
    }
    exit;
}

if ($method === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input || empty($input["id"])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID pegawai wajib diisi"]);
        exit;
    }
    try {
        // Hapus unit_kerja dari proses Update
        $stmt = $pdo->prepare("UPDATE pegawai SET nama = :nama, nip = :nip, jabatan = :jabatan WHERE id = :id");
        $stmt->execute([
            ":id" => $input["id"],
            ":nama" => $input["nama"] ?? "",
            ":nip" => $input["nip"] ?? null,
            ":jabatan" => $input["jabatan"] ?? null
        ]);
        echo json_encode(["success" => true, "message" => "Pegawai berhasil diperbarui"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Gagal memperbarui pegawai", "error" => $e->getMessage()]);
    }
    exit;
}

if ($method === "DELETE") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input || empty($input["id"])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID pegawai wajib diisi"]);
        exit;
    }
    try {
        $checkStmt = $pdo->prepare("SELECT COUNT(*) AS total FROM aset WHERE pemegang_id = :id");
        $checkStmt->execute([":id" => $input["id"]]);
        $check = $checkStmt->fetch();
        if ($check["total"] > 0) {
            http_response_code(409);
            echo json_encode(["success" => false, "message" => "Pegawai masih memiliki aset. Kembalikan aset terlebih dahulu.", "jumlah_aset" => $check["total"]]);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM pegawai WHERE id = :id");
        $stmt->execute([":id" => $input["id"]]);
        echo json_encode(["success" => true, "message" => "Pegawai berhasil dihapus"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Gagal menghapus pegawai", "error" => $e->getMessage()]);
    }
    exit;
}
http_response_code(405);
echo json_encode(["success" => false, "message" => "Method tidak didukung"]);
?>