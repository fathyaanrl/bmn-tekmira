<?php
session_start();
// Barikade Keamanan Endpoint
if (!isset($_SESSION["admin_username"])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Akses ditolak! Sesi login tidak valid.']);
    exit;
}

require_once "config.php";
header("Content-Type: application/json; charset=UTF-8");
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    try {
        $sql = "
            SELECT
                a.id, a.jenis, a.kode_barang, a.nup_baru, a.merek, a.tipe,
                a.nama_barang, a.tahun, a.kondisi, a.keterangan, a.nilai_perolehan, a.pemegang_id,
                a.created_at,
                p.nama AS pemegang_nama, p.nip AS pemegang_nip,
                p.jabatan AS pemegang_jabatan
            FROM aset a
            LEFT JOIN pegawai p ON a.pemegang_id = p.id
            ORDER BY a.id ASC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        echo json_encode(["success" => true, "message" => "Data aset berhasil diambil", "data" => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Gagal mengambil data aset", "error" => $e->getMessage()]);
    }
    exit;
}

if ($method === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Data tidak valid"]);
        exit;
    }
    try {
        $sql = "INSERT INTO aset (jenis, kode_barang, nup_baru, merek, tipe, nama_barang, tahun, kondisi, keterangan, nilai_perolehan, pemegang_id) 
                VALUES (:jenis, :kode_barang, :nup_baru, :merek, :tipe, :nama_barang, :tahun, :kondisi, :keterangan, :nilai_perolehan, :pemegang_id)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ":jenis" => $input["jenis"] ?? "Laptop",
            ":kode_barang" => $input["kode_barang"] ?? null,
            ":nup_baru" => $input["nup_baru"] ?? null,
            ":merek" => $input["merek"] ?? null,
            ":tipe" => $input["tipe"] ?? null,
            ":nama_barang" => $input["nama_barang"] ?? null,
            ":tahun" => $input["tahun"] ?? null,
            ":kondisi" => $input["kondisi"] ?? "Baik",
            ":keterangan" => $input["keterangan"] ?? null,
            ":nilai_perolehan" => $input["nilai_perolehan"] ?? null,
            ":pemegang_id" => $input["pemegang_id"] ?? null
        ]);
        echo json_encode(["success" => true, "message" => "Aset berhasil ditambahkan", "id" => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Gagal menambahkan aset", "error" => $e->getMessage()]);
    }
    exit;
}

if ($method === "PUT") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input || empty($input["id"])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID aset wajib diisi"]);
        exit;
    }
    try {
        $sql = "UPDATE aset SET jenis = :jenis, kode_barang = :kode_barang, nup_baru = :nup_baru, merek = :merek, tipe = :tipe, 
                nama_barang = :nama_barang, tahun = :tahun, kondisi = :kondisi, keterangan = :keterangan, 
                nilai_perolehan = :nilai_perolehan, pemegang_id = :pemegang_id 
                WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ":id" => $input["id"],
            ":jenis" => $input["jenis"] ?? "Laptop",
            ":kode_barang" => $input["kode_barang"] ?? null,
            ":nup_baru" => $input["nup_baru"] ?? null,
            ":merek" => $input["merek"] ?? null,
            ":tipe" => $input["tipe"] ?? null,
            ":nama_barang" => $input["nama_barang"] ?? null,
            ":tahun" => $input["tahun"] ?? null,
            ":kondisi" => $input["kondisi"] ?? "Baik",
            ":keterangan" => $input["keterangan"] ?? null,
            ":nilai_perolehan" => $input["nilai_perolehan"] ?? null,
            ":pemegang_id" => $input["pemegang_id"] ?? null
        ]);
        echo json_encode(["success" => true, "message" => "Aset berhasil diperbarui"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Gagal memperbarui aset", "error" => $e->getMessage()]);
    }
    exit;
}

if ($method === "DELETE") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input || empty($input["id"])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID aset wajib diisi"]);
        exit;
    }
    try {
        $stmt = $pdo->prepare("DELETE FROM aset WHERE id = :id");
        $stmt->execute([":id" => $input["id"]]);
        echo json_encode(["success" => true, "message" => "Aset berhasil dihapus"]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Gagal menghapus aset", "error" => $e->getMessage()]);
    }
    exit;
}
http_response_code(405);
echo json_encode(["success" => false, "message" => "Method tidak didukung"]);
?>