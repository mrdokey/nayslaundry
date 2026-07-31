import { db, doc, setDoc, onSnapshot } from "./firebase-db.js";
import { useAuth } from "./services/useAuth.js";
import { useLayanan } from "./services/useLayanan.js";
import { usePelanggan } from "./services/usePelanggan.js";
import { useTransaksi } from "./services/useTransaksi.js";
import { useTagihan } from "./services/useTagihan.js";
import { useLaporan } from "./services/useLaporan.js";

import AuthLogin from "./components/AuthLogin.js";
import DashboardView from "./components/DashboardView.js";
import TransaksiView from "./components/TransaksiView.js";
import TagihanView from "./components/TagihanView.js";
import LaporanView from "./components/LaporanView.js";
import PelangganView from "./components/PelangganView.js";
import MasterItemView from "./components/MasterItemView.js";
import ProfilView from "./components/ProfilView.js";
import InvoicePrintView from "./components/InvoicePrintView.js";

const { createApp, ref, onMounted, computed, watch } = Vue;

createApp({
    components: { AuthLogin, DashboardView, TransaksiView, TagihanView, LaporanView, PelangganView, MasterItemView, ProfilView, InvoicePrintView },
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

                <!-- DRAWER MOBILE DENGAN PENGUNCI SENTUHAN -->
                <div v-if="menuOpen" @click="menuOpen = false" @touchmove.prevent class="fixed inset-0 bg-black/40 z-40 touch-none"></div>
                <aside :class="menuOpen ? 'translate-x-0' : '-translate-x-full'" class="fixed inset-y-0 left-0 w-56 bg-indigo-900 text-white z-50 transform transition-transform duration-200 flex flex-col overflow-y-auto overscroll-contain">
                    <div class="p-4 border-b border-indigo-800 flex justify-between items-center"><span class="font-bold">Menu</span><button @click="menuOpen = false">✕</button></div>
                    <nav class="flex-1 p-3 space-y-1">
                        <button v-for="m in menuList" :key="m.id" @click="changeTab(m.id)" :class="activeTab===m.id?'bg-indigo-800':''" class="w-full text-left p-2.5 rounded hover:bg-indigo-800 flex items-center space-x-2">
                            <span>{{ m.icon }}</span><span class="capitalize">{{ m.name }}</span>
                        </button>
                        <button v-if="!isApk" @click="logoutAdmin" class="w-full text-left p-2.5 rounded text-rose-300 hover:bg-rose-950 block mt-8 border-t border-indigo-800">🚪 Keluar</button>
                    </nav>
                </aside>

                <!-- SIDEBAR DESKTOP -->
                <aside :class="sidebarCollapsed ? 'w-16' : 'w-56'" class="hidden md:flex bg-indigo-900 text-white flex-col shadow-lg shrink-0 transition-all duration-200">
                    <div class="p-3 border-b border-indigo-800 flex items-center justify-between">
                        <div v-if="!sidebarCollapsed" class="flex items-center space-x-2 overflow-hidden">
                            <img v-if="profile.logo_url" :src="profile.logo_url" class="w-7 h-7 rounded-full object-cover bg-white shrink-0">
                            <span class="font-bold text-xs truncate">{{ profile.nama_laundry || 'Nays Laundry' }}</span>
                        </div>
                        <button @click="sidebarCollapsed = !sidebarCollapsed" class="p-1.5 text-base hover:bg-indigo-800 rounded w-full text-center">
                            {{ sidebarCollapsed ? '➡️' : '☰' }}
                        </button>
                    </div>
                    <nav class="flex-1 p-2 space-y-1 text-indigo-100">
                        <button v-for="m in menuList" :key="m.id" @click="changeTab(m.id)" 
                                :class="activeTab===m.id?'bg-indigo-800 text-white':''" 
                                :title="m.name"
                                class="w-full text-left p-2.5 rounded hover:bg-indigo-800 flex items-center space-x-3 transition">
                            <span class="text-base shrink-0">{{ m.icon }}</span>
                            <span v-if="!sidebarCollapsed" class="capitalize text-xs whitespace-nowrap">{{ m.name }}</span>
                        </button>
                        <button v-if="!isApk" @click="logoutAdmin" title="Keluar" class="w-full text-left p-2.5 rounded text-rose-300 hover:bg-rose-950 flex items-center space-x-3 mt-12 border-t border-indigo-800">
                            <span class="text-base shrink-0">🚪</span>
                            <span v-if="!sidebarCollapsed" class="text-xs">Keluar</span>
                        </button>
                    </nav>
                </aside>

                <!-- BOTTOM NAV MOBILE -->
                <nav class="flex md:hidden fixed bottom-0 left-0 right-0 h-14 bg-indigo-900 text-white border-t border-indigo-800 z-30 justify-around items-center shadow-lg">
                    <button @click="changeTab('dashboard')" :class="activeTab==='dashboard'?'text-white font-bold':'text-indigo-300'" class="flex flex-col items-center text-[9px]"><span class="text-base">🏠</span><span>Dashboard</span></button>
                    <button @click="changeTab('transaksi')" :class="activeTab==='transaksi'?'text-white font-bold':'text-indigo-300'" class="flex flex-col items-center text-[9px]"><span class="text-base">📝</span><span>Transaksi</span></button>
                    <button @click="changeTab('pelanggan')" :class="activeTab==='pelanggan'?'text-white font-bold':'text-indigo-300'" class="flex flex-col items-center text-[9px]"><span class="text-base">👥</span><span>Customer</span></button>
                    <button @click="changeTab('layanan')" :class="activeTab==='layanan'?'text-white font-bold':'text-indigo-300'" class="flex flex-col items-center text-[9px]"><span class="text-base">⚙️</span><span>Item</span></button>
                </nav>

                <main class="flex-1 p-4 pt-20 md:pt-4 overflow-y-auto">
                    <DashboardView v-if="activeTab === 'dashboard'" :customers="customers" :services="services" :unbilled-count="unbilledTransactionsCount" :has-unbilled="hasUnbilledCustomers" :get-unbilled-total="getCustomerUnbilledTotal" />
                    
                    <TransaksiView v-if="activeTab === 'transaksi'" 
                        :transactions="filteredTransactions" 
                        :customers="customers" 
                        :services="services" 
                        :search-query="searchQueryTransactions" 
                        :filter-start-date="filterStartDate" 
                        :filter-end-date="filterEndDate" 
                        :show-form="showTransactionForm" 
                        :is-editing-trx="isEditingTrx" 
                        :editing-trx-id="editingTrxId" 
                        :trx-form="trxForm" 
                        :item-search="itemSearchQuery" 
                        :selected-item-id="selectedItemId" 
                        :selected-item-qty="selectedItemQty" 
                        :selected-item-price="selectedItemPrice"
                        :filtered-search-items="filteredSearchItems" 
                        :get-customer-name="getCustomerName" 
                        :get-service-name="getServiceName" 
                        :get-service-unit="getServiceUnit" 
                        :get-price="getPrice" 
                        :format-date="formatDate" 
                        @update:search-query="searchQueryTransactions = $event" 
                        @update:filter-start-date="filterStartDate = $event" 
                        @update:filter-end-date="filterEndDate = $event" 
                        @update:item-search="itemSearchQuery = $event" 
                        @update:selected-item-qty="selectedItemQty = $event" 
                        @update:selected-item-price="selectedItemPrice = $event"
                        @open-add="openAddTransaction" 
                        @open-edit="openEditTransaction" 
                        @close-form="showTransactionForm = false" 
                        @select-search-item="selectSearchItem" 
                        @add-item="addTrxItem" 
                        @remove-item="removeTrxItem" 
                        @save="saveTransaction" 
                        @delete="deleteTransaction" 
                        @print-a5="printA5Note"
                        @shortcut-tagihan="handleShortcutTagihan" />
                    
                    <TagihanView v-if="activeTab === 'tagihan'" 
                        :invoices="filteredInvoices" 
                        :unpaid-invoices="unpaidInvoices" 
                        :paid-invoices="paidInvoices" 
                        :customers="customers" 
                        :search-query="searchQueryInvoices" 
                        :selected-filter-month="selectedFilterMonth" 
                        :selected-filter-year="selectedFilterYear" 
                        :available-years="availableYears" 
                        :show-form="showInvoiceForm" 
                        :is-editing-invoice="isEditingInvoice" 
                        :editing-invoice-id="editingInvoiceId" 
                        :invoice-form="invoiceForm" 
                        :selected-trx-ids="selectedTrxIds" 
                        :manual-subtotal="manualSubtotal" 
                        :discount-amount="discountAmount" 
                        :available-trx-for-draft="availableTrxForDraft" 
                        :draft-invoice-items="draftInvoiceItems" 
                        :calculated-subtotal="calculatedSubtotal" 
                        :grand-total="grandTotal" 
                        :get-customer-name="getCustomerName" 
                        :format-month-year="formatMonthYear" 
                        @update:search-query="searchQueryInvoices = $event" 
                        @update:selected-filter-month="selectedFilterMonth = $event" 
                        @update:selected-filter-year="selectedFilterYear = $event" 
                        @update:manual-subtotal="manualSubtotal = $event" 
                        @update:discount-amount="discountAmount = $event" 
                        @open-add="openAddInvoice" 
                        @open-edit="openEditInvoice" 
                        @close-form="showInvoiceForm = false" 
                        @calculate="calculateDraftInvoice" 
                        @select-all-trx="selectAllTrx" 
                        @deselect-all-trx="deselectAllTrx" 
                        @save="saveInvoice" 
                        @delete="deleteInvoice" 
                        @update-status="updatePaymentStatus" 
                        @print="printInvoice" @print-kwitansi="printKwitansi"
                        />
                    
                    <LaporanView v-if="activeTab === 'laporan'" :customers="customers" :report-invoices="reportInvoices" :report-totals="reportTotals" :filter-client="reportFilterClient" :filter-month="reportFilterMonth" :get-customer-name="getCustomerName" :format-month-year="formatMonthYear" @update:filter-client="reportFilterClient = $event" @update:filter-month="reportFilterMonth = $event" @export="exportToExcel" />
                    
                    <PelangganView v-if="activeTab === 'pelanggan' || activeTab === 'harga_khusus'" 
                        :active-tab="activeTab" 
                        :customers="filteredCustomers" 
                        :services="services" 
                        :selected-customer="selectedCustomer" 
                        :temp-prices="tempPrices" 
                        :search-query="searchQueryCustomers" 
                        :show-form="showCustomerForm" 
                        :is-editing="isEditing" 
                        :customer-form="customerForm" 
                        @update:search-query="searchQueryCustomers = $event" 
                        @open-add="openAddCustomer" 
                        @open-edit="openEditCustomer" 
                        @open-custom="handleOpenCustom" 
                        @close-form="showCustomerForm = false" 
                        @save="saveCustomer" 
                        @delete="deleteCustomer" 
                        @save-custom="handleSaveCustom" 
                        @back-to-list="activeTab = 'pelanggan'" />
                    
                    <MasterItemView v-if="activeTab === 'layanan'" :services="services" :show-form="showServiceForm" :is-editing="isEditingService" :service-form="serviceForm" @open-add="openAddService" @open-edit="openEditService" @close-form="showServiceForm = false" @save="saveService" @delete="deleteService" @import-guest="importGuestServices" />
                    <ProfilView v-if="activeTab === 'profil'" :profile="profile" @save="saveProfile" />
                </main>
            </div>

<!-- Sesuaikan tag <InvoicePrintView> di app.js Anda menjadi seperti ini: -->
<InvoicePrintView v-if="printData || printA5Data || printKwitansiData" 
    :print-data="printData" 
    :print-a5-data="printA5Data" 
    :print-kwitansi-data="printKwitansiData"
    :profile="profile" 
    :get-customer-name="getCustomerName" 
    :get-customer-address="getCustomerAddress" 
    :get-customer-markup="getCustomerMarkup"
    :get-service-name="getServiceName" 
    :get-service-unit="getServiceUnit" 
    :get-price="getPrice"
    :format-date="formatDate" 
    :format-month-year="formatMonthYear"
    :terbilang="terbilang" />
        </div>
    `,
    setup() {
        const savedTab = localStorage.getItem('nays_active_tab');
        const activeTab = ref(savedTab || 'dashboard');
        
        const menuOpen = ref(false);
        const sidebarCollapsed = ref(false);

        watch(menuOpen, (val) => {
            if (val) {
                document.body.style.overflow = 'hidden';
                document.documentElement.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
            }
        });

        const profile = ref({ nama_laundry: '', alamat: '', no_telepon: '', bank_cabang: '', bank_nomor: '', bank_nama: '', logo_url: '', tos: '' });

        onMounted(() => {
            onSnapshot(doc(db, "pengaturan", "profil"), (snap) => { if (snap.exists()) profile.value = snap.data(); });
        });

        const saveProfile = async () => { try { await setDoc(doc(db, "pengaturan", "profil"), profile.value, { merge: true }); alert("Profil tersimpan!"); } catch (e) { alert("Error: " + e.message); } };

        const menuList = [
            { id: 'dashboard', name: 'Dashboard', icon: '🏠' },
            { id: 'transaksi', name: 'Transaksi', icon: '📝' },
            { id: 'tagihan', name: 'Tagihan', icon: '💵' },
            { id: 'laporan', name: 'Laporan', icon: '📈' },
            { id: 'pelanggan', name: 'Pelanggan', icon: '👥' },
            { id: 'layanan', name: 'Master Item', icon: '⚙️' },
            { id: 'profil', name: 'Profil', icon: '🏢' }
        ];

        const auth = useAuth();
        const layanan = useLayanan();
        const pelanggan = usePelanggan(layanan.services);
        const transaksi = useTransaksi(pelanggan.customers, layanan.services, pelanggan.getPrice, pelanggan.getCustomerName);
        const tagihan = useTagihan(transaksi.transactions, pelanggan.getPrice, layanan.getServiceName, layanan.getServiceUnit, pelanggan.getCustomerName);
        const laporan = useLaporan(tagihan.invoices, pelanggan.getCustomerName, tagihan.formatMonthYear);

        const showForm = computed(() => transaksi.showTransactionForm.value || pelanggan.showCustomerForm.value || layanan.showServiceForm.value);

        const changeTab = (tab) => { 
            activeTab.value = tab; 
            localStorage.setItem('nays_active_tab', tab); 
            menuOpen.value = false; 
        };

        const triggerAdd = () => {
            if (activeTab.value === 'transaksi') transaksi.openAddTransaction();
            else if (activeTab.value === 'pelanggan') pelanggan.openAddCustomer();
            else if (activeTab.value === 'layanan') layanan.openAddService();
        };

        // HANDLER SHORTCUT TAGIHAN DARI MENU TRANSAKSI
        const handleShortcutTagihan = ({ id_pelanggan, periode, trx_ids }) => {
            activeTab.value = 'tagihan';
            tagihan.invoiceForm.value = { id_pelanggan, periode };
            tagihan.selectedTrxIds.value = trx_ids;
            tagihan.isEditingInvoice.value = false;
            tagihan.showInvoiceForm.value = true;
            tagihan.calculateDraftInvoice();
        };

        // HANDLER HARGA KHUSUS PELANGGAN
        const handleOpenCustom = (c) => {
            pelanggan.openCustomPrices(c);
            activeTab.value = 'harga_khusus';
        };

        const handleSaveCustom = async () => {
            await pelanggan.saveCustomPrices();
            activeTab.value = 'pelanggan';
        };

        const logoutAdmin = () => {
            if (confirm("Keluar sistem?")) { 
                auth.isLoggedIn.value = false; 
                localStorage.removeItem('nays_logged_in'); 
                localStorage.removeItem('nays_active_tab'); 
                activeTab.value = 'dashboard'; 
                auth.otpSent.value = false; 
                auth.phoneNumber.value = ''; 
                auth.inputOtp.value = ''; 
            }
        };

        return {
            activeTab, menuOpen, sidebarCollapsed, menuList, profile, saveProfile, showForm, changeTab, triggerAdd, logoutAdmin,
            handleShortcutTagihan, handleOpenCustom, handleSaveCustom,
            ...auth, ...layanan, ...pelanggan, ...transaksi, ...tagihan, ...laporan
        };
    }
}).mount('#app');