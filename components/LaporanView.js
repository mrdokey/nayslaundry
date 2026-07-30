export default {
    name: 'LaporanView',
    props: ['customers', 'reportInvoices', 'reportTotals', 'filterClient', 'filterMonth', 'getCustomerName', 'formatMonthYear'],
    emits: ['update:filterClient', 'update:filterMonth', 'export'],
    template: `
        <section class="space-y-3">
            <h2 class="text-base font-bold">Laporan Omset Pendapatan</h2>
            
            <div class="bg-white p-3 rounded-xl border flex flex-col gap-2">
                <div class="grid grid-cols-2 gap-2">
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 mb-1">Filter Klien</label>
                        <select :value="filterClient" @change="$emit('update:filterClient', $event.target.value)" class="w-full p-2 border rounded">
                            <option value="">-- Semua Klien --</option>
                            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.nama_pelanggan }}</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-semibold text-slate-400 mb-1">Filter Bulan</label>
                        <input :value="filterMonth" @input="$emit('update:filterMonth', $event.target.value)" type="month" class="w-full p-2 border rounded text-xs">
                    </div>
                </div>
                <button @click="$emit('export')" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg font-semibold flex items-center justify-center space-x-1">
                    <span>📊 Download Excel</span>
                </button>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-3 gap-2 text-center">
                <div class="bg-indigo-50 p-2 rounded-lg border border-indigo-100 shadow-sm">
                    <span class="text-[9px] text-indigo-700 font-semibold block uppercase leading-none mb-1">Total Omset</span>
                    <span class="font-bold text-indigo-950 text-xs">Rp {{ reportTotals.totalOmset.toLocaleString() }}</span>
                </div>
                <div class="bg-emerald-50 p-2 rounded-lg border border-emerald-100 shadow-sm">
                    <span class="text-[9px] text-emerald-700 font-semibold block uppercase leading-none mb-1">Terbayar</span>
                    <span class="font-bold text-emerald-950 text-xs">Rp {{ reportTotals.totalTerbayar.toLocaleString() }}</span>
                </div>
                <div class="bg-rose-50 p-2 rounded-lg border border-rose-100 shadow-sm">
                    <span class="text-[9px] text-rose-700 font-semibold block uppercase leading-none mb-1">Piutang</span>
                    <span class="font-bold text-rose-950 text-xs">Rp {{ reportTotals.totalPiutang.toLocaleString() }}</span>
                </div>
            </div>

            <!-- List Laporan -->
            <div class="space-y-1.5">
                <div v-for="inv in reportInvoices" :key="inv.id" class="bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm">
                    <div>
                        <h4 class="font-bold text-slate-800">{{ getCustomerName(inv.id_pelanggan) }}</h4>
                        <span class="text-[10px] text-slate-400 block">{{ inv.no_invoice }} | {{ formatMonthYear(inv.periode) }}</span>
                    </div>
                    <div class="text-right">
                        <span class="font-bold block">Rp {{ inv.total_tagihan.toLocaleString() }}</span>
                        <span :class="inv.status_pembayaran==='belum_lunas'?'text-red-500':'text-emerald-500'" class="text-[9px] font-bold uppercase">
                            {{ inv.status_pembayaran.replace('_', ' ') }}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    `
};