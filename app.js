// Impor koneksi database dan fungsi dari file firebase-db.js
import { 
    db, doc, setDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot 
} from "./firebase-db.js";

const { createApp, ref, onMounted, computed } = Vue;

createApp({
    setup() {
        const activeTab = ref('dashboard');
        const menuOpen = ref(false); // Hamburger menu drawer state
        
        const profile = ref({
            nama_laundry: '',
            alamat: '',
            no_telepon: '',
            rekening_pembayaran: '',
            logo_url: ''
        });

        const customers = ref([]);
        const services = ref([]);
        const customPricesList = ref([]);
        
        const transactions = ref([]);
        const invoices = ref([]);

        // Fitur Pencarian Instan (State)
        const searchQueryCustomers = ref('');
        const searchQueryTransactions = ref('');
        const searchQueryInvoices = ref('');

        // Fitur Filter Laporan Omset (State)
        const reportFilterClient = ref('');
        const reportFilterMonth = ref(new Date().toISOString().slice(0, 7)); // Default: bulan sekarang "YYYY-MM"

        // Form States
        const showCustomerForm = ref(false);
        const isEditing = ref(false);
        const customerForm = ref({ id: '', nama_pelanggan: '', alamat: '', no_telepon: '' });

        const showServiceForm = ref(false);
        const isEditingService = ref(false);
        const serviceForm = ref({ id: '', nama_layanan: '', satuan: 'Pcs', harga_standar: 0 });

        const showTransactionForm = ref(false);
        const trxForm = ref({ id_pelanggan: '', tanggal: '', items: {} });

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

        onMounted(() => {
            // Stream Profil
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

            // Stream Harga Khusus
            onSnapshot(collection(db, "harga_khusus"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                customPricesList.value = list;
            });

            // Stream Transaksi
            onSnapshot(collection(db, "transaksi"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                transactions.value = list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
            });

            // Stream Invoice
            onSnapshot(collection(db, "tagihan"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                invoices.value = list.sort((a, b) => b.tanggal_buat.localeCompare(a.tanggal_buat));
            });
        });

        // --- HELPER DATA ---
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
            const custom = customPricesList.value.find(p => p.id_pelanggan === custId && p.id_layanan === itemId);
            if (custom && custom.harga_custom !== undefined && custom.harga_custom !== '') {
                return Number(custom.harga_custom);
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

        // Hitung transaksi aktif belum ditagih untuk dashboard widget
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

            // Susun baris data khusus untuk Excel secara informatif
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

            // Membuat Sheet dari dataset JSON
            const worksheet = XLSX.utils.json_to_sheet(dataToExcel);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Omset");

            // Mengatur judul file excel
            const clientName = reportFilterClient.value ? getCustomerName(reportFilterClient.value).replace(/\s+/g, '_') : 'Semua_Klien';
            const periodName = reportFilterMonth.value ? reportFilterMonth.value : 'Semua_Periode';
            const filename = `Laporan_Omset_${clientName}_${periodName}.xlsx`;

            // Proses Download
            XLSX.writeFile(workbook, filename);
        };

        // --- CRUD CUSTOMER ---
        const saveProfile = async () => {
            try {
                await setDoc(doc(db, "pengaturan", "profil"), profile.value, { merge: true });
                alert("Profil perusahaan berhasil diperbarui!");
            } catch (error) {
                alert("Gagal memperbarui profil: " + error.message);
            }
        };

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

        // --- HARGA KHUSUS ---
        const openCustomPrices = (customer) => {
            selectedCustomer.value = customer;
            tempPrices.value = {};
            services.value.forEach(item => {
                const savedPrice = customPricesList.value.find(
                    p => p.id_pelanggan === customer.id && p.id_layanan === item.id
                );
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

        // --- TRANSAKSI ---
        const openAddTransaction = () => {
            const todayStr = new Date().toISOString().split('T')[0];
            trxForm.value = { id_pelanggan: '', tanggal: todayStr, items: {} };
            services.value.forEach(item => {
                trxForm.value.items[item.id] = '';
            });
            showTransactionForm.value = true;
        };

        const saveTransaction = async () => {
            if (!trxForm.value.id_pelanggan || !trxForm.value.tanggal) {
                alert("Harap pilih pelanggan dan tanggal pengambilan.");
                return;
            }

            const itemPayload = [];
            for (const itemId of Object.keys(trxForm.value.items)) {
                const qty = Number(trxForm.value.items[itemId]);
                if (qty > 0) {
                    itemPayload.push({ id_layanan: itemId, qty: qty });
                }
            }

            if (itemPayload.length === 0) {
                alert("Harap masukkan kuantitas minimal pada satu item.");
                return;
            }

            try {
                await addDoc(collection(db, "transaksi"), {
                    id_pelanggan: trxForm.value.id_pelanggan,
                    tanggal: trxForm.value.tanggal,
                    items: itemPayload,
                    status_tagihan: 'belum_ditagih'
                });
                alert("Catatan transaksi berhasil disimpan!");
                showTransactionForm.value = false;
            } catch (error) {
                alert("Gagal menyimpan transaksi: " + error.message);
            }
        };

        const deleteTransaction = async (id, status) => {
            if (status === 'sudah_ditagih') {
                alert("Transaksi ini tidak bisa dihapus karena sudah digabungkan ke dalam invoice tagihan bulanan.");
                return;
            }
            if (confirm("Apakah Anda yakin ingin menghapus catatan transaksi ini?")) {
                try {
                    await deleteDoc(doc(db, "transaksi", id));
                } catch (error) {
                    alert("Gagal menghapus transaksi: " + error.message);
                }
            }
        };

        // --- INVOICE TAGIHAN ---
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
                draftInvoiceItems.value = [];
                draftInvoiceTotal.value = 0;
                draftTrxIds.value = [];
                return;
            }

            const filteredTrx = transactions.value.filter(t => {
                return t.id_pelanggan === custId && 
                       t.status_tagihan === 'belum_ditagih' && 
                       t.tanggal.startsWith(period);
            });

            const mapItems = {};
            const trxIds = [];

            filteredTrx.forEach(t => {
                trxIds.push(t.id);
                t.items.forEach(item => {
                    if (!mapItems[item.id_layanan]) {
                        mapItems[item.id_layanan] = 0;
                    }
                    mapItems[item.id_layanan] += item.qty;
                });
            });

            const draftList = [];
            let grandTotal = 0;

            for (const itemId of Object.keys(mapItems)) {
                const qty = mapItems[itemId];
                const price = getPrice(custId, itemId);
                const subtotal = qty * price;

                draftList.push({
                    id_layanan: itemId,
                    nama_layanan: getServiceName(itemId),
                    satuan: getServiceUnit(itemId),
                    qty: qty,
                    harga_satuan: price,
                    subtotal: subtotal
    
