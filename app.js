import { db, doc, setDoc, collection, addDoc, updateDoc, deleteDoc, onSnapshot } from "./firebase-db.js";

// Import Komponen Modular dari folder components/
import AuthLogin from "./components/AuthLogin.js";
import DashboardView from "./components/DashboardView.js";
import TransaksiView from "./components/TransaksiView.js";
import TagihanView from "./components/TagihanView.js";
import LaporanView from "./components/LaporanView.js";
import PelangganView from "./components/PelangganView.js";
import MasterItemView from "./components/MasterItemView.js";
import ProfilView from "./components/ProfilView.js";
import InvoicePrintView from "./components/InvoicePrintView.js";
import MasterItemView from "./components/MasterItemView.js";

const { createApp, ref, onMounted, computed } = Vue;

createApp({
    components: {
        AuthLogin, DashboardView, TransaksiView, TagihanView, 
        LaporanView, PelangganView, MasterItemView, ProfilView, InvoicePrintView
    },
    template: `
        <div class="flex flex-col min-h-screen print:p-0 print:bg-white">
            <!-- LOGIN VIEW -->
            <AuthLogin v-if="!isLoggedIn" 
                :phone-number="phoneNumber" :otp-sent="otpSent" :input-otp="inputOtp" :is-loading-otp="isLoadingOtp"
                @update:phone-number="phoneNumber = $event" @update:input-otp="inputOtp = $event"
                @send-otp="sendOtpCode" @verify-otp="verifyOtpCode" />

            <!-- MAIN APPLICATION -->
            <div v-else class="flex flex-col md:flex-row w-full min-h-screen print:hidden pb-16 md:pb-0">
                <!-- FAB MOBILE -->
                <button v-if="['transaksi', 'pelanggan', 'layanan'].includes(activeTab) && !showForm" 
                        @click="triggerAdd" class="md:hidden fixed bottom-20 right-4 bg-indigo-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg z-40 text-xl font-bold">+</button>

                <!-- HEADER MOBILE -->
                <header class="flex md:hidden h-14 bg-indigo-900 text-white items-center justify-between px-4 fixed top-0 left-0 right-0 z-40 shadow">
                    <div class="flex items-center space-x-2">
                        <img v-if="profile.logo_url" :src="profile.logo_url" class="w-8 h-8 rounded-full object-cover bg-white">
                        <h1 class="font-bold text-xs">{{ profile.nama_laundry || 'Nays Laundry' }}</h1>
                    </div>
                    <button @click="menuOpen = !menuOpen" class="text-xl p-2">☰</button>
                </header>

                <!-- DRAWER MOBILE -->
                <div v-if="menuOpen" @click="menuOpen = false" class="fixed inset-0 bg-black/40 z-40"></div>
                <aside :class="menuOpen ? 'translate-x-0' : '-translate-x-full'" class="fixed inset-y-0 left-0 w-56 bg-indigo-900 text-white z-50 transform transition-transform duration-200 flex flex-col">
                    <div class="p-4 border-b border-indigo-800 flex justify-between items-center"><span class="font-bold">Menu</span><button @click="menuOpen = false">✕</button></div>
                    <nav class="flex-1 p-3 space-y-1">
                        <button v-for="t in ['dashboard', 'transaksi', 'tagihan', 'laporan', 'pelanggan', 'layanan', 'profil']" @click="changeTab(t)" :class="activeTab===t?'bg-indigo-800':''" class="w-full text-left p-2.5 rounded hover:bg-indigo-800 capitalize">{{ t==='layanan'?'master item':t }}</button>
                        <button v-if="!isApk" @click="logoutAdmin" class="w-full text-left p-2.5 rounded text-rose-300 hover:bg-rose-950 block mt-8 border-t border-indigo-800">🚪 Keluar</button>
                    </nav>
                </aside>

                <!-- SIDEBAR DESKTOP -->
                <aside class="hidden md:flex w-56 bg-indigo-900 text-white flex-col shadow-lg shrink-0">
                    <div class="p-4 border-b border-indigo-800 flex items-center space-x-2">
                        <img v-if="profile.logo_url" :src="profile.logo_url" class="w-8 h-8 rounded-full object-cover bg-white">
                        <span class="font-bold text-xs">{{ profile.nama_laundry || 'Nays Laundry' }}</span>
                    </div>
                    <nav class="flex-1 p-3 space-y-1 text-indigo-100">
                        <button v-for="t in ['dashboard', 'transaksi', 'tagihan', 'laporan', 'pelanggan', 'layanan', 'profil']" @click="changeTab(t)" :class="activeTab===t?'bg-indigo-800 text-white':''" class="w-full text-left p-2.5 rounded hover:bg-indigo-800 capitalize">{{ t==='layanan'?'master item':t }}</button>
                        <button v-if="!isApk" @click="logoutAdmin" class="w-full text-left p-2.5 rounded text-rose-300 hover:bg-rose-950 block mt-12 border-t border-indigo-800">🚪 Keluar</button>
                    </nav>
                </aside>

                <!-- BOTTOM NAV MOBILE -->
                <nav class="flex md:hidden fixed bottom-0 left-0 right-0 h-14 bg-indigo-900 text-white border-t border-indigo-800 z-30 justify-around items-center shadow-lg">
                    <button @click="changeTab('dashboard')" :class="activeTab==='dashboard'?'text-white font-bold':'text-indigo-300'" class="flex flex-col items-center text-[9px]"><span class="text-base">🏠</span><span>Dashboard</span></button>
                    <button @click="changeTab('transaksi')" :class="activeTab==='transaksi'?'text-white font-bold':'text-indigo-300'" class="flex flex-col items-center text-[9px]"><span class="text-base">📝</span><span>Transaksi</span></button>
                    <button @click="changeTab('pelanggan')" :class="activeTab==='pelanggan'?'text-white font-bold':'text-indigo-300'" class="flex flex-col items-center text-[9px]"><span class="text-base">👥</span><span>Customer</span></button>
                    <button @click="changeTab('layanan')" :class="activeTab==='layanan'?'text-white font-bold':'text-indigo-300'" class="flex flex-col items-center text-[9px]"><span class="text-base">⚙️</span><span>Item</span></button>
                </nav>

                <!-- MAIN DISPLAY -->
                <main class="flex-1 p-4 pt-20 md:pt-4 overflow-y-auto">
                    <DashboardView v-if="activeTab === 'dashboard'" :customers="customers" :services="services" :unbilled-count="unbilledTransactionsCount" :has-unbilled="hasUnbilledCustomers" :get-unbilled-total="getCustomerUnbilledTotal" />
                    <TransaksiView v-if="activeTab === 'transaksi'" :transactions="filteredTransactions" :customers="customers" :services="services" :search-query="searchQueryTransactions" :show-form="showTransactionForm" :trx-form="trxForm" :item-search="itemSearchQuery" :selected-item-id="selectedItemId" :selected-item-qty="selectedItemQty" :filtered-search-items="filteredSearchItems" :get-customer-name="getCustomerName" :get-service-name="getServiceName" :get-service-unit="getServiceUnit" :get-price="getPrice" :format-date="formatDate" @update:search-query="searchQueryTransactions = $event" @open-add="openAddTransaction" @close-form="showTransactionForm = false" @select-search-item="selectSearchItem" @add-item="addTrxItem" @remove-item="removeTrxItem" @save="saveTransaction" @delete="deleteTransaction" />
                    <TagihanView v-if="activeTab === 'tagihan'" :invoices="filteredInvoices" :customers="customers" :search-query="searchQueryInvoices" :show-form="showInvoiceForm" :invoice-form="invoiceForm" :draft-items="draftInvoiceItems" :draft-total="draftInvoiceTotal" :get-customer-name="getCustomerName" :format-month-year="formatMonthYear" @update:search-query="searchQueryInvoices = $event" @open-add="openAddInvoice" @close-form="showInvoiceForm = false" @calculate="calculateDraftInvoice" @save="saveInvoice" @delete="deleteInvoice" @update-status="updatePaymentStatus" @print="printInvoice" />
                    <LaporanView v-if="activeTab === 'laporan'" :customers="customers" :report-invoices="reportInvoices" :report-totals="reportTotals" :filter-client="reportFilterClient" :filter-month="reportFilterMonth" :get-customer-name="getCustomerName" :format-month-year="formatMonthYear" @update:filter-client="reportFilterClient = $event" @update:filter-month="reportFilterMonth = $event" @export="exportToExcel" />
                    <PelangganView v-if="activeTab === 'pelanggan' || activeTab === 'harga_khusus'" :active-tab="activeTab" :customers="filteredCustomers" :services="services" :selected-customer="selectedCustomer" :temp-prices="tempPrices" :search-query="searchQueryCustomers" :show-form="showCustomerForm" :is-editing="isEditing" :customer-form="customerForm" @update:search-query="searchQueryCustomers = $event" @open-add="openAddCustomer" @open-edit="openEditCustomer" @open-custom="openCustomPrices" @close-form="showCustomerForm = false" @save="saveCustomer" @delete="deleteCustomer" @save-custom="saveCustomPrices" @back-to-list="activeTab = 'pelanggan'" />
                    <MasterItemView v-if="activeTab === 'layanan'" :services="services" :show-form="showServiceForm" :is-editing="isEditingService" :service-form="serviceForm" @open-add="openAddService" @open-edit="openEditService" @close-form="showServiceForm = false" @save="saveService" @delete="deleteService" @import-guest="importGuestServices" />
                    <ProfilView v-if="activeTab === 'profil'" :profile="profile" @save="saveProfile" />
                </main>
            </div>

            <!-- PRINTABLE INVOICE -->
            <InvoicePrintView v-if="printData" :print-data="printData" :profile="profile" :get-customer-name="getCustomerName" :get-customer-address="getCustomerAddress" :format-date="formatDate" :format-month-year="formatMonthYear" />
        </div>
    `,
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

        const profile = ref({ nama_laundry: '', alamat: '', no_telepon: '', bank_cabang: '', bank_nomor: '', bank_nama: '', logo_url: '', tos: '' });
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
        const serviceForm = ref({ id: '', nama_layanan: '', satuan: 'Pcs', harga_standar: 0, kategori: 'Linen Kamar' });

        const showTransactionForm = ref(false);
        const trxForm = ref({ id_pelanggan: '', tanggal: '', items: [] });

        const itemSearchQuery = ref('');
        const selectedItemId = ref('');
        const selectedItemQty = ref('');

        const showInvoiceForm = ref(false);
        const invoiceForm = ref({ id_pelanggan: '', periode: '' });
        const draftInvoiceItems = ref([]);
        const draftInvoiceTotal = ref(0);
        const draftTrxIds = ref([]);

        const printData = ref(null);

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('apk') === 'true') {
            isApk.value = true;
            isLoggedIn.value = true;
        } else if (localStorage.getItem('nays_logged_in') === 'true') {
            isLoggedIn.value = true;
        }

        const showForm = computed(() => showTransactionForm.value || showCustomerForm.value || showServiceForm.value);

        const changeTab = (tab) => {
            activeTab.value = tab;
            menuOpen.value = false;
        };

        const triggerAdd = () => {
            if (activeTab.value === 'transaksi') openAddTransaction();
            else if (activeTab.value === 'pelanggan') openAddCustomer();
            else if (activeTab.value === 'layanan') openAddService();
        };

        onMounted(() => {
            onSnapshot(doc(db, "pengaturan", "profil"), (snap) => { if (snap.exists()) profile.value = snap.data(); });
            onSnapshot(collection(db, "pelanggan"), (snap) => {
                const list = []; snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                customers.value = list.sort((a, b) => a.nama_pelanggan.localeCompare(b.nama_pelanggan));
            });
            onSnapshot(collection(db, "layanan"), (snap) => {
                const list = []; snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                services.value = list.sort((a, b) => a.nama_layanan.localeCompare(b.nama_layanan));
            });
            onSnapshot(collection(db, "harga_khusus"), (snap) => {
                const list = []; snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                customPricesList.value = list;
            });
            onSnapshot(collection(db, "transaksi"), (snap) => {
                const list = []; snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                transactions.value = list.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
            });
            onSnapshot(collection(db, "tagihan"), (snap) => {
                const list = []; snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
                invoices.value = list.sort((a, b) => b.tanggal_buat.localeCompare(a.tanggal_buat));
            });
        });

        const getCustomerName = (id) => { const c = customers.value.find(x => x.id === id); return c ? c.nama_pelanggan : 'Tanpa Nama'; };
        const getCustomerAddress = (id) => { const c = customers.value.find(x => x.id === id); return c ? c.alamat : '-'; };
        const getServiceName = (id) => { const s = services.value.find(x => x.id === id); return s ? s.nama_layanan : 'Item'; };
        const getServiceUnit = (id) => { const s = services.value.find(x => x.id === id); return s ? s.satuan : 'Pcs'; };
        const getPrice = (custId, itemId) => {
            const pFound = customPricesList.value.find(p => p.id_pelanggan === custId && p.id_layanan === itemId);
            if (pFound && pFound.harga_custom !== undefined && pFound.harga_custom !== '') return Number(pFound.harga_custom);
            const s = services.value.find(x => x.id === itemId); return s ? Number(s.harga_standar) : 0;
        };
        const formatDate = (ds) => { if (!ds) return '-'; if (ds.includes('T')) ds = ds.split('T')[0]; const p = ds.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ds; };
        const formatMonthYear = (ms) => {
            if (!ms) return '-'; const p = ms.split('-');
            if (p.length === 2) { const m = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]; return `${m[parseInt(p[1]) - 1]} ${p[0]}`; }
            return ms;
        };

        const getCustomerUnbilledTotal = (custId) => {
            let total = 0;
            transactions.value.filter(t => t.id_pelanggan === custId && t.status_tagihan === 'belum_ditagih').forEach(t => {
                t.items.forEach(item => { total += Number(item.qty) * getPrice(custId, item.id_layanan); });
            });
            return total;
        };

        const hasUnbilledCustomers = computed(() => customers.value.some(c => getCustomerUnbilledTotal(c.id) > 0));
        const unbilledTransactionsCount = computed(() => transactions.value.filter(t => t.status_tagihan === 'belum_ditagih').length);

        const filteredCustomers = computed(() => {
            const q = searchQueryCustomers.value.toLowerCase().trim();
            return !q ? customers.value : customers.value.filter(c => c.nama_pelanggan.toLowerCase().includes(q) || c.alamat.toLowerCase().includes(q));
        });
        const filteredTransactions = computed(() => {
            const q = searchQueryTransactions.value.toLowerCase().trim();
            return !q ? transactions.value : transactions.value.filter(t => getCustomerName(t.id_pelanggan).toLowerCase().includes(q));
        });
        const filteredInvoices = computed(() => {
            const q = searchQueryInvoices.value.toLowerCase().trim();
            return !q ? invoices.value : invoices.value.filter(inv => inv.no_invoice.toLowerCase().includes(q) || getCustomerName(inv.id_pelanggan).toLowerCase().includes(q));
        });
        const reportInvoices = computed(() => {
            return invoices.value.filter(inv => (!reportFilterClient.value || inv.id_pelanggan === reportFilterClient.value) && (!reportFilterMonth.value || inv.periode === reportFilterMonth.value));
        });
        const reportTotals = computed(() => {
            let tO = 0, tT = 0, tP = 0;
            reportInvoices.value.forEach(inv => {
                const val = Number(inv.total_tagihan) || 0; tO += val;
                if (inv.status_pembayaran === 'lunas_cash' || inv.status_pembayaran === 'lunas_transfer') tT += val; else tP += val;
            });
            return { totalOmset: tO, totalTerbayar: tT, totalPiutang: tP };
        });

        const exportToExcel = () => {
            if (reportInvoices.value.length === 0) { alert("Tidak ada data."); return; }
            const data = reportInvoices.value.map(inv => ({
                "No. Invoice": inv.no_invoice, "Nama Klien": getCustomerName(inv.id_pelanggan), "Periode": formatMonthYear(inv.periode), "Total (IDR)": inv.total_tagihan, "Status": inv.status_pembayaran.replace('_', ' ')
            }));
            const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Laporan"); XLSX.writeFile(wb, `Omset_${reportFilterMonth.value}.xlsx`);
        };

        const sendOtpCode = async () => {
            let phone = phoneNumber.value.replace(/[^0-9]/g, '');
            if (!phone) { alert("Harap masukkan nomor WA."); return; }
            if (phone.startsWith('0')) phone = '62' + phone.substring(1); else if (!phone.startsWith('62')) phone = '62' + phone;
            if (phone !== '628123654594' && phone !== '62895428400665') { alert("Akses ditolak."); return; }
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const waUrl = `https://wa.mrdsolution.my.id/api/send-message?key=7BC82018076500360255A4E0F78D52C7&session=botmrd&to=${phone}&text=${encodeURIComponent(`Kode OTP Nays Laundry: *${otp}*`)}`;
            isLoadingOtp.value = true;
            try { await fetch(waUrl, { mode: 'no-cors' }); generatedOtp.value = otp; otpSent.value = true; alert("OTP terkirim!"); } catch (e) { alert("Gagal: " + e.message); } finally { isLoadingOtp.value = false; }
        };
        const verifyOtpCode = () => {
            if (inputOtp.value.toString() === generatedOtp.value.toString()) { isLoggedIn.value = true; localStorage.setItem('nays_logged_in', 'true'); } else { alert("Kode OTP salah."); }
        };
        const logoutAdmin = () => {
            if (confirm("Keluar sistem?")) { isLoggedIn.value = false; localStorage.removeItem('nays_logged_in'); otpSent.value = false; phoneNumber.value = ''; inputOtp.value = ''; }
        };

        const saveProfile = async () => { try { await setDoc(doc(db, "pengaturan", "profil"), profile.value, { merge: true }); alert("Profil tersimpan!"); } catch (e) { alert("Error: " + e.message); } };
        const openAddCustomer = () => { isEditing.value = false; customerForm.value = { id: '', nama_pelanggan: '', alamat: '', no_telepon: '' }; showCustomerForm.value = true; };
        const openEditCustomer = (c) => { isEditing.value = true; customerForm.value = { ...c }; showCustomerForm.value = true; };
        const saveCustomer = async () => {
            try {
                if (isEditing.value) await updateDoc(doc(db, "pelanggan", customerForm.value.id), { nama_pelanggan: customerForm.value.nama_pelanggan, alamat: customerForm.value.alamat, no_telepon: customerForm.value.no_telepon });
                else await addDoc(collection(db, "pelanggan"), { nama_pelanggan: customerForm.value.nama_pelanggan, alamat: customerForm.value.alamat, no_telepon: customerForm.value.no_telepon, tanggal_bergabung: new Date().toISOString() });
                showCustomerForm.value = false;
            } catch (e) { alert("Error: " + e.message); }
        };
        const deleteCustomer = async (id) => { if (confirm("Hapus pelanggan?")) { try { await deleteDoc(doc(db, "pelanggan", id)); } catch (e) { alert("Error: " + e.message); } } };

        const openAddService = () => { isEditingService.value = false; serviceForm.value = { id: '', nama_layanan: '', satuan: 'Pcs', harga_standar: 0 }; showServiceForm.value = true; };
        const openEditService = (item) => { 
    isEditingService.value = true; 
    serviceForm.value = { 
        ...item, 
        kategori: item.kategori || 'Linen Kamar' // <-- 3. Sisipkan di sini
    }; 
    showServiceForm.value = true; 
};
        const saveService = async () => {
    try {
        if (isEditingService.value) {
            await updateDoc(doc(db, "layanan", serviceForm.value.id), {
                nama_layanan: serviceForm.value.nama_layanan,
                satuan: serviceForm.value.satuan,
                harga_standar: Number(serviceForm.value.harga_standar),
                kategori: serviceForm.value.kategori || 'Linen Kamar' // <-- 1. Sisipkan di sini (Edit)
            });
        } else {
            await addDoc(collection(db, "layanan"), {
                nama_layanan: serviceForm.value.nama_layanan,
                satuan: serviceForm.value.satuan,
                harga_standar: Number(serviceForm.value.harga_standar),
                kategori: serviceForm.value.kategori || 'Linen Kamar', // <-- 2. Sisipkan di sini (Tambah)
                tanggal_dibuat: new Date().toISOString()
            });
        }
        showServiceForm.value = false;
    } catch (e) { alert("Error: " + e.message); }
};
        const deleteService = async (id) => { if (confirm("Hapus item?")) { try { await deleteDoc(doc(db, "layanan", id)); } catch (e) { alert("Error: " + e.message); } } };

        const openCustomPrices = (c) => {
            selectedCustomer.value = c; tempPrices.value = {};
            services.value.forEach(i => { const p = customPricesList.value.find(x => x.id_pelanggan === c.id && x.id_layanan === i.id); tempPrices.value[i.id] = p ? p.harga_custom : ''; });
            activeTab.value = 'harga_khusus';
        };
        const saveCustomPrices = async () => {
            try {
                const cId = selectedCustomer.value.id;
                for (const k of Object.keys(tempPrices.value)) {
                    const val = tempPrices.value[k], dId = `${cId}_${k}`;
                    if (val !== '' && val !== null && val !== undefined) await setDoc(doc(db, "harga_khusus", dId), { id_pelanggan: cId, id_layanan: k, harga_custom: Number(val) });
                    else await deleteDoc(doc(db, "harga_khusus", dId));
                }
                alert("Tarif khusus tersimpan!"); activeTab.value = 'pelanggan';
            } catch (e) { alert("Error: " + e.message); }
        };

        const openAddTransaction = () => {
            trxForm.value = { id_pelanggan: '', tanggal: new Date().toISOString().split('T')[0], items: [] };
            itemSearchQuery.value = ''; selectedItemId.value = ''; selectedItemQty.value = ''; showTransactionForm.value = true;
        };
        const filteredSearchItems = computed(() => {
            const q = itemSearchQuery.value.toLowerCase().trim();
            return !q ? services.value : services.value.filter(s => s.nama_layanan.toLowerCase().includes(q));
        });
        const selectSearchItem = (i) => { selectedItemId.value = i.id; itemSearchQuery.value = i.nama_layanan; };
        const addTrxItem = () => {
            if (!selectedItemId.value) { alert("Pilih item!"); return; }
            if (!selectedItemQty.value || Number(selectedItemQty.value) <= 0) { alert("Isi Qty!"); return; }
            const ex = trxForm.value.items.find(x => x.id_layanan === selectedItemId.value);
            if (ex) ex.qty += Number(selectedItemQty.value);
            else trxForm.value.items.push({ id_layanan: selectedItemId.value, qty: Number(selectedItemQty.value) });
            selectedItemId.value = ''; selectedItemQty.value = ''; itemSearchQuery.value = '';
        };
        const removeTrxItem = (idx) => { trxForm.value.items.splice(idx, 1); };
        const saveTransaction = async () => {
            if (!trxForm.value.id_pelanggan || !trxForm.value.tanggal) { alert("Harap isi data."); return; }
            if (trxForm.value.items.length === 0) { alert("Isi minimal 1 item."); return; }
            try {
                await addDoc(collection(db, "transaksi"), { id_pelanggan: trxForm.value.id_pelanggan, tanggal: trxForm.value.tanggal, items: trxForm.value.items, status_tagihan: 'belum_ditagih' });
                alert("Transaksi tersimpan!"); showTransactionForm.value = false;
            } catch (e) { alert("Error: " + e.message); }
        };
        const deleteTransaction = async (id, status) => {
            if (status === 'sudah_ditagih') { alert("Sudah masuk invoice."); return; }
            if (confirm("Hapus transaksi?")) { try { await deleteDoc(doc(db, "transaksi", id)); } catch (e) { alert("Error: " + e.message); } }
        };

        const openAddInvoice = () => {
            invoiceForm.value = { id_pelanggan: '', periode: new Date().toISOString().slice(0, 7) };
            draftInvoiceItems.value = []; draftInvoiceTotal.value = 0; draftTrxIds.value = []; showInvoiceForm.value = true;
        };
        const calculateDraftInvoice = () => {
            const cId = invoiceForm.value.id_pelanggan, period = invoiceForm.value.periode;
            if (!cId || !period) { draftInvoiceItems.value = []; draftInvoiceTotal.value = 0; draftTrxIds.value = []; return; }
            const flt = transactions.value.filter(t => t.id_pelanggan === cId && t.status_tagihan === 'belum_ditagih' && t.tanggal.startsWith(period));
            const mapItems = {}, tIds = [];
            flt.forEach(t => { tIds.push(t.id); t.items.forEach(i => { mapItems[i.id_layanan] = (mapItems[i.id_layanan] || 0) + i.qty; }); });
            const list = []; let gTotal = 0;
            for (const k of Object.keys(mapItems)) {
                const qty = mapItems[k], p = getPrice(cId, k), sub = qty * p;
                list.push({ id_layanan: k, nama_layanan: getServiceName(k), satuan: getServiceUnit(k), qty, harga_satuan: p, subtotal: sub });
                gTotal += sub;
            }
            draftInvoiceItems.value = list; draftInvoiceTotal.value = gTotal; draftTrxIds.value = tIds;
        };
        const saveInvoice = async () => {
            if (draftInvoiceItems.value.length === 0) { alert("Draf kosong."); return; }
            try {
                const rId = Math.floor(100 + Math.random() * 900), noInv = `INV/${invoiceForm.value.periode.replace('-', '')}/${rId}`;
                await addDoc(collection(db, "tagihan"), { no_invoice: noInv, id_pelanggan: invoiceForm.value.id_pelanggan, periode: invoiceForm.value.periode, tanggal_buat: new Date().toISOString(), total_tagihan: draftInvoiceTotal.value, status_pembayaran: 'belum_lunas', items: draftInvoiceItems.value });
                await Promise.all(draftTrxIds.value.map(id => updateDoc(doc(db, "transaksi", id), { status_tagihan: 'sudah_ditagih' })));
                alert("Tagihan terbit!"); showInvoiceForm.value = false;
            } catch (e) { alert("Error: " + e.message); }
        };
        const deleteInvoice = async (id) => { if (confirm("Hapus tagihan?")) { try { await deleteDoc(doc(db, "tagihan", id)); } catch (e) { alert("Error: " + e.message); } } };
        const updatePaymentStatus = async (id, ns) => { try { await updateDoc(doc(db, "tagihan", id), { status_pembayaran: ns }); } catch (e) { alert("Error: " + e.message); } };
        const printInvoice = (inv) => { printData.value = inv; setTimeout(() => { window.print(); }, 300); };

        const importGuestServices = async () => {
            const items = [
                { name: "Shirt/Blouse", price: 5000 }, { name: "T-Shirt", price: 4000 }, { name: "Polo/Long Sleeved T-Shirt", price: 5000 },
                { name: "Sweater/Hoodie", price: 5000 }, { name: "Under Shirt/Tank Top", price: 3000 }, { name: "Shorts/Skirt", price: 5000 },
                { name: "Trousers/Long Skirt", price: 7000 }, { name: "Jeans", price: 8000 }, { name: "Briefs/Boxer/Panties", price: 3000 },
                { name: "Bra", price: 4000 }, { name: "Swimsuit", price: 4000 }, { name: "Socks/Kaos Kaki", price: 2500 },
                { name: "Long Dress", price: 9000 }, { name: "Pajamas/Baju Tidur", price: 7000 }, { name: "Sarong/Sarung", price: 3000 },
                { name: "Scarf/Selendang", price: 3000 }, { name: "Topi", price: 5000 }, { name: "Baby Clothes/Baju Bayi", price: 3000 }
            ];
            if (confirm(`Impor ${items.length} item Guest Laundry?`)) {
                let cnt = 0;
                try {
                    for (const i of items) { await addDoc(collection(db, "layanan"), { nama_layanan: i.name, satuan: "Pcs", harga_standar: Number(i.price), tanggal_dibuat: new Date().toISOString() }); cnt++; }
                    alert(`Sukses impor ${cnt} item!`);
                } catch (e) { alert("Error: " + e.message); }
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
            draftInvoiceItems, draftInvoiceTotal, printData, showForm, triggerAdd,
            itemSearchQuery, selectedItemId, selectedItemQty, filteredSearchItems, selectSearchItem, addTrxItem, removeTrxItem,
            getCustomerName, getCustomerAddress, getServiceName, getServiceUnit, getPrice, formatDate, formatMonthYear,
            sendOtpCode, verifyOtpCode, logoutAdmin, saveProfile, openAddCustomer, openEditCustomer, saveCustomer, deleteCustomer,
            openAddService, openEditService, saveService, deleteService, openCustomPrices, saveCustomPrices,
            openAddTransaction, saveTransaction, deleteTransaction, openAddInvoice, calculateDraftInvoice, saveInvoice, deleteInvoice,
            updatePaymentStatus, printInvoice, exportToExcel, getCustomerUnbilledTotal, hasUnbilledCustomers, importGuestServices
        };
    }
}).mount('#app');