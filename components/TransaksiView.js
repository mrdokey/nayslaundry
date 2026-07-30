export default {
    name: 'TransaksiView',
    props: [
        'transactions', 'customers', 'services', 
        'searchQuery', 'filterStartDate', 'filterEndDate', 'showForm', 'isEditingTrx', 
        'editingTrxId', 'trxForm', 'itemSearch', 'selectedItemId', 'selectedItemQty', 'selectedItemPrice',
        'filteredSearchItems', 'getCustomerName', 'getServiceName', 'getServiceUnit', 
        'getPrice', 'formatDate'
    ],
    emits: [
        'update:searchQuery', 'update:filterStartDate', 'update:filterEndDate', 
        'update:itemSearch', 'update:selectedItemQty', 'update:selectedItemPrice', 'openAdd', 'openEdit', 
        'closeForm', 'selectSearchItem', 'addItem', 'removeItem', 'save', 'delete', 'printA5'
    ],
    setup(props) {
        const expandedCustomers = Vue.ref([]); // State lipat/buka per pelanggan

        // Mengelompokkan transaksi PER PELANGGAN (Hotel/Vila)
        const groupedByCustomer = Vue.computed(() => {
            if (!props.transactions) return {};
            const groups = {};
            
            props.transactions.forEach(t => {
                const custId = t.id_pelanggan;
                if (!groups[custId]) groups[custId] = [];
                groups[custId].push(t);
            });

            // Urutkan di dalam setiap hotel: Belum Ditagih di ATAS, Sudah Ditagih di BAWAH
            for (const custId in groups) {
                groups[custId].sort((a, b) => {
                    const aUnbilled = a.status_tagihan !== 'sudah_ditagih' ? 0 : 1;
                    const bUnbilled = b.status_tagihan !== 'sudah_ditagih' ? 0 : 1;
                    if (aUnbilled !== bUnbilled) return aUnbilled - bUnbilled;
                    return b.tanggal.localeCompare(a.tanggal); // Urutan kedua berdasarkan tanggal terbaru
                });
            }
            return groups;
        });

        const toggleCustomerGroup = (custId) => {
            const idx = expandedCustomers.value.indexOf(custId);
            if (idx > -1) expandedCustomers.value.splice(idx, 1);
            else expandedCustomers.value.push(custId);
        };

        const isCustomerExpanded = (custId) => {
            if (props.searchQuery && props.searchQuery.trim() !== '') return true; // Otomatis buka saat cari
            return expandedCustomers.value.includes(custId);
        };

        // Menghitung jumlah belum ditagih spesifik per hotel
        const getCustomerUnbilledCount = (custTransactions) => {
            return custTransactions.filter(t => t.status_tagihan !== 'sudah_ditagih').length;
        };

        return { groupedByCustomer, toggleCustomerGroup, isCustomerExpanded, getCustomerUnbilledCount };
    },
    template: `
        <section class="space-y-3">
            <div class="flex justify-between items-center">
                <h2 class="text-base font-bold">Transaksi Laundry</h2>
                <button v-if="!showForm" @click="$emit('openAdd')" class="hidden md:block bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 shadow text-xs">+ Tambah Transaksi</button>
            </div>

            <!-- Panel Filter Pencarian & Rentang Tanggal -->
            <div v-if="!showForm" class="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                    <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Cari Pelanggan</label>
                    <input :value="searchQuery" @input="$emit('update:searchQuery', $event.target.value)" type="text" placeholder="🔍 Ketik nama hotel/vila..." class="w-full px-2.5 py-1 border rounded-lg text-xs focus:outline-indigo-500">
                </div>
                <div>
                    <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Dari Tanggal</label>
                    <input :value="filterStartDate" @input="$emit('update:filterStartDate', $event.target.value)" type="date" class="w-full px-2 py-1 border rounded-lg text-xs">
                </div>
                <div>
                    <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Sampai Tanggal</label>
                    <input :value="filterEndDate" @input="$emit('update:filterEndDate', $event.target.value)" type="date" class="w-full px-2 py-1 border rounded-lg text-xs">
                </div>
            </div>

            <!-- Form Transaksi (Tambah / Edit Cart-Style) -->
            <div v-if="showForm" class="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <div class="flex justify-between items-center">
                    <h3 class="font-bold text-slate-700 text-xs">{{ isEditingTrx ? 'Ubah Catatan Transaksi' : 'Form Pencatatan Laundry' }}</h3>
                    <span v-if="isEditingTrx" class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">Mode Edit</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Pelanggan</label>
                        <select v-model="trxForm.id_pelanggan" class="w-full p-2 border rounded text-xs">
                            <option value="">-- Pilih Hotel/Vila --</option>
                            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.nama_pelanggan }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Tanggal Pengambilan</label>
                        <input v-model="trxForm.tanggal" type="date" class="w-full p-2 border rounded text-xs">
                    </div>
                </div>

                <!-- Selector Item Cart dengan HARGA EDITABLE -->
                <div v-if="trxForm.id_pelanggan" class="border p-3 rounded-lg bg-slate-50 space-y-2">
                    <h4 class="font-bold text-xs text-indigo-900 uppercase">Tambah Item ke Daftar:</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                        <div class="relative sm:col-span-2">
                            <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Cari & Pilih Item</label>
                            <input type="text" :value="itemSearch" @input="$emit('update:itemSearch', $event.target.value)" placeholder="Ketik nama item..." class="w-full p-2 border rounded text-xs bg-white focus:outline-indigo-500">
                            <div v-if="itemSearch && selectedItemId === ''" class="absolute left-0 right-0 max-h-40 overflow-y-auto bg-white border rounded shadow-lg z-50 mt-1">
                                <button v-for="item in filteredSearchItems" :key="item.id" @click="$emit('selectSearchItem', item)" type="button" class="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 border-b last:border-0 block text-slate-700">
                                    {{ item.nama_layanan }} (Rp {{ getPrice(trxForm.id_pelanggan, item.id).toLocaleString() }})
                                </button>
                                <div v-if="filteredSearchItems.length === 0" class="p-2 text-center text-slate-400">Item tidak ditemukan</div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Jumlah (Qty)</label>
                            <input type="number" :value="selectedItemQty" @input="$emit('update:selectedItemQty', $event.target.value)" placeholder="0" class="w-full p-2 border rounded text-xs text-center bg-white focus:outline-indigo-500">
                        </div>
                        <div>
                            <label class="block text-[10px] font-semibold text-slate-500 mb-0.5">Harga / Unit (Rp)</label>
                            <input type="number" :value="selectedItemPrice" @input="$emit('update:selectedItemPrice', $event.target.value)" placeholder="Tarif" class="w-full p-2 border rounded text-xs text-center bg-white focus:outline-indigo-500 font-semibold">
                        </div>
                    </div>
                    <button type="button" @click="$emit('addItem')" class="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded font-bold text-xs shadow">
                        ➕ Masukkan ke Daftar
                    </button>
                </div>

                <!-- Daftar Item Rincian -->
                <div v-if="trxForm.items.length > 0" class="space-y-1.5">
                    <h4 class="font-bold text-xs text-slate-600">Daftar Item Rincian:</h4>
                    <div class="space-y-1">
                        <div v-for="(item, index) in trxForm.items" :key="item.id_layanan" class="flex justify-between items-center bg-slate-50 p-2 rounded border">
                            <div>
                                <span class="font-semibold text-slate-800">{{ getServiceName(item.id_layanan) }}</span>
                                <span class="text-[9px] text-slate-400 block">
                                    {{ item.qty }} {{ getServiceUnit(item.id_layanan) }} x Rp {{ (item.harga_satuan !== undefined ? item.harga_satuan : getPrice(trxForm.id_pelanggan, item.id_layanan)).toLocaleString() }}
                                </span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <span class="font-bold text-slate-800">Rp {{ (item.qty * (item.harga_satuan !== undefined ? item.harga_satuan : getPrice(trxForm.id_pelanggan, item.id_layanan))).toLocaleString() }}</span>
                                <button @click="$emit('removeItem', index)" type="button" class="text-rose-500 hover:text-rose-700 font-bold text-sm">✕</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-between items-center pt-2 border-t">
                    <div>
                        <button v-if="isEditingTrx" type="button" @click="$emit('delete', editingTrxId, 'belum_ditagih')" class="text-red-500 hover:text-red-700 font-semibold text-xs border border-red-200 px-3 py-1 rounded bg-red-50">
                            🗑️ Hapus Transaksi Ini
                        </button>
                    </div>
                    <div class="flex space-x-2">
                        <button type="button" @click="$emit('closeForm')" class="px-3 py-1 bg-slate-100 rounded text-xs">Batal</button>
                        <button type="button" @click="$emit('save')" class="bg-indigo-600 text-white px-4 py-1 rounded font-semibold text-xs shadow">Simpan</button>
                    </div>
                </div>
            </div>

            <!-- ACCORDION TRANSAKSI PER PELANGGAN -->
            <div v-if="!showForm" class="space-y-3">
                <div v-for="(transList, custId) in groupedByCustomer" :key="custId" class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <!-- Header Accordion Pelanggan -->
                    <button @click="toggleCustomerGroup(custId)" type="button" class="w-full p-3 bg-slate-50 hover:bg-slate-100 flex justify-between items-center border-b border-slate-100">
                        <div class="flex items-center space-x-2">
                            <span class="font-bold text-indigo-950 text-xs">{{ getCustomerName(custId) }}</span>
                            <span class="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{{ transList.length }} transaksi</span>
                            <span v-if="getCustomerUnbilledCount(transList) > 0" class="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                {{ getCustomerUnbilledCount(transList) }} belum ditagih
                            </span>
                        </div>
                        <span class="text-slate-400 font-bold text-xs">{{ isCustomerExpanded(custId) ? '▲' : '▼' }}</span>
                    </button>

                    <!-- Body Kartu Transaksi (Belum Ditagih di Atas, Sudah Ditagih di Bawah) -->
                    <div v-show="isCustomerExpanded(custId)" class="p-3 space-y-2 bg-white">
                        <div v-for="t in transList" :key="t.id" class="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm space-y-2">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-bold text-slate-800 text-xs">{{ getCustomerName(t.id_pelanggan) }}</h4>
                                    <span class="text-slate-400 text-[10px]">{{ formatDate(t.tanggal) }}</span>
                                </div>
                                <span :class="t.status_tagihan==='sudah_ditagih'?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'" class="px-2 py-0.5 rounded text-[9px] font-bold">
                                    {{ t.status_tagihan==='sudah_ditagih'?'Sudah Ditagih':'Belum Ditagih' }}
                                </span>
                            </div>
                            <div class="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-100 leading-relaxed">
                                <span v-for="item in t.items" :key="item.id_layanan" class="inline-block mr-3">
                                    • {{ getServiceName(item.id_layanan) }}: <strong>{{ item.qty }}</strong>
                                </span>
                            </div>
                            <div class="flex justify-end space-x-3 pt-1 border-t border-slate-200/60 text-xs">
                                <button @click="$emit('printA5', t)" class="text-indigo-600 font-semibold hover:underline">📄 Cetak A5</button>
                                <button @click="$emit('openEdit', t)" class="text-amber-700 font-semibold hover:underline">✏️ Edit</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="Object.keys(groupedByCustomer).length === 0" class="p-8 text-center text-slate-400 bg-white rounded-xl border">
                    Tidak ada catatan transaksi ditemukan.
                </div>
            </div>
        </section>
    `
};