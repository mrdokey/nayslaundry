import { 
    db, doc, setDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot 
} from "./firebase-db.js";

const { createApp, ref, onMounted, computed } = Vue;

createApp({
    setup() {
        const activeTab = ref('dashboard');
        const menuOpen = ref(false);
        
        const isLoggedIn = ref(false);
        const isApk = ref(false);
        const phoneNumber = ref('');
        const otpSent = ref(false);
        const generatedOtp = ref('');
        const inputOtp = ref('');
        const isLoadingOtp = ref(false);

        // DETEKSI BYPASS APK DI BARIS PALING ATAS
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('apk') === 'true') {
            isApk.value = true;
            isLoggedIn.value = true;
        } else if (localStorage.getItem('nays_logged_in') === 'true') {
            isLoggedIn.value = true;
        }

        // --- STATE OPERASIONAL LAUNDRY (DENGAN STRUKTUR BANK TERPISAH) ---
        const profile = ref({ 
            nama_laundry: '', 
            alamat: '', 
            no_telepon: '', 
            bank_cabang: '', 
            bank_nomor: '', 
            bank_nama: '', 
            logo_url: '' 
        });
        const customers = ref([]);
        const services = ref([]);
        const customPricesList = ref([]);
        const transactions = ref([]);
        const invoices = ref([]);

        const selectedCustomer = ref(null);
        const tempPrices = ref({}); 

        const searchQueryCustomers = ref('');
        const searchQueryTransactions = ref('');
        const searchQueryInvoices = ref('');

        const reportFilterClient = ref('');
        const reportFilterMonth = ref(new Date().toISOString().slice(0, 7));

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
        const draftTrxIds = ref([]);

        const printData = ref(null);

        const changeTab = (tab) => {
            activeTab.value = tab;
            menuOpen.value = false;
        };

        onMounted(() => {
            onSnapshot(doc(db, "pengaturan", "profil"), (snap) => {
                if (snap.exists()) profile.value = snap.data();
            });
            onSnapshot(collection(db, "pelanggan"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                customers.value = list.sort((a, b) => a.nama_pelanggan.localeCompare(b.nama_pelanggan));
            });
            onSnapshot(collection(db, "layanan"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                services.value = list.sort((a, b) => a.nama_layanan.localeCompare(b.nama_layanan));
            });
            onSnapshot(collection(db, "harga_khusus"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                customPricesList.value = list;
            });
            onSnapshot(collection(db, "transaksi"), (snap) => {
                const list = [];
                snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                transactions.value = list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
            });
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
        const getPrice = (custId, itemId) => {
            const custom = customPricesList.value.find(p => p.id_pelanggan === custId && p.id_layanan === itemId);
            if (custom && custom.harga_custom !== undefined && custom.harga_custom !== '') return Number(custom.harga_custom);
            const service = services.value.find(s => s.id === itemId);
            return service ? Number(service.harga_standar) : 0;
        };
        const formatDate = (ds) => {
            if (!ds) return '-';
            if (ds.includes('T')) ds = ds.split('T')[0];
            const p = ds.split('-');
            return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ds;
        };
        const formatMonthYear = (ms) => {
            if (!ms) return '-';
            const p = ms.split('-');
            if (p.length === 2) {
                const m = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                return `${m[parseInt(p[1]) - 1]} ${p[0]}`;
            }
            return ms;
        };

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

        const hasUnbilledCustomers = computed(() => {
            return customers.value.some(c => getCustomerUnbilledTotal(c.id) > 0);
        });

        const unbilledTransactionsCount = computed(() => {
            return transactions.value.filter(t => t.status_tagihan === 'belum_ditagih').length;
        });
        const filteredCustomers = computed(() => {
            const q = searchQueryCustomers.value.toLowerCase().trim();
            if (!q) return customers.value;
            return customers.value.filter(c => c.nama_pelanggan.toLowerCase().includes(q) || c.alamat.toLowerCase().includes(q));
        });
        const filteredTransactions = computed(() => {
            const q = searchQueryTransactions.value.toLowerCase().trim();
            if (!q) return transactions.value;
            return transactions.value.filter(t => getCustomerName(t.id_pelanggan).toLowerCase().includes(q));
        });
        const filteredInvoices = computed(() => {
            const q = searchQueryInvoices.value.toLowerCase().trim();
            if (!q) return invoices.value;
            return invoices.value.filter(inv => inv.no_invoice.toLowerCase().includes(q) || getCustomerName(inv.id_pelanggan).toLowerCase().includes(q));
        });
        const reportInvoices = computed(() => {
            return invoices.value.filter(inv => {
                const mC = !reportFilterClient.value || inv.id_pelanggan === reportFilterClient.value;
                const mM = !reportFilterMonth.value || inv.periode === reportFilterMonth.value;
                return mC && mM;
            });
        });
        const reportTotals = computed(() => {
            let tO = 0, tT = 0, tP = 0;
            reportInvoices.value.forEach(inv => {
                const val = Number(inv.total_tagihan) || 0;
                tO += val;
                if (inv.status_pembayaran === 'lunas_cash' || inv.status_pembayaran === 'lunas_transfer') tT += val;
                else tP += val;
            });
            return { totalOmset: tO, totalTerbayar: tT, totalPiutang: tP };
        });

        const exportToExcel = () => {
            if (reportInvoices.value.length === 0) { alert("Tidak ada data."); return; }
            const data = reportInvoices.value.map(inv => ({
                "No. Invoice": inv.no_invoice,
                "Nama Klien": getCustomerName(inv.id_pelanggan),
                "Periode": formatMonthYear(inv.periode),
                "Total (IDR)": inv.total_tagihan,
                "Status": inv.status_pembayaran.replace('_', ' ')
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Laporan");
            XLSX.writeFile(wb, `Omset_${reportFilterMonth.value}.xlsx`);
        };

        // --- WA GATEWAY & OTP ---
        const sendOtpCode = async () => {
            let phone = phoneNumber.value.replace(/[^0-9]/g, '');
            if (!phone) { alert("Harap masukkan nomor WhatsApp."); return; }
            if (phone.startsWith('0')) { phone = '62' + phone.substring(1); }
            else if (!phone.startsWith('62')) { phone = '62' + phone; }

            if (phone !== '628123654594') {
                alert("Akses ditolak. Nomor WhatsApp tidak terdaftar.");
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
            } else {
                alert("Kode OTP salah.");
            }
        };

        const logoutAdmin = () => {
            if (confirm("Keluar sistem?")) {
                isLoggedIn.value = false;
                localStorage.removeItem('nays_logged_in');
                otpSent.value = false;
                phoneNumber.value = '';
                inputOtp.value = '';
            }
        };

        const saveProfile = async () => {
            try {
                await setDoc(doc(db, "pengaturan", "profil"), profile.value, { merge: true });
                alert("Profil perusahaan berhasil diperbarui!");
            } catch (e) { alert("Error: " + e.message); }
        };

        const openAddCustomer = () => {
            isEditing.value = false;
            customerForm.value = { id: '', nama_pelanggan: '', alamat: '', no_telepon: '' };
            showCustomerForm.value = true;
        };
        const openEditCustomer = (c) => {
            isEditing.value = true;
            customerForm.value = { ...c };
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
            } catch (e) { alert("Error: " + e.message); }
        };
        const deleteCustomer = async (id) => {
            if (confirm("Hapus pelanggan?")) {
                try { await deleteDoc(doc(db, "pelanggan", id)); } catch (e) { alert("Error: " + e.message); }
            }
        };

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
            } catch (e) { alert("Error: " + e.message); }
        };
        const deleteService = async (id) => {
            if (confirm("Hapus item?")) {
                try { await deleteDoc(doc(db, "layanan", id)); } catch (e) { alert("Error: " + e.message); }
            }
        };

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
                        await setDoc(doc(db, "harga_khusus", docId), { id_pelanggan: custId, id_layanan: itemId, harga_custom: Number(val) });
                    } else {
                        await deleteDoc(doc(db, "harga_khusus", docId));
                    }
                }
                alert("Tarif khusus tersimpan!");
                activeTab.value = 'pelanggan';
            } catch (e) { alert("Error: " + e.message); }
        };

        const openAddTransaction = () => {
            const todayStr = new Date().toISOString().split('T')[0];
            trxForm.value = { id_pelanggan: '', tanggal: todayStr, items: {} };
            services.value.forEach(item => { trxForm.value.items[item.id] = ''; });
            showTransactionForm.value = true;
        };
        const saveTransaction = async () => {
            if (!trxForm.value.id_pelanggan || !trxForm.value.tanggal) { alert("Harap isi lengkap."); return; }
            const payload = [];
            for (const itemId of Object.keys(trxForm.value.items)) {
                const qty = Number(trxForm.value.items[itemId]);
                if (qty > 0) payload.push({ id_layanan: itemId, qty });
            }
            if (payload.length === 0) { alert("Harap isi kuantitas item."); return; }
            try {
                await addDoc(collection(db, "transaksi"), { id_pelanggan: trxForm.value.id_pelanggan, tanggal: trxForm.value.tanggal, items: payload, status_tagihan: 'belum_ditagih' });
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
                const noInvoice = `INV/${invoiceForm.value.periode.replace('-', '')}/${randomId}`;
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
            if (confirm("Hapus tagihan?")) {
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
            getCustomerName, getCustomerAddress, getServiceName, getServiceUnit, getPrice, formatDate, formatMonthYear,
            sendOtpCode, verifyOtpCode, logoutAdmin, saveProfile, openAddCustomer, openEditCustomer, saveCustomer, deleteCustomer,
            openAddService, openEditService, saveService, deleteService, openCustomPrices, saveCustomPrices,
            openAddTransaction, saveTransaction, deleteTransaction, openAddInvoice, calculateDraftInvoice, saveInvoice, deleteInvoice,
            updatePaymentStatus, printInvoice, exportToExcel, getCustomerUnbilledTotal, hasUnbilledCustomers, importGuestServices
        };
    }
}).mount('#app');