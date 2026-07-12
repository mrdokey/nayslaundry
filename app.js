// Impor koneksi database dan fungsi dari file firebase-db.js
import { 
    db, doc, setDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot 
} from "./firebase-db.js";

// Mengambil fungsi reaktif dari objek Vue global yang diload di HTML
const { createApp, ref, onMounted, computed } = Vue;

createApp({
    setup() {
        const activeTab = ref('dashboard');
        const menuOpen = ref(false); // State hamburger menu drawer
        
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
                });

                grandTotal += subtotal;
            }

            draftInvoiceItems.value = draftList;
            draftInvoiceTotal.value = grandTotal;
            draftTrxIds.value = trxIds;
        };

        const saveInvoice = async () => {
            if (draftInvoiceItems.value.length === 0) {
                alert("Tidak ada draf item transaksi untuk disimpan.");
                return;
            }

            try {
                const randomId = Math.floor(100 + Math.random() * 900);
                const cleanPeriod = invoiceForm.value.periode.replace('-', '');
                const noInvoice = `INV/${cleanPeriod}/${randomId}`;

                await addDoc(collection(db, "tagihan"), {
                    no_invoice: noInvoice,
                    id_pelanggan: invoiceForm.value.id_pelanggan,
                    periode: invoiceForm.value.periode,
                    tanggal_buat: new Date().toISOString(),
                    total_tagihan: draftInvoiceTotal.value,
                    status_pembayaran: 'belum_lunas',
                    items: draftInvoiceItems.value
                });

                const batchTrxPromises = draftTrxIds.value.map(id => {
                    return updateDoc(doc(db, "transaksi", id), {
                        status_tagihan: 'sudah_ditagih'
                    });
                });
                await Promise.all(batchTrxPromises);

                alert("Tagihan bulanan berhasil diterbitkan!");
                showInvoiceForm.value = false;
            } catch (error) {
                alert("Gagal menerbitkan tagihan: " + error.message);
            }
        };

        const deleteInvoice = async (id) => {
            if (confirm("Menghapus invoice tidak mengembalikan status transaksi menjadi belum ditagih. Apakah Anda yakin?")) {
                try {
                    await deleteDoc(doc(db, "tagihan", id));
                } catch (error) {
                    alert("Gagal menghapus tagihan: " + error.message);
                }
            }
        };

        const updatePaymentStatus = async (id, newStatus) => {
            try {
                await updateDoc(doc(db, "tagihan", id), {
                    status_pembayaran: newStatus
                });
            } catch (error) {
                alert("Gagal memperbarui status pembayaran: " + error.message);
            }
        };

        const printInvoice = (inv) => {
            printData.value = inv;
            setTimeout(() => {
                window.print();
            }, 300);
        };

        return {
            activeTab,
            menuOpen,
            changeTab,
            profile,
            customers,
            services,
            transactions,
            invoices,
            unbilledTransactionsCount,
            showCustomerForm,
            isEditing,
            customerForm,
            showServiceForm,
            isEditingService,
            serviceForm,
            selectedCustomer,
            tempPrices,
            showTransactionForm,
            trxForm,
            showInvoiceForm,
            invoiceForm,
            draftInvoiceItems,
            draftInvoiceTotal,
            printData,
            getCustomerName,
            getCustomerAddress,
            getServiceName,
            getServiceUnit,
            getPrice,
            formatDate,
            formatMonthYear,
            saveProfile,
            openAddCustomer,
            openEditCustomer,
            saveCustomer,
            deleteCustomer,
            openAddService,
            openEditService,
            saveService,
            deleteService,
            openCustomPrices,
            saveCustomPrices,
            openAddTransaction,
            saveTransaction,
            deleteTransaction,
            openAddInvoice,
            calculateDraftInvoice,
            saveInvoice,
            deleteInvoice,
            updatePaymentStatus,
            printInvoice
        };
    }
}).mount('#app');
