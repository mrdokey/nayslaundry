export default {
    name: 'TagihanView',
    props: ['invoices', 'customers', 'searchQuery', 'showForm', 'invoiceForm', 'draftItems', 'draftTotal', 'getCustomerName', 'formatMonthYear'],
    emits: ['update:searchQuery', 'openAdd', 'closeForm', 'calculate', 'save', 'delete', 'updateStatus', 'print'],
    template: `
        <section class="space-y-3">
            <div class="flex justify-between items-center">
                <h2 class="text-base font-bold">Tagihan & Invoice</h2>
                <button v-if="!showForm" @click="$emit('openAdd')" class="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 shadow">💵 Buat Tagihan</button>
            </div>

            <input v-if="!showForm" :value="searchQuery" @input="$emit('update:searchQuery', $event.target.value)" type="text" placeholder="🔍 Cari invoice atau pelanggan..." class="w-full max-w-xs px-3 py-1.5 border rounded-lg text-xs">

            <!-- Form Invoice -->
            <div v-if="showForm" class="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 class="font-bold text-slate-700">Generate Invoice Bulanan</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label class="block font-semibold text-slate-500 mb-1">Pelanggan</label>
                        <select v-model="invoiceForm.id_pelanggan" @change="$emit('calculate')" class="w-full p-2 border rounded text-xs">
                            <option value="">-- Pilih Hotel/Vila --</option>
                            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.nama_pelanggan }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-500 mb-1">Periode</label>
                        <input v-model="invoiceForm.periode" @input="$emit('calculate')" type="month" class="w-full p-2 border rounded text-xs">
                    </div>
                </div>

                <div v-if="invoiceForm.id_pelanggan && draftItems.length > 0" class="border-t pt-2 space-y-2">
                    <h4 class="font-bold text-xs text-indigo-900">Rincian Draft:</h4>
                    <div class="bg-slate-50 p-2.5 rounded text-[11px] space-y-1">
                        <div v-for="item in draftItems" :key="item.id_layanan" class="flex justify-between">
                            <span>{{ item.nama_layanan }} ({{ item.qty }} {{ item.satuan }})</span>
                            <span class="font-semibold">Rp {{ item.subtotal.toLocaleString() }}</span>
                        </div>
                        <div class="flex justify-between border-t pt-1.5 font-bold text-indigo-950">
                            <span>TOTAL:</span>
                            <span>Rp {{ draftTotal.toLocaleString() }}</span>
                        </div>
                    </div>
                </div>
                <div v-else-if="invoiceForm.id_pelanggan && draftItems.length === 0" class="text-xs text-red-500 italic">
                    *Tidak ditemukan catatan transaksi belum tertagih pada periode ini.
                </div>

                <div class="flex justify-end space-x-2 pt-2 border-t">
                    <button @click="$emit('closeForm')" class="px-3 py-1 bg-slate-100 rounded">Batal</button>
                    <button v-if="draftItems.length > 0" @click="$emit('save')" class="bg-indigo-600 text-white px-4 py-1 rounded font-semibold">Terbitkan</button>
                </div>
            </div>

            <!-- List Invoices -->
            <div v-if="!showForm" class="space-y-2">
                <div v-for="inv in invoices" :key="inv.id" class="bg-white p-3 rounded-xl border shadow-sm space-y-2">
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-bold text-slate-800 text-xs">{{ getCustomerName(inv.id_pelanggan) }}</h4>
                            <p class="text-[10px] text-indigo-900 font-semibold mt-0.5">{{ inv.no_invoice }} | {{ formatMonthYear(inv.periode) }}</p>
                        </div>
                        <select :value="inv.status_pembayaran" @change="$emit('updateStatus', inv.id, $event.target.value)" 
                                :class="{'bg-red-100 text-red-800':inv.status_pembayaran==='belum_lunas','bg-emerald-100 text-emerald-800':inv.status_pembayaran==='lunas_cash','bg-blue-100 text-blue-800':inv.status_pembayaran==='lunas_transfer'}"
                                class="px-1.5 py-0.5 rounded text-[10px] font-bold border-0 focus:outline-none bg-slate-100">
                            <option value="belum_lunas">❌ Belum Lunas</option>
                            <option value="lunas_cash">💵 Lunas Cash</option>
                            <option value="lunas_transfer">💳 Lunas Transfer</option>
                        </select>
                    </div>
                    <div class="flex justify-between items-center pt-1.5 border-t text-[11px]">
                        <span class="font-bold text-slate-700">Total: Rp {{ inv.total_tagihan.toLocaleString() }}</span>
                        <div class="flex space-x-3">
                            <button @click="$emit('print', inv)" class="text-indigo-600 font-semibold">📄 Cetak</button>
                            <button @click="$emit('delete', inv.id)" class="text-red-500">Hapus</button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `
};