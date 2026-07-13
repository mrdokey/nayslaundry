// Impor koneksi database dan fungsi dari file firebase-db.js
import { 
    db, doc, setDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot 
} from "./firebase-db.js";

const { createApp, ref, onMounted, computed } = Vue;

createApp({
    setup() {
        const activeTab = ref('dashboard');
        const menuOpen = ref(false); // Hamburger menu drawer state
        
        // --- STATE KEAMANAN & OTP LOGIN ---
        const isLoggedIn = ref(false);
        const isApk = ref(false);
        const phoneNumber = ref('');
        const otpSent = ref(false);
        const generatedOtp = ref('');
        const inputOtp = ref('');
        const isLoadingOtp = ref(false);

        // DETEKSI BYPASS APK DI BARIS PALING ATAS AGAR INSTAN
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('apk') === 'true') {
            isApk.value = true;
            isLoggedIn.value = true; // Langsung masuk bypass login
        } else if (localStorage.getItem('nays_logged_in') === 'true') {
            isLoggedIn.value = true; // Sesi login browser aman
        }

        // --- STATE OPERASIONAL LAUNDRY ---
        const profile = ref({ 
            nama_laundry: '', 
            alamat: '', 
            no_telepon: '', 
            bank_cabang: '', 
            bank_nomor: '', 
            bank_nama: '', 
            logo_url: '',
            tos: '' 
        });
        const customers = ref([]);
        const services = ref([]);
        const customPricesList = ref([]);
        const transactions = ref([]);
        const invoices = ref([]);

        // State untuk Tarif Khusus Pelanggan
        const selectedCustomer = ref(null);
        const tempPrices = ref({}); 

        // State Pencarian Instan
        const searchQueryCustomers = ref('');
        const searchQueryTransactions = ref('');
        const searchQueryInvoices = ref('');

        // State Filter Laporan Omset
        const reportFilterClient = ref('');
        const reportFilterMonth = ref(new Date().toISOString().slice(0, 7)); // Default: bulan sekarang "YYYY-MM"

        // Form States Pelanggan
        const showCustomerForm = ref(false);
        const isEditing = ref(false);
        const customerForm = ref({ id: '', nama_pelanggan: '', alamat: '', no_telepon: '' });

        // Form States Layanan
        const showServiceForm = ref(false);
        const isEditingService = ref(false);
        const serviceForm = ref({ id: '', nama_layanan: '', satuan: 'Pcs', harga_standar: 0 });

        // Form States Transaksi (Ubah Struktur Items menjadi Array agar Dinamis)
        const showTransactionForm = ref(false);
        const trxForm = ref({ id_pelanggan: '', tanggal: '', items: [] });

        // State Pencarian Item dalam Form Transaksi
        const itemSearchQuery = ref('');
        const selectedItemId = ref('');
        const selectedItemQty = ref('');

        // Form States Invoice
        const showInvoiceForm = ref(false);
        const invoiceForm = ref({ id_pelanggan: '', periode: '' });
        const draftInvoiceItems = ref([]);
        const draftInvoiceTotal = ref(0);
        const draftTrxIds = ref([]); // ID transaksi yang masuk ke draft ini

        // State cetak PDF
        const printData = ref(null);

        const changeTab = (tab) => {
            activeTab.value = tab;
            menuOpen.value = false; // Tutup drawer otomatis saat pindah tab
        };

        // --- SISTEM PEMANTAUAN REAL-TIME (onMounted) ---
        onMounted(() => {
            // Stream Profil Perusahaan
            onSnapshot(doc(db, "pengaturan", "profil"), (snap) => {
                if (snap.exists()) profile.value = snap.data();
            });

            // Stream Pelanggan
            onSnapshot(collection(db, "pelanggan"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                customers.value = list.sort((a, b) => a.nama_pelanggan.localeCompare(b.nama_pelanggan));
            });

            // Stream Master Item
            onSnapshot(collection(db, "layanan"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                services.value = list.sort((a, b) => a.nama_layanan.localeCompare(b.nama_layanan));
            });

            // Stream Harga Khusus Klien
            onSnapshot(collection(db, "harga_khusus"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                customPricesList.value = list;
            });

            // Stream Catatan Transaksi Harian
            onSnapshot(collection(db, "transaksi"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                transactions.value = list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
            });

            // Stream Dokumen Tagihan (Invoice)
            onSnapshot(collection(db, "tagihan"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                invoices.value = list.sort((a, b) => b.tanggal_buat.localeCompare(a.tanggal_buat));
            });
        });

        // --- FUNGSI PENDUKUNG DATA ---
        const getCustomerName = (id) => {
            const c = customers.value.find(x => x.id === id);
            return c ? c.nama_pelanggan : 'Tanpa Nama';
        };

        const getCustomerAddress = (id) => {
            const c = customers.value.find(x => x.id === id);
            return c ? c.alamat : '-';
        };

        const getServiceName = (id) => {
            const s = services.value.find(x => x.id === id);
            return s ? s.nama_layanan : 'Item';
        };

        const getServiceUnit = (id) => {
            const s = services.value.find(x => x.id === id);
            return s ? s.satuan : 'Pcs';
        };

        // Mendapatkan harga aktif (custom/standar)
        const getPrice = (custId, itemId) => {
            const priceFound = customPricesList.value.find(p => p.id_pelanggan === custId && p.id_layanan === itemId);
            if (priceFound && priceFound.harga_custom !== undefined && priceFound.harga_custom !== '') {
                return Number(priceFound.harga_custom);
            }
            const service = services.value.find(s => s.id === itemId);
            return service ? Number(service.harga_standar) : 0;
        };

        const formatDate = (dateString) => {
            if (!dateString) return '-';
            if (dateString.includes('T')) {
                dateString = dateString.split('T')[0];
            }
            const parts = dateString.split('-');
            if (parts.length === 3) {
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateString;
        };

        const formatMonthYear = (monthString) => {
            if (!monthString) return '-';
            const parts = monthString.split('-');
            if (parts.length === 2) {
                const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                return `${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
            }
            return monthString;
        };

        // Hitung estimasi tagihan aktif klien yang belum ditarik ke invoice
        const getCustomerUnbilledTotal = (custId) => {
            let total = 0;
            const unbilled = transactions.value.filter(t => t.id_pelanggan === custId && t.status_tagihan === 'belum_ditagih');
            unbilled.forEach(t => {
                t.items.forEach(item => {
                    total += Number(item.qty) * getPrice(custId, item.id_layanan);
                });
            });
            return total;
        };

        // Memeriksa apakah ada minimal satu pelanggan yang memiliki estimasi tagihan aktif
        const hasUnbilledCustomers = computed(() => {
            return customers.value.some(c => getCustomerUnbilledTotal(c.id) > 0);
        });

        // Hitung total transaksi aktif belum ditagih untuk dashboard widget
        const unbilledTransactionsCount = computed(() => {
            return transactions.value.filter(t => t.status_tagihan === 'belum_ditagih').length;
        });

        // --- PENCARIAN REAKTIF (COMPUTED) ---
        const filteredCustomers = computed(() => {
            const q = searchQueryCustomers.value.toLowerCase().trim();
            if (!q) return customers.value;
            return customers.value.filter(c => 
                c.nama_pelanggan.toLowerCase().includes(q) || 
                c.alamat.toLowerCase().includes(q)
            );
        });

        const filteredTransactions = computed(() => {
            const q = searchQueryTransactions.value.toLowerCase().trim();
            if (!q) return transactions.value;
            return transactions.value.filter(t => {
                const custName = getCustomerName(t.id_pelanggan).toLowerCase();
                return custName.includes(q);
            });
        });

        const filteredInvoices = computed(() => {
            const q = searchQueryInvoices.value.toLowerCase().trim();
            if (!q) return invoices.value;
            return invoices.value.filter(inv => {
                const noInv = inv.no_invoice.toLowerCase();
                const custName = getCustomerName(inv.id_pelanggan).toLowerCase();
                return noInv.includes(q) || custName.includes(q);
            });
        });

        // --- LAPORAN OMSET & TOTALAN ---
        const reportInvoices = computed(() => {
            return invoices.value.filter(inv => {
                const matchClient = !reportFilterClient.value || inv.id_pelanggan === reportFilterClient.value;
                const matchMonth = !reportFilterMonth.value || inv.periode === reportFilterMonth.value;
                return matchClient && matchMonth;
            });
        });

        const reportTotals = computed(() => {
            let totalOmset = 0;
            let totalTerbayar = 0;
            let totalPiutang = 0;

            reportInvoices.value.forEach(inv => {
                const value = Number(inv.total_tagihan) || 0;
                totalOmset += value;
                if (inv.status_pembayaran === 'lunas_cash' || inv.status_pembayaran === 'lunas_transfer') {
                    totalTerbayar += value;
                } else {
                    totalPiutang += value;
                }
            });

            return { totalOmset, totalTerbayar, totalPiutang };
        });

        // --- EKSPOR DATA EXCEL ---
        const exportToExcel = () => {
            if (reportInvoices.value.length === 0) {
                alert("Tidak ada data laporan untuk diunduh pada filter saat ini.");
                return;
            }

            const dataToExcel = reportInvoices.value.map(inv => {
                let statusTxt = 'Belum Lunas';
                if (inv.status_pembayaran === 'lunas_cash') statusTxt = 'Lunas Cash';
                if (inv.status_pembayaran === 'lunas_transfer') statusTxt = 'Lunas Transfer';

                return {
                    "No. Invoice": inv.no_invoice,
                    "Nama Pelanggan / Klien": getCustomerName(inv.id_pelanggan),
                    "Periode Tagihan": formatMonthYear(inv.periode),
                    "Tanggal Terbit": formatDate(inv.tanggal_buat),
                    "Jumlah Tagihan (IDR)": inv.total_tagihan,
                    "Status Pembayaran": statusTxt
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(dataToExcel);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Omset");

            const clientName = reportFilterClient.value ? getCustomerName(reportFilterClient.value).replace(/\s+/g, '_') : 'Semua_Klien';
            const periodName = reportFilterMonth.value ? reportFilterMonth.value : 'Semua_Periode';
            const filename = `Laporan_Omset_${clientName}_${periodName}.xlsx`;

            XLSX.writeFile(workbook, filename);
        };

        // --- WA GATEWAY & OTP ---
        const sendOtpCode = async () => {
            let phone = phoneNumber.value.replace(/[^0-9]/g, '');
            if (!phone) { alert("Harap masukkan nomor WhatsApp."); return; }
            if (phone.startsWith('0')) { phone = '62' + phone.substring(1); }
            else if (!phone.startsWith('62')) { phone = '62' + phone; }

            // Batasi login hanya untuk nomor klien Anda DAN nomor kontrol Anda
            if (phone !== '628123654594' && phone !== '62895428400665') {
                alert("Akses ditolak. Nomor WhatsApp tidak terdaftar sebagai Admin.");
                return;
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const textMsg = `Kode OTP Login Nays Laundry Anda adalah: *${otp}*`;
            const waApiUrl = `https://wa.mrdsolution.my.id/api/send-message?key=7BC82018076500360255A4E0F78D52C7&session=botmrd&to=${phone}&text=${encodeURIComponent(textMsg)}`;

            isLoadingOtp.value = true;
            try {
                await fetch(waApiUrl, { mode: 'no-cors' });
                generatedOtp.value = otp;
                otpSent.value = true;
                alert("Kode OTP terkirim!");
            } catch (e) {
                alert("Gagal kirim OTP: " + e.message);
            } finally {
                isLoadingOtp.value = false;
            }
        };

        const verifyOtpCode = () => {
            if (inputOtp.value.toString() === generatedOtp.value.toString()) {
                isLoggedIn.value = true;
                localStorage.setItem('nays_logged_in', 'true');
                alert("Verifikasi sukses! Selamat datang.");
            } else {
                alert("Kode OTP salah.");
            }
        };

        const logoutAdmin = () => {
            if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
                isLoggedIn.value = false;
                localStorage.removeItem('nays_logged_in');
                otpSent.value = false;
                phoneNumber.value = '';
                inputOtp.value = '';
            }
        };

        // --- CRUD PROFIL PERUSAHAAN ---
        const saveProfile = async () => {
            try {
                await setDoc(doc(db, "pengaturan", "profil"), profile.value, { merge: true });
                alert("Profil perusahaan berhasil diperbarui!");
            } catch (error) {
                alert("Gagal memperbarui profil: " + error.message);
            }
        };

        // --- CRUD CUSTOMER ---
        const openAddCustomer = () => {
            isEditing.value = false;
            customerForm.value = { id: '', nama_pelanggan: '', alamat: '', no_telepon: '' };
            showCustomerForm.value = true;
        };

        const openEditCustomer = (customer) => {
            isEditing.value = true;
            customerForm.value = { ...customer };
            showCustomerForm.value = true;
        };

        const saveCustomer = async () => {
            try {
                if (isEditing.value) {
                    await updateDoc(doc(db, "pelanggan", customerForm.value.id), {
                        nama_pelanggan: customerForm.value.nama_pelanggan,
                        alamat: customerForm.value.alamat,
                        no_telepon: customerForm.value.no_telepon
                    });
                } else {
                    await addDoc(collection(db, "pelanggan"), {
                        nama_pelanggan: customerForm.value.nama_pelanggan,
                        alamat: customerForm.value.alamat,
                        no_telepon: customerForm.value.no_telepon,
                        tanggal_bergabung: new Date().toISOString()
                    });
                }
                showCustomerForm.value = false;
            } catch (error) {
                alert("Gagal memproses data: " + error.message);
            }
        };

        const deleteCustomer = async (id) => {
            if (confirm("Apakah Anda yakin ingin menghapus pelanggan ini?")) {
                try {
                    await deleteDoc(doc(db, "pelanggan", id));
                } catch (error) {
                    alert("Gagal menghapus: " + error.message);
                }
            }
        };

        // --- CRUD MASTER ITEM ---
        const openAddService = () => {
            isEditingService.value = false;
            serviceForm.value = { id: '', nama_layanan: '', satuan: 'Pcs', harga_standar: 0 };
            showServiceForm.value = true;
        };

        const openEditService = (item) => {
            isEditingService.value = true;
            serviceForm.value = { ...item };
            showServiceForm.value = true;
        };

        const saveService = async () => {
            try {
                if (isEditingService.value) {
                    await updateDoc(doc(db, "layanan", serviceForm.value.id), {
                        nama_layanan: serviceForm.value.nama_layanan,
                        satuan: serviceForm.value.satuan,
                        harga_standar: Number(serviceForm.value.harga_standar)
                    });
                } else {
                    await addDoc(collection(db, "layanan"), {
                        nama_layanan: serviceForm.value.nama_layanan,
                        satuan: serviceForm.value.satuan,
                        harga_standar: Number(serviceForm.value.harga_standar),
                        tanggal_dibuat: new Date().toISOString()
                    });
                }
                showServiceForm.value = false;
            } catch (error) {
                alert("Gagal menyimpan data item: " + error.message);
            }
        };

        const deleteService = async (id) => {
            if (confirm("Apakah Anda yakin ingin menghapus item ini?")) {
                try {
                    await deleteDoc(doc(db, "layanan", id));
                } catch (error) {
                    alert("Gagal menghapus: " + error.message);
                }
            }
        };

        // --- PORTAL TARIF KHUSUS KLIEN ---
        const openCustomPrices = (customer) => {
            selectedCustomer.value = customer;
            tempPrices.value = {};
            services.value.forEach(item => {
                const savedPrice = customPricesList.value.find(p => p.id_pelanggan === customer.id && p.id_layanan === item.id);
                tempPrices.value[item.id] = savedPrice ? savedPrice.harga_custom : '';
            });
            activeTab.value = 'harga_khusus';
        };

        const saveCustomPrices = async () => {
            try {
                const custId = selectedCustomer.value.id;
                for (const itemId of Object.keys(tempPrices.value)) {
                    const val = tempPrices.value[itemId];
                    const docId = `${custId}_${itemId}`;

                    if (val !== '' && val !== null && val !== undefined) {
                        await setDoc(doc(db, "harga_khusus", docId), {
                            id_pelanggan: custId,
                            id_layanan: itemId,
                            harga_custom: Number(val)
                        });
                    } else {
                        await deleteDoc(doc(db, "harga_khusus", docId));
                    }
                }
                alert("Harga khusus pelanggan berhasil disimpan!");
                activeTab.value = 'pelanggan';
            } catch (error) {
                alert("Gagal menyimpan harga khusus: " + error.message);
            }
        };

        // --- PENCATATAN TRANSAKSI HARIAN (CART-STYLE) ---
        const openAddTransaction = () => {
            const todayStr = new Date().toISOString().split('T')[0];
            trxForm.value = { id_pelanggan: '', tanggal: todayStr, items: [] }; // Reset sebagai array kosong
            itemSearchQuery.value = '';
            selectedItemId.value = '';
            selectedItemQty.value = '';
            showTransactionForm.value = true;
        };

        const filteredSearchItems = computed(() => {
            const q = itemSearchQuery.value.toLowerCase().trim();
            if (!q) return services.value;
            return services.value.filter(s => s.nama_layanan.toLowerCase().includes(q));
        });

        const selectSearchItem = (item) => {
            selectedItemId.value = item.id;
            itemSearchQuery.value = item.nama_layanan; // Tampilkan nama barang di input pencarian
        };

        const addTrxItem = () => {
            if (!selectedItemId.value) {
                alert("Harap pilih item laundry terlebih dahulu."); return;
            }
            if (!selectedItemQty.value || Number(selectedItemQty.value) <= 0) {
                alert("Harap masukkan kuantitas yang valid."); return;
            }

            // Cari apakah barang sudah ada di list cart sementara
            const existing = trxForm.value.items.find(x => x.id_layanan === selectedItemId.value);
            if (existing) {
                existing.qty += Number(selectedItemQty.value);
            } else {
                trxForm.value.items.push({
                    id_layanan: selectedItemId.value,
                    qty: Number(selectedItemQty.value)
                });
            }

            // Reset form input pencarian item
            selectedItemId.value = '';
            selectedItemQty.value = '';
            itemSearchQuery.value = '';
        };

        const removeTrxItem = (index) => {
            trxForm.value.items.splice(index, 1);
        };

        const saveTransaction = async () => {
            if (!trxForm.value.id_pelanggan || !trxForm.value.tanggal) { alert("Harap isi lengkap."); return; }
            if (trxForm.value.items.length === 0) { alert("Harap tambahkan minimal satu item ke daftar."); return; }
            try {
                await addDoc(collection(db, "transaksi"), { 
                    id_pelanggan: trxForm.value.id_pelanggan, 
                    tanggal: trxForm.value.tanggal, 
                    items: trxForm.value.items, 
                    status_tagihan: 'belum_ditagih' 
                });
                alert("Transaksi tersimpan!");
                showTransactionForm.value = false;
            } catch (e) { alert("Error: " + e.message); }
        };

        const deleteTransaction = async (id, status) => {
            if (status === 'sudah_ditagih') { alert("Sudah masuk invoice."); return; }
            if (confirm("Hapus transaksi?")) {
                try { await deleteDoc(doc(db, "transaksi", id)); } catch (e) { alert("Error: " + e.message); }
            }
        };

        // --- INVOICE & GENERATE TAGIHAN ---
        const openAddInvoice = () => {
            const currentMonth = new Date().toISOString().slice(0, 7);
            invoiceForm.value = { id_pelanggan: '', periode: currentMonth };
            draftInvoiceItems.value = [];
            draftInvoiceTotal.value = 0;
            draftTrxIds.value = [];
            showInvoiceForm.value = true;
        };

        const calculateDraftInvoice = () => {
            const custId = invoiceForm.value.id_pelanggan;
            const period = invoiceForm.value.periode;
            if (!custId || !period) {
                draftInvoiceItems.value = []; draftInvoiceTotal.value = 0; draftTrxIds.value = []; return;
            }
            const filtered = transactions.value.filter(t => t.id_pelanggan === custId && t.status_tagihan === 'belum_ditagih' && t.tanggal.startsWith(period));
            const mapItems = {};
            const trxIds = [];
            filtered.forEach(t => {
                trxIds.push(t.id);
                t.items.forEach(item => {
                    if (!mapItems[item.id_layanan]) mapItems[item.id_layanan] = 0;
                    mapItems[item.id_layanan] += item.qty;
                });
            });
            const list = [];
            let grandTotal = 0;
            for (const itemId of Object.keys(mapItems)) {
                const qty = mapItems[itemId];
                const price = getPrice(custId, itemId);
                const sub = qty * price;
                list.push({ id_layanan: itemId, nama_layanan: getServiceName(itemId), satuan: getServiceUnit(itemId), qty, harga_satuan: price, subtotal: sub });
                grandTotal += sub;
            }
            draftInvoiceItems.value = list;
            draftInvoiceTotal.value = grandTotal;
            draftTrxIds.value = trxIds;
        };

        const saveInvoice = async () => {
            if (draftInvoiceItems.value.length === 0) { alert("Draf kosong."); return; }
            try {
                const randomId = Math.floor(100 + Math.random() * 900);
                const cleanPeriod = invoiceForm.value.periode.replace('-', '');
                const noInvoice = `INV/${cleanPeriod}/${randomId}`;
                await addDoc(collection(db, "tagihan"), {
                    no_invoice: noInvoice, id_pelanggan: invoiceForm.value.id_pelanggan, periode: invoiceForm.value.periode,
                    tanggal_buat: new Date().toISOString(), total_tagihan: draftInvoiceTotal.value, status_pembayaran: 'belum_lunas', items: draftInvoiceItems.value
                });
                const batch = draftTrxIds.value.map(id => updateDoc(doc(db, "transaksi", id), { status_tagihan: 'sudah_ditagih' }));
                await Promise.all(batch);
                alert("Tagihan bulanan terbit!");
                showInvoiceForm.value = false;
            } catch (e) { alert("Error: " + e.message); }
        };

        const deleteInvoice = async (id) => {
            if (confirm("Menghapus invoice tidak mengembalikan status transaksi menjadi belum ditagih. Apakah Anda yakin?")) {
                try { await deleteDoc(doc(db, "tagihan", id)); } catch (e) { alert("Error: " + e.message); }
            }
        };

        const updatePaymentStatus = async (id, newStatus) => {
            try { await updateDoc(doc(db, "tagihan", id), { status_pembayaran: newStatus }); } catch (e) { alert("Error: " + e.message); }
        };

        const printInvoice = (inv) => {
            printData.value = inv;
            setTimeout(() => { window.print(); }, 300);
        };

        // --- SISTEM IMPOR GUEST LAUNDRY ---
        const importGuestServices = async () => {
            const guestItems = [
                { name: "Shirt/Blouse", price: 5000 },
                { name: "T-Shirt", price: 4000 },
                { name: "Polo/Long Sleeved T-Shirt", price: 5000 },
                { name: "Sweater/Hoodie", price: 5000 },
                { name: "Under Shirt/Tank Top", price: 3000 },
                { name: "Shorts/Skirt", price: 5000 },
                { name: "Trousers/Long Skirt", price: 7000 },
                { name: "Jeans", price: 8000 },
                { name: "Briefs/Boxer/Panties", price: 3000 },
                { name: "Bra", price: 4000 },
                { name: "Swimsuit", price: 4000 },
                { name: "Socks/Kaos Kaki", price: 2500 },
                { name: "Long Dress", price: 9000 },
                { name: "Pajamas/Baju Tidur", price: 7000 },
                { name: "Sarong/Sarung", price: 3000 },
                { name: "Scarf/Selendang", price: 3000 },
                { name: "Topi", price: 5000 },
                { name: "Baby Clothes/Baju Bayi", price: 3000 }
            ];
            if (confirm(`Apakah Anda yakin ingin mengimpor ${guestItems.length} item Guest Laundry?`)) {
                let count = 0;
                try {
                    for (const item of guestItems) {
                        await addDoc(collection(db, "layanan"), {
                            nama_layanan: item.name,
                            satuan: "Pcs",
                            harga_standar: Number(item.price),
                            tanggal_dibuat: new Date().toISOString()
                        });
                        count++;
                    }
                    alert(`Sukses mengimpor ${count} item Guest Laundry!`);
                } catch (err) { alert("Error: " + err.message); }
            }
        };

        return {
            activeTab, menuOpen, changeTab, isLoggedIn, isApk, phoneNumber, otpSent, inputOtp, isLoadingOtp,
            profile, customers, services, transactions, invoices, unbilledTransactionsCount,
            searchQueryCustomers, searchQueryTransactions, searchQueryInvoices,
            reportFilterClient, reportFilterMonth, reportInvoices, reportTotals,
            filteredCustomers, filteredTransactions, filteredInvoices,
            showCustomerForm, isEditing, customerForm, showServiceForm, isEditingService, serviceForm,
            selectedCustomer, tempPrices, showTransactionForm, trxForm, showInvoiceForm, invoiceForm,
            draftInvoiceItems, draftInvoiceTotal, printData,
            itemSearchQuery, selectedItemId, selectedItemQty, filteredSearchItems, selectSearchItem, addTrxItem, removeTrxItem,
            getCustomerName, getCustomerAddress, getServiceName, getServiceUnit, getPrice, formatDate, formatMonthYear,
            sendOtpCode, verifyOtpCode, logoutAdmin, saveProfile, openAddCustomer, openEditCustomer, saveCustomer, deleteCustomer,
            openAddService, openEditService, saveService, deleteService, openCustomPrices, saveCustomPrices,
            openAddTransaction, saveTransaction, deleteTransaction, openAddInvoice, calculateDraftInvoice, saveInvoice, deleteInvoice,
            updatePaymentStatus, printInvoice, exportToExcel, getCustomerUnbilledTotal, hasUnbilledCustomers, importGuestServices
        };
    }
}).mount('#app');