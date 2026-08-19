const { createApp, ref, computed, onMounted } = Vue;

createApp({

    setup() {
        //login
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
        const forgotConfirmPassword = ref('');

        const openForgotPassword = () => {

            forgotUsername.value = '';
            forgotNewPassword.value = '';
            forgotConfirmPassword.value = '';

            modalForgotPassword.value.show = true;
        };


        const resetPassword = async () => {
            const username = forgotUsername.value.trim();
            const newPassword = forgotNewPassword.value;
            const confirmPassword = forgotConfirmPassword.value;

            if (!username) {
                showToast('Username wajib diisi!', true);
                return;
            }

            if (!newPassword) {
                showToast('Password baru wajib diisi!', true);
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('Konfirmasi password tidak cocok!', true);
                return;
            }

            try {

                const result = await apiRequest('password.php', {
                    method: 'POST',

                    body: JSON.stringify({
                        username: username,
                        password_baru: newPassword
                    })
                });

                if (result.success) {

                    modalForgotPassword.value.show = false;

                    forgotUsername.value = '';
                    forgotNewPassword.value = '';
                    forgotConfirmPassword.value = '';

                    showToast(
                        'Password berhasil direset! Silakan login kembali.'
                    );

                } else {

                    showToast(
                        result.message || 'Gagal mereset password!',
                        true
                    );
                }

            } catch (error) {

                console.error('Reset password gagal:', error);

                showToast(
                    error.message || 'Gagal mereset password!',
                    true
                );
            }
        };

        // =====================================================
        // FUNCTION LOGIN
        // =====================================================
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

                    // SIMPAN STATUS LOGIN
                    sessionStorage.setItem('bmn_logged_in', 'true');

                    // SIMPAN USERNAME
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


        // =====================================================
        // CEK LOGIN SAAT RELOAD
        // =====================================================
        const checkLogin = () => {

            const loggedIn =
                sessionStorage.getItem('bmn_logged_in');

            if (loggedIn === 'true') {
                isLoggedIn.value = true;
            } else {
                isLoggedIn.value = false;
            }
        };


        // =====================================================
        // SAAT APLIKASI DIBUKA / RELOAD
        // =====================================================
        onMounted(async () => {

            checkLogin();

            if (isLoggedIn.value) {
                await loadDataFromBackend();
            }

        });
        // =====================================================
        // STATE UTAMA
        // =====================================================
        const currentCategory = ref('laptops');
        const currentTab = ref('assets');
        const showDropdown = ref(false); // Untuk menu titik tiga
        const itemsPerPage = ref(25);

        const searchQuery = ref('');
        const filterStatus = ref('all');
        const filterKondisi = ref('all');
        const filterKeterangan = ref('all');
        const filterSurat = ref('all');
        const filterKondisiRiwayat = ref('all');
        const fileInputBukti = ref(null);
        const currentUploadId = ref(null);

        // Untuk fitur pilih/hapus banyak
        const isSelectMode = ref(false);
        const selectedAssets = ref([]);
        const selectedPegawai = ref([]);
        const selectedHistory = ref([]);

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

        // =====================================================
        // TOAST & API
        // =====================================================
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

        // =====================================================
        // NORMALIZE DATA
        // =====================================================
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
                file_bukti: row.file_bukti || null
            };
        };

        // =====================================================
        // LOAD & REFRESH DATA
        // =====================================================
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

        // =====================================================
        // BUKTI SURAT (file PDF hasil upload, dicek dari FOLDER, bukan dari DB)
        // =====================================================
        const buktiIds = ref([]); // isinya kumpulan ID yang udah punya file bukti_<id>.pdf

        const refreshBuktiList = async () => {
            try {
                const res = await fetch(`${API_BASE}/list_bukti.php`);
                const result = await res.json();
                buktiIds.value = (result.ids || []).map(Number);
            } catch (error) {
                console.error('Gagal ambil daftar bukti surat:', error);
            }
        };

        // Dipanggil dari template: cek apakah baris riwayat ini udah ada file buktinya
        const hasBukti = (id) => buktiIds.value.includes(Number(id));

        // =====================================================
        // CATEGORY & STATISTICS
        // =====================================================
        
        const activeAssets = computed(() => allAssets.value);

        const allAssets = computed(() => [
            ...db.value.laptops,
            ...db.value.pcs,
            ...db.value.tablets
        ]);

        // Aset yang "beneran keliatan" -> udah dibuang yang berketerangan 'Transfer keluar'
        // Dipakai khusus buat kartu statistik di atas, biar gak ikut kehitung
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
        
        // =====================================================
        // PEGAWAI INFO
        // =====================================================
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

        // =====================================================
        // AMBIL TANGGAL BAST TERAKHIR / TANGGAL INPUT BARU
        // =====================================================
        const getLastMutationDate = (asset) => {
            // Cari riwayat mutasi berdasarkan ID aset
            const history = historyList.value.filter(h => h.aset_id === asset.id && h.tanggal && h.tanggal !== '0000-00-00');
            
            // 1. Kalau ada riwayat mutasi/BAST, ambil yang paling baru
            if (history.length > 0) {
                history.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
                return formatTanggalIndo(history[0].tanggal);
            }
            
            // 2. Kalau NGGAK ADA riwayat mutasi, cek apakah ini barang baru di-input (ada created_at)
            if (asset.created_at && asset.created_at !== '0000-00-00 00:00:00') {
                // Biasanya formatnya "2026-08-14 10:30:00", kita potong ambil tanggalnya aja
                const tglInput = asset.created_at.split(' ')[0];
                return formatTanggalIndo(tglInput);
            }
            
            // 3. Kalau bener-bener data mentah/lama yang nggak punya history dan created_at
            return '10 Agustus 2026';
        };

        // =====================================================
        // BADGES & ICONS
        // =====================================================
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

        // =====================================================
        // FILTERS
        // =====================================================
        const filteredAssets = computed(() => {
            return activeAssets.value.filter(asset => {
                // =======================================================
                // 1. FILTER KETERANGAN BARU
                // =======================================================
                if (filterKeterangan.value !== 'all') {
                    const ket = (asset.keterangan || '').toLowerCase();
                    const pilihan = filterKeterangan.value.toLowerCase();
                    // Cek apakah keterangannya diawali dengan pilihan filter
                    if (!ket.startsWith(pilihan)) return false;
                } else {
                    // Kalau pilih 'Semua', jalankan trik sulap lama: sembunyikan 'Transfer keluar'
                    if (asset.keterangan && String(asset.keterangan).toLowerCase().includes('transfer keluar')) {
                        return false;
                    }
                }

                // =======================================================
                // 2. FILTER STATUS & KONDISI (Bawaan Lama)
                // =======================================================
                if (filterStatus.value === 'assigned' && asset.pemegangId === null) return false;
                if (filterStatus.value === 'gudang' && asset.pemegangId !== null) return false;
                if (filterKondisi.value !== 'all' && asset.kondisi !== filterKondisi.value) return false;

                // =======================================================
                // 3. PENCARIAN KATA KUNCI (Bawaan Lama)
                // =======================================================
                const query = searchQuery.value.toLowerCase().trim();
                if (!query) return true;

                const holder = asset.pemegangId ? getPegawaiName(asset.pemegangId).toLowerCase() : 'gudang bmn';

                return (
                    String(asset.kodeBarang).toLowerCase().includes(query) ||
                    String(asset.nup).toLowerCase().includes(query) ||
                    String(asset.merek).toLowerCase().includes(query) ||
                    String(asset.tipe).toLowerCase().includes(query) ||
                    String(asset.tahun).toLowerCase().includes(query) ||
                    String(asset.keterangan).toLowerCase().includes(query) ||
                    holder.includes(query)
                );
            }).sort((a, b) => Number(b.id) - Number(a.id));
        });

        const filteredPegawai = computed(() => {
            // Sembunyiin pegawai yang semua asetnya udah "Transfer keluar" (alias udah resign/pindah)
            const pegawaiAktifSaja = pegawaiList.value.filter(pegawai => !pegawaiSudahKeluar(pegawai.id));

            const query = searchQuery.value.toLowerCase().trim();
            if (!query) return pegawaiAktifSaja;

            return pegawaiAktifSaja.filter(pegawai => (
                String(pegawai.nama).toLowerCase().includes(query) ||
                String(pegawai.nip).toLowerCase().includes(query) ||
                String(pegawai.jabatan).toLowerCase().includes(query)
            ));
        });

        // Filter Tabel Riwayat (SIP, BAST, Kondisi)
        const filteredHistory = computed(() => {
            // TRIKNYA DI SINI: Kita 'copy' datanya pakai [...] biar Vue nggak looping & nge-freeze!
            let result = [...historyList.value];

            // 1. Filter Jenis Surat (Berdasarkan format nomor surat)
            if (filterSurat.value === 'SIP') {
                result = result.filter(h => h.nomorBast && String(h.nomorBast).includes('/GDG/'));
            } else if (filterSurat.value === 'BAST') {
                result = result.filter(h => h.nomorBast && String(h.nomorBast).includes('-GDG/'));
            }

            // 2. Filter Kondisi
            if (filterKondisiRiwayat.value !== 'all') {
                result = result.filter(h => h.kondisi === filterKondisiRiwayat.value);
            }

            // 3. Pencarian Kata Kunci
            const query = searchQuery.value.toLowerCase().trim();
            if (query) {
                result = result.filter(h => 
                    String(h.nomorBast).toLowerCase().includes(query) ||
                    String(h.merekTipe).toLowerCase().includes(query) ||
                    String(h.pemegangLama).toLowerCase().includes(query) ||
                    String(h.pemegangBaru).toLowerCase().includes(query)
                );
            }

            // Urutkan dari yang terbaru
            return result.sort((a, b) => Number(b.id) - Number(a.id));
        });

        // Logika Upload PDF
        const triggerUpload = (id) => {
            currentUploadId.value = id;
            if (fileInputBukti.value) fileInputBukti.value.click();
        };

        const handleFileUpload = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            if (file.type !== 'application/pdf') {
                showToast('Gagal: File harus format PDF!', true);
                event.target.value = '';
                return;
            }

            const formData = new FormData();
            formData.append('id', currentUploadId.value);
            formData.append('file_pdf', file);

            try {
                // Tembak pakai tanda kutip backtick ` 
                const response = await fetch(`${API_BASE}/upload_bukti.php`, { method: 'POST', body: formData });
                
                // KITA BACA MENTAHNYA DULU
                const textResult = await response.text(); 
                
                // Kalau PHP-nya tetep nge-blank
                if (!textResult || textResult.trim() === '') {
                    showToast('Server PHP nge-blank! Coba upload file PDF yang lebih kecil.', true);
                    return;
                }

                // Terjemahin ke JSON
                const result = JSON.parse(textResult);
                
                if (result.status === 'success') {
                    showToast('Yey! Bukti TTD berhasil diupload.');
                    await refreshBuktiList(); 
                } else {
                    showToast(result.message, true); // Nampilin error aslinya dari PHP
                }
            } catch (error) {
                // Kalau muncul pesan merah aneh, ini bakal nangkep
                showToast(`Gagal! Cek tulisan merah di atas atau klik F12.`, true);
                console.error("Error dari server:", error);
            } finally {
                event.target.value = ''; 
            }
        };

        const openPdf = (id) => {
            if (id) window.open(`uploads/surat/bukti_${id}.pdf`, '_blank');
        };

        // =====================================================
        // FITUR PILIH & HAPUS BANYAK
        // =====================================================
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

        // =====================================================
        // MODAL ASET
        // =====================================================
        const modalAset = ref({ show: false, isEdit: false, editId: null });
        const formAset = ref({ jenis: '', kodeBarang: '', nup: '', merek: '', tipe: '', tahun: '', keterangan: '', kondisi: 'Baik', 
            kategoriKeterangan: 'Pembelian', detailKeterangan: ''});

        const openAsetModal = (item = null) => {
            if (item) {
                // Logika pinter buat misahin teks "Kategori - Detail" kalau lagi mau ngedit
                let parsedKategori = 'Lainnya';
                let parsedDetail = item.keterangan || '';
                
                const categories = ['Transfer masuk', 'Transfer keluar', 'Sewa', 'Pembelian'];
                for (const cat of categories) {
                    if (item.keterangan && item.keterangan.startsWith(cat)) {
                        parsedKategori = cat;
                        // Hapus kata kategorinya dan tanda strip, sisa teksnya masuk ke kotak detail
                        parsedDetail = item.keterangan.substring(cat.length).replace(/^ \- /, '').trim();
                        break;
                    }
                }

                modalAset.value = { show: true, isEdit: true, editId: item.id };
                formAset.value = { 
                    ...item,
                    kategoriKeterangan: parsedKategori,
                    detailKeterangan: parsedDetail
                };
                return;
            }
            
            let jenis = currentCategory.value === 'pcs' ? 'PC Desktop' : currentCategory.value === 'tablets' ? 'Tablet' : 'Laptop';
            modalAset.value = { show: true, isEdit: false, editId: null };
            // Pas nambah baru, setel default dropdownnya jadi Pembelian
            formAset.value = { 
                jenis, kodeBarang: '', nup: '', merek: '', tipe: '', tahun: '', kondisi: 'Baik', 
                kategoriKeterangan: 'Pembelian', detailKeterangan: '' 
            };
        };

        const saveAset = async () => {
            try {
                // GABUNGIN DULU KETERANGANNYA DI SINI SEBELUM DIKIRIM KE DB
                let combinedKeterangan = formAset.value.kategoriKeterangan;
                if (formAset.value.detailKeterangan && formAset.value.detailKeterangan.trim() !== '') {
                    combinedKeterangan += ` - ${formAset.value.detailKeterangan}`;
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
                    keterangan: combinedKeterangan, // <--- MASUKIN HASIL GABUNGAN KE SINI
                    pemegang_id: formAset.value.pemegangId ?? null,
                    pemegang_nama_sumber: formAset.value.pemegangNama || null
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

        // =====================================================
        // MODAL PEGAWAI
        // =====================================================
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

        // =====================================================
        // LOGIKA MODAL TRANSFER KELUAR (TKTM) DARI PEGAWAI
        // =====================================================
        const modalTKTM = ref({
            show: false,
            pegawaiId: null,
            namaPegawai: '',
            asetList: [],
            selectedAsetId: '',
            tujuan: ''
        });

        const openModalTKTM = (pegawai) => {
            const empId = pegawai.id;
            let list = [];
            
            // Cari semua aset aktif (belum ditransfer) yang dipegang pegawai ini
            Object.values(db.value).forEach(kategoriAssets => {
                const asetAktif = kategoriAssets.filter(a => 
                    a.pemegangId === empId && 
                    (!a.keterangan || !String(a.keterangan).toLowerCase().includes('transfer keluar'))
                );
                list = list.concat(asetAktif);
            });

            // Munculin pop-up rapi
            modalTKTM.value = {
                show: true,
                pegawaiId: empId,
                namaPegawai: pegawai.nama,
                asetList: list,
                selectedAsetId: '', // Default kosong biar disuruh milih
                tujuan: ''
            };
        };

        const submitTKTM = async () => {
            const { selectedAsetId, tujuan, asetList } = modalTKTM.value;
            
            // Cari detail lengkap dari aset yang barusan dipilih di dropdown
            const asset = asetList.find(a => a.id === selectedAsetId);
            if (!asset) return;

            // Bikin kalimat gabungannya
            const combinedKeterangan = `Transfer keluar - ${tujuan.trim()}`;

            try {
                // Bungkus paket data buat ditimpa keterangannya
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
                    keterangan: combinedKeterangan, // <--- Ini yang bikin dia ngilang nanti
                    pemegang_id: asset.pemegangId ?? null
                };

                // Tembak ke database
                await apiRequest('aset.php', { method: 'PUT', body: JSON.stringify(payload) });
                await refreshAssets(); // Refresh biar ngilang dari tabel aktif
                
                modalTKTM.value.show = false;
                showToast('Aset berhasil ditransfer keluar (TKTM).');
            } catch (error) {
                showToast(`Gagal memproses TKTM: ${error.message}`, true);
            }
        };

        // =====================================================
        // AMBIL ASET YANG DIPEGANG PEGAWAI (Khusus di Modal Pegawai)
        //=====================================================
        const asetDipegang = computed(() => {
            // Pastikan modal pegawai lagi dalam mode Edit
            if (!modalPegawai.value || !modalPegawai.value.isEdit) return [];
            
            const empId = modalPegawai.value.editId;
            let list = [];
            
            // Tarik dari semua kategori (Laptop, PC, Tablet)
            Object.values(db.value).forEach(kategoriAssets => {
                // Jangan masukin yang udah ditransfer keluar sebelumnya
                const asetAktif = kategoriAssets.filter(a => 
                    a.pemegangId === empId && 
                    (!a.keterangan || !String(a.keterangan).toLowerCase().includes('transfer keluar'))
                );
                list = list.concat(asetAktif);
            });
            
            return list;
        });

        // =====================================================
        // MODAL SERAH TERIMA & SURAT
        // =====================================================
        const modalSerahTerima = ref({ show: false, asset: null });
        const formMutasi = ref({ pemegangBaruId: '', adminGudangId: '', tanggal: new Date().toISOString().slice(0, 10), kondisi: 'Baik', nomorBast: '', nomorSip: '' });
        const printData = ref({ show: false });

        const openSerahTerimaModal = (asset) => {
            modalSerahTerima.value = { show: true, asset };
            formMutasi.value = { pemegangBaruId: '', adminGudangId: '', tanggal: new Date().toISOString().slice(0, 10), kondisi: asset.kondisi || 'Baik', nomorBast: '' };

            generateNomorSurat();
        };

        // Cek: pegawai ini masih aktif atau semua asetnya udah "Transfer keluar" (alias udah resign/pindah)?
        const pegawaiSudahKeluar = (pegawaiId) => {
            const punyaAsetPernah = allAssets.value.some(asset => Number(asset.pemegangId) === Number(pegawaiId));
            if (!punyaAsetPernah) return false; // Belum pernah pegang aset sama sekali -> pegawai baru, bukan "udah keluar"

            const masihAdaAsetAktif = allAssets.value.some(asset =>
                Number(asset.pemegangId) === Number(pegawaiId) &&
                (!asset.keterangan || !String(asset.keterangan).toLowerCase().includes('transfer keluar'))
            );
            return !masihAdaAsetAktif; // Kalau gak ada satupun aset aktif tersisa -> dianggap udah keluar
        };

        const availablePegawaiForTransfer = computed(() => {
            if (!modalSerahTerima.value.asset) return [];
            const currentHolderId = modalSerahTerima.value.asset.pemegangId;
            return pegawaiList.value.filter(pegawai =>
                Number(pegawai.id) !== Number(currentHolderId) &&
                !pegawaiSudahKeluar(pegawai.id)
            );
        });

        const stafGudangList = computed(() => {
            return pegawaiList.value;
        });

        // =====================================================
        // AUTO-GENERATE NOMOR SURAT (RESET PER TAHUN, SIP & BAST PISAH)
        // =====================================================
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

            // Cari nomor terakhir untuk SIP dan BAST di tahun yang sama
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

            // Penentuan Surat
            if (oldHolder === null || oldHolder === '') {
                // Dari Gudang ke Pegawai -> Hanya SIP
                formMutasi.value.nomorSip = formatSIP;
                formMutasi.value.nomorBast = '';
            } else if (newHolder === 'GUDANG' || newHolder === null) {
                // Dari Pegawai ke Gudang -> Hanya BAST
                formMutasi.value.nomorBast = formatBAST;
                formMutasi.value.nomorSip = '';
            } else {
                // Mutasi Pegawai ke Pegawai -> BUTUH KEDUANYA
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

            try {
                if (jenisTransaksi === 'MUTASI') {
                    // 1. Eksekusi BAST 
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
                            keterangan: 'Otomatis: Pengembalian sebelum dimutasi'
                        })
                    });

                    // 2. Eksekusi SIP 
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
                            keterangan: 'Otomatis: Peminjaman hasil mutasi'
                        })
                    });
                } else {
                    // Jika hanya meminjam / mengembalikan (Normal 1 Halaman)
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
                            keterangan: ''
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

                // KITA KEMBALIKAN AUTO-SHOW PRINT PREVIEW NYA!
                // KITA KEMBALIKAN AUTO-SHOW PRINT PREVIEW NYA!
                printData.value = {
                    show: true,
                    jenisTransaksi: jenisTransaksi,
                    printMode: jenisTransaksi === 'PEMINJAMAN' ? 'SIP' : 'BAST', // <-- TAMBAHAN BARU INI
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
                // Kita kasih waktu loading (200ms) biar halamannya muncul dulu baru di-scroll
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
            
            if (record.nomorBast && record.nomorBast.includes('/GDG/')) {
                nSip = record.nomorBast;
                record.jenisTransaksi = 'PEMINJAMAN';
            } else {
                nBast = record.nomorBast;
                record.jenisTransaksi = 'PENGEMBALIAN';
            }

            // =========================================================
            // LACAK DATA PEGAWAI BERDASARKAN NAMA DI RIWAYAT
            // =========================================================
            const cariPegawaiBerdasarkanNama = (namaCari) => {
                if (!namaCari || namaCari.includes('Gudang') || namaCari === '-') return null;
                return pegawaiList.value.find(p => p.nama.toLowerCase() === namaCari.toLowerCase()) || null;
            };

            const pegawaiLamaObj = cariPegawaiBerdasarkanNama(record.pemegangLama);
            const pegawaiBaruObj = cariPegawaiBerdasarkanNama(record.pemegangBaru);

            // Ambil staf gudang pertama yang ditemukan di list sebagai default admin jika dari/ke gudang
            const defaultStafGudang = stafGudangList.value[0] || pegawaiList.value[0] || { nama: 'Admin Gudang', nip: '-', jabatan: 'Staf Perlengkapan' };

            // Tentukan Pihak Pertama & Kedua beserta Jabatan dan NIP aslinya
            let namaPihakPertama = record.pemegangLama;
            let nipPihakPertama = pegawaiLamaObj?.nip || '-';
            let jabatanPihakPertama = pegawaiLamaObj?.jabatan || (record.pemegangLama.includes('Gudang') ? defaultStafGudang.jabatan : '-');

            let namaPihakKedua = record.pemegangBaru;
            let nipPihakKedua = pegawaiBaruObj?.nip || '-';
            let jabatanPihakKedua = pegawaiBaruObj?.jabatan || (record.pemegangBaru.includes('Gudang') ? defaultStafGudang.jabatan : '-');

            // Jika Pihak Kedua adalah gudang, gunakan data staf gudang aktif
            let namaAdminGudang = defaultStafGudang.nama;
            let nipAdminGudang = defaultStafGudang.nip;
            let jabatanAdminGudang = defaultStafGudang.jabatan;

            if (record.pemegangBaru.includes('Gudang') || record.pemegangBaru === '-') {
                namaPihakKedua = namaAdminGudang;
                nipPihakKedua = nipAdminGudang;
                jabatanPihakKedua = jabatanAdminGudang;
            }

            if (record.pemegangLama.includes('Gudang') || record.pemegangLama === '-') {
                namaPihakPertama = namaAdminGudang;
                nipPihakPertama = nipAdminGudang;
                jabatanPihakPertama = jabatanAdminGudang;
            }
            // =========================================================

            printData.value = { 
                show: true, 
                ...record,
                nomorBast: nBast,
                nomorSip: nSip,
                jenisTransaksi: record.jenisTransaksi,
                printMode: record.jenisTransaksi === 'PEMINJAMAN' ? 'SIP' : 'BAST',
                
                // Masukkan data yang sudah dilacak dengan akurat
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

        const tutupPrint = () => { printData.value.show = false; };
        const jalankanPrint = () => { window.print(); };

        // =====================================================
        // MODAL PENGATURAN DOKUMEN
        // =====================================================
        const modalPengaturan = ref({ show: false });
        const savedPengaturan = JSON.parse(localStorage.getItem('bmn_pengaturan_dokumen') || 'null');
        
        const formPengaturan = ref({
            namaKepala: savedPengaturan?.namaKepala || 'Nur Syarief Boni Mulyanto',
            nipKepala: savedPengaturan?.nipKepala || '',
            jabatanKepala: savedPengaturan?.jabatanKepala || 'Kepala Subbagian Perlengkapan,\nRumah Tangga dan Pengadaan'
        });

        const openPengaturanModal = () => { modalPengaturan.value.show = true; };
        const savePengaturan = () => {
            localStorage.setItem('bmn_pengaturan_dokumen', JSON.stringify(formPengaturan.value));
            modalPengaturan.value.show = false;
            showToast('Pengaturan dokumen berhasil disimpan di browser.');
        };

        // =====================================================
        // MODAL PROFIL & LOGOUT
        // =====================================================
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

        // Username wajib diisi
        if (!usernameBaru) {
            showToast('Username tidak boleh kosong!', true);
            return;
        }

        // Kalau password diisi, harus sama
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

                // Update username yang sedang digunakan
                currentUsername.value = usernameBaru;

                // Simpan username untuk tampilan setelah reload
                localStorage.setItem(
                    'bmn_username',
                    usernameBaru
                );

                // Tutup modal
                modalProfil.value.show = false;

                // Bersihkan form
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

                username:
                    currentUsername.value,

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

            sessionStorage.removeItem(
                'bmn_logged_in'
            );

            loginUsername.value = '';
            loginPassword.value = '';
            loginError.value = '';

            showToast('Logout berhasil.');
        };

        // =====================================================
        // EXPORT EXCEL
        // =====================================================
         // Sama kayak filteredAssets, tapi KHUSUS buat export -> gak nyembunyiin 'Transfer keluar'
        // walau lagi di filter 'Semua', soalnya laporan Excel emang harus lengkap.
        const assetsForExport = computed(() => {
            return activeAssets.value.filter(asset => {
                if (filterKeterangan.value !== 'all') {
                    const ket = (asset.keterangan || '').toLowerCase();
                    const pilihan = filterKeterangan.value.toLowerCase();
                    if (!ket.startsWith(pilihan)) return false;
                }
                // (Sengaja TIDAK ada blok "sembunyiin transfer keluar" di sini)

                if (filterStatus.value === 'assigned' && asset.pemegangId === null) return false;
                if (filterStatus.value === 'gudang' && asset.pemegangId !== null) return false;
                if (filterKondisi.value !== 'all' && asset.kondisi !== filterKondisi.value) return false;

                const query = searchQuery.value.toLowerCase().trim();
                if (!query) return true;

                const holder = asset.pemegangId ? getPegawaiName(asset.pemegangId).toLowerCase() : 'gudang bmn';

                return (
                    String(asset.kodeBarang).toLowerCase().includes(query) ||
                    String(asset.nup).toLowerCase().includes(query) ||
                    String(asset.merek).toLowerCase().includes(query) ||
                    String(asset.tipe).toLowerCase().includes(query) ||
                    String(asset.tahun).toLowerCase().includes(query) ||
                    String(asset.keterangan).toLowerCase().includes(query) ||
                    holder.includes(query)
                );
            }).sort((a, b) => Number(b.id) - Number(a.id));
        });

        const exportExcel = () => {
            // 1. Ambil semua data (master) tanpa filter
            const allAssets = activeAssets.value.sort((a, b) => Number(b.id) - Number(a.id));

            if (!allAssets.length) {
                showToast('Tidak ada data untuk di-export!', true);
                return;
            }

            // 2. Kelompokkan Data Berdasarkan Kategori/Status
            const dataGudang = allAssets.filter(a => a.pemegangId === null);
            const dataDipakai = allAssets.filter(a => a.pemegangId !== null && !(a.keterangan || '').toLowerCase().startsWith('transfer'));
            const dataTransferMasuk = allAssets.filter(a => (a.keterangan || '').toLowerCase().startsWith('transfer masuk'));
            const dataTransferKeluar = allAssets.filter(a => (a.keterangan || '').toLowerCase().startsWith('transfer keluar'));

            // Daftar sheet yang akan dibuat
            const sheetCategories = [
                { title: 'Semua Data', data: allAssets },
                { title: 'Di Gudang', data: dataGudang },
                { title: 'Dipakai', data: dataDipakai },
                { title: 'Transfer Masuk', data: dataTransferMasuk },
                { title: 'Transfer Keluar', data: dataTransferKeluar }
            ];

            const wb = XLSX.utils.book_new();
            const judulKategori = categoryLabel.value.toUpperCase();

            // 3. Helper Function untuk Mengisi & Memoles Setiap Sheet
            const createStyledSheet = (sheetTitle, assetList) => {
                const headerRow = [
                    'NO', 'USER', 'KODE BARANG', 'NUP BARU', 'MERK & TIPE', 'TAHUN', 'TANGGAL BAST', 'KONDISI', 'KETERANGAN'
                ];

                const dataRows = assetList.map((asset, index) => [
                    index + 1,
                    asset.pemegangId ? getPegawaiName(asset.pemegangId) : 'Gudang BMN TekMira',
                    asset.kodeBarang ? String(asset.kodeBarang) : '-',
                    asset.nup ? String(asset.nup) : '-',
                    `${asset.merek || ''} ${asset.tipe || ''}`.trim() || '-',
                    asset.tahun || '-',
                    getLastMutationDate(asset),
                    asset.kondisi || '-',
                    asset.keterangan || '-'
                ]);

                const aoa = [
                    [`DAFTAR PEMEGANG ${judulKategori} - ${sheetTitle.toUpperCase()}`],
                    ['BALAI BESAR PENGUJIAN MINERAL DAN BATUBARA TEKMIRA'],
                    [],
                    headerRow,
                    ...dataRows
                ];

                const ws = XLSX.utils.aoa_to_sheet(aoa);

                const colCount = headerRow.length;
                const headerRowIndex = 3;
                const lastDataRowIndex = headerRowIndex + dataRows.length;

                // Merge Judul
                ws['!merges'] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
                    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } }
                ];

                // Lebar Kolom (Presisi)
                ws['!cols'] = [
                    { wch: 6 },  // NO
                    { wch: 26 }, // USER
                    { wch: 18 }, // KODE BARANG
                    { wch: 12 }, // NUP BARU
                    { wch: 30 }, // MERK & TIPE
                    { wch: 10 }, // TAHUN
                    { wch: 24 }, // TANGGAL BAST
                    { wch: 14 }, // KONDISI
                    { wch: 35 }  // KETERANGAN
                ];

                // Tinggi Baris
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

                // Style Judul Utama
                setCellStyle(0, 0, {
                    font: { bold: true, sz: 14, color: { rgb: '1E293B' }, name: 'Calibri' },
                    alignment: { horizontal: 'center', vertical: 'center' }
                });

                // Style Subjudul
                setCellStyle(1, 0, {
                    font: { bold: true, sz: 11, color: { rgb: '475569' }, name: 'Calibri' },
                    alignment: { horizontal: 'center', vertical: 'center' }
                });

                // Style Header Tabel (Dark Slate)
                for (let c = 0; c < colCount; c++) {
                    setCellStyle(headerRowIndex, c, {
                        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
                        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                        fill: { fgColor: { rgb: '1E293B' } },
                        border: borderSubtle
                    });
                }

                // Style Baris Data (Zebra Striping)
                for (let r = headerRowIndex + 1; r <= lastDataRowIndex; r++) {
                    const isEven = (r - headerRowIndex) % 2 === 0;
                    const bgRowColor = isEven ? 'F8FAFC' : 'FFFFFF';

                    for (let c = 0; c < colCount; c++) {
                        let alignHoriz = 'center';
                        if (c === 1 || c === 4 || c === 8) {
                            alignHoriz = 'left';
                        }

                        setCellStyle(r, c, {
                            font: { sz: 10, name: 'Calibri', color: { rgb: '334155' } },
                            alignment: { horizontal: alignHoriz, vertical: 'center', wrapText: true },
                            fill: { fgColor: { rgb: bgRowColor } },
                            border: borderSubtle
                        });
                    }
                }

                // AutoFilter
                ws['!autofilter'] = {
                    ref: XLSX.utils.encode_range(
                        { r: headerRowIndex, c: 0 },
                        { r: headerRowIndex, c: colCount - 1 }
                    )
                };

                return ws;
            };

            // 4. Generate Semua Sheet dan Masukkan ke Workbook
            sheetCategories.forEach(cat => {
                // Hanya buat tab jika ada datanya (atau tetap buat meski kosong jika ingin lengkap)
                const ws = createStyledSheet(cat.title, cat.data);
                // Nama sheet di Excel maksimal 31 karakter
                XLSX.utils.book_append_sheet(wb, ws, cat.title.substring(0, 31));
            });

            // 5. Download File Excel
            const namaFile = `Laporan_Aset_${judulKategori.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(wb, namaFile);

            showToast('Export Excel multi-tab berhasil!');
        };

        // =====================================================
        // MODAL KONFIRMASI HAPUS (POP UP MODERN)
        // =====================================================
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
            modalHapus.value.show = false; // Tutup modal langsung pas di-klik "Ya"

            try {
                if (jenis === 'pegawai') {
                    await apiRequest('pegawai.php', { method: 'DELETE', body: JSON.stringify({ id }) });
                    await refreshPegawai();
                    showToast('Data pegawai berhasil dihapus.');
                } else if (jenis === 'banyak_pegawai') {
                    for (const pegId of selectedPegawai.value) {
                        await apiRequest('pegawai.php', { method: 'DELETE', body: JSON.stringify({ id: pegId }) });
                    }
                    selectedPegawai.value = [];
                    await refreshPegawai();
                    showToast('Pegawai terpilih berhasil dihapus.');
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

        // --- FUNGSI PENGHUBUNG DARI HTML KE MODAL ---

        const deleteAsset = (id) => {
            openModalHapus('aset', id, 'Yakin ingin menghapus data aset ini? Tindakan ini tidak bisa dibatalkan.');
        };

        const deletePegawai = (id) => {
            // Validasi: Cek dulu pegawainya masih megang aset atau nggak
            const held = getPegawaiAllAssets(id);
            if (held.length > 0) {
                showToast(`Gagal! Pegawai masih memegang ${held.length} aset. Kembalikan ke gudang dulu.`, true);
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
            openModalHapus('banyak_pegawai', null, `Yakin ingin menghapus ${selectedPegawai.value.length} pegawai terpilih?`);
        };

        const hapusBanyakHistory = () => {
            if (selectedHistory.value.length === 0) return;
            openModalHapus('banyak_history', null, `Yakin ingin menghapus ${selectedHistory.value.length} riwayat surat terpilih?`);
        };

        // =====================================================
        // LIFECYCLE
        // =====================================================
        onMounted(async () => {
            checkLogin();

            // Hanya load dashboard kalau sudah login
            if (isLoggedIn.value) {
                await loadDataFromBackend();
            }
        });

        // =====================================================
        // EKSPOR SEMUA VARIABEL & FUNGSI KE HTML
        // =====================================================
        return {
            isLoggedIn, loginUsername, loginPassword, loginError, currentUsername, handleLogin,
            modalForgotPassword, forgotUsername, forgotNewPassword, forgotConfirmPassword, openForgotPassword, resetPassword,
            
            currentCategory, currentTab, showDropdown, searchQuery, filterStatus, filterKondisi, toast,
            categoryLabel, categoryIcon, db, activeAssets, visibleAssets, allAssets, pegawaiList, historyList, assignedCount, availableCount, damagedCount,
            getPegawaiName, getPegawaiNip, getPegawaiInitials, getPegawaiAllAssets, getConditionBadgeClass, getConditionIconClass,
            filteredAssets, filteredPegawai, filterKeterangan,
            
            isSelectMode, toggleSelectMode, selectedAssets, selectedPegawai, selectAllAssets, selectAllPegawai, 
            hapusBanyakAset, hapusBanyakPegawai, // <--- INI KETINGGALAN TADI
            
            modalAset, formAset, openAsetModal, saveAset, deleteAsset, // <--- INI JUGA KETINGGALAN
            modalPegawai, formPegawai, openPegawaiModal, savePegawai, deletePegawai, // <--- INI JUGA KETINGGALAN
            modalHapus, openModalHapus, prosesHapusData, 
            
            modalSerahTerima, formMutasi, openSerahTerimaModal, availablePegawaiForTransfer, stafGudangList, submitSerahTerima,
            
            printData, formatTanggalIndo, cetakUlangBast, tutupPrint, jalankanPrint,
            
            modalPengaturan, formPengaturan, openPengaturanModal, savePengaturan,
            modalProfil, formProfil, openProfilModal, saveProfil,
            modalLogout, openLogoutModal, confirmLogout, itemsPerPage,
            exportExcel, getLastMutationDate, asetDipegang, 
            modalTKTM, openModalTKTM, submitTKTM,

            filterSurat, filterKondisiRiwayat, filteredHistory, fileInputBukti, triggerUpload, 
            handleFileUpload, openPdf, hasBukti, selectedHistory, selectAllHistory, hapusBanyakHistory,
        };
    }
}).mount('#app');