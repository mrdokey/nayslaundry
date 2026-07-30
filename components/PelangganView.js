export default {
    name: 'PelangganView',
    props: ['activeTab', 'customers', 'services', 'selectedCustomer', 'tempPrices', 'searchQuery', 'showForm', 'isEditing', 'customerForm'],
    emits: ['update:searchQuery', 'openAdd', 'openEdit', 'openCustom', 'closeForm', 'save', 'delete', 'saveCustom', 'backToList'],
    template: `
        <div>
            <!-- TAB: KELOLA PELANGGAN -->
            <section v-if="activeTab === 'pelanggan'" class="space-y-3">
                <div class="flex justify-between items-center">
                    <h2 class="text-base font-bold">Kelola Pelanggan (Hotel / Vila)</h2>
                    <button v-if="!showForm" @click="$emit('openAdd')" class="hidden md:block bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-700 shadow text-xs">+ Tambah Pelanggan</button>
                </div>

                <input v-if="!showForm" :value="searchQuery" @input="$emit('update:searchQuery', $event.target.value)" type="text" placeholder="🔍 Cari nama pelanggan atau alamat..." class="w-full max-w-xs px-3 py-1.5 border rounded-lg text-xs">

                <!-- Form Input Pelanggan -->
                <div v-if="showForm" class="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                    <h3 class="font-bold text-slate-700 text-xs">{{ isEditing ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan Baru' }}</h3>
                    <form @submit.prevent="$emit('save')" class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Nama Hotel / Vila</label>
                            <input v-model="customerForm.nama_pelanggan" type="text" required class="w-full p-2 border rounded text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Nomor Telepon</label>
                            <input v-model="customerForm.no_telepon" type="text" required class="w-full p-2 border rounded text-xs">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Alamat Lengkap</label>
                            <input v-model="customerForm.alamat" type="text" required class="w-full p-2 border rounded text-xs">
                        </div>
                        <div class="md:col-span-3 flex justify-end space-x-2 pt-2 border-t">
                            <button type="button" @click="$emit('closeForm')" class="px-3 py-1 bg-slate-100 rounded text-xs">Batal</button>
                            <button type="submit" class="bg-indigo-600 text-white px-4 py-1 rounded font-semibold text-xs shadow">Simpan</button>
                        </div>
                    </form>
                </div>

                <!-- List Pelanggan (Card) -->
                <div v-if="!showForm" class="space-y-2">
                    <div v-for="cust in customers" :key="cust.id" class="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                        <div>
                            <h4 class="font-bold text-slate-800 text-xs">{{ cust.nama_pelanggan }}</h4>
                            <span class="text-slate-400 text-[10px] block mt-0.5">📍 {{ cust.alamat }} | Telp: {{ cust.no_telepon }}</span>
                        </div>
                        <div class="flex space-x-1.5 shrink-0 text-xs">
                            <button @click="$emit('openCustom', cust)" class="bg-emerald-50 text-emerald-600 p-1.5 rounded font-bold">💰 Tarif</button>
                            <button @click="$emit('openEdit', cust)" class="bg-indigo-50 text-indigo-600 p-1.5 rounded">Edit</button>
                            <button @click="$emit('delete', cust.id)" class="bg-rose-50 text-rose-500 p-1.5 rounded">Hapus</button>
                        </div>
                    </div>
                    <div v-if="customers.length === 0" class="p-8 text-center text-slate-400 bg-white rounded-xl border">
                        Belum ada pelanggan terdaftar.
                    </div>
                </div>
            </section>

            <!-- SUB-TAB: HARGA KHUSUS -->
            <section v-if="activeTab === 'harga_khusus'" class="space-y-4">
                <div class="flex justify-between items-center">
                    <h2 class="text-sm font-bold">Tarif Khusus: <span class="text-indigo-600">{{ selectedCustomer ? selectedCustomer.nama_pelanggan : '' }}</span></h2>
                    <button @click="$emit('backToList')" class="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold">⬅️ Kembali</button>
                </div>

                <div class="bg-white p-4 rounded-xl border border-slate-100 space-y-4 text-xs">
                    <p class="text-slate-400 italic">*Kosongkan jika ingin memakai Harga Standar.</p>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-[11px]">
                            <thead class="bg-slate-50 border-b text-slate-400 font-semibold uppercase text-[9px]">
                                <tr>
                                    <th class="p-2">Nama Layanan</th>
                                    <th class="p-2">Satuan</th>
                                    <th class="p-2">Harga Standar</th>
                                    <th class="p-2 w-32">Harga Khusus (Rp)</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="item in services" :key="item.id">
                                    <td class="p-2 font-medium leading-tight">{{ item.nama_layanan }}</td>
                                    <td class="p-2"><span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase inline-block mt-0.5">{{ item.satuan }}</span></td>
                                    <td class="p-2 text-slate-500">Rp {{ item.harga_standar.toLocaleString() }}</td>
                                    <td class="p-2">
                                        <input type="number" v-model.number="tempPrices[item.id]" placeholder="Standar" class="w-full p-1 border rounded bg-slate-50 text-xs">
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="flex justify-end pt-3 border-t">
                        <button @click="$emit('saveCustom')" class="bg-emerald-600 text-white px-5 py-2 rounded-lg font-semibold shadow">💾 Simpan Semua Tarif</button>
                    </div>
                </div>
            </section>
        </div>
    `
};