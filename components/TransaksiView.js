export default {
    name: 'TransaksiView',
    props: ['transactions', 'customers', 'services', 'searchQuery', 'showForm', 'trxForm', 'itemSearch', 'selectedItemId', 'selectedItemQty', 'filteredSearchItems', 'getCustomerName', 'getServiceName', 'getServiceUnit', 'getPrice', 'formatDate'],
    emits: ['update:searchQuery', 'update:itemSearch', 'update:selectedItemQty', 'openAdd', 'closeForm', 'selectSearchItem', 'addItem', 'removeItem', 'save', 'delete'],
    template: `
        <section class="space-y-3">
            <div class="flex justify-between items-center">
                <h2 class="text-base font-bold">Transaksi Laundry</h2>
                <button v-if="!showForm" @click="$emit('openAdd')" class="hidden md:block bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 shadow">+ Tambah</button>
            </div>

            <input v-if="!showForm" :value="searchQuery" @input="$emit('update:searchQuery', $event.target.value)" type="text" placeholder="🔍 Cari nama pelanggan..." class="w-full max-w-xs px-3 py-1.5 border rounded-lg text-xs">

            <!-- Form Transaksi Cart-Style -->
            <div v-if="showForm" class="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 class="font-bold text-slate-700">Form Pencatatan Laundry</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block font-semibold text-slate-500 mb-1">Pelanggan</label>
                        <select v-model="trxForm.id_pelanggan" class="w-full p-2 border rounded text-xs">
                            <option value="">-- Pilih Hotel/Vila --</option>
                            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.nama_pelanggan }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-500 mb-1">Tanggal</label>
                        <input v-model="trxForm.tanggal" type="date" class="w-full p-2 border rounded text-xs">
                    </div>
                </div>

                <!-- Panel Tambah Item ala Cart (Dropdown + Cari) -->
                <div v-if="trxForm.id_pelanggan" class="border p-3 rounded-lg bg-slate-50 space-y-2">
                    <h4 class="font-bold text-xs text-indigo-900 uppercase">Tambah Item ke Daftar:</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                        <div class="relative">
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
                        <button type="button" @click="$emit('addItem')" class="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded font-bold text-xs shadow">
                            ➕ Masukkan ke Daftar
                        </button>
                    </div>
                </div>

                <!-- List Item Sementara -->
                <div v-if="trxForm.items.length > 0" class="space-y-1.5">
                    <h4 class="font-bold text-xs text-slate-600">Daftar Item Sementara:</h4>
                    <div class="space-y-1">
                        <div v-for="(item, index) in trxForm.items" :key="item.id_layanan" class="flex justify-between items-center bg-slate-50 p-2 rounded border">
                            <div>
                                <span class="font-semibold text-slate-800">{{ getServiceName(item.id_layanan) }}</span>
                                <span class="text-[9px] text-slate-400 block">
                                    {{ item.qty }} {{ getServiceUnit(item.id_layanan) }} x Rp {{ getPrice(trxForm.id_pelanggan, item.id_layanan).toLocaleString() }}
                                </span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <span class="font-bold text-slate-800">Rp {{ (item.qty * getPrice(trxForm.id_pelanggan, item.id_layanan)).toLocaleString() }}</span>
                                <button @click="$emit('removeItem', index)" type="button" class="text-rose-500 hover:text-rose-700 font-bold text-sm">✕</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex justify-end space-x-2 pt-2 border-t">
                    <button @click="$emit('closeForm')" class="px-3 py-1 bg-slate-100 rounded">Batal</button>
                    <button @click="$emit('save')" class="bg-indigo-600 text-white px-4 py-1 rounded font-semibold">Simpan</button>
                </div>
            </div>

            <!-- List Transaksi Log -->
            <div v-if="!showForm" class="space-y-2">
                <div v-for="t in transactions" :key="t.id" class="bg-white p-3 rounded-xl border shadow-sm flex flex-col justify-between gap-2">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-slate-800 text-xs">{{ getCustomerName(t.id_pelanggan) }}</h4>
                            <span class="text-slate-400 text-[10px]">{{ formatDate(t.tanggal) }}</span>
                        </div>
                        <span :class="t.status_tagihan==='belum_ditagih'?'bg-amber-100 text-amber-800':'bg-emerald-100 text-emerald-800'" class="px-2 py-0.5 rounded text-[9px] font-bold">
                            {{ t.status_tagihan==='belum_ditagih'?'Belum Ditagih':'Sudah Ditagih' }}
                        </span>
                    </div>
                    <div class="text-[10px] text-slate-600 bg-slate-50 p-2 rounded leading-relaxed">
                        <span v-for="item in t.items" :key="item.id_layanan" class="inline-block mr-3">
                            • {{ getServiceName(item.id_layanan) }}: <strong>{{ item.qty }}</strong>
                        </span>
                    </div>
                    <div class="flex justify-end pt-1">
                        <button @click="$emit('delete', t.id, t.status_tagihan)" class="text-red-500 hover:text-red-700">Hapus</button>
                    </div>
                </div>
            </div>
        </section>
    `
};