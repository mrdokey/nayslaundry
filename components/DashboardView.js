export default {
    name: 'DashboardView',
    props: ['customers', 'services', 'unbilledCount', 'hasUnbilled', 'getUnbilledTotal'],
    template: `
        <section class="space-y-4">
            <h2 class="text-base font-bold">Ringkasan Operasional</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-white p-3.5 rounded-xl border shadow-sm">
                    <span class="text-slate-400">Total Pelanggan</span>
                    <div class="text-xl font-bold text-indigo-600 mt-0.5">{{ customers.length }}</div>
                </div>
                <div class="bg-white p-3.5 rounded-xl border shadow-sm">
                    <span class="text-slate-400">Total Master Item</span>
                    <div class="text-xl font-bold text-indigo-600 mt-0.5">{{ services.length }}</div>
                </div>
                <div class="bg-white p-3.5 rounded-xl border shadow-sm">
                    <span class="text-slate-400">Cucian Belum Ditagih</span>
                    <div class="text-xl font-bold text-indigo-600 mt-0.5">{{ unbilledCount }}</div>
                </div>
                <div class="bg-white p-3.5 rounded-xl border shadow-sm">
                    <span class="text-slate-400">Status Koneksi</span>
                    <div class="text-xs font-semibold text-emerald-600 flex items-center mt-1.5">
                        <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block mr-1.5 animate-ping"></span>
                        Connected
                    </div>
                </div>
            </div>

            <div class="bg-white p-4 rounded-xl border shadow-sm">
                <h3 class="font-bold text-xs text-indigo-900 uppercase tracking-wide border-b pb-2 mb-2">Estimasi Tagihan Aktif Klien (Belum Ditagih)</h3>
                <div class="divide-y text-xs">
                    <template v-for="c in customers" :key="c.id">
                        <div v-if="getUnbilledTotal(c.id) > 0" class="py-2.5 flex justify-between items-center">
                            <span class="font-semibold text-slate-700">{{ c.nama_pelanggan }}</span>
                            <span class="font-bold text-indigo-600">Rp {{ getUnbilledTotal(c.id).toLocaleString() }}</span>
                        </div>
                    </template>
                    <div v-if="!hasUnbilled" class="py-3 text-center text-slate-400 italic">
                        Semua transaksi harian sudah bersih tertagihkan.
                    </div>
                </div>
            </div>
        </section>
    `
};