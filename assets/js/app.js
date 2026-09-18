const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        // LOGIN & USER STATE
        const isLoggedIn = ref(
            sessionStorage.getItem('bmn_logged_in') === 'true'
        );

        const loginUsername = ref('');
        const loginPassword = ref('');
        const loginError = ref('');

        const currentUsername = ref(
            localStorage.getItem('bmn_username') || 'AdminBMN'
        );

        const modalForgotPassword = ref({
            show: false
        });

        const forgotUsername = ref('');
        const forgotNewPassword = ref('');
        const forgotPin = ref('');
        const forgotConfirmPassword = ref('');
        const forgotError = ref('');

        const openForgotPassword = () => {
            forgotUsername.value = '';
            forgotNewPassword.value = '';
            forgotPin.value = '';
            forgotConfirmPassword.value = '';
            forgotError.value = '';

            modalForgotPassword.value.show = true;
        };

        const closeForgotPassword = () => {
            forgotUsername.value = '';
            forgotPin.value = '';
            forgotNewPassword.value = '';
            forgotConfirmPassword.value = '';
            forgotError.value = '';

            modalForgotPassword.value.show = false;
        };

        const resetPassword = async () => {
            forgotError.value = '';

            const username = forgotUsername.value.trim();
            const pin = forgotPin.value.trim();
            const newPassword = forgotNewPassword.value;
            const confirmPassword = forgotConfirmPassword.value;

            if (!username) {
                forgotError.value = 'Username salah diisi!';
                return;
            }

            if (!pin) {
                forgotError.value = 'PIN Darurat salah diisi!';
                return;
            }

            if (!newPassword) {
                forgotError.value = 'Password baru wajib diisi!';
                return;
            }

            if (newPassword !== confirmPassword) {
                forgotError.value = 'Konfirmasi password tidak cocok!';
                return;
            }

            try {
                const result = await apiRequest('password.php', {
                    method: 'POST',
                    body: JSON.stringify({
                        username: username,
                        pin: pin, 
                        password_baru: newPassword
                    })
                });

                if (result.success) {
                    modalForgotPassword.value.show = false;

                    forgotUsername.value = '';
                    forgotPin.value = ''; 
                    forgotNewPassword.value = '';
                    forgotConfirmPassword.value = '';

                    showToast('Password berhasil direset! Silakan login kembali.');
                } else {
                    forgotError.value = result.message || 'Gagal mereset password!';
                }

            } catch (error) {
                console.error('Reset password gagal:', error);
                forgotError.value = error.message || 'Gagal terhubung ke server!';
            }
        };

        // FUNCTION LOGIN
        const handleLogin = async () => {
            const usernameInput = loginUsername.value.trim();
            const passwordInput = loginPassword.value;

            loginError.value = '';

            if (!usernameInput || !passwordInput) {
                loginError.value = 'Username dan password wajib diisi!';
                return;
            }

            try {
                const result = await apiRequest('login.php', {
                    method: 'POST',
                    body: JSON.stringify({
                        username: usernameInput,
                        password: passwordInput
                    })
                });

                if (result.success) {
                    isLoggedIn.value = true;
                    loginError.value = '';

                    sessionStorage.setItem('bmn_logged_in', 'true');

                    currentUsername.value = result.username;
                    localStorage.setItem(
                        'bmn_username',
                        result.username
                    );

                    loginUsername.value = '';
                    loginPassword.value = '';

                    await loadDataFromBackend();
                }

            } catch (error) {
                console.error('Login gagal:', error);
                isLoggedIn.value = false;

                loginError.value =
                    error.message || 'Username atau password salah!';
            }
        };

        // CEK LOGIN SAAT RELOAD
        const checkLogin = () => {
            const loggedIn = sessionStorage.getItem('bmn_logged_in');

            if (loggedIn === 'true') {
                isLoggedIn.value = true;
            } else {
                isLoggedIn.value = false;
            }
        };

        // STATE UTAMA
        const currentCategory = ref('laptops');
        const currentTab = ref('assets');

        const changeTab = async (tabName) => {
            currentTab.value = tabName;
            printData.value = { show: false }; 
            
            searchQuery.value = '';
            filterStatus.value = 'all';
            filterKondisi.value = 'all';
            filterKeterangan.value = 'all';
            filterJenisAset.value = 'all'; 
            filterStatusPegawai.value = 'all';
            filterSurat.value = 'all';
            filterJenisTransaksi.value = 'all';
            filterKondisiRiwayat.value = 'all';

            isSelectMode.value = false;
            selectedAssets.value = [];
            selectedPegawai.value = [];
            selectedHistory.value = [];

            // Jika pindah ke tab riwayat/mutasi, refresh datanya
            if (tabName === 'mutasi' || tabName === 'riwayat') {
                await refreshHistory();
                await refreshBuktiList();
            }
        };

        const showDropdown = ref(false); 
        const itemsPerPage = ref(25);

        const searchQuery = ref('');
        const filterStatus = ref('all');
        const filterKondisi = ref('all');
        const filterKeterangan = ref('all');
        const filterJenisAset = ref('all'); 
        const filterStatusPegawai = ref('all');
        const filterSurat = ref('all');
        const filterJenisTransaksi = ref('all');
        const filterKondisiRiwayat = ref('all');
        const fileInputBukti = ref(null);
        const currentUploadId = ref(null);

        const isSelectMode = ref(false);
        const selectedAssets = ref([]);
        const selectedPegawai = ref([]);
        const selectedHistory = ref([]);

        const sortHistoryOrder = ref('desc'); 
        const toggleHistorySort = () => {
            sortHistoryOrder.value = sortHistoryOrder.value === 'desc' ? 'asc' : 'desc';
        };

        const sortAssetOrder = ref('desc'); 
        const toggleAssetSort = () => {
            sortAssetOrder.value = sortAssetOrder.value === 'desc' ? 'asc' : 'desc';
        };

        const toast = ref({
            show: false,
            message: '',
            isError: false
        });

        const db = ref({
            laptops: [],
            pcs: [],
            tablets: []
        });

        const pegawaiList = ref([]);
        const historyList = ref([]);

        const API_BASE = 'backend';

        // TOAST & API
        const showToast = (message, isError = false) => {
            toast.value = { show: true, message, isError };
            setTimeout(() => { toast.value.show = false; }, 4000);
        };

        const apiRequest = async (endpoint, options = {}) => {
            try {
                const response = await fetch(`${API_BASE}/${endpoint}`, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(options.headers || {})
                    }
                });
                const text = await response.text();
                let result;
                try {
                    result = text ? JSON.parse(text) : {};
                } catch (error) {
                    throw new Error(`Response ${endpoint} bukan JSON yang valid.`);
                }
                if (!response.ok || result.success === false) {
                    throw new Error(result.message || result.error || `Request ${endpoint} gagal.`);
                }
                return result;
            } catch (error) {
                console.error(`API Error ${endpoint}:`, error);
                throw error;
            }
        };

        // NORMALIZE DATA
        const normalizeAsset = (row) => {
            const jenis = row.jenis || row.nama_barang || 'Laptop';
            const jenisLower = String(jenis).toLowerCase();
            let category = 'laptops';

            if (jenisLower.includes('pc') || jenisLower.includes('desktop')) {
                category = 'pcs';
            }
            if (jenisLower.includes('tablet')) {
                category = 'tablets';
            }

            const pemegangId = row.pemegang_id !== null && row.pemegang_id !== undefined && row.pemegang_id !== ''
                ? Number(row.pemegang_id)
                : null;

            return {
                id: Number(row.id),
                jenis,
                kodeBarang: String(row.kode_barang || '').replace(/\.0+$/, ''),
                nup: String(row.nup_baru || '').replace(/\.0+$/, ''),
                nupBaru: String(row.nup_baru || ''),
                merek: row.merek || '',
                tipe: row.tipe || '',
                namaBarang: row.nama_barang || '',
                tahun: row.tahun !== null && row.tahun !== undefined ? String(row.tahun) : '',
                kondisi: row.kondisi || 'Baik',
                kondisiAsli: row.kondisi_asli || row.kondisi || 'Baik',
                keterangan: row.keterangan || '',
                pemegangId,
                pemegangNama: row.pemegang_nama || null,
                pemegangNip: row.pemegang_nip || null,
                pemegangJabatan: row.pemegang_jabatan || null,
                pemegangUnitKerja: row.pemegang_unit_kerja || null,
                nilaiPerolehan: row.nilai_perolehan || row.nilaiPerolehan || '',
                _category: category,
                created_at: row.created_at,
            };
        };

        const normalizePegawai = (row) => {
            return {
                id: Number(row.id),
                nama: row.nama || row.sumber_nama || '',
                nip: row.nip || '',
                jabatan: row.jabatan || '',
                unit_kerja: row.unit_kerja || '',
                sumber_nama: row.sumber_nama || row.nama || ''
            };
        };

        const normalizeHistory = (row) => {
            return {
                id: Number(row.id),
                aset_id: Number(row.aset_id),
                tanggal: row.tanggal || '',
                kategoriLabel: row.jenis || '',
                kodeBarang: String(row.kode_barang || '').replace(/\.0+$/, ''),
                nup: String(row.nup_baru || '').replace(/\.0+$/, ''),
                merekTipe: `${row.merek || ''} ${row.tipe || ''}`.trim(),
                namaBarang: row.nama_barang || row.jenis || '',
                tahun: row.tahun || '',
                pemegangLamaNama: row.pemegang_lama_nama || 'Gudang BMN TekMira',
                pemegangLamaNip: row.pemegang_lama_nip || null,
                pemegangBaruNama: row.pemegang_baru_nama || 'Gudang BMN TekMira',
                pemegangBaruNip: row.pemegang_baru_nip || null,
                pemegangLama: row.pemegang_lama_nama || 'Gudang BMN TekMira',
                pemegangBaru: row.pemegang_baru_nama || 'Gudang BMN TekMira',
                kondisi: row.kondisi || 'Baik',
                nomorBast: row.nomor_bast || '',
                jenisTransaksi: row.jenis_transaksi || '',
                keterangan: row.keterangan || '',
                nilai_perolehan: row.nilai_perolehan || '',
                lampiran_foto: row.lampiran_foto || null,
                file_bukti: row.file_bukti || null
            };
        };

        // LOAD & REFRESH DATA
        const loadDataFromBackend = async () => {
            try {
                const [asetResponse, pegawaiResponse, mutasiResponse] = await Promise.all([
                    apiRequest('aset.php'),
                    apiRequest('pegawai.php'),
                    apiRequest('mutasi.php')
                ]);

                const assets = (asetResponse.data || []).map(normalizeAsset).sort((a, b) => b.id - a.id);
                const grouped = { laptops: [], pcs: [], tablets: [] };
                assets.forEach(asset => { grouped[asset._category].push(asset); });
                db.value = grouped;

                pegawaiList.value = (pegawaiResponse.data || []).map(normalizePegawai).sort((a, b) => b.id - a.id);
                historyList.value = (mutasiResponse.data || []).map(normalizeHistory);
                await refreshBuktiList();

                showToast(`Database berhasil dimuat: ${assets.length} aset, ${pegawaiList.value.length} user.`);
            } catch (error) {
                showToast(`Gagal memuat database: ${error.message}`, true);
            }
        };

        const refreshAssets = async () => {
            const response = await apiRequest('aset.php');
            const assets = (response.data || []).map(normalizeAsset).sort((a, b) => b.id - a.id);
            const grouped = { laptops: [], pcs: [], tablets: [] };
            assets.forEach(asset => { grouped[asset._category].push(asset); });
            db.value = grouped;
        };

        const refreshPegawai = async () => {
            const response = await apiRequest('pegawai.php');
            pegawaiList.value = (response.data || []).map(normalizePegawai).sort((a, b) => b.id - a.id);
        };

        const refreshHistory = async () => {
            const response = await apiRequest('mutasi.php');
            historyList.value = (response.data || []).map(normalizeHistory);
        };

        // BUKTI SURAT
        const buktiIds = ref([]); 

        const refreshBuktiList = async () => {
            try {
                const res = await fetch(`${API_BASE}/list_bukti.php`);
                const result = await res.json();
                if (result.status === 'success' || Array.isArray(result.ids)) {
                    buktiIds.value = (result.ids || []).map(Number);
                }
            } catch (error) {
                console.error('Gagal ambil daftar bukti surat:', error);
            }
        };
        
        const hasBukti = (item) => {
            if (!item) return false;
            
            if (item.file_bukti || item.file_pdf || item.bukti_pdf) return true;
            
            const id = item.id || item.id_mutasi;
            if (typeof buktiIds !== 'undefined' && buktiIds.value) {
                return buktiIds.value.some(bId => String(bId) === String(id));
            }
            
            return false;
        };

        // CATEGORY & STATISTICS        
        const activeAssets = computed(() => allAssets.value);
        
        const allAssets = computed(() => [
            ...db.value.laptops,
            ...db.value.pcs,
            ...db.value.tablets
        ]);

        const visibleAssets = computed(() =>
            activeAssets.value.filter(asset =>
                !(asset.keterangan && String(asset.keterangan).toLowerCase().includes('transfer keluar'))
            )
        );
        
        const categoryLabel = computed(() => {
            if (currentCategory.value === 'laptops') return 'Laptop';
            if (currentCategory.value === 'pcs') return 'PC Desktop';
            return 'Tablet';
        });

        const categoryIcon = computed(() => {
            if (currentCategory.value === 'laptops') return 'fa-solid fa-laptop';
            if (currentCategory.value === 'pcs') return 'fa-solid fa-desktop';
            return 'fa-solid fa-tablet-screen-button';
        });

        const assignedCount = computed(() =>
            visibleAssets.value.filter(asset => asset.pemegangId !== null).length
        );     

        const availableCount = computed(() =>
            visibleAssets.value.filter(asset => asset.pemegangId === null).length
        );
        
        const damagedCount = computed(() =>
            visibleAssets.value.filter(asset => asset.kondisi !== 'Baik').length
        );
        
        // PEGAWAI INFO
        const getPegawaiInfo = (id) => pegawaiList.value.find(pegawai => Number(pegawai.id) === Number(id)) || null;
        const getPegawaiName = (id) => getPegawaiInfo(id)?.nama || '-';
        const getPegawaiNip = (id) => getPegawaiInfo(id)?.nip || '-';
        
        const getPegawaiInitials = (id) => {
            const name = getPegawaiName(id);
            if (name === '-') return '?';
            const cleanName = name.replace(/^(Dr\.|Ir\.|Drs\.|H\.|Hj\.|M\.T\.|S\.T\.|M\.Sc\.|S\.Si\.)\s+/gi, '').trim();
            const parts = cleanName.split(/\s+/);
            if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
            return (parts[0][0] + parts[1][0]).toUpperCase();
        };

        const getPegawaiAllAssets = (pegawaiId) => {
            const result = [];
            Object.keys(db.value).forEach(category => {
                const found = db.value[category].filter(asset => Number(asset.pemegangId) === Number(pegawaiId));
                result.push(...found);
            });
            return result;
        };

        // AMBIL TANGGAL BAST TERAKHIR / TANGGAL INPUT BARU
        const getLastMutationDate = (asset) => {
            const history = historyList.value.filter(h => h.aset_id === asset.id && h.tanggal && h.tanggal !== '0000-00-00');
            
            if (history.length > 0) {
                history.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
                return formatTanggalIndo(history[0].tanggal);
            }
            
            if (asset.created_at && asset.created_at !== '0000-00-00 00:00:00') {
                const tglInput = asset.created_at.split(' ')[0];
                return formatTanggalIndo(tglInput);
            }
            
            return '10 Agustus 2026';
        };

        // BADGES & ICONS
        const getConditionBadgeClass = kondisi => {
            if (kondisi === 'Baik') return 'bg-emerald-100 text-emerald-800';
            if (kondisi === 'Rusak Ringan') return 'bg-amber-100 text-amber-800';
            return 'bg-rose-100 text-rose-800';
        };

        const getConditionIconClass = kondisi => {
            if (kondisi === 'Baik') return 'fa-circle-check text-emerald-600';
            if (kondisi === 'Rusak Ringan') return 'fa-triangle-exclamation text-amber-600';
            return 'fa-circle-xmark text-rose-600';
        };

        // FILTERS
        const filteredAssets = computed(() => {
            return activeAssets.value.filter(asset => {
                if (filterKeterangan.value === 'Lainnya') {
                    const ket = (asset.keterangan || '').toLowerCase();
                    const isStandar = ket.startsWith('pembelian') || ket.startsWith('sewa') || ket.startsWith('transfer masuk') || ket.startsWith('transfer keluar');
                    if (isStandar) return false;
                } else if (filterKeterangan.value !== 'all') {
                    if (!(asset.keterangan || '').toLowerCase().startsWith(filterKeterangan.value.toLowerCase())) return false;
                } else {
                    if (asset.keterangan && String(asset.keterangan).toLowerCase().includes('transfer keluar')) return false;
                }
                if (filterJenisAset.value !== 'all' && asset.jenis !== filterJenisAset.value) return false;

                if (filterStatus.value === 'assigned' && asset.pemegangId === null) return false;
                if (filterStatus.value === 'gudang' && asset.pemegangId !== null) return false;
                if (filterKondisi.value !== 'all' && asset.kondisi !== filterKondisi.value) return false;

                const query = searchQuery.value.toLowerCase().trim();
                if (!query) return true;
                const holder = asset.pemegangId ? getPegawaiName(asset.pemegangId).toLowerCase() : 'gudang bmn';
                return (
                    String(asset.kodeBarang).toLowerCase().includes(query) || String(asset.nup).toLowerCase().includes(query) ||
                    String(asset.merek).toLowerCase().includes(query) || String(asset.tipe).toLowerCase().includes(query) ||
                    String(asset.tahun).toLowerCase().includes(query) || String(asset.keterangan).toLowerCase().includes(query) || holder.includes(query)
                );
            }).sort((a, b) => {
                if (sortAssetOrder.value === 'desc') {
                    return Number(b.id) - Number(a.id);
                } else {
                    return Number(a.id) - Number(b.id);
                }
            });
        });

        const filteredPegawai = computed(() => {
            const pegawaiAktifSaja = pegawaiList.value.filter(pegawai => !pegawaiSudahKeluar(pegawai.id));
            
            const hasilFilter = pegawaiAktifSaja.filter(pegawai => {
                if (filterStatusPegawai.value === 'ada' && getPegawaiAllAssets(pegawai.id).length === 0) return false;
                if (filterStatusPegawai.value === 'kosong' && getPegawaiAllAssets(pegawai.id).length > 0) return false;

                const query = searchQuery.value.toLowerCase().trim();
                if (!query) return true;
                
                return (
                    String(pegawai.nama).toLowerCase().includes(query) || 
                    String(pegawai.nip).toLowerCase().includes(query) || 
                    String(pegawai.jabatan).toLowerCase().includes(query)
                );
            });

            return hasilFilter.sort((a, b) => 
                String(a.nama).localeCompare(String(b.nama), 'id', { sensitivity: 'base' })
            );
        });

        // Filter Tabel Riwayat
        const filteredHistory = computed(() => {
            let result = [...historyList.value];

            if (filterSurat.value === 'SIP') {
                result = result.filter(h => h.nomorBast && String(h.nomorBast).includes('/GDG/'));
            } else if (filterSurat.value === 'BAST') {
                result = result.filter(h => h.nomorBast && String(h.nomorBast).includes('-GDG/'));
            } else if (filterSurat.value === 'VERIFIKASI') {
                result = result.filter(h => h.keterangan && String(h.keterangan).includes('Verifikasi Aset'));
            } else if (filterSurat.value === 'PENELITIAN') {
                result = result.filter(h => h.keterangan && String(h.keterangan).includes('Penelitian Fisik'));
            }

            if (filterJenisTransaksi.value !== 'all') {
                result = result.filter(h => h.jenisTransaksi === filterJenisTransaksi.value);
            }

            if (filterKondisiRiwayat.value !== 'all') {
                result = result.filter(h => h.kondisi === filterKondisiRiwayat.value);
            }

            const query = searchQuery.value.toLowerCase().trim();
            if (query) {
                result = result.filter(h => 
                    String(h.nomorBast).toLowerCase().includes(query) ||
                    String(h.merekTipe).toLowerCase().includes(query) ||
                    String(h.pemegangLama).toLowerCase().includes(query) ||
                    String(h.pemegangBaru).toLowerCase().includes(query)
                );
            }

            return result.sort((a, b) => {
                if (sortHistoryOrder.value === 'desc') {
                    return Number(b.id) - Number(a.id);
                } else {
                    return Number(a.id) - Number(b.id);
                }
            });
        });

        // Logika Upload PDF
        const triggerUpload = (id) => {
            console.log("1. Tombol Upload diklik untuk ID:", id);
            currentUploadId.value = id;
            
            const inputEl = document.getElementById('fileInputBuktiPDF');
            if (inputEl) {
                inputEl.value = '';
                inputEl.click();
            } else {
                alert('Error: Elemen #fileInputBuktiPDF tidak ditemukan di HTML!');
            }
        };

        const handleFileUpload = async (event) => {
            console.log("2. File berhasil dipilih oleh user");
            const file = event.target.files[0];
            if (!file) return;

            if (file.type !== 'application/pdf') {
                alert('File harus berupa format PDF!');
                return;
            }

            const uploadId = currentUploadId.value;
            alert(`Mengirim file '${file.name}' untuk ID Riwayat: ${uploadId}`);

            const formData = new FormData();
            formData.append('id', uploadId);
            formData.append('file_pdf', file);

            try {
                const res = await fetch(`${API_BASE}/upload_bukti.php`, {
                    method: 'POST',
                    body: formData
                });
                const result = await res.json();
                console.log("3. Respon dari server:", result);

                if (result.status === 'success') {
                    alert('Upload Berhasil! Tombol Lihat sekarang aktif.');
                    
                    if (typeof buktiIds !== 'undefined' && buktiIds.value) {
                        if (!buktiIds.value.includes(Number(uploadId))) {
                            buktiIds.value.push(Number(uploadId));
                        }
                    }
                    if (typeof refreshBuktiList === 'function') {
                        await refreshBuktiList();
                    }
                } else {
                    alert('Gagal dari Backend: ' + result.message);
                }
            } catch (err) {
                console.error("Error Upload:", err);
                alert('Terjadi kesalahan koneksi atau server PHP error.');
            }
        };

        const uploadPdfLangsung = async (event, idMutasi) => {
            const file = event.target.files[0];
            if (!file) return;

            if (file.type !== 'application/pdf') {
                alert('File harus berupa PDF!');
                return;
            }

            const formData = new FormData();
            formData.append('id', idMutasi);
            formData.append('file_pdf', file);

            try {
                const res = await fetch(`${API_BASE}/upload_bukti.php`, {
                    method: 'POST',
                    body: formData
                });
                const result = await res.json();

                if (result.status === 'success') {
                    alert('Upload Berhasil!');

                    const numId = Number(idMutasi);
                    if (!buktiIds.value.includes(numId)) {
                        buktiIds.value.push(numId);
                    }

                    if (typeof refreshBuktiList === 'function') {
                        await refreshBuktiList();
                    }
                } else {
                    alert('Gagal dari Server: ' + result.message);
                }
            } catch (err) {
                console.error("Error Upload PDF:", err);
                alert('Terjadi kesalahan koneksi saat mengunggah file.');
            } finally {
                event.target.value = '';
            }
        };

        const openPdf = (item) => {
            const id = typeof item === 'object' ? (item.id || item.id_mutasi) : item;
            const fileUrl = (typeof item === 'object' && item.file_bukti) 
                ? item.file_bukti 
                : `uploads/surat/bukti_${id}.pdf`;
                
            window.open(fileUrl, '_blank');
        };

        // FITUR PILIH & HAPUS BANYAK
        const toggleSelectMode = () => {
            isSelectMode.value = !isSelectMode.value;
            if (!isSelectMode.value) {
                selectedAssets.value = [];
                selectedPegawai.value = [];
            }
        };

        const selectAllAssets = computed({
            get: () => filteredAssets.value.length > 0 && selectedAssets.value.length === filteredAssets.value.length,
            set: (val) => { selectedAssets.value = val ? filteredAssets.value.map(a => a.id) : []; }
        });

        const selectAllPegawai = computed({
            get: () => filteredPegawai.value.length > 0 && selectedPegawai.value.length === filteredPegawai.value.length,
            set: (val) => { selectedPegawai.value = val ? filteredPegawai.value.map(p => p.id) : []; }
        });
        
        const selectAllHistory = computed({
            get: () => filteredHistory.value.length > 0 && selectedHistory.value.length === filteredHistory.value.length,
            set: (val) => { selectedHistory.value = val ? filteredHistory.value.map(h => h.id) : []; }
        });

        // MODAL ASET
        const modalAset = ref({ show: false, isEdit: false, editId: null });
        const formAset = ref({ 
            jenis: '', kodeBarang: '', nup: '', merek: '', tipe: '', tahun: '', keterangan: '', kondisi: 'Baik', 
            kategoriKeterangan: 'Pembelian', detailKeterangan: '', nilaiPerolehan: ''
        });

        const ubahKodeOtomatis = () => {
            const jenis = formAset.value.jenis;
            if (jenis === 'Laptop') {
                formAset.value.kodeBarang = '3100102002';
            } else if (jenis === 'Notebook') {
                formAset.value.kodeBarang = '3100102003';
            } else if (jenis === 'PC Unit') {
                formAset.value.kodeBarang = '3100102001';
            } else if (jenis === 'Tablet' ) {
                formAset.value.kodeBarang = '3100102009';
            } else if (jenis === 'Telephone Mobile' ) {
                formAset.value.kodeBarang = '3060201004';
            } else {
                formAset.value.kodeBarang = '';
            }
        };

        const openAsetModal = (item = null) => {
            if (item) {
                let parsedKategori = 'Lainnya';
                let parsedDetail = item.keterangan || '';
                
                const categories = ['Transfer masuk', 'Transfer keluar', 'Sewa', 'Pembelian'];
                for (const cat of categories) {
                    if (item.keterangan && item.keterangan.startsWith(cat)) {
                        parsedKategori = cat;
                        parsedDetail = item.keterangan.substring(cat.length).replace(/^ \- /, '').trim();
                        break;
                    }
                }

                modalAset.value = { show: true, isEdit: true, editId: item.id };
                formAset.value = { 
                    ...item,
                    kategoriKeterangan: parsedKategori,
                    detailKeterangan: parsedDetail,
                    nilaiPerolehan: item.nilaiPerolehan || item.nilai_perolehan || ''
                };
                return;
            }
            
            let jenis = currentCategory.value === 'pcs' ? 'PC Unit' : currentCategory.value === 'tablets' ? 'Tablet' : 'Laptop';
            
            modalAset.value = { show: true, isEdit: false, editId: null };
            
            formAset.value = { 
                jenis, 
                kodeBarang: '', 
                nup: '', 
                merek: '', 
                tipe: '', 
                tahun: new Date().getFullYear(), 
                kondisi: 'Baik', 
                kategoriKeterangan: 'Pembelian',
                detailKeterangan: '',
                asalPerolehanCustom: '',
                nilaiPerolehan: '' 
            };

            ubahKodeOtomatis();
        };

        const saveAset = async () => {
            try {
                let asalPerolehan = formAset.value.kategoriKeterangan === 'Lainnya' 
                    ? (formAset.value.asalPerolehanCustom?.trim() || 'Lainnya') 
                    : formAset.value.kategoriKeterangan;

                let combinedKeterangan = asalPerolehan;
                if (formAset.value.detailKeterangan && formAset.value.detailKeterangan.trim() !== '') {
                    combinedKeterangan += ` - ${formAset.value.detailKeterangan.trim()}`;
                }

                const payload = {
                    jenis: formAset.value.jenis,
                    kode_barang: formAset.value.kodeBarang,
                    nup_baru: formAset.value.nupBaru || formAset.value.nup || '',
                    merek: formAset.value.merek,
                    tipe: formAset.value.tipe,
                    nama_barang: formAset.value.namaBarang || `${formAset.value.merek || ''} ${formAset.value.tipe || ''}`.trim(),
                    tahun: formAset.value.tahun,
                    kondisi: formAset.value.kondisi,
                    kondisi_asli: formAset.value.kondisi,
                    keterangan: combinedKeterangan, 
                    pemegang_id: formAset.value.pemegangId ?? null,
                    pemegang_nama_sumber: formAset.value.pemegangNama || null,  
                    nilai_perolehan: formAset.value.nilaiPerolehan
                };

                if (modalAset.value.isEdit) {
                    await apiRequest('aset.php', { method: 'PUT', body: JSON.stringify({ id: modalAset.value.editId, ...payload }) });
                } else {
                    await apiRequest('aset.php', { method: 'POST', body: JSON.stringify(payload) });
                }
                await refreshAssets();
                modalAset.value.show = false;
                showToast('Data aset berhasil disimpan.');
            } catch (error) {
                showToast(`Gagal menyimpan aset: ${error.message}`, true);
            }
        };

        // MODAL PEGAWAI
        const modalPegawai = ref({ show: false, isEdit: false, editId: null });
        const formPegawai = ref({ nama: '', nip: '', jabatan: '' });

        const openPegawaiModal = (item = null) => {
            if (item) {
                modalPegawai.value = { show: true, isEdit: true, editId: item.id };
                formPegawai.value = { ...item };
                return;
            }
            modalPegawai.value = { show: true, isEdit: false, editId: null };
            formPegawai.value = { nama: '', nip: '', jabatan: '' };
        };

        const savePegawai = async () => {
            try {
                if (!formPegawai.value.nama.trim()) {
                    showToast('Nama pegawai wajib diisi.', true);
                    return;
                }
                const payload = {
                    nama: formPegawai.value.nama,
                    nip: formPegawai.value.nip || null,
                    jabatan: formPegawai.value.jabatan || null,
                    unit_kerja: formPegawai.value.unit_kerja || null
                };

                if (modalPegawai.value.isEdit) {
                    await apiRequest('pegawai.php', { method: 'PUT', body: JSON.stringify({ id: modalPegawai.value.editId, ...payload }) });
                } else {
                    await apiRequest('pegawai.php', { method: 'POST', body: JSON.stringify(payload) });
                }
                await refreshPegawai();
                modalPegawai.value.show = false;
                showToast('Data pegawai berhasil disimpan.');
            } catch (error) {
                showToast(`Gagal menyimpan pegawai: ${error.message}`, true);
            }
        };

        // LOGIKA MODAL TRANSFER KELUAR (TKTM) DARI PEGAWAI
        const modalTKTM = ref({
            show: false, pegawaiId: null, namaPegawai: '', asetList: [], selectedAsetId: '',
            tujuan: '', nilaiPerolehan: '', tanggal: '', 
            nomorPenelitian: '', nomorVerifikasi: '',
            pemeriksaTekmira1: '', pemeriksaTekmira2: '', pemeriksaTujuan1: '', pemeriksaTujuan2: '',
            petinggiTujuan: '', petinggiTekmira: 'Daman',
            fotoBarangUrls: [], fotoLabelUrls: [],
            fotoBarangFiles: [], fotoLabelFiles: []
        });

        const generateNomorTKTM = () => {
            const tahun = new Date().getFullYear();

            let maxPenelitian = 0;
            let maxVerifikasi = 0;

            historyList.value.forEach(h => {
                const nomor = String(h.nomorBast || '').trim();
                if (!nomor) return;

                const match = nomor.match(/^(\d+)\.BA\/BN\.10\/DBR\/(\d{4})$/);
                if (!match) return;

                const angka = parseInt(match[1], 10);
                const tahunNomor = match[2];

                if (tahunNomor !== String(tahun)) return;

                if (angka === 77) {
                    maxPenelitian = Math.max(maxPenelitian, angka);
                }

                if (angka === 78) {
                    maxVerifikasi = Math.max(maxVerifikasi, angka);
                }
            });

            return {
                penelitian: maxPenelitian
                    ? `${maxPenelitian}.BA/BN.10/DBR/${tahun}`
                    : `77.BA/BN.10/DBR/${tahun}`,

                verifikasi: maxVerifikasi
                    ? `${maxVerifikasi}.BA/BN.10/DBR/${tahun}`
                    : `78.BA/BN.10/DBR/${tahun}`
            };
        };

        const openModalTKTM = (pegawai) => {
            const empId = pegawai.id;
            let list = [];
            Object.values(db.value).forEach(kategoriAssets => {
                const asetAktif = kategoriAssets.filter(a => Number(a.pemegangId) === Number(empId) && (!a.keterangan || !String(a.keterangan).toLowerCase().includes('transfer keluar')));
                list = list.concat(asetAktif);
            });

            const thn = new Date().getFullYear();
            
            modalTKTM.value = {
                show: true, pegawaiId: empId, namaPegawai: pegawai.nama, asetList: list, selectedAsetId: '', 
                tujuan: '', nilaiPerolehan: '', 
                tanggal: new Date().toISOString().slice(0, 10), 
                nomorPenelitian: `77.BA/BN.10/DBR/${thn}`, 
                nomorVerifikasi: `78.BA/BN.10/DBR/${thn}`,
                pemeriksaTekmira1: '', pemeriksaTekmira2: '', pemeriksaTujuan1: '', pemeriksaTujuan2: '',
                petinggiTujuan: '', petinggiTekmira: 'Daman',
                fotoBarangUrls: [], fotoLabelUrls: [],
                fotoBarangFiles: [], fotoLabelFiles: []
            };
        };

        const handleSelectAsetTKTM = () => {
            const selected = modalTKTM.value.asetList.find(a => Number(a.id) === Number(modalTKTM.value.selectedAsetId));
            if (selected) {
                modalTKTM.value.nilaiPerolehan = selected.nilaiPerolehan || selected.nilai_perolehan || '';
            } else {
                modalTKTM.value.nilaiPerolehan = '';
            }
        };

        const prosesTransferKeluar = (asset) => {
            modalPegawai.value.show = false;
            
            const pegawai = getPegawaiInfo(asset.pemegangId);          
            if (pegawai) {
                openModalTKTM(pegawai);
                modalTKTM.value.selectedAsetId = asset.id;
                modalTKTM.value.nilaiPerolehan = asset.nilaiPerolehan || asset.nilai_perolehan || '';
            }
        };

        const handleFotoTktm = (event, jenis) => {
            const files = Array.from(event.target.files);
            const newUrls = files.map(file => URL.createObjectURL(file));

            if (jenis === 'barang') {
                modalTKTM.value.fotoBarangUrls = [...modalTKTM.value.fotoBarangUrls, ...newUrls];
                modalTKTM.value.fotoBarangFiles = [...modalTKTM.value.fotoBarangFiles, ...files];
            }
            if (jenis === 'label') {
                modalTKTM.value.fotoLabelUrls = [...modalTKTM.value.fotoLabelUrls, ...newUrls];
                modalTKTM.value.fotoLabelFiles = [...modalTKTM.value.fotoLabelFiles, ...files];
            }
            
            event.target.value = '';
        };

        const removeFotoTktm = (type, index) => {
            if (type === 'barang') {
                if (modalTKTM.value.fotoBarangUrls) {
                    modalTKTM.value.fotoBarangUrls.splice(index, 1);
                }
                if (modalTKTM.value.fotoBarangFiles) {
                    modalTKTM.value.fotoBarangFiles.splice(index, 1);
                }
            } else if (type === 'label') {
                if (modalTKTM.value.fotoLabelUrls) {
                    modalTKTM.value.fotoLabelUrls.splice(index, 1);
                }
                if (modalTKTM.value.fotoLabelFiles) {
                    modalTKTM.value.fotoLabelFiles.splice(index, 1);
                }
            }
        };

        const submitTKTM = async () => {
            const m = modalTKTM.value;
            const asset = m.asetList.find(a => Number(a.id) === Number(m.selectedAsetId));
            if (!asset) { showToast('Pilih aset terlebih dahulu!', true); return; }

            const combinedKeterangan = `Transfer keluar - ${m.tujuan.trim()}`;
            const adminGudang = stafGudangList.value[0] || { nama: 'Admin BMN', nip: '-', jabatan: 'Staf' };
            const oldPegawai = getPegawaiInfo(m.pegawaiId);
            const tgl = m.tanggal; 

            try {
                const metadataNames = JSON.stringify({
                    pemeriksaTekmira1: m.pemeriksaTekmira1 ? getPegawaiName(m.pemeriksaTekmira1) : '',
                    pemeriksaTekmira2: m.pemeriksaTekmira2 ? getPegawaiName(m.pemeriksaTekmira2) : '',
                    pemeriksaTujuan1: m.pemeriksaTujuan1 || '', 
                    pemeriksaTujuan2: m.pemeriksaTujuan2 || '',
                    petinggiTujuan: m.petinggiTujuan || '', 
                    petinggiTekmira: m.petinggiTekmira || ''
                });

                const payload = {
                    id: asset.id, jenis: asset.jenis, kode_barang: asset.kodeBarang,
                    nup_baru: asset.nup_baru || asset.nup || '', merek: asset.merek,
                    tipe: asset.tipe, nama_barang: asset.nama_barang || asset.namaBarang,
                    tahun: asset.tahun, kondisi: asset.kondisi,
                    keterangan: combinedKeterangan, pemegang_id: null ,
                    nilai_perolehan: m.nilaiPerolehan
                };
                await apiRequest('aset.php', { method: 'PUT', body: JSON.stringify(payload) });

                const resMutasi1 = await apiRequest('mutasi.php', { method: 'POST', body: JSON.stringify({ aset_id: asset.id, tanggal: tgl, pemegang_lama_id: m.pegawaiId, pemegang_baru_id: null, jenis_transaksi: 'LAINNYA', kondisi: asset.kondisi, nomor_bast: m.nomorPenelitian, keterangan: 'BA Penelitian Fisik - ' + m.tujuan.trim(), nilai_perolehan: m.nilaiPerolehan, lampiran_foto: metadataNames }) });
                const resMutasi2 = await apiRequest('mutasi.php', { method: 'POST', body: JSON.stringify({ aset_id: asset.id, tanggal: tgl, pemegang_lama_id: m.pegawaiId, pemegang_baru_id: null, jenis_transaksi: 'LAINNYA', kondisi: asset.kondisi, nomor_bast: m.nomorVerifikasi, keterangan: 'BA Verifikasi Aset - ' + m.tujuan.trim(), nilai_perolehan: m.nilaiPerolehan, lampiran_foto: metadataNames }) });
                
                const uploadPhotos = async (mutasiId) => {
                    if (m.fotoBarangFiles.length === 0 && m.fotoLabelFiles.length === 0) return;

                    const formData = new FormData();
                    formData.append('id', mutasiId);
                    m.fotoBarangFiles.forEach(file => formData.append('foto_barang[]', file));
                    m.fotoLabelFiles.forEach(file => formData.append('foto_label[]', file));

                    const response = await fetch(`${API_BASE}/upload_tktm.php`, { method: 'POST', body: formData });
                    const result = await response.json();
                    if (!response.ok || result.status !== 'success') {
                        throw new Error(result.message || 'Gagal mengunggah foto TKTM.');
                    }
                    return result;
                };

                if (resMutasi1.success && resMutasi1.data?.mutasi_id) await uploadPhotos(resMutasi1.data.mutasi_id);
                if (resMutasi2.success && resMutasi2.data?.mutasi_id) await uploadPhotos(resMutasi2.data.mutasi_id);

                await Promise.all([refreshAssets(), refreshHistory()]);
                m.show = false;
                showToast('Aset ditransfer, Surat & Foto berhasil disimpan.');

                printData.value = {
                    show: true, jenisTransaksi: 'LAINNYA', printMode: 'PENELITIAN',
                    tanggal: tgl, kategoriLabel: asset.jenis, kodeBarang: asset.kodeBarang, nup: asset.nup_baru || asset.nup,
                    merekTipe: `${asset.merek} ${asset.tipe}`.trim(), tahun: asset.tahun, kondisi: asset.kondisi,
                    nomorPenelitian: m.nomorPenelitian, nomorVerifikasi: m.nomorVerifikasi, nilaiPerolehan: m.nilaiPerolehan,
                    pemeriksaTekmira1: m.pemeriksaTekmira1 ? getPegawaiName(m.pemeriksaTekmira1) : '....................',
                    pemeriksaTekmira2: m.pemeriksaTekmira2 ? getPegawaiName(m.pemeriksaTekmira2) : '....................',
                    pemeriksaTujuan1: m.pemeriksaTujuan1 || '....................', 
                    pemeriksaTujuan2: m.pemeriksaTujuan2 || '....................',
                    petinggiTujuan: m.petinggiTujuan || '....................', petinggiTekmira: m.petinggiTekmira || '....................',
                    fotoBarangUrls: m.fotoBarangUrls, fotoLabelUrls: m.fotoLabelUrls,
                    pemegangLamaNama: oldPegawai?.nama || '-', pemegangLamaNip: oldPegawai?.nip || '-', pemegangLamaJabatan: oldPegawai?.jabatan || '-',
                    pemegangBaruNama: m.tujuan.trim(), pemegangBaruNip: '-', pemegangBaruJabatan: '-',
                    adminNama: adminGudang.nama, adminNip: adminGudang.nip, adminJabatan: adminGudang.jabatan
                };

                setTimeout(() => document.getElementById('print-section')?.scrollIntoView({ behavior: 'smooth' }), 200);
            } catch (error) { showToast(`Gagal memproses TKTM: ${error.message}`, true); }
        };


        // AMBIL ASET YANG DIPEGANG PEGAWAI
        const asetDipegang = computed(() => {
            if (!modalPegawai.value || !modalPegawai.value.isEdit) return [];
            
            const empId = modalPegawai.value.editId;
            let list = [];
            
            Object.values(db.value).forEach(kategoriAssets => {
                const asetAktif = kategoriAssets.filter(a => 
                    a.pemegangId === empId && 
                    (!a.keterangan || !String(a.keterangan).toLowerCase().includes('transfer keluar'))
                );
                list = list.concat(asetAktif);
            });
            
            return list;
        });

        // HELPER AMBIL NILAI PEROLEHAN (DENGAN FALLBACK KE RIWAYAT MUTASI/TKTM)
        const getNilaiPerolehan = (asset) => {
            if (!asset) return '-';
            
            // 1. Cek langsung dari data aset
            const valAset = asset.nilaiPerolehan || asset.nilai_perolehan;
            if (valAset && String(valAset).trim() !== '' && valAset !== '-') {
                return valAset;
            }
            
            // 2. Fallback: Ambil dari riwayat mutasi/TKTM jika data aset kosong
            const hist = historyList.value.find(h => Number(h.aset_id) === Number(asset.id) && h.nilai_perolehan && h.nilai_perolehan !== '-');
            if (hist && hist.nilai_perolehan) {
                return hist.nilai_perolehan;
            }
            
            return '-';
        };

        // MODAL SERAH TERIMA & SURAT
        const modalSerahTerima = ref({ show: false, asset: null });
        const formMutasi = ref({ pemegangBaruId: '', adminGudangId: '', tanggal: new Date().toISOString().slice(0, 10), kondisi: 'Baik', nomorBast: '', nomorSip: '' });
        const printData = ref({ show: false });

        const openSerahTerimaModal = (asset) => {
            modalSerahTerima.value = { show: true, asset };
            formMutasi.value = { pemegangBaruId: '', adminGudangId: '', tanggal: new Date().toISOString().slice(0, 10), kondisi: asset.kondisi || 'Baik', nomorBast: '' };

            generateNomorSurat();
        };

        const pegawaiSudahKeluar = (pegawaiId) => {
            const punyaAsetPernah = allAssets.value.some(asset => Number(asset.pemegangId) === Number(pegawaiId));
            if (!punyaAsetPernah) return false; 

            const masihAdaAsetAktif = allAssets.value.some(asset =>
                Number(asset.pemegangId) === Number(pegawaiId) &&
                (!asset.keterangan || !String(asset.keterangan).toLowerCase().includes('transfer keluar'))
            );
            return !masihAdaAsetAktif; 
        };

        const availablePegawaiForTransfer = computed(() => {
            if (!modalSerahTerima.value.asset) return [];
            const currentHolderId = modalSerahTerima.value.asset.pemegangId;
            const hasil = pegawaiList.value.filter(pegawai =>
                Number(pegawai.id) !== Number(currentHolderId) &&
                !pegawaiSudahKeluar(pegawai.id)
            );
            return hasil.sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id', { sensitivity: 'base' }));
        });

        const stafGudangList = computed(() => {
            return [...pegawaiList.value].sort((a, b) => String(a.nama).localeCompare(String(b.nama), 'id', { sensitivity: 'base' }));
        });

        // AUTO-GENERATE NOMOR SURAT
        const generateNomorSurat = () => {
            const asset = modalSerahTerima.value.asset;
            if (!asset) return;

            const oldHolder = asset.pemegangId;
            const newHolder = formMutasi.value.pemegangBaruId;

            const tgl = new Date(formMutasi.value.tanggal);
            const tahun = tgl.getFullYear();
            const bulan = String(tgl.getMonth() + 1).padStart(2, '0');

            let maxNomorSIP = 15;  
            let maxNomorBAST = 8;  

            historyList.value.forEach(h => {
                if (!h.tanggal || !h.nomorBast) return;
                const hTahun = new Date(h.tanggal).getFullYear();
                if (hTahun === tahun) {
                    const match = h.nomorBast.match(/^(\d+)/);
                    if (match) {
                        const num = parseInt(match[1], 10);
                        if (h.nomorBast.includes('/GDG/') && num > maxNomorSIP && num < 1000) maxNomorSIP = num;
                        if (h.nomorBast.includes('-GDG/') && num > maxNomorBAST && num < 1000) maxNomorBAST = num;
                    }
                }
            });

            const nextSIP = String(maxNomorSIP + 1).padStart(3, '0');
            const nextBAST = String(maxNomorBAST + 1).padStart(3, '0');

            const formatSIP = `${nextSIP}/${bulan}/GDG/${tahun}`;
            const formatBAST = `${nextBAST}-GDG/${bulan}/${tahun}`;

            if (oldHolder === null || oldHolder === '') {
                formMutasi.value.nomorSip = formatSIP;
                formMutasi.value.nomorBast = '';
            } else if (newHolder === 'GUDANG' || newHolder === null) {
                formMutasi.value.nomorBast = formatBAST;
                formMutasi.value.nomorSip = '';
            } else {
                formMutasi.value.nomorBast = formatBAST;
                formMutasi.value.nomorSip = formatSIP;
            }
        };

        const submitSerahTerima = async () => {
            const asset = modalSerahTerima.value.asset;
            if (!asset) return;

            const oldPegawai = asset.pemegangId !== null ? getPegawaiInfo(asset.pemegangId) : null;
            let newHolderId = null;
            let newPegawai = null;

            let adminGudang = formMutasi.value.adminGudangId ? getPegawaiInfo(formMutasi.value.adminGudangId) : null;
            if (!adminGudang) {
                showToast('Staf Gudang wajib dipilih!', true);
                return;
            }

            if (formMutasi.value.pemegangBaruId !== 'GUDANG') {
                newHolderId = Number(formMutasi.value.pemegangBaruId);
                newPegawai = getPegawaiInfo(newHolderId);
            }

            let jenisTransaksi;
            if (!oldPegawai && newPegawai) jenisTransaksi = 'PEMINJAMAN';
            else if (oldPegawai && !newPegawai) jenisTransaksi = 'PENGEMBALIAN';
            else if (oldPegawai && newPegawai) jenisTransaksi = 'MUTASI';
            else return;

            const adminMeta = JSON.stringify({
                adminNama: adminGudang.nama,
                adminNip: adminGudang.nip,
                adminJabatan: adminGudang.jabatan
            });

            try {
                if (jenisTransaksi === 'MUTASI') {
                    await apiRequest('mutasi.php', {
                        method: 'POST',
                        body: JSON.stringify({
                            aset_id: asset.id,
                            tanggal: formMutasi.value.tanggal,
                            pemegang_lama_id: oldPegawai.id,
                            pemegang_baru_id: null,
                            jenis_transaksi: 'PENGEMBALIAN',
                            kondisi: formMutasi.value.kondisi,
                            nomor_bast: formMutasi.value.nomorBast,
                            keterangan: 'Otomatis: Pengembalian sebelum dimutasi',
                            lampiran_foto: adminMeta
                        })
                    });

                    await apiRequest('mutasi.php', {
                        method: 'POST',
                        body: JSON.stringify({
                            aset_id: asset.id,
                            tanggal: formMutasi.value.tanggal,
                            pemegang_lama_id: null,
                            pemegang_baru_id: newHolderId,
                            jenis_transaksi: 'PEMINJAMAN',
                            kondisi: formMutasi.value.kondisi,
                            nomor_bast: formMutasi.value.nomorSip,
                            keterangan: 'Otomatis: Peminjaman hasil mutasi',
                            lampiran_foto: adminMeta
                        })
                    });
                } else {
                    await apiRequest('mutasi.php', {
                        method: 'POST',
                        body: JSON.stringify({
                            aset_id: asset.id,
                            tanggal: formMutasi.value.tanggal,
                            pemegang_lama_id: oldPegawai ? oldPegawai.id : null,
                            pemegang_baru_id: newHolderId,
                            jenis_transaksi: jenisTransaksi,
                            kondisi: formMutasi.value.kondisi,
                            nomor_bast: jenisTransaksi === 'PENGEMBALIAN' ? formMutasi.value.nomorBast : formMutasi.value.nomorSip,
                            keterangan: '',
                            lampiran_foto: adminMeta
                        })
                    });
                }

                await Promise.all([refreshAssets(), refreshHistory()]);
                modalSerahTerima.value.show = false;
                showToast('Transaksi berhasil diproses & otomatis membuka dokumen cetak.');

                let updatedAsset = null;
                Object.values(db.value).forEach(list => {
                    const found = list.find(item => Number(item.id) === Number(asset.id));
                    if (found) updatedAsset = found;
                });
                if (!updatedAsset) updatedAsset = { ...asset, pemegangId: newHolderId, kondisi: formMutasi.value.kondisi };

                printData.value = {
                    show: true,
                    jenisTransaksi: jenisTransaksi,
                    printMode: jenisTransaksi === 'PEMINJAMAN' ? 'SIP' : 'BAST', 
                    tanggal: formMutasi.value.tanggal,
                    kategoriLabel: updatedAsset.jenis,
                    kodeBarang: updatedAsset.kodeBarang,
                    nup: updatedAsset.nup,
                    merekTipe: `${updatedAsset.merek || ''} ${updatedAsset.tipe || ''}`.trim(),
                    tahun: updatedAsset.tahun,
                    kondisi: formMutasi.value.kondisi,
                    nomorBast: formMutasi.value.nomorBast,
                    nomorSip: formMutasi.value.nomorSip,
                    pemegangLamaNama: oldPegawai?.nama || 'Gudang BMN TekMira',
                    pemegangLamaNip: oldPegawai?.nip || '-',
                    pemegangLamaJabatan: oldPegawai?.jabatan || '-',
                    pemegangBaruNama: newPegawai?.nama || 'Gudang BMN TekMira',
                    pemegangBaruNip: newPegawai?.nip || '-',
                    pemegangBaruJabatan: newPegawai?.jabatan || '-',
                    adminNama: adminGudang.nama,
                    adminNip: adminGudang.nip,
                    adminJabatan: adminGudang.jabatan
                };
                setTimeout(() => {
                    const printArea = document.getElementById('print-section');
                    if (printArea) {
                        printArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }, 200);

            } catch (error) {
                showToast(`Transaksi gagal: ${error.message}`, true);
            }
        };

        const cetakUlangBast = (record) => {
            let nBast = '';
            let nSip = '';
            let nPenelitian = '';
            let nVerifikasi = '';
            let targetPrintMode = 'BAST';
            let jenisTrans = record.jenisTransaksi || '';
            let tujuanTktm = '-';

            if (record.keterangan && record.keterangan.toLowerCase().includes('penelitian fisik')) {
                jenisTrans = 'LAINNYA';
                nPenelitian = String(record.nomorBast || '').trim();

                if (!nPenelitian) {
                    const tahunSurat = record.tanggal
                        ? new Date(record.tanggal).getFullYear()
                        : new Date().getFullYear();

                    nPenelitian = `77.BA/BN.10/DBR/${tahunSurat}`;
                }

                targetPrintMode = 'PENELITIAN';
                tujuanTktm = record.keterangan.split(' - ')[1] || '-';
            } else if (record.keterangan && record.keterangan.includes('Verifikasi Aset')) {
                jenisTrans = 'LAINNYA';

                nVerifikasi = record.nomorBast && String(record.nomorBast).trim() !== ''
                    ? record.nomorBast
                    : `78.BA/BN.10/DBR/${new Date(record.tanggal).getFullYear()}`;

                targetPrintMode = 'VERIFIKASI';
                tujuanTktm = record.keterangan.split(' - ')[1] || '-';
            } else if (jenisTrans === 'PEMINJAMAN' || (record.nomorBast && String(record.nomorBast).includes('/GDG/'))) {
                jenisTrans = 'PEMINJAMAN';
                nSip = record.nomorBast;
                targetPrintMode = 'SIP';
            } else {
                jenisTrans = 'PENGEMBALIAN'; 
                nBast = record.nomorBast;
                targetPrintMode = 'BAST';
            }

            const cariPegawaiBerdasarkanNama = (namaCari) => {
                if (!namaCari || namaCari.includes('Gudang') || namaCari === '-') return null;
                return pegawaiList.value.find(p => p.nama.toLowerCase() === namaCari.toLowerCase()) || null;
            };

            const pegawaiLamaObj = cariPegawaiBerdasarkanNama(record.pemegangLama);
            const pegawaiBaruObj = cariPegawaiBerdasarkanNama(record.pemegangBaru);

            let namaAdminGudang = '[Ketik Nama Admin]';
            let nipAdminGudang = '-';
            let jabatanAdminGudang = 'Staf Pengelola BMN';

            let fotoBarang = [];
            let fotoLabel = [];
            let meta = {
                pemeriksaTekmira1: '....................', pemeriksaTekmira2: '....................', 
                pemeriksaTujuan1: '....................', pemeriksaTujuan2: '....................',
                petinggiTujuan: '....................', petinggiTekmira: '....................'
            };

            if (record.lampiran_foto) {
                try {
                    const parsed = JSON.parse(record.lampiran_foto);
                    if (parsed.barang) fotoBarang = parsed.barang; 
                    if (parsed.label) fotoLabel = parsed.label;

                    if (parsed.pemeriksaTekmira1) meta.pemeriksaTekmira1 = parsed.pemeriksaTekmira1;
                    if (parsed.pemeriksaTekmira2) meta.pemeriksaTekmira2 = parsed.pemeriksaTekmira2;
                    if (parsed.pemeriksaTujuan1) meta.pemeriksaTujuan1 = parsed.pemeriksaTujuan1;
                    if (parsed.pemeriksaTujuan2) meta.pemeriksaTujuan2 = parsed.pemeriksaTujuan2;
                    if (parsed.petinggiTujuan) meta.petinggiTujuan = parsed.petinggiTujuan;
                    if (parsed.petinggiTekmira) meta.petinggiTekmira = parsed.petinggiTekmira;

                    if (parsed.adminNama) namaAdminGudang = parsed.adminNama;
                    if (parsed.adminNip) nipAdminGudang = parsed.adminNip;
                    if (parsed.adminJabatan) jabatanAdminGudang = parsed.adminJabatan;
                } catch (e) { console.error('Gagal parse foto/meta', e); }
            }

            let namaPihakPertama = record.pemegangLama;
            let nipPihakPertama = pegawaiLamaObj?.nip || '-';
            let jabatanPihakPertama = pegawaiLamaObj?.jabatan || (record.pemegangLama.includes('Gudang') ? jabatanAdminGudang : '-');

            let namaPihakKedua = record.pemegangBaru;
            let nipPihakKedua = pegawaiBaruObj?.nip || '-';
            let jabatanPihakKedua = pegawaiBaruObj?.jabatan || (record.pemegangBaru.includes('Gudang') ? jabatanAdminGudang : '-');

            if (jenisTrans === 'LAINNYA') {
                namaPihakKedua = tujuanTktm;
                nipPihakKedua = '-';
                jabatanPihakKedua = '-';
            } else {
                if (record.pemegangBaru.includes('Gudang') || record.pemegangBaru === '-') {
                    namaPihakKedua = namaAdminGudang;
                    nipPihakKedua = nipAdminGudang;
                    jabatanPihakKedua = jabatanAdminGudang;
                }
            }

            if (record.pemegangLama.includes('Gudang') || record.pemegangLama === '-') {
                namaPihakPertama = namaAdminGudang;
                nipPihakPertama = nipAdminGudang;
                jabatanPihakPertama = jabatanAdminGudang;
            }

            printData.value = { 
                show: true, 
                ...record,
                nomorBast: nBast,
                nomorSip: nSip,
                nomorPenelitian: nPenelitian,
                nomorVerifikasi: nVerifikasi,
                jenisTransaksi: jenisTrans,
                printMode: targetPrintMode,

                nilaiPerolehan: record.nilai_perolehan || '-',
                fotoBarangUrls: fotoBarang,
                fotoLabelUrls: fotoLabel,

                ...meta,

                pemegangLamaNama: namaPihakPertama,
                pemegangLamaNip: nipPihakPertama,
                pemegangLamaJabatan: jabatanPihakPertama,

                pemegangBaruNama: namaPihakKedua,
                pemegangBaruNip: nipPihakKedua,
                pemegangBaruJabatan: jabatanPihakKedua,

                adminNama: namaAdminGudang,
                adminNip: nipAdminGudang,
                adminJabatan: jabatanAdminGudang
            };

            setTimeout(() => {
                const printArea = document.getElementById('print-section');
                if (printArea) printArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        };

        const formatTanggalIndo = (tanggal) => {
            if (!tanggal) return '-';
            const date = new Date(`${tanggal}T00:00:00`);
            return date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        };

        const terbilang = (angka) => {
            const huruf = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
            if (angka < 12) return huruf[angka];
            if (angka < 20) return terbilang(angka - 10) + " belas";
            if (angka < 100) return terbilang(Math.floor(angka / 10)) + " puluh " + terbilang(angka % 10);
            if (angka < 200) return "seratus " + terbilang(angka - 100);
            if (angka < 1000) return terbilang(Math.floor(angka / 100)) + " ratus " + terbilang(angka % 100);
            if (angka < 2000) return "seribu " + terbilang(angka - 1000);
            if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + " ribu " + terbilang(angka % 1000);
            return "";
        };

        const formatTanggalTerbilang = (tanggalStr) => {
            if (!tanggalStr) return '';
            const parts = tanggalStr.split('-');
            if(parts.length !== 3) return tanggalStr;
            const dateObj = new Date(`${tanggalStr}T00:00:00`);
            
            const hariArr = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
            const bulanArr = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            
            const hari = hariArr[dateObj.getDay()];
            const tgl = parseInt(parts[2], 10);
            const bln = parseInt(parts[1], 10);
            const thn = parseInt(parts[0], 10);
            
            const tglTeks = terbilang(tgl).trim();
            const thnTeks = terbilang(thn).trim();
            const blnNama = bulanArr[bln - 1];
            
            return `${hari} tanggal ${tglTeks} bulan ${blnNama} tahun ${thnTeks}`;
        };

        const formatTanggalAngka = (tanggalStr) => {
            if (!tanggalStr) return '';
            const parts = tanggalStr.split('-');
            if(parts.length !== 3) return tanggalStr;
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        };

        const tutupPrint = () => { printData.value.show = false; };
        const jalankanPrint = () => { window.print(); };

        // MODAL PENGATURAN DOKUMEN
        const modalPengaturan = ref({ show: false });
        const savedPengaturan = JSON.parse(localStorage.getItem('bmn_pengaturan_dokumen') || 'null');
        
        const formPengaturan = ref({
            namaKepala: savedPengaturan?.namaKepala || 'Nur Syarief Boni Mulyanto, S.T',
            nipKepala: savedPengaturan?.nipKepala || '',
            jabatanKepala: savedPengaturan?.jabatanKepala || 'Kepala Subbagian Perlengkapan,\nRumah Tangga dan Pengadaan',
            kodeSip: savedPengaturan?.kodeSip || 'F. DBR.U.1.02.02',
            kodeBast: savedPengaturan?.kodeBast || 'F. DBR.U.1.02.01'
        });

        const openPengaturanModal = () => { modalPengaturan.value.show = true; };
        const savePengaturan = () => {
            localStorage.setItem('bmn_pengaturan_dokumen', JSON.stringify(formPengaturan.value));
            modalPengaturan.value.show = false;
            showToast('Pengaturan dokumen berhasil disimpan di browser.');
        };

        // MODAL PROFIL & LOGOUT
        const savedUsername = localStorage.getItem('bmn_username') || 'Admin BMN';
        currentUsername.value = savedUsername;

        const modalProfil = ref({ show: false });
        const formProfil = ref({
            username: '',
            oldPass: '',
            newPass: '',
            confirmPass: ''
        });

        const saveProfil = async () => {
            const usernameBaru = formProfil.value.username.trim();
            const passwordBaru = formProfil.value.newPass;
            const konfirmasi = formProfil.value.confirmPass;

            if (!usernameBaru) {
                showToast('Username tidak boleh kosong!', true);
                return;
            }

            if (passwordBaru || konfirmasi) {
                if (passwordBaru !== konfirmasi) {
                    showToast('Konfirmasi password tidak cocok!', true);
                    return;
                }
            }

            try {
                const result = await apiRequest('update_admin.php', {
                    method: 'POST',
                    body: JSON.stringify({
                        username_lama: currentUsername.value,
                        username_baru: usernameBaru,
                        password_baru: passwordBaru
                    })
                });

                if (result.success) {
                    currentUsername.value = usernameBaru;
                    localStorage.setItem(
                        'bmn_username',
                        usernameBaru
                    );

                    modalProfil.value.show = false;

                    formProfil.value = {
                        username: usernameBaru,
                        oldPass: '',
                        newPass: '',
                        confirmPass: ''
                    };

                    showToast('Profil berhasil diperbarui!');
                } else {
                    showToast(
                        result.message || 'Gagal memperbarui profil!',
                        true
                    );
                }
            } catch (error) {
                console.error('Update profil gagal:', error);
                showToast(
                    error.message || 'Gagal menyimpan perubahan!',
                    true
                );
            }
        };

        const openProfilModal = () => {
            formProfil.value = {
                username: currentUsername.value,
                oldPass: '',
                newPass: '',
                confirmPass: ''
            };
            modalProfil.value.show = true;
        };

        const modalLogout = ref({ show: false });
        const openLogoutModal = () => {
            modalLogout.value.show = true;
        };

        const confirmLogout = () => {
            modalLogout.value.show = false;
            isLoggedIn.value = false;

            sessionStorage.removeItem('bmn_logged_in');

            loginUsername.value = '';
            loginPassword.value = '';
            loginError.value = '';

            showToast('Logout berhasil.');
        };

        // MODAL RESET DATA
        const modalReset = ref({ show: false, konfirmasi: '' });
        
        const openResetModal = () => {
            modalReset.value = { show: true, konfirmasi: '' };
        };

        const prosesResetData = async () => {
            if (modalReset.value.konfirmasi !== 'HAPUS SEMUA') {
                showToast('Teks konfirmasi tidak sesuai! Ketik HAPUS SEMUA', true);
                return;
            }

            try {
                const res = await apiRequest('reset.php', { method: 'POST', body: JSON.stringify({ confirm: true }) });
                if (res.success) {
                    showToast('BOOM! Semua data berhasil dikosongkan.');
                    modalReset.value.show = false;
                    await loadDataFromBackend();
                } else {
                    showToast(res.message || 'Gagal reset data!', true);
                }
            } catch (error) {
                showToast(`Gagal mereset: ${error.message}`, true);
            }
        };

        // EXPORT EXCEL PEGAWAI
        const exportPegawaiExcel = (pegawai) => {
            if (!pegawai) {
                showToast('Data pegawai tidak ditemukan!', true);
                return;
            }

            const asetPegawai = getPegawaiAllAssets(pegawai.id);

            if (!asetPegawai || asetPegawai.length === 0) {
                showToast(`${pegawai.nama} tidak memiliki aset untuk di-export!`, true);
                return;
            }

            const wb = XLSX.utils.book_new();

            const headerRow = [
                'NO', 'USER', 'KODE BARANG', 'NUP BARU', 'MERK & TIPE', 'TAHUN', 'NILAI PEROLEHAN', 'TANGGAL BAST', 'KONDISI', 'KETERANGAN'
            ];

            const dataRows = asetPegawai.map((asset, index) => {
                return [
                    index + 1,
                    pegawai.nama || '-',
                    asset.kodeBarang ? String(asset.kodeBarang) : '-',
                    asset.nup ? String(asset.nup) : '-',
                    `${asset.merek || ''} ${asset.tipe || ''}`.trim() || '-',
                    asset.tahun || '-',
                    getNilaiPerolehan(asset), // <-- GANTI BARIS INI (sebelumnya: asset.nilaiPerolehan || asset.nilai_perolehan || '-')
                    getLastMutationDate(asset),
                    asset.kondisi || '-',
                    asset.keterangan || '-'
                ];
            });
            const judulPegawai = `ASET PEGAWAI - ${pegawai.nama || ''}`.toUpperCase();

            const aoa = [
                [judulPegawai],
                ['BALAI BESAR PENGUJIAN MINERAL DAN BATUBARA TEKMIRA'],
                [],
                headerRow,
                ...dataRows
            ];

            const ws = XLSX.utils.aoa_to_sheet(aoa);

            const colCount = headerRow.length;
            const headerRowIndex = 3;
            const lastDataRowIndex = headerRowIndex + dataRows.length;

            ws['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } }
            ];

            ws['!cols'] = [
                { wch: 6 }, { wch: 26 }, { wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 24 }, { wch: 14 }, { wch: 35 }
            ];

            const rowHeights = [];
            rowHeights[0] = { hpt: 24 };
            rowHeights[1] = { hpt: 20 };
            rowHeights[2] = { hpt: 10 };
            rowHeights[headerRowIndex] = { hpt: 26 };

            for (let r = headerRowIndex + 1; r <= lastDataRowIndex; r++) {
                rowHeights[r] = { hpt: 22 };
            }

            ws['!rows'] = rowHeights;

            const borderSubtle = {
                top: { style: 'thin', color: { rgb: 'CBD5E1' } },
                bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
                left: { style: 'thin', color: { rgb: 'CBD5E1' } },
                right: { style: 'thin', color: { rgb: 'CBD5E1' } }
            };

            const setCellStyle = (r, c, style) => {
                const addr = XLSX.utils.encode_cell({ r, c });
                if (!ws[addr]) ws[addr] = { t: 's', v: '' };
                ws[addr].s = { ...(ws[addr].s || {}), ...style };
            };

            setCellStyle(0, 0, { font: { bold: true, sz: 14, color: { rgb: '1E293B' }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } });
            setCellStyle(1, 0, { font: { bold: true, sz: 11, color: { rgb: '475569' }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } });

            for (let c = 0; c < colCount; c++) {
                setCellStyle(headerRowIndex, c, {
                    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
                    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                    fill: { fgColor: { rgb: '1E293B' } },
                    border: borderSubtle
                });
            }

            for (let r = headerRowIndex + 1; r <= lastDataRowIndex; r++) {
                const isEven = (r - headerRowIndex) % 2 === 0;
                const bgRowColor = isEven ? 'F8FAFC' : 'FFFFFF';

                for (let c = 0; c < colCount; c++) {
                    let alignHoriz = 'center';
                    if (c === 1 || c === 4 || c === 9) alignHoriz = 'left';

                    setCellStyle(r, c, {
                        font: { sz: 10, name: 'Calibri', color: { rgb: '334155' } },
                        alignment: { horizontal: alignHoriz, vertical: 'center', wrapText: true },
                        fill: { fgColor: { rgb: bgRowColor } },
                        border: borderSubtle
                    });
                }
            }

            ws['!autofilter'] = {
                ref: XLSX.utils.encode_range({ r: headerRowIndex, c: 0 }, { r: headerRowIndex, c: colCount - 1 })
            };

            XLSX.utils.book_append_sheet(wb, ws, 'Aset Pegawai');

            const namaBersih = (pegawai.nama || 'Pegawai').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
            const namaFile = `Laporan_Aset_${namaBersih}_${new Date().toISOString().slice(0, 10)}.xlsx`;

            XLSX.writeFile(wb, namaFile);
            showToast(`Laporan aset ${pegawai.nama} berhasil di-export!`);
        };

        // EXPORT EXCEL SEMUA ASET
        const exportExcel = () => {
            const allAssets = [...activeAssets.value].sort((a, b) => Number(b.id) - Number(a.id));

            if (!allAssets.length) {
                showToast('Tidak ada data untuk di-export!', true);
                return;
            }

            const dataTransferKeluar = allAssets.filter(a => (a.keterangan || '').toLowerCase().startsWith('transfer keluar'));
            const activeOnly = allAssets.filter(a => !(a.keterangan || '').toLowerCase().startsWith('transfer keluar'));

            const dataGudang = activeOnly.filter(a => a.pemegangId === null);
            const dataDipakai = activeOnly.filter(a => a.pemegangId !== null);
            const dataTransferMasuk = activeOnly.filter(a => (a.keterangan || '').toLowerCase().startsWith('transfer masuk'));
            const dataSewa = activeOnly.filter(a => (a.keterangan || '').toLowerCase().startsWith('sewa'));

            const sheetCategories = [
                { title: 'Semua Aset', data: allAssets },     
                { title: 'Di Gudang', data: dataGudang },
                { title: 'Dipakai', data: dataDipakai },
                { title: 'Transfer Masuk', data: dataTransferMasuk },
                { title: 'Sewa', data: dataSewa },
                { title: 'Transfer Keluar', data: dataTransferKeluar }
            ];
            
            const wb = XLSX.utils.book_new();
            const judulKategori = categoryLabel.value.toUpperCase();

            const createStyledSheet = (sheetTitle, assetList) => {
                const headerRow = [
                    'NO', 'USER', 'KODE BARANG', 'NUP BARU', 'MERK & TIPE', 'TAHUN', 'NILAI PEROLEHAN', 'TANGGAL BAST', 'KONDISI', 'KETERANGAN'
                ];

              const dataRows = assetList.map((asset, index) => {
                    let namaUser = 'Gudang BMN TekMira'; 
                    
                    if (asset.pemegangId) {
                        namaUser = getPegawaiName(asset.pemegangId);
                    } else if ((asset.keterangan || '').toLowerCase().includes('transfer keluar')) {
                        const hist = historyList.value.find(h => h.aset_id === asset.id);
                        if (hist && hist.pemegangLamaNama && hist.pemegangLamaNama !== 'Gudang BMN TekMira') {
                            namaUser = hist.pemegangLamaNama;
                        } else {
                            namaUser = asset.pemegangNama || '-';
                        }
                    }

                    return [
                        index + 1,
                        namaUser,
                        asset.kodeBarang ? String(asset.kodeBarang) : '-',
                        asset.nup ? String(asset.nup) : '-',
                        `${asset.merek || ''} ${asset.tipe || ''}`.trim() || '-',
                        asset.tahun || '-',
                        getNilaiPerolehan(asset), // <-- GANTI BARIS INI (sebelumnya: asset.nilaiPerolehan || asset.nilai_perolehan || '-')
                        getLastMutationDate(asset),
                        asset.kondisi || '-',
                        asset.keterangan || '-'
                    ];
                });

                const aoa = [
                    [`DAFTAR ASET ${judulKategori} - ${sheetTitle.toUpperCase()}`],
                    ['BALAI BESAR PENGUJIAN MINERAL DAN BATUBARA TEKMIRA'],
                    [],
                    headerRow,
                    ...dataRows
                ];

                const ws = XLSX.utils.aoa_to_sheet(aoa);

                const colCount = headerRow.length;
                const headerRowIndex = 3;
                const lastDataRowIndex = headerRowIndex + dataRows.length;

                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
                    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } }
                ];

                ws['!cols'] = [
                    { wch: 6 }, { wch: 26 }, { wch: 18 }, { wch: 12 }, { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 24 }, { wch: 14 }, { wch: 35 }
                ];

                const rowHeights = [];
                rowHeights[0] = { hpt: 24 };
                rowHeights[1] = { hpt: 20 };
                rowHeights[2] = { hpt: 10 };
                rowHeights[headerRowIndex] = { hpt: 26 };

                for (let r = headerRowIndex + 1; r <= lastDataRowIndex; r++) {
                    rowHeights[r] = { hpt: 22 };
                }
                ws['!rows'] = rowHeights;

                const borderSubtle = {
                    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
                    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
                    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
                    right: { style: 'thin', color: { rgb: 'CBD5E1' } }
                };

                const setCellStyle = (r, c, style) => {
                    const addr = XLSX.utils.encode_cell({ r, c });
                    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
                    ws[addr].s = { ...(ws[addr].s || {}), ...style };
                };

                setCellStyle(0, 0, { font: { bold: true, sz: 14, color: { rgb: '1E293B' }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } });
                setCellStyle(1, 0, { font: { bold: true, sz: 11, color: { rgb: '475569' }, name: 'Calibri' }, alignment: { horizontal: 'center', vertical: 'center' } });

                for (let c = 0; c < colCount; c++) {
                    setCellStyle(headerRowIndex, c, {
                        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
                        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                        fill: { fgColor: { rgb: '1E293B' } },
                        border: borderSubtle
                    });
                }

                for (let r = headerRowIndex + 1; r <= lastDataRowIndex; r++) {
                    const isEven = (r - headerRowIndex) % 2 === 0;
                    const bgRowColor = isEven ? 'F8FAFC' : 'FFFFFF';

                    for (let c = 0; c < colCount; c++) {
                        let alignHoriz = 'center';
                        if (c === 1 || c === 4 || c === 9) alignHoriz = 'left';

                        setCellStyle(r, c, {
                            font: { sz: 10, name: 'Calibri', color: { rgb: '334155' } },
                            alignment: { horizontal: alignHoriz, vertical: 'center', wrapText: true },
                            fill: { fgColor: { rgb: bgRowColor } },
                            border: borderSubtle
                        });
                    }
                }

                ws['!autofilter'] = {
                    ref: XLSX.utils.encode_range({ r: headerRowIndex, c: 0 }, { r: headerRowIndex, c: colCount - 1 })
                };

                return ws;
            };

            sheetCategories.forEach(cat => {
                const ws = createStyledSheet(cat.title, cat.data);
                XLSX.utils.book_append_sheet(wb, ws, cat.title.substring(0, 31));
            });

            const namaFile = `Laporan_Aset_${judulKategori.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, namaFile);

            showToast('Export Excel multi-tab berhasil!');
        };

        // MODAL KONFIRMASI HAPUS
        const modalHapus = ref({
            show: false,
            id: null,
            jenis: '', 
            pesan: ''
        });

        const openModalHapus = (jenis, id = null, pesan) => {
            modalHapus.value = { show: true, id, jenis, pesan };
        };

        const prosesHapusData = async () => {
            const { jenis, id } = modalHapus.value;
            modalHapus.value.show = false; 

            try {
                if (jenis === 'pegawai') {
                    await apiRequest('pegawai.php', { method: 'DELETE', body: JSON.stringify({ id }) });
                    await refreshPegawai();
                    showToast('Data pegawai berhasil dihapus.');
                } 
                else if (jenis === 'pegawai_dengan_aset') {
                    const held = getPegawaiAllAssets(id);
                    
                    for (const asset of held) {
                        const payload = {
                            id: asset.id,
                            jenis: asset.jenis,
                            kode_barang: asset.kodeBarang,
                            nup_baru: asset.nup_baru || asset.nup || '',
                            merek: asset.merek,
                            tipe: asset.tipe,
                            nama_barang: asset.nama_barang || asset.namaBarang,
                            tahun: asset.tahun,
                            kondisi: asset.kondisi,
                            keterangan: asset.keterangan,
                            pemegang_id: null
                        };
                        await apiRequest('aset.php', { method: 'PUT', body: JSON.stringify(payload) });
                    }
                    
                    await apiRequest('pegawai.php', { method: 'DELETE', body: JSON.stringify({ id }) });
                    
                    await refreshAssets();
                    await refreshPegawai();
                    showToast(`Pegawai dihapus & ${held.length} aset berhasil dikembalikan ke gudang.`); 
                } else if (jenis === 'banyak_pegawai') {
                    for (const pegId of selectedPegawai.value) {
                        const held = getPegawaiAllAssets(pegId);
                        for (const asset of held) {
                            const payload = {
                                id: asset.id,
                                jenis: asset.jenis,
                                kode_barang: asset.kodeBarang,
                                nup_baru: asset.nup_baru || asset.nup || '',
                                merek: asset.merek,
                                tipe: asset.tipe,
                                nama_barang: asset.nama_barang || asset.namaBarang,
                                tahun: asset.tahun,
                                kondisi: asset.kondisi,
                                keterangan: asset.keterangan,
                                pemegang_id: null 
                            };
                            await apiRequest('aset.php', { method: 'PUT', body: JSON.stringify(payload) });
                        }
                        
                        await apiRequest('pegawai.php', { method: 'DELETE', body: JSON.stringify({ id: pegId }) });
                    }
                    
                    selectedPegawai.value = [];
                    await refreshAssets(); 
                    await refreshPegawai();
                    showToast('Pegawai terpilih berhasil dihapus & aset diamankan ke gudang.');
                } else if (jenis === 'aset') {
                    await apiRequest('aset.php', { method: 'DELETE', body: JSON.stringify({ id }) });
                    await refreshAssets();
                    showToast('Aset berhasil dihapus.');
                } else if (jenis === 'banyak_aset') {
                    for (const asetId of selectedAssets.value) {
                        await apiRequest('aset.php', { method: 'DELETE', body: JSON.stringify({ id: asetId }) });
                    }
                    selectedAssets.value = [];
                    await refreshAssets();
                    showToast('Aset terpilih berhasil dihapus.');
                } else if (jenis === 'banyak_history') {
                    for (const histId of selectedHistory.value) {
                        await apiRequest('mutasi.php', { method: 'DELETE', body: JSON.stringify({ id: histId }) });
                    }
                    selectedHistory.value = [];
                    await refreshHistory();
                    showToast('Riwayat surat terpilih berhasil dihapus.');
                }
            } catch (error) {
                showToast(`Gagal menghapus data: ${error.message}`, true);
            }
        };

        const deleteAsset = (id) => {
            openModalHapus('aset', id, 'Yakin ingin menghapus data aset ini? Tindakan ini tidak bisa dibatalkan.');
        };

        const deletePegawai = (id) => {
            const held = getPegawaiAllAssets(id);
            if (held.length > 0) {
                openModalHapus('pegawai_dengan_aset', id, `Pegawai ini masih memegang ${held.length} aset. Yakin ingin menghapus pegawai dan mengembalikan asetnya ke gudang BMN?`);
                return;
            }
            openModalHapus('pegawai', id, 'Yakin ingin menghapus data pegawai ini?');
        };

        const hapusBanyakAset = () => {
            if (selectedAssets.value.length === 0) return;
            openModalHapus('banyak_aset', null, `Yakin ingin menghapus ${selectedAssets.value.length} aset terpilih?`);
        };

        const hapusBanyakPegawai = () => {
            if (selectedPegawai.value.length === 0) return;
            
            let totalAsetDipegang = 0;
            for (const pegId of selectedPegawai.value) {
                totalAsetDipegang += getPegawaiAllAssets(pegId).length;
            }

            if (totalAsetDipegang > 0) {
                openModalHapus('banyak_pegawai', null, `Dari ${selectedPegawai.value.length} pegawai terpilih, ada yang masih memegang total ${totalAsetDipegang} aset. Yakin ingin menghapus mereka dan mengembalikan semua asetnya ke gudang?`);
            } else {
                openModalHapus('banyak_pegawai', null, `Yakin ingin menghapus ${selectedPegawai.value.length} pegawai terpilih?`);
            }
        };
        
        const hapusBanyakHistory = () => {
            if (selectedHistory.value.length === 0) return;
            openModalHapus('banyak_history', null, `Yakin ingin menghapus ${selectedHistory.value.length} riwayat surat terpilih?`);
        };

        // LIFECYCLE
        onMounted(async () => {
            await refreshBuktiList();
            checkLogin();

            if (isLoggedIn.value) {
                await loadDataFromBackend();
            }
        });

        return {
            isLoggedIn, loginUsername, loginPassword, loginError, currentUsername, handleLogin,
            modalForgotPassword, forgotUsername, forgotNewPassword, forgotConfirmPassword, forgotPin, openForgotPassword, resetPassword, forgotError, closeForgotPassword,
            
            currentCategory, currentTab, changeTab, showDropdown, searchQuery, filterStatus, filterKondisi, toast,
            categoryLabel, categoryIcon, db, activeAssets, visibleAssets, allAssets, pegawaiList, historyList, assignedCount, availableCount, damagedCount,
            getPegawaiName, getPegawaiNip, getPegawaiInitials, getPegawaiAllAssets, getConditionBadgeClass, getConditionIconClass,
            filteredAssets, filteredPegawai, filterKeterangan,
            
            isSelectMode, toggleSelectMode, selectedAssets, selectedPegawai, selectAllAssets, selectAllPegawai, 
            hapusBanyakAset, hapusBanyakPegawai, 
            
            modalAset, formAset, openAsetModal, saveAset, deleteAsset, ubahKodeOtomatis,
            modalPegawai, formPegawai, openPegawaiModal, savePegawai, deletePegawai,
            modalHapus, openModalHapus, prosesHapusData, sortHistoryOrder, toggleHistorySort,
            
            modalSerahTerima, formMutasi, openSerahTerimaModal, availablePegawaiForTransfer, stafGudangList, submitSerahTerima,
            printData, formatTanggalIndo, formatTanggalTerbilang, formatTanggalAngka, cetakUlangBast, tutupPrint, jalankanPrint,
            
            modalPengaturan, formPengaturan, openPengaturanModal, savePengaturan,
            modalProfil, formProfil, openProfilModal, saveProfil, 
            modalLogout, openLogoutModal, confirmLogout, itemsPerPage, 
            modalReset, openResetModal, prosesResetData,getNilaiPerolehan,

            exportExcel, exportPegawaiExcel, getLastMutationDate, asetDipegang, sortAssetOrder, toggleAssetSort,
            modalTKTM, openModalTKTM, handleSelectAsetTKTM, submitTKTM, handleFotoTktm, filterJenisTransaksi, removeFotoTktm, refreshHistory, refreshBuktiList,

            filterSurat, filterKondisiRiwayat, filteredHistory, fileInputBukti, filterJenisAset, filterStatusPegawai, triggerUpload, 
            handleFileUpload, openPdf, hasBukti, selectedHistory, selectAllHistory, hapusBanyakHistory, prosesTransferKeluar, uploadPdfLangsung
        };
    }
}).mount('#app');