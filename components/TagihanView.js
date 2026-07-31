export default {
    name: 'TagihanView',
    props: [
        'invoices', 'unpaidInvoices', 'paidInvoices', 'customers', 'searchQuery', 
        'selectedFilterMonth', 'selectedFilterYear', 'availableYears', 'showForm', 
        'isEditingInvoice', 'editingInvoiceId', 'invoiceForm', 'selectedTrxIds', 'manualSubtotal', 
        'discountAmount', 'availableTrxForDraft', 'draftInvoiceItems', 'calculatedSubtotal', 
        'grandTotal', 'getCustomerName', 'formatMonthYear'
    ],
    emits: [
        'update:searchQuery', 'update:selectedFilterMonth', 'update:selectedFilterYear', 
        'update:manualSubtotal', 'update:discountAmount', 
        'openAdd', 'openEdit', 'closeForm', 'calculate', 'selectAllTrx', 'deselectAllTrx', 
        'save', 'delete', 'updateStatus', 'print', 'printDate', 'printKwitansi'
    ],
    setup() {
        const openUnpaid = Vue.ref(true);
        const openPaid = Vue.ref(false);

        const monthsList = [
            { id: '', name: 'Semua Bulan' },
            { id: '01', name: 'Januari' }, { id: '02', name: 'Februari' },
            { id: '03', name: 'Maret' }, { id: '04', name: 'April' },
            { id: '05', name: 'Mei' }, { id: '06', name: 'Juni' },
            { id: '07', name: 'Juli' }, { id: '08', name: 'Agustus' },
            { id: '09', name: 'September' }, { id: '10', name: 'Oktober' },
            { id: '11', name: 'November' }, { id: '12', name: 'Desember' }
        ];

        return { openUnpaid, openPaid, monthsList };
    },
    template: `
        <section class="space-y-3">
            <div class="flex justify-between items-center">
                <h2 class="text-base font-bold">Tagihan & Invoice Bulanan</h2>
                <button v-if="!showForm" @click="$emit('openAdd')" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 shadow text-xs">💵 Buat Tagihan Baru</button>
            </div>

            <!-- Panel Filter -->
            <div v-if="!showForm" class="bg-white p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                    <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Cari Invoice / Klien</label>
                    <input :value="searchQuery" @input="$emit('update:searchQuery', $event.target.value)" type="text" placeholder="🔍 Ketik nama/no. invoice..." class="w-full px-2 py-1 border rounded-lg text-xs focus:outline-indigo-500">
                </div>
                <div>
                    <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Filter Bulan</label>
                    <select :value="selectedFilterMonth" @change="$emit('update:selectedFilterMonth', $event.target.value)" class="w-full p-1 border rounded-lg text-xs">
                        <option v-for="m in monthsList" :key="m.id" :value="m.id">{{ m.name }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Filter Tahun</label>
                    <select :value="selectedFilterYear" @change="$emit('update:selectedFilterYear', $event.target.value)" class="w-full p-1 border rounded-lg text-xs">
                        <option value="">Semua Tahun</option>
                        <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
                    </select>
                </div>
            </div>

            <!-- Form Tagihan -->
            <div v-if="showForm" class="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
                <div class="flex justify-between items-center">
                    <h3 class="font-bold text-slate-700 text-xs">{{ isEditingInvoice ? 'Ubah Tagihan Invoice' : 'Generate Invoice Bulanan' }}</h3>
                    <span v-if="isEditingInvoice" class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">Mode Edit</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Pelanggan</label>
                        <select v-model="invoiceForm.id_pelanggan" @change="$emit('calculate')" class="w-full p-2 border rounded text-xs">
                            <option value="">-- Pilih Hotel/Vila --</option>
                            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.nama_pelanggan }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-500 mb-1">Periode Tagihan</label>
                        <input v-model="invoiceForm.periode" @input="$emit('calculate')" type="month" class="w-full p-2 border rounded text-xs">
                    </div>
                </div>

                <!-- DAFTAR CEKLIST TRANSAKSI HARIAN -->
                <div v-if="invoiceForm.id_pelanggan" class="border p-3 rounded-lg bg-slate-50 space-y-2">
                    <div class="flex justify-between items-center">
                        <h4 class="font-bold text-xs text-indigo-900 uppercase">Pilih Transaksi Harian yang Ditagihkan:</h4>
                        <div class="space-x-2 text-[10px]">
                            <button type="button" @click="$emit('selectAllTrx')" class="text-indigo-600 font-bold hover:underline">Centang Semua</button>
                            <span class="text-slate-300">|</span>
                            <button type="button" @click="$emit('deselectAllTrx')" class="text-slate-500 hover:underline">Hapus Centang</button>
                        </div>
                    </div>

                    <div v-if="availableTrxForDraft.length > 0" class="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        <label v-for="trx in availableTrxForDraft" :key="trx.id" class="flex items-center justify-between p-2 bg-white rounded border border-slate-200 cursor-pointer hover:bg-indigo-50/50">
                            <div class="flex items-center space-x-2.5">
                                <input type="checkbox" :value="trx.id" v-model="selectedTrxIds" class="w-4 h-4 text-indigo-600 rounded">
                                <span class="font-semibold text-slate-700 text-xs">{{ trx.tanggal }}</span>
                            </div>
                            <div class="text-[10px] text-slate-500">
                                <span v-for="item in trx.items" :key="item.id_layanan" class="mr-2">
                                    {{ item.qty }} pcs
                                </span>
                            </div>
                        </label>
                    </div>
                    <div v-else class="p-3 text-center text-slate-400 italic text-xs">
                        Tidak ada transaksi harian belum ditagih pada periode terpilih.
                    </div>
                </div>

                <!-- DRAFT & SUBTOTAL -->
                <div v-if="draftInvoiceItems.length > 0" class="border-t pt-3 space-y-3">
                    <h4 class="font-bold text-xs text-slate-700">Rincian & Penyesuaian Nilai Tagihan:</h4>
                    
                    <div class="bg-slate-50 p-3 rounded-lg space-y-1 text-xs border">
                        <div v-for="item in draftInvoiceItems" :key="item.id_layanan" class="flex justify-between text-slate-600">
                            <span>{{ item.nama_layanan }} ({{ item.qty }} {{ item.satuan }})</span>
                            <span>Rp {{ item.subtotal.toLocaleString() }}</span>
                        </div>
                        <div class="flex justify-between border-t pt-1 font-semibold text-slate-500">
                            <span>Kalkulasi Otomatis Sistem:</span>
                            <span>Rp {{ calculatedSubtotal.toLocaleString() }}</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <div>
                            <label class="block text-[10px] font-bold text-indigo-900 uppercase mb-1">Subtotal Tagihan (Editable Rp)</label>
                            <input type="number" :value="manualSubtotal" @input="$emit('update:manualSubtotal', $event.target.value)" class="w-full p-2 border rounded font-semibold text-xs bg-white focus:outline-indigo-500">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-indigo-900 uppercase mb-1">Diskon / Potongan (Rp)</label>
                            <input type="number" :value="discountAmount" @input="$emit('update:discountAmount', $event.target.value)" placeholder="0" class="w-full p-2 border rounded font-semibold text-xs bg-white focus:outline-indigo-500 text-rose-600">
                        </div>
                    </div>

                    <div class="flex justify-between items-center p-3 bg-indigo-900 text-white rounded-xl font-bold">
                        <span class="uppercase text-xs">Total Akhir Invoice:</span>
                        <span class="text-base">Rp {{ grandTotal.toLocaleString() }}</span>
                    </div>
                </div>

                <div class="flex justify-between items-center pt-3 border-t">
                    <div>
                        <button v-if="isEditingInvoice" type="button" @click="$emit('delete', editingInvoiceId)" class="text-red-500 hover:text-red-700 font-semibold text-xs border border-red-200 px-3 py-1 rounded bg-red-50">
                            🗑️ Hapus Invoice Ini
                        </button>
                    </div>
                    <div class="flex space-x-2">
                        <button type="button" @click="$emit('closeForm')" class="px-3 py-1 bg-slate-100 rounded text-xs">Batal</button>
                        <button v-if="selectedTrxIds.length > 0 || draftInvoiceItems.length > 0" type="button" @click="$emit('save')" class="bg-indigo-600 text-white px-4 py-1 rounded font-semibold text-xs shadow">
                            Simpan & Terbitkan
                        </button>
                    </div>
                </div>
            </div>

            <!-- ACCORDION TAGIHAN -->
            <div v-if="!showForm" class="space-y-3">
                <!-- 1. KELOMPOK BELUM LUNAS -->
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <button @click="openUnpaid = !openUnpaid" type="button" class="w-full p-3 bg-red-50 hover:bg-red-100/80 flex justify-between items-center border-b border-red-100">
                        <div class="flex items-center space-x-2">
                            <span class="font-bold text-red-900 text-xs">❌ BELUM LUNAS</span>
                            <span class="bg-red-200 text-red-900 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{{ unpaidInvoices.length }}</span>
                        </div>
                        <span class="text-red-700 font-bold text-xs">{{ openUnpaid ? '▲' : '▼' }}</span>
                    </button>

                    <div v-show="openUnpaid" class="p-3 space-y-2 bg-white">
                        <div v-for="inv in unpaidInvoices" :key="inv.id" class="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm space-y-2">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-bold text-slate-800 text-xs">{{ getCustomerName(inv.id_pelanggan) }}</h4>
                                    <p class="text-[10px] text-indigo-900 font-semibold mt-0.5">{{ inv.no_invoice }} | {{ formatMonthYear(inv.periode) }}</p>
                                </div>
                                <select :value="inv.status_pembayaran" @change="$emit('updateStatus', inv.id, $event.target.value)" class="px-1.5 py-0.5 rounded text-[10px] font-bold border border-red-200 bg-red-100 text-red-800 focus:outline-none">
                                    <option value="belum_lunas">❌ Belum Lunas</option>
                                    <option value="lunas_cash">💵 Lunas Cash</option>
                                    <option value="lunas_transfer">💳 Lunas Transfer</option>
                                </select>
                            </div>
                            <div class="flex justify-between items-center pt-1.5 border-t text-[11px]">
                                <span class="font-bold text-slate-700">Total: Rp {{ inv.total_tagihan.toLocaleString() }}</span>
                                <div class="flex space-x-2 text-[10px]">
                                    <button @click="$emit('print', inv)" class="text-indigo-600 font-semibold hover:underline">📄 Per Item</button>
                                    <button @click="$emit('printDate', inv)" class="text-purple-700 font-semibold hover:underline">📅 Per Tanggal</button>
                                    <button @click="$emit('openEdit', inv)" class="text-amber-700 font-semibold hover:underline">✏️ Edit</button>
                                </div>
                            </div>
                        </div>
                        <div v-if="unpaidInvoices.length === 0" class="p-6 text-center text-slate-400 italic text-xs">
                            Tidak ada tagihan yang belum lunas.
                        </div>
                    </div>
                </div>

                <!-- 2. KELOMPOK SUDAH LUNAS -->
                <div class="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <button @click="openPaid = !openPaid" type="button" class="w-full p-3 bg-emerald-50 hover:bg-emerald-100/80 flex justify-between items-center border-b border-emerald-100">
                        <div class="flex items-center space-x-2">
                            <span class="font-bold text-emerald-900 text-xs">✅ SUDAH LUNAS (CASH / TRANSFER)</span>
                            <span class="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full text-[10px] font-extrabold">{{ paidInvoices.length }}</span>
                        </div>
                        <span class="text-emerald-700 font-bold text-xs">{{ openPaid ? '▲' : '▼' }}</span>
                    </button>

                    <div v-show="openPaid" class="p-3 space-y-2 bg-white">
                        <div v-for="inv in paidInvoices" :key="inv.id" class="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm space-y-2">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-bold text-slate-800 text-xs">{{ getCustomerName(inv.id_pelanggan) }}</h4>
                                    <p class="text-[10px] text-indigo-900 font-semibold mt-0.5">{{ inv.no_invoice }} | {{ formatMonthYear(inv.periode) }}</p>
                                </div>
                                <select :value="inv.status_pembayaran" @change="$emit('updateStatus', inv.id, $event.target.value)" 
                                        :class="inv.status_pembayaran==='lunas_cash'?'bg-emerald-100 text-emerald-800 border-emerald-200':'bg-blue-100 text-blue-800 border-blue-200'"
                                        class="px-1.5 py-0.5 rounded text-[10px] font-bold border focus:outline-none">
                                    <option value="belum_lunas">❌ Belum Lunas</option>
                                    <option value="lunas_cash">💵 Lunas Cash</option>
                                    <option value="lunas_transfer">💳 Lunas Transfer</option>
                                </select>
                            </div>
                            <div class="flex justify-between items-center pt-1.5 border-t text-[11px]">
                                <span class="font-bold text-slate-700">Total: Rp {{ inv.total_tagihan.toLocaleString() }}</span>
                                <div class="flex space-x-2 text-[10px]">
                                    <button @click="$emit('printKwitansi', inv)" class="text-emerald-600 font-bold hover:underline">🧾 Kwitansi</button>
                                    <button @click="$emit('print', inv)" class="text-indigo-600 font-semibold hover:underline">📄 Per Item</button>
                                    <button @click="$emit('printDate', inv)" class="text-purple-700 font-semibold hover:underline">📅 Per Tanggal</button>
                                    <button @click="$emit('openEdit', inv)" class="text-amber-700 font-semibold hover:underline">✏️ Edit</button>
                                </div>
                            </div>
                        </div>
                        <div v-if="paidInvoices.length === 0" class="p-6 text-center text-slate-400 italic text-xs">
                            Belum ada riwayat tagihan yang sudah lunas.
                        </div>
                    </div>
                </div>

            </div>
        </section>
    `
};