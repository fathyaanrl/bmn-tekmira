<?php
require_once "config.php";
header("Content-Type: application/json; charset=UTF-8");
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    try {
        $sql = "
            SELECT
                m.id, m.aset_id, m.tanggal, m.pemegang_lama_id, m.pemegang_baru_id,
                m.jenis_transaksi, m.kondisi, m.nomor_bast, m.keterangan,
                a.jenis, a.kode_barang, a.nup_baru, a.merek, a.tipe, a.nama_barang, a.tahun,
                p1.nama AS pemegang_lama_nama, p1.nip AS pemegang_lama_nip,
                p2.nama AS pemegang_baru_nama, p2.nip AS pemegang_baru_nip
            FROM mutasi m
            INNER JOIN aset a ON m.aset_id = a.id
            LEFT JOIN pegawai p1 ON m.pemegang_lama_id = p1.id
            LEFT JOIN pegawai p2 ON m.pemegang_baru_id = p2.id
            ORDER BY m.id DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute();
        echo json_encode(["success" => true, "message" => "Riwayat mutasi berhasil diambil", "data" => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Gagal mengambil riwayat mutasi", "error" => $e->getMessage()]);
    }
    exit;
}

if ($method === "POST") {
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input || empty($input["aset_id"]) || empty($input["jenis_transaksi"])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Data mutasi tidak valid"]);
        exit;
    }

    $asetId = (int) $input["aset_id"];
    $tanggal = !empty($input["tanggal"]) ? $input["tanggal"] : date("Y-m-d");
    $jenisTransaksi = strtoupper(trim($input["jenis_transaksi"]));
    $pemegangLamaId = !empty($input["pemegang_lama_id"]) ? (int) $input["pemegang_lama_id"] : null;
    $pemegangBaruId = !empty($input["pemegang_baru_id"]) ? (int) $input["pemegang_baru_id"] : null;
    $kondisi = !empty($input["kondisi"]) ? $input["kondisi"] : null;
    $nomorBast = !empty($input["nomor_bast"]) ? $input["nomor_bast"] : null;
    $keterangan = !empty($input["keterangan"]) ? $input["keterangan"] : null;

    $jenisValid = ["PEMINJAMAN", "PENGEMBALIAN", "MUTASI", "LAINNYA"];
    if (!in_array($jenisTransaksi, $jenisValid)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Jenis transaksi tidak valid"]);
        exit;
    }

    try {
        $pdo->beginTransaction();

        $checkAsset = $pdo->prepare("SELECT id, pemegang_id, kondisi FROM aset WHERE id = :id FOR UPDATE");
        $checkAsset->execute([":id" => $asetId]);
        $asset = $checkAsset->fetch();

        if (!$asset) {
            $pdo->rollBack();
            echo json_encode(["success" => false, "message" => "Aset tidak ditemukan"]);
            exit;
        }

        $insertStmt = $pdo->prepare("INSERT INTO mutasi (aset_id, tanggal, pemegang_lama_id, pemegang_baru_id, jenis_transaksi, kondisi, nomor_bast, keterangan) VALUES (:aset_id, :tanggal, :pemegang_lama_id, :pemegang_baru_id, :jenis_transaksi, :kondisi, :nomor_bast, :keterangan)");
        $insertStmt->execute([
            ":aset_id" => $asetId, ":tanggal" => $tanggal, ":pemegang_lama_id" => $pemegangLamaId,
            ":pemegang_baru_id" => $pemegangBaruId, ":jenis_transaksi" => $jenisTransaksi,
            ":kondisi" => $kondisi, ":nomor_bast" => $nomorBast, ":keterangan" => $keterangan
        ]);
        $mutasiId = $pdo->lastInsertId();

        $updateStmt = $pdo->prepare("UPDATE aset SET pemegang_id = :pemegang_id, kondisi = COALESCE(:kondisi, kondisi) WHERE id = :id");
        $updateStmt->execute([":pemegang_id" => $pemegangBaruId, ":kondisi" => $kondisi, ":id" => $asetId]);

        $pdo->commit();
        echo json_encode(["success" => true, "message" => "Transaksi berhasil disimpan", "data" => ["mutasi_id" => $mutasiId]]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Transaksi gagal disimpan", "error" => $e->getMessage()]);
    }
    exit;
}
http_response_code(405);
echo json_encode(["success" => false, "message" => "Method tidak didukung"]);
?>